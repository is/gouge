import { Config as LinkConfig } from "./superlink";
import { readFileSync } from "fs";

export interface GougeConfig {
  port: number;
  link: LinkConfig;
}


export function readConfig(fn: string): GougeConfig {
  return JSON.parse(readFileSync(fn).toString("utf8"));
}