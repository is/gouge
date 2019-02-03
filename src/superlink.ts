import CircularBuffer from "circularbuffer";
import { Link, Data } from "./link";
import Builder from "./packet";
import { EventEmitter } from "events";

const OutQueueSize = 64;
const OutQueuePauseSize = 48;


export interface Config {
  code: string;
  lifecycle: number;
  size: number;
}

export const defaultConfig: Config = {
  code: "HALOWORD20190101",
  lifecycle: 56,
  size: 2
};

interface SendOp {
  data: Data;
  cb?: () => void;
}

export class SuperLink  extends EventEmitter {
  active: boolean;
  c: Config;
  links: Array<Link>;
  outIndex: number;
  writableLinks: number;
  outQueue: CircularBuffer<SendOp>;

  flushOutNextTipFlag: boolean;

  constructor(config: Config) {
    super();
    this.active = false;
    this.c = config;
    this.links = new Array(this.c.size);
    this.writableLinks = 0;
    this.outIndex = -1;
    this.outQueue = new CircularBuffer<SendOp>(OutQueueSize);
    this.flushOutNextTipFlag = false;

    this.on("linkdrain", this.onLinkDrain);
  }

  add(link: Link) {
    this.resetLink(link.slotNumber);
    this.links[link.slotNumber] = link;
    link.ws.send(Builder.nego(this.c.code, link.slotNumber));
    link.attach(this);
  }

  detach(l: Link) {
    if (this.links[l.slotNumber] == l) {
      delete this.links[l.slotNumber];
      if (l.writable && l.isReady()) {
        this.writableLinks -= 1;
      }
    }
  }

  resetLink(id: number) {
    const l = this.links[id];
    if (id == undefined) {
      return;
    }

    if (!l.isClosed()) {
      l.close();
    }
    delete this.links[id];
  }

  write(data: Data, cb?: () => void): boolean {
    this.outQueue.enq({data: data, cb: cb});
    this.flushOut();
    return this.outQueue.size == 0;
  }

  nextOutLink(): Link | undefined {
    const _size = this.c.size;
    for (let i = 0; i < this.c.size; ++i) {
      this.outIndex += 1;
      if (this.outIndex == _size) {
        this.outIndex = 0;
      }
      const l = this.links[this.outIndex];
      if (l.isReady() && l.writable) {
        return l;
      }
    }
    return undefined;
  }

  flushOut() {
    while (this.writableLinks > 0 && this.outQueue.size > 0) {
      const link = this.nextOutLink();
      if (link === undefined) {
        return;
      }
      const op = this.outQueue.deq()!;
      link.send(op.data, op.cb);
    }
  }

  onLinkDrain(l: Link) {
    this.outIndex = l.slotNumber;
    this.flushOut();
  }
}
