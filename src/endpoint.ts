import { SuperLink } from "./superlink";

export enum Mode {
  UNSET = 0,
  IN = 1,
  OUT = 2,
  L = 3,
  R = 4,
}

export interface Config {
  mode: string;
  local: any;
  remote: any;
}


export class Endpoint {
  mode: Mode = Mode.UNSET;
  id: number = -1;
  link!: SuperLink;
  options!: any;

  construct(mode: Mode, options: any) {
    this.mode = mode;
    this.options = options;
  }

  setup(link: SuperLink) {
    // TODO:empty
  }

  startAgent() {
    // TODO:empty
  }

  startServer() {
    // TODO:empty
  }

  shutdown() {
    // TODO:empty
  }
}
