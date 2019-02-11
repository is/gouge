import { Socket } from "net";
import { SuperLink } from "./superlink";
import { Tunnel, Mode as TunnelMode } from "./tunnel";
import { D, Code,
  CHANNEL_MAX_BUFFER_SIZE, CHANNEL_RING_BUFFER_SIZE, CHANNEL_MAX_SEQ, CHANNEL_RING_BUFFER_RANGE } from "./constants";
import { Builder as B, Parser as P,
  Data, Ack, Close, Close2, PLEN, Type } from "./packet";

type ChannelOrderPacket = Data | Close2 ;

const DMSG = D("ch-msg");
const debug = D("ch");

interface ChannelPacket {
  cmd: Type;
  seq: number;
}



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

  ring: Array<ChannelPacket>;
  inSeq: number = 0;
  inHead: number = 0;


  constructor(opts: Options) {
    this.id = opts.id;
    this.link = opts.link;
    this.tunnel = opts.tunnel;
    this.mode = opts.tunnel.mode;
    this.ring = new Array<ChannelPacket>(CHANNEL_RING_BUFFER_SIZE);

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
    this.bufferedSize += data.length;

    const p = B.data(this.id, this.nextOutSeq(), data);
    const res = this.link.send(p);

    DMSG("ondata %d %d %s", this.id, PLEN(p), res);

    if (this.bufferedSize >= CHANNEL_MAX_BUFFER_SIZE) {
      this.isPaused = true;
      this.socket.pause();
      DMSG("data-paused %d", this.id);
    }
  }

  nextOutSeq(): number {
    this.outSeq += 1;
    if (this.outSeq > CHANNEL_MAX_SEQ) {
      this.outSeq = 0;
    }
    return this.outSeq;
  }

  // 恢复传输
  onDrain() {
    // TODO:TBD
  }

  isInSeqRange(seq: number): boolean {
    if (seq >= this.inSeq) {
      if (this.inSeq - seq < CHANNEL_RING_BUFFER_RANGE) {
        return true;
      }
    } else {
      if ((CHANNEL_MAX_SEQ - this.inSeq + seq) < CHANNEL_RING_BUFFER_RANGE) {
        return true;
      }
    }
    return false;
  }

  onTunnel_MessageIn(seq: number, pkt: ChannelPacket) {
    if (!this.isInSeqRange(seq)) {
      debug("on-tunnel-message-in.outofrange %d %d %d", this.id, seq, this.inSeq);
      const p = B.close2(this.id, Code.CHANNEL_SEQ_OUTOF_RANGE, seq);
      this.link.send(p);
      this.onTunnel_Close2(P.close2(p));
    }

    const pos = seq % CHANNEL_RING_BUFFER_SIZE;
    this.ring[pos] = pkt;

    while (true) {
      const pos2 = this.inSeq % CHANNEL_RING_BUFFER_SIZE;
      const p = this.ring[pos2];
      if (p === undefined) {
        break;
      }

      delete this.ring[pos2];
      this.inSeq += 1;
      if (this.inSeq > CHANNEL_MAX_SEQ) {
        this.inSeq = 0;
      }

      switch (p.cmd) {
        case Type.Data: {
          this.onTunnel_Data(<Data> p);
          break;
        }

        case Type.Close: {
          this.onTunnel_Close(<Close> p);
        }
      }
    }
  }

  onTunnel_Data(data: Data) {
    const size = data.payload.length;
    const seq = data.seq;
    DMSG("on-tunnel-data %d %d %d", this.id, seq, size);
    this.socket.write(data.payload, () => {
      this.sendAck(seq, size);
    });
  }

  onTunnel_Close(close: Close) {
    if (this.state != ChannelState.CLOSED) {
      this.s.end();
      this.state = ChannelState.CLOSED;
      this.detach();
    }
  }

  onTunnel_Ack(ack: Ack) {
    this.bufferedSize -= ack.size;
    if (this.bufferedSize < CHANNEL_MAX_BUFFER_SIZE && this.isPaused) {
      this.isPaused = false;
      this.s.resume();
    }
  }

  onTunnel_Close2(close2: Close2) {
    debug("on-tunnel-close2 %d %d %d", this.id, close2.code, close2.where);
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
