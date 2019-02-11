import { TunnelConfig } from "./config";
import { SuperLink } from "./superlink";
import net from "net";
import { D } from "./constants";

const debug = D("tunnel");

export enum Mode {
  UNSET = 0,
  IN = 1,
  OUT = 2,
  L = 3,
  R = 4,
}


export class Tunnel {
  c: TunnelConfig;
  mode: Mode = Mode.UNSET;

  id: number = -1;
  link!: SuperLink;
  options!: any;
  server!: net.Server;
  serverSocket!: net.Socket;

  constructor(cf: TunnelConfig) {
    this.c = cf;
    this.id = cf.id;
  }

  start(link: SuperLink) {
    this.link = link;
    const mode = this.c.mode + this.link.mode;

    switch (mode) {
      case "LC": {
        this.mode = Mode.IN;
        this.options = this.c.local;
        break;
      }
      case "RC": {
        this.mode = Mode.OUT;
        this.options = this.c.local;
        break;
      }
      case "LS": {
        this.mode = Mode.OUT;
        this.options = this.c.remote;
        break;
      }
      case "RS": {
        this.mode = Mode.IN;
        this.options = this.c.remote;
        break;
      }
    }

    if (this.mode == Mode.IN) {
      this.startServer();
    } else {
      this.startClient();
    }
  }

  getSocketOption(): any {
    if (this.link.mode == "S") {
      return this.c.remote;
    } else {
      return this.c.local;
    }
  }

  startClient() {
    // TODO:TBD
  }

  startServer() {
    const s = net.createServer();
    s.on("connection", this.onConnection.bind(this));
    s.listen(this.options);
    debug("start server...", s);
    this.server = s;
  }


  onConnection(s: net.Socket) {
    const ch = this.link.newChannel(this, s);
    ch.start();
  }

  shutdown() {
    // TODO:TBD
  }
}
