import { SuperLink } from "./superlink";
import WebSocket from "ws";
import P, { Type as Cmd } from "./packet";


const WebSocketBufferSize = 16 * 1024;

export type Data = WebSocket.Data;

export enum State {
  Init = 0,
  Ready = 1,
  Shutdown = 2,
  Closed = 3
}

export class Link {
  ws: WebSocket;
  state: State;
  group!: SuperLink;
  createTime!: number;

  slotNumber: number;
  linkSerial: number;
  writable: boolean;

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.state = State.Init;
    this.slotNumber = -1;
    this.linkSerial = -1;
    this.writable = true;
  }

  attach(h: SuperLink) {
    this.group = h;
    this.createTime = Date.now();
    this.ws.on("message", this.onMessage);
    this.ready();
  }

  ready() {
    this.state = State.Ready;
  }

  isReady(): boolean {
    return this.state == State.Ready;
  }

  isClosed(): boolean {
    return this.state == State.Closed;
  }

  detach() {
    this.group && this.group.detach(this);
  }

  close() {
    this.detach();
    this.ws.close(1000);
    this.state = State.Closed;
  }

  shutdown() {
    this.detach();
    this.ws.send(P.shutdown2());
  }

  onClose(ws: WebSocket) {
    if (this.isClosed()) {
      return;
    }
    this.detach();
    this.state = State.Closed;
  }

  send(data: Data, cb?: () => void) {
    this.ws.send(data, {}, () => { this.onSend(cb); });
    this.isDrain(false);
    return true;
  }


  onMessage(data: Buffer) {
    const cmd = data.readInt16BE(0);
    if (cmd == Cmd.Shutdown) {
      this.shutdown();
      return;
    }
    if (cmd == Cmd.Shutdown2) {
      this.close();
      return;
    }
  }


  onSend(cb?: () => void): void {
    if (cb) {
      cb();
    }

    if (this.state == State.Shutdown && this.ws.bufferedAmount == 0) {
      this.close();
      return;
    }

    this.isDrain(true);
  }

  isDrain(emit: boolean) {
    const curState = this.ws.bufferedAmount < WebSocketBufferSize;
    if (curState != this.writable) {
      if (this.writable == true) {
        this.group.writableLinks -= 1;
        this.writable = false;
      } else {
        this.group!.writableLinks += 1;
        this.writable = true;
        if (emit && this.group !== undefined)  {
          this.group.emit("linkdrain", this);
        }
      }
    }
  }
}
