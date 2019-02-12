import { readFileSync } from "fs";
import yaml from "js-yaml";

export interface SuperlinkConfig {
  label: string;
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


export interface GougeSimpleConfig {
  listen: number;
  link: SuperlinkConfig;
}

export interface GougeConfig {
  revision: string;
  node: string;
  listen: any;
  links: Array<SuperlinkConfig>;
}

export function readConfig(fn: string): any {
  if (fn.endsWith(".yaml") || fn.endsWith(".yml")) {
    return yaml.safeLoad(readFileSync(fn, "utf8"));
  }
  return JSON.parse(readFileSync(fn).toString("utf8"));
}

