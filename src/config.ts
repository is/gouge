import { Config as LinkConfig } from "./superlink";
import { readFileSync } from "fs";
import yaml from "js-yaml";

export interface GougeConfig {
  port: number;
  link: LinkConfig;
}

export function readConfig(fn: string): GougeConfig {
  if (fn.endsWith(".yaml") || fn.endsWith(".yml")) {
    return yaml.safeLoad(readFileSync(fn, "utf8"));
  }
  return JSON.parse(readFileSync(fn).toString("utf8"));
}