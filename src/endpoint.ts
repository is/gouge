import { SuperLink } from "./superlink";
import net from "net";

export enum Mode {
  UNSET = 0,
  IN = 1,
  OUT = 2,
  L = 3,
  R = 4,
}

export interface Config {
  mode: string;
  id: number;
  local: any;
  remote: any;
}

export class Endpoint {
  c: Config;
  mode: Mode = Mode.UNSET;
  id: number = -1;
  link!: SuperLink;
  options!: any;
  server!: net.Server;
  socket!: net.Socket;

  constructor(cf: Config) {
    this.c = cf;
    this.id = cf.id;
  }

  setup(link: SuperLink, mode: string) {
    this.link = link;

    const mark = mode + this.c.mode;
    switch (mark) {
      case "LL": {
        this.mode = Mode.IN;
        this.options = this.c.local;
      }
      case "RL": {
        this.mode = Mode.OUT;
        this.options = this.c.remote;
      }
      case "LR": {
        this.mode = Mode.OUT;
        this.options = this.c.local;
      }
      case "RR": {
        this.mode = Mode.IN;
        this.options = this.c.remote;
      }
    }

    if (this.mode == Mode.IN) {
      this.startServer();
    } else {
      this.startAgent();
    }
  }

  startAgent() {
    // TODO:empty
  }

  startServer() {
    // create server
    this.server = net.createServer(this.options, (socket: net.Socket) => {
      this.socket = socket;
    });
    // add callback hooks

    // TODO:empty
    // TODO:unfinished
  }

  shutdown() {
    // TODO:empty
  }
}
