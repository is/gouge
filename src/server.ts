import WebSocket from "ws";
import { SuperLink, defaultConfig as defaultLinkConfig } from "./superlink";
import { GougeConfig } from "./config";
import { SmartBuffer } from "smart-buffer";
import { Link } from "./link";

class GougeServer {
  c: GougeConfig;
  links!: SuperLink;
  server!: WebSocket.Server;
  socketSerial: number;

  constructor(cf: GougeConfig) {
    this.c = cf;
    this.socketSerial = 0;
  }

  negotiate(l: Link, message: Buffer) {
    const reader = SmartBuffer.fromBuffer(message);
    reader.readInt16BE();
    reader.readBuffer(32);
    reader.readBuffer(32);

    l.slotNumber = reader.readInt32BE();
    l.linkSerial = this.socketSerial;
    this.socketSerial++;
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
    this.server.on("connection", this.onConnection);
  }
}

const C: GougeConfig = {
  port: 3000,
  link: defaultLinkConfig,
};

const server = new GougeServer(C);
server.run();
