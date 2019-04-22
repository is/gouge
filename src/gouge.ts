import ws from "ws";

import { Superlink } from "./superlink";
import { Link } from "./link";
import { GougeConfig, readConfig } from "./config";
import { Parser as P } from "./packet";
import { D, REVISION,
  SUPERLINK_LABEL_SEPERATOR, CONFIG_PATH } from "./constants";

const debug = D("G");

class Gouge {
  c!: GougeConfig;
  node!: string;
  cs!: Map<string, Superlink>;
  ss!: Map<string, Superlink>;
  server!: ws.Server;

  constructor() {
  }

  createWsServer() {
    debug("listen on:", this.c.listen);
    // TODO - support all type of address
    // this.server = new ws.Server(this.c as ws.ServerOptions);
    this.server = new ws.Server({port: this.c.listen});
    this.server.on("connection", this.onConnection.bind(this));
  }

  init(cf: GougeConfig) {
    this.c = cf;
    this.node = cf.node;
    const cc = this.c.links.filter((i) => i.label.split(SUPERLINK_LABEL_SEPERATOR)[0] == this.node);
    const sc = this.c.links.filter((i) => i.label.split(SUPERLINK_LABEL_SEPERATOR)[1] == this.node);

    if (sc.length != 0) {
      this.createWsServer();
      this.ss = new Map();
      for (const c of sc) {
        const l = new Superlink(c);
        this.ss.set(c.code, l);
        l.start("S");
      }
    }

    if (cc.length != 0) {
      this.cs = new Map();
      for (const c of cc) {
        const l = new Superlink(c);
        this.cs.set(c.code, l);
        l.start("C");
      }
    }
  }

  startup(args: Array<string>) {
    let cfPath = CONFIG_PATH;
    if (args.length > 2) {
      cfPath = args[2];
    }
    debug("read config: %s", cfPath);
    const cf = <GougeConfig> readConfig(cfPath);
    this.init(cf);
  }

  onConnection(s: ws) {
    const link = new Link(s);
    s.once("message", (message: Buffer) => {
      this.negotiate(link, message);
    });
    s.on("close", link.onClose.bind(link));
  }

  negotiate(l: Link, message: Buffer) {
    const nego = P.nego(message);
    const code = nego.linkId;
    l.slotNumber = nego.slotNumber;
    const s = this.ss.get(code);
    if (s === undefined) {
      l.ws.close(1002);
    }
    s!.add(l);
  }
}

console.log("+ Gouge - %s", REVISION);
const g = new Gouge();
g.startup(process.argv);
