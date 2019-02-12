import { Superlink } from "./superlink";
import { GougeConfig, readConfig } from "./config";
import { DEFAULT_CF } from "./constants";

class GougeClient {
  c: GougeConfig;
  link!: Superlink;

  constructor(c: GougeConfig) {
    this.c = c;
    this.link = new Superlink(c.link);
  }

  fire() {
    this.link.clientStart();
  }
}

const cf = readConfig(DEFAULT_CF);
const client = new GougeClient(cf);
client.fire();


