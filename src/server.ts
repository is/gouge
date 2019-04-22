import WebSocket from "ws";
import { Superlink } from "./superlink";
import { GougeSimpleConfig, readConfig } from "./config";
import { Link } from "./link";
import { Parser as P } from "./packet";
import { DEFAULT_CF, D, REVISION } from "./constants";

const debug = D("server");


class GougeServer {
  c: GougeSimpleConfig;
  link!: Superlink;
  server!: WebSocket.Server;

  constructor(cf: GougeSimpleConfig) {
    this.c = cf;
  }

  negotiate(l: Link, message: Buffer) {
    const nego = P.nego(message);
    l.slotNumber = nego.slotNumber;
    this.link.add(l);
  }

  onConnection(ws: WebSocket) {
    const link = new Link(ws);
    ws.once("message", (message: Buffer) => {
      this.negotiate(link, message);
    });
    ws.on("close", link.onClose.bind(link));
  }

  run() {
    debug("revision:%s, listen:%d", REVISION, this.c.listen);
    this.link = new Superlink(this.c.link);
    this.link.serverStart();
    this.server = new WebSocket.Server({port: this.c.listen});
    this.server.on("connection", (ws: WebSocket) => {
      this.onConnection(ws);
    });
  }
}

const cf = readConfig(DEFAULT_CF);

const server = new GougeServer(cf);
server.run();
