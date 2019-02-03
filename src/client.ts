import { SuperLink } from "./superlink";
import { GougeConfig, readConfig } from "./config";

class GougeClient {
  c: GougeConfig;
  link!: SuperLink;

  constructor(c: GougeConfig) {
    this.c = c;
  }
}

const c = readConfig("cf/g0.json");
console.log(c);