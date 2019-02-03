import WebSocket from "ws";
import { SuperLink } from "./superlink";
import { GougeConfig, readConfig } from "./config";
import { Link } from "./link";
import { parseNego } from "./packet";
import { DEFAULT_CF } from "./constants";

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
    console.log("listen on: %d", this.c.port);
    this.links = new SuperLink(this.c.link);
    this.server = new WebSocket.Server({port: this.c.port});
    this.server.on("connection", this.onConnection.bind(this));
  }
}

const cf = readConfig(DEFAULT_CF);

const server = new GougeServer(cf);
server.run();
