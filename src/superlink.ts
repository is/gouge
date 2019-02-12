import { Socket } from "net";
import CircularBuffer from "circularbuffer";

import { SuperlinkConfig } from "./config";
import { Link, Data } from "./link";
import { Builder as B, Parser as P, PLEN, Type } from "./packet";
import { Tunnel } from "./tunnel";
import { Channel } from "./channel";
import { D, SUPERLINK_OUT_QUEUE_SIZE, Code } from "./constants";


const debug = D("superlink");
const debug2 = D("superlink-2");

enum Mode {
  S = "S",
  C = "C"
}

interface SendOp {
  data: Data;
  cb?: () => void;
}

export class Superlink {
  // active: boolean = false;
  mode: string;
  c: SuperlinkConfig;

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

  tunnels: Map<number, Tunnel>;
  channels: Array<Channel>;
  chIndex: number;
  minChid: number;
  maxChid: number;

  constructor(config: SuperlinkConfig) {
    this.c = config;
    this.mode = Mode.S;
    this.links = new Array(this.c.size);
    this.outQueue = new CircularBuffer<SendOp>(SUPERLINK_OUT_QUEUE_SIZE);
    this.cur = Date.now();
    this.lastCur = 0;
    this.newLinkPeriod = Math.floor(this.c.lifecycle / this.c.size);
    this.tunnels = new Map();
    this.channels = new Array<Channel>(this.c.channelSize);

    this.minChid = Math.floor(this.c.channelSize / 2);
    this.maxChid = this.c.channelSize;
    this.chIndex = this.minChid;
  }

  start(mode: String) {
    if (mode == Mode.C) {
      this.clientStart();
    } else {
      this.serverStart();
    }
  }


  serverStart() {
    this.tick();
    this.setupTunnels();
    setInterval(this.run, 500, this);
  }

  clientStart(target?: string) {
    if (target) {
      this.c.target = target;
    }
    debug("connect target:%s", this.c.target);
    // this.active = true;
    this.mode = Mode.C;
    this.maxChid = this.minChid;
    this.minChid = 0;
    this.chIndex = 0;
    this.tick();
    this.setupTunnels();
    setInterval(this.run, 500, this);
  }

  setupTunnels() {
    for (const tc of this.c.tunnels) {
      debug("superlink.setup.tunnel", tc);
      const t = new Tunnel(tc);
      this.tunnels.set(t.id, t);
      t.start(this);
    }
  }


  run(self: Superlink) {
    self.tick();
  }

  tick() {
    this.lastCur = this.cur;
    this.cur = Date.now();

    const _size = this.c.size;
    // if active
    if (this.mode == Mode.C) {
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
    /*
    if (this.activeLinks > 0) {
      this.sendSomething();
    }
    */
  }

  sendSomething() {
    for (let i = 0; i < 30000; ++i) {
      if (!this.send(B.dummyData(i, 1024))) {
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
    link.ws.send(B.nego(this.c.code, link.slotNumber));
    link.attach(this);
  }

  newChannel(t: Tunnel, s: Socket): Channel {
    // TODO check channel table full.
    while (true) {
      if (this.channels[this.chIndex] === undefined) {
        break;
      }
      this.chIndex += 1;
      if (this.chIndex == this.maxChid) {
        this.chIndex = this.minChid;
      }
    }

    const ch = new Channel({
      id: this.chIndex,
      link: this,
      tunnel: t,
      socket: s,
    });

    this.channels[this.chIndex] = ch;
    this.chIndex += 1;
    if (this.chIndex == this.maxChid) {
      this.chIndex = this.minChid;
    }
      this.chIndex += 1;
      if (this.chIndex == this.maxChid) {
        this.chIndex = this.minChid;
      }

    return ch;
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
    this.inBytes += PLEN(data);
  }

  metricOut(data: Data) {
    this.outPackets ++;
    this.outBytes += PLEN(data);
  }

  onLinkDrain(l: Link) {
    this.outIndex = l.slotNumber;
    if (this.outQueue.size > 0) {
      debug("on link drain: %d %d,  %d %d", l.slotNumber, l.serial, this.writableLinks, this.outQueue.size);
      this.flushOut();
    }
  }

  onMessage(l: Link, cmd: number, data: Buffer) {
    debug("on-message %d %s %d", l.slotNumber, Type[cmd], data.length);
    switch (cmd) {
      case Type.Open: {
        this.onMessage_Open(data);
        break;
      }
      case Type.Open2: {
        this.onMessage_Open2(data);
        break;
      }
      case Type.Data: {
        this.onMessage_Data(data);
        break;
      }
      case Type.Ack: {
        this.onMessage_Ack(data);
        break;
      }
      case Type.Close: {
        this.onMessage_Close(data);
        break;
      }

      case Type.Close2: {
        this.onMessage_Close2(data);
        break;
      }
    }
  }

  onMessage_Open(data: Buffer) {
    const p = P.open(data);
    debug2("open - %s %s %s", p.channel, p.tunnel);
    const ch = new Channel({id: p.channel, link: this, tunnel: this.tunnels.get(p.tunnel)!});
    this.channels[p.channel] = ch;
    ch.start();
  }

  onMessage_Open2(data: Buffer) {
    const p = P.open2(data);
    this.channels[p.channel].onConnected();
  }

  onMessage_Data(data: Buffer) {
    const p = P.data(data);
    const ch = this.getChannel(p.channel);
    if (ch === undefined) {
      return;
    }
    ch.onTunnel_MessageIn(p.seq, p);
  }

  onMessage_Ack(data: Buffer) {
    const p = P.ack(data);
    const ch = this.getChannel(p.channel);
    if (ch === undefined) {
      return;
    }
    ch.onTunnel_Ack(p);
  }

  onMessage_Close(data: Buffer) {
    const p = P.close(data);
    const ch = this.getChannel(p.channel);
    if (ch === undefined) {
      return;
    }
    ch.onTunnel_MessageIn(p.seq, p);
  }

  onMessage_Close2(data: Buffer) {
    const p = P.close2(data);
    const ch = this.channels[p.channel];
    if (ch === undefined) {
      return;
    }

    ch.onTunnel_Close2(p);
  }

  getChannel(id: number) {
    const ch = this.channels[id];
    if (ch === undefined) {
      this.send(B.close2(id, Code.NO_SUCH_CHANNEL, id));
    }
    return ch;
  }
}
