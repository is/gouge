import CircularBuffer from "circularbuffer";
import { Link, Data } from "./link";
import P, { packetLength } from "./packet";
import { Endpoint } from "./endpoint";
import { Channel } from "./channel";
import { D } from "./constants";

const OutQueueSize = 128;

const debug = D("superlink");

export interface Config {
  code: string;
  lifecycle: number;
  size: number;
  target?: string;
  channelSize: number;
}

interface SendOp {
  data: Data;
  cb?: () => void;
}

export class SuperLink {
  active: boolean = false;
  c: Config;

  links: Array<Link>;
  outIndex: number = -1;
  writableLinks: number = 0;
  activeLinks: number = 0;
  outQueue: CircularBuffer<SendOp>;

  cur: number;
  lastCur: number = 0;

  newLinkPeriod: number = 0;
  lastNewLink: number = 0;

  inPackets: number = 0;
  inBytes: number = 0;
  outPackets: number = 0;
  outBytes: number = 0;

  endpoints: Map<number, Endpoint>;
  channels: Array<Channel>;
  chIndex: number = 0;

  constructor(config: Config) {
    this.c = config;
    this.links = new Array(this.c.size);
    this.outQueue = new CircularBuffer<SendOp>(OutQueueSize);
    this.cur = Date.now();
    this.lastCur = 0;

    this.newLinkPeriod = Math.floor(this.c.lifecycle / this.c.size);

    this.endpoints = new Map();
    this.channels = new Array<Channel>()
  }

  serverActivate() {
    this.tick();
    setInterval(this.run, 500, this);
  }


  activate(target?: string) {
    if (target) {
      this.c.target = target;
    }
    debug("connect target:%s", this.c.target);
    this.active = true;
    this.tick();
    setInterval(this.run, 500, this);
  }

  run(self: SuperLink) {
    self.tick();
  }

  tick() {
    this.lastCur = this.cur;
    this.cur = Date.now();

    const _size = this.c.size;
    // if active
    if (this.active) {
      // find timeout link and closed
      for (let i = 0; i < _size; ++i) {
        if (this.links[i] === undefined) {
          continue;
        }
        if (this.links[i].isReady() && this.cur - this.links[i].createTime > this.c.lifecycle) {
          this.links[i].graceClose();
        }
      }

      // create new link
      if (this.cur - this.lastNewLink > this.newLinkPeriod) {
        let freeSlot = -1;

        for (let i = 0; i < _size; ++i) {
          const l = this.links[i];
          if (l === undefined) {
            freeSlot = i;
            break;
          }
        }

        if (freeSlot >= 0) {
          this.newActiveLink(freeSlot);
          this.lastNewLink = this.cur;
        }
      }
    }

    this.activeLinks = 0;
    this.writableLinks = 0;

    for (let i = 0; i < _size; ++i) {
      if (this.links[i] === undefined) {
        continue;
      }
      if (!this.links[i].isReady()) {
        continue;
      }
      this.activeLinks += 1;
      if (this.links[i].writable) {
        this.writableLinks += 1;
      }
    }
    if (this.activeLinks > 0) {
      this.sendSomething();
    }
  }

  sendSomething() {
    for (let i = 0; i < 30000; ++i) {
      if (!this.send(P.dummyData(i, 1024))) {
        break;
      }
    }
  }

  newActiveLink(slotNumber: number): void {
    const link = Link.create(slotNumber, this.c.target!);
    link.ws.once("open", () => {
      this.add(link);
    });
    link.ws.on("close", link.onClose.bind(link));
  }


  add(link: Link) {
    debug("add %d %d", link.slotNumber, link.serial);
    this.resetLink(link.slotNumber);
    this.links[link.slotNumber] = link;
    link.ws.send(P.nego(this.c.code, link.slotNumber));
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
    if (l === undefined) {
      return;
    }

    if (!l.isClosed()) {
      l.close();
    }
    delete this.links[id];
  }

  send(data: Data, cb?: () => void): boolean {
    this.metricOut(data);
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
      if (l !== undefined && l.isReady() && l.writable) {
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
      if (!link.writable) {
        this.writableLinks -= 1;
      }
    }
    if (this.writableLinks == 0) {
      debug("flashout writers blocked");
    }
  }

  onDummyData(link: Link, data: Buffer) {
    this.metricIn(data);
  }

  metricIn(data: Data) {
    this.inPackets ++;
    this.inBytes += packetLength(data);
  }

  metricOut(data: Data) {
    this.outPackets ++;
    this.outBytes += packetLength(data);
  }

  onLinkDrain(l: Link) {
    this.outIndex = l.slotNumber;
    if (this.outQueue.size > 0) {
      debug("on link drain: %d %d,  %d %d", l.slotNumber, l.serial, this.writableLinks, this.outQueue.size);
      this.flushOut();
    }
  }
}
