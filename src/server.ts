import ws from "ws";
import { Hyperlink, defaultConfig as defaultHyperlinkConfig } from "./hyperlink";
import { WebSocketEx } from "./websocket_ex";
import { GougeConfig } from "./config";

type Data = ws.Data;

class GougeServer {
  c: GougeConfig;
  hyper!: Hyperlink;
  server!: ws.Server;

  constructor(cf: GougeConfig) {
    this.c = cf;
  }

  run() {
    console.log("listen on: %d", this.c.port);
    this.hyper = new Hyperlink(this.c.hyperlink);
    this.server = new ws.Server({port: this.c.port});
    this.server.on("connection", (ws: WebSocketEx) => {
      ws.on("message", (message: Data) => {
        console.log("receiver", message);
      });
      ws.on("close", (ws: WebSocketEx) => {
        console.log("closed");
      });
      ws.send("something");
    });
  }
}


const C: GougeConfig = {
  port: 3000,
  hyperlink: defaultHyperlinkConfig,
};


const server = new GougeServer(C);
server.run();
