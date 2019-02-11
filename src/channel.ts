import { Socket } from "net";
import { SuperLink } from "./superlink";
import { Tunnel, Mode as TunnelMode } from "./tunnel";
import { D, CHANNEL_MAX_BUFFER_SIZE } from "./constants";
import { Builder as B, Data, Ack, Close, Close2 } from "./packet";


const DMSG = D("ch-msg");

export enum ChannelState {
  INIT = 0,
  CONNECTING = 1,
  CONNECTED = 2,
  CLOSED = 3,
  ERROR = 4,
}

export interface Options {
  id: number;
  link: SuperLink;
  tunnel: Tunnel;
  socket?: Socket;
}


export class Channel {
  state: ChannelState = ChannelState.INIT;
  id: number = -1;
  mode: TunnelMode = TunnelMode.UNSET;
  link: SuperLink;
  tunnel: Tunnel;
  s!: Socket;
  bufferedSize: number = 0;
  outSeq: number = -1;
  isPaused: boolean = false;
  isDetached: boolean = false;

  constructor(opts: Options) {
    this.id = opts.id;
    this.link = opts.link;
    this.tunnel = opts.tunnel;
    this.mode = opts.tunnel.mode;

    if (opts.socket !== undefined) {
      this.socket = opts.socket;
    }

    this.state = ChannelState.INIT;
  }

  get socket(): Socket {
    return this.s;
  }

  set socket(s: Socket) {
    this.s = s;
  }

  start() {
    if (this.mode == TunnelMode.IN) {
      this.serverStart();
    } else {
      this.clientStart();
    }
  }

  // 处理关闭事件
  onClose(hadError: boolean) {
    DMSG("on-close %d %d", this.id, this.state);
    if (this.state != ChannelState.CLOSED) {
      this.link.send(B.close(this.id, this.nextOutSeq()));
    }
    this.state = ChannelState.CLOSED;
    this.detach();
  }

  // 链接完成,发送消息,开始工作
  onReady() {
    this.state = ChannelState.CONNECTED;
    this.link.send(B.open2(this.id));
  }

  onConnected() {
    this.state = ChannelState.CONNECTED;
    this.s.resume();
  }

  // 收到数据
  onData(data: Buffer) {
    DMSG("ondata");
    this.bufferedSize += data.length;
    this.link.send(B.data(
      this.id, this.nextOutSeq(), data));
    if (this.bufferedSize >= CHANNEL_MAX_BUFFER_SIZE) {
      this.isPaused = true;
      this.socket.pause();
    }
  }

  nextOutSeq(): number {
    this.outSeq += 1;
    if (this.outSeq > 0x8000) {
      this.outSeq = 0;
    }
    return this.outSeq;
  }

  // 恢复传输
  onDrain() {
    // TODO:TBD
  }

  onTunnel_Data(data: Data) {
    const size = data.payload.length;
    const seq = data.seq;
    DMSG("ontunneldata %d %d %d", this.id, seq, size);
    this.socket.write(data.payload, () => {
      this.sendAck(seq, size);
    });
  }


  onTunnel_Ack(ack: Ack) {
    this.bufferedSize -= ack.size;
    if (this.bufferedSize < CHANNEL_MAX_BUFFER_SIZE && this.isPaused) {
      this.isPaused = false;
      this.s.resume();
    }
  }

  onTunnel_Close(close: Close) {
    if (this.state != ChannelState.CLOSED) {
      this.s.end();
      this.state = ChannelState.CLOSED;
      this.detach();
    }
  }

  onTunnel_Close2(close2: Close2) {
    if (this.state != ChannelState.CLOSED) {
      this.s.end();
      this.state = ChannelState.CLOSED;
      this.detach();
    }
  }


  sendAck(seq: number, size: number): void {
    this.link.send(B.ack(this.id, seq, size));
  }

  clientStart() {
    const s = new Socket();
    this.s = s;
    this.state = ChannelState.CONNECTING;
    s.on("close", this.onClose.bind(this));
    s.on("ready", this.onReady.bind(this));
    s.on("data", this.onData.bind(this));
    // s.on("drain", this.onDrain.bind(this));
    s.connect(this.tunnel.getSocketOption());
  }

  serverStart() {
    const s = this.s;
    s.pause();
    s.on("data", this.onData.bind(this));
    // s.on("drain", this.onDrain.bind(this));
    s.on("close", this.onClose.bind(this));
    this.state = ChannelState.CONNECTING;
    this.link.send(B.open(this.tunnel.id, this.id));
  }

  detach() {
    if (this.isDetached) {
      return;
    }
    this.isDetached = true;
    delete this.link.channels[this.id];
  }
}
