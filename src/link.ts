import { SuperLink } from "./superlink";
import WebSocket from "ws";
import P, { Type as Cmd } from "./packet";

export type Data = WebSocket.Data;

export enum State {
  Init = 0,
  Ready = 1,
  Shutdown = 2,
  Closed = 3
}

let linkSerial: number = -1;
function nextLinkSerial(): number {
  return linkSerial++;
}

export class Link {
  ws: WebSocket;
  state: State;
  parent!: SuperLink;
  createTime!: number;

  slotNumber: number;
  serial: number;
  writable: boolean;

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
    this.ws.on("message", this.onMessage);
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
    this.detach();
    delete this.parent;

    if (this.isClosed()) {
      return;
    }
    this.state = State.Closed;
  }

  send(data: Data, cb?: () => void): void {
    this.ws.send(data, {}, cb);
  }

  onMessage(data: Buffer) {
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
    }
  }

  onDrain() {
    if (this.writable) {
      return;
    }

    if (this.state != State.Ready) {
      return;
    }

    this.writable = true;
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
