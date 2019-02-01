import ws from "ws";

export interface Config {
  linkCode: string;
  lifecycle: number;
  parallel: number;
};

export const defaultConfig:Config = {
  linkCode: "HALOWORD",
  lifecycle: 56,
  parallel: 2
};


export class Hyperlink {
  active: boolean;
  c: Config;
  streams: Array<ws>

  constructor(config:Config) {
    this.active = false;
    this.c = config;
    this.streams = new Array(this.c.parallel);
  }
}
