import WebSocket from "ws";
import { Hyperlink, defaultConfig as defaultHyperlinkConfig } from "./hyperlink";
import { GougeConfig } from "./config";
import { SmartBuffer } from "smart-buffer";
import { Link } from "./link";

type Data = WebSocket.Data;


class GougeServer {
  c: GougeConfig;
  hyper!: Hyperlink;
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

    l.id = reader.readInt32BE();
    l.serial = this.socketSerial;
    this.socketSerial++;
    this.hyper.add(l);
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
    this.hyper = new Hyperlink(this.c.hyperlink);
    this.server = new WebSocket.Server({port: this.c.port});
    this.server.on("connection", this.onConnection);
  }
}


const C: GougeConfig = {
  port: 3000,
  hyperlink: defaultHyperlinkConfig,
};


const server = new GougeServer(C);
server.run();
