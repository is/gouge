import debug from "debug";

export const SEQ_SIZE = 16384;
export const NEGOTIATE_SIGN = "1024204840968192";
export const DEFAULT_CF = "cf/g0.yml";

export function D(namespace: string): debug.IDebugger {
  return debug(namespace);
}