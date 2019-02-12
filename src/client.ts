import { Superlink } from "./superlink";
import { GougeSimpleConfig, readConfig } from "./config";
import { DEFAULT_CF } from "./constants";

class GougeClient {
  c: GougeSimpleConfig;
  link!: Superlink;

  constructor(c: GougeSimpleConfig) {
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


