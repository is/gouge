import ws from "ws";
import { WebSocketEx } from "./websocket_ex";
import { Packet } from "./packet";
const RING_SIZE = 512;
const SEQ_SIZE = 16384;

export interface Config {
  linkCode: string;
  lifecycle: number;
  parallel: number;
}


export const defaultConfig: Config = {
  linkCode: "HALOWORD",
  lifecycle: 56,
  parallel: 2
};


export class Hyperlink {
  active: boolean;
  c: Config;
  sockets: Array<WebSocketEx>;
  ring: Array<Packet>;

  constructor(config: Config) {
    this.active = false;
    this.c = config;
    this.sockets = new Array(this.c.parallel);
    this.ring = new Array(RING_SIZE);
  }
}
