import { Hyperlink } from "./hyperlink";
import WebSocket from "ws";


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
  group?: Hyperlink;
  createTime!: number;

  id: number;
  serial: number;

  writable: boolean;
  writeCb?: (err?: Error) => void;

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.state = State.Init;
    this.id = -1;
    this.serial = -1;
    this.writable = true;
  }

  start() {
    this.createTime = Date.now();
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

  doClose() {
    this.detach();
    this.ws.close(1000);
    this.state = State.Closed;
  }

  onClose(ws: WebSocket) {
    if (this.isClosed()) {
      return;
    }
    this.detach();
    this.state = State.Closed;
  }

  send(data: Data, cb?: (err?: Error) => void): boolean {
    this.writable = false;
    this.writeCb = cb;
    this.ws.send(data, {}, this.onSend);
    return true;
  }

  onSend(err?: Error): void {
    this.writable = true;
    if (this.writeCb) {
      this.writeCb(err);
    }
  }
}