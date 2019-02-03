import { SuperLink } from "./superlink";
import WebSocket from "ws";
import P, { Type as Cmd, packetLength } from "./packet";
import { D } from "./constants";

export type Data = WebSocket.Data;

export enum State {
  Init = 0,
  Ready = 1,
  Shutdown = 2,
  Closed = 3
}

let linkSerial: number = -1;
function nextLinkSerial(): number {
  return ++linkSerial;
}

const debug = D("link");

export class Link {
  ws: WebSocket;
  state: State;
  parent!: SuperLink;
  createTime!: number;

  slotNumber: number;
  serial: number;
  writable: boolean;

  inBytes: number = 0;
  outBytes: number = 0;
  inPackets: number = 0;
  outPackets: number = 0;

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.state = State.Init;
    this.slotNumber = -1;
    this.serial = nextLinkSerial();
    this.writable = true;
  }

  attach(h: SuperLink) {
    const _ws = <any> this.ws;
    _ws._socket.write = Link.writeMod(_ws._socket.write, this);
    _ws._socket.on("drain", this.onDrain.bind(this));

    this.parent = h;
    this.createTime = Date.now();
    this.ws.on("message", this.onMessage.bind(this));
    this.state = State.Ready;
  }

  isReady(): boolean {
    return this.state == State.Ready;
  }

  isClosed(): boolean {
    return this.state == State.Closed;
  }

  detach() {
    if (this.parent && this.state == State.Ready) {
      this.parent && this.parent.detach(this);
    }
  }

  close() {
    this.detach();
    this.ws.close(1000);
    this.state = State.Closed;
  }

  graceClose() {
    this.detach();
    this.ws.send(P.shutdown());
    this.state = State.Shutdown;
  }


  shutdown() {
    this.detach();
    this.ws.send(P.shutdown2());
    this.state = State.Shutdown;
  }

  onClose(ws: WebSocket) {
    debug("onclose %d", this.serial);
    this.detach();
    delete this.parent;

    if (this.isClosed()) {
      return;
    }
    this.state = State.Closed;
  }

  send(data: Data, cb?: () => void): void {
    this.outPackets ++;
    this.outBytes += packetLength(data);
    this.ws.send(data, {}, cb);
  }

  onMessage(data: Buffer) {
    this.inPackets++;
    this.inBytes += data.length;

    const cmd = data.readInt16BE(0);

    switch (cmd) {
      case Cmd.Shutdown: {
        this.shutdown();
        return;
      }

      case Cmd.Shutdown2: {
        this.close();
        return;
      }

      case Cmd.DummyData: {
        this.onDummyData(data);
        return;
      }
    }
  }


  onDummyData(data: Buffer) {
    this.parent && this.parent.onDummyData(this, data);
  }
  /*
  dummyData(data: Buffer) {
    // const cmd = data.readInt16BE(0);
    const id = data.readInt16BE(2);
    const size = data.readInt32BE(4);
    debug("dummy data %s +%s", id, this.serial);
  }
  */

  onDrain() {
    if (this.writable) {
      return;
    }

    if (this.state != State.Ready) {
      return;
    }

    this.writable = true;
    this.parent.writableLinks += 1;
    this.parent.onLinkDrain(this);
  }

  static writeMod(nativeFunction: any, link: Link): any {
    return function(this: any) {
      return link.writable = nativeFunction.apply(this as any, arguments);
    };
  }

  static create(slotNumber: number, target: string): Link {
    const ws = new WebSocket(target);
    const link = new Link(ws);
    link.slotNumber = slotNumber;
    return link;
  }
}
