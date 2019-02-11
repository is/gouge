import { SuperLink } from "./superlink";
import { GougeConfig, readConfig } from "./config";
import { DEFAULT_CF } from "./constants";

class GougeClient {
  c: GougeConfig;
  link!: SuperLink;

  constructor(c: GougeConfig) {
    this.c = c;
    this.link = new SuperLink(c.link);
  }

  fire() {
    this.link.clientStart();
  }
}

const cf = readConfig(DEFAULT_CF);
const client = new GougeClient(cf);
client.fire();


