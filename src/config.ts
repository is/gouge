import { readFileSync } from "fs";
import yaml from "js-yaml";

export interface SuperlinkConfig {
  code: string;
  lifecycle: number;
  size: number;
  target?: string;
  channelSize: number;
  tunnels: Array<TunnelConfig>;
}

export interface TunnelConfig {
  mode: string;
  id: number;
  local: any;
  remote: any;
  address?: string;
}


export interface GougeConfig {
  port: number;
  link: SuperlinkConfig;
}




export function readConfig(fn: string): GougeConfig {
  if (fn.endsWith(".yaml") || fn.endsWith(".yml")) {
    return yaml.safeLoad(readFileSync(fn, "utf8"));
  }
  return JSON.parse(readFileSync(fn).toString("utf8"));
}