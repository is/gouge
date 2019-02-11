import WebSocket from "ws";
import { SuperLink } from "./superlink";
import { GougeConfig, readConfig } from "./config";
import { Link } from "./link";
import { parseNego } from "./packet";
import { DEFAULT_CF, D } from "./constants";

const debug = D("server");

const REVISION = "0.1r1";

class GougeServer {
  c: GougeConfig;
  links!: SuperLink;
  server!: WebSocket.Server;

  constructor(cf: GougeConfig) {
    this.c = cf;
  }

  negotiate(l: Link, message: Buffer) {
    const nego = parseNego(message);
    l.slotNumber = nego.slotNumber;
    this.links.add(l);
  }

  onConnection(ws: WebSocket) {
    const link = new Link(ws);
    ws.once("message", (message: Buffer) => {
      this.negotiate(link, message);
    });
    ws.on("close", link.onClose.bind(link));
  }

  run() {
    debug("revision:%s, listen:%d", REVISION, this.c.port);
    this.links = new SuperLink(this.c.link);
    this.links.serverStart();
    this.server = new WebSocket.Server({port: this.c.port});
    this.server.on("connection", (ws: WebSocket) => {
      this.onConnection(ws);
    });
  }
}

const cf = readConfig(DEFAULT_CF);

const server = new GougeServer(cf);
server.run();
