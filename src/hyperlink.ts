import CircularBuffer from "circularbuffer";
import { Link, Data } from "./link";
import P from "./packet";

const OutQueueSize = 32;

type IOCB = (err?: Error) => void;

export interface Config {
  linkCode: string;
  lifecycle: number;
  parallel: number;
}

export const defaultConfig: Config = {
  linkCode: "HALOWORD20190101",
  lifecycle: 56,
  parallel: 2
};

interface SendOp {
  data: Data;
  cb?: IOCB;
}

export class Hyperlink {
  active: boolean;
  c: Config;
  links: Array<Link>;
  writePos: number;
  outQueue: CircularBuffer<SendOp>;

  constructor(config: Config) {
    this.active = false;
    this.c = config;
    this.links = new Array(this.c.parallel);
    this.writePos = -1;
    this.outQueue = new CircularBuffer<SendOp>(OutQueueSize);
  }

  add(l: Link) {
    this.resetLink(l.id);
    l.group = this;
    const id = l.id;
    l.ws.send(P.nego(this.c.linkCode, l.id));
    l.start();
  }

  detach(l: Link) {
    if (this.links[l.id] == l) {
      delete this.links[l.id];
    }
    delete l.group;
  }

  resetLink(id: number) {
    const l = this.links[id];
    if (id == undefined) {
      return;
    }

    if (!l.isClosed()) {
      l.doClose();
    }
    delete this.links[id];
  }

  send(data: Data, cb?: IOCB): boolean {
    for (let i = 0; i < this.c.parallel; i++) {
      this.writePos += 1;
      if (this.writePos == this.c.parallel) {
        this.writePos = 0;
      }

      const l = this.links[this.writePos];
      if (l != undefined && l.writable) {
        return l.send(data, cb);
      }
    }

    if (this.outQueue.size == OutQueueSize) {
      if (cb) {
        const e = new Error("BUFFER_FULL");
        cb(e);
      }
      return false;
    }

    this.outQueue.enq({data: data, cb: cb});
    return false;
  }
}
