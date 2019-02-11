import debug from "debug";

export const SEQ_SIZE = 16384;
export const CHANNEL_SIZE = 0x1000;
export const CHANNEL_HALF_SIZE = 0x800;

export const CHANNEL_MAX_BUFFER_SIZE = 0x400 * 512;
export const SUPERLINK_OUT_QUEUE_SIZE = 0x400;

export const NEGOTIATE_SIGN = "1024204840968192";
export const DEFAULT_CF = "cf/g0.yml";

export function D(namespace: string): debug.IDebugger {
  return debug(namespace);
}


export enum Code {
  NO_SUCH_CHANNEL = 3000,
}