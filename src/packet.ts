import { SmartBuffer } from "smart-buffer";
import { NEGOTIATE_SIGN } from "./constants";

export interface Packet {
  data(): Buffer|Buffer[];
}

export enum Type {
  Nego = 16385,
  Ack,
  Shutdown,
}

export interface Nego {
  cmd: Type;
  sign: string;
  linkId: string;
  socketId: number;
}


export function BuildNego(sign: string, id: number): Buffer {
  const writer = new SmartBuffer({size: 2 + 16 + 16 + 4});
  writer.writeInt16BE(Type.Nego);
  writer.writeString(NEGOTIATE_SIGN.substring(0, 16));
  writer.writeString(sign.substring(0, 16));
  writer.writeInt32BE(id);
  return writer.toBuffer();
}


export function parseNego(buf: Buffer): Nego {
  const reader = SmartBuffer.fromBuffer(buf);
  return {
    cmd: reader.readUInt16BE(),
    sign: reader.readString(16),
    linkId: reader.readString(16),
    socketId: reader.readInt32BE(),
  };
}

function BuildHeadOnly(t: Type): Buffer {
  const buf = Buffer.alloc(2);
  buf.writeInt16BE(t, 0);
  return buf;
}


export function BuildShutdown(): Buffer {
  return BuildHeadOnly(Type.Shutdown);
}


const P = {
  nego: BuildNego,
  shutdown: BuildShutdown,
};

export default P;