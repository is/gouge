import ws from "ws";
import { SmartBuffer } from "smart-buffer";
import { NEGOTIATE_SIGN } from "./constants";

export interface Packet {
  data(): Buffer|Buffer[];
}

export enum Type {
  Base = 16384,
  Nego = 16385,
  Ack,
  Shutdown,
  Shutdown2,
  DummyData = Base + 2048 + 1,
}

export interface Nego {
  cmd: Type;
  sign: string;
  linkId: string;
  slotNumber: number;
}

export function packetLength(p: ws.Data) {
  if (p instanceof Buffer) {
    return p.length;
  }

  if (p instanceof Array) {
    let sum = 0;
    const _p = p as Array<Buffer>;
    for (const b of _p) {
      sum += b.length;
    }
    return sum;
  }

  return 0;
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
    slotNumber: reader.readInt32BE(),
  };
}

function buildHeadOnly(t: Type): Buffer {
  const buf = Buffer.alloc(2);
  buf.writeInt16BE(t, 0);
  return buf;
}

export function buildShutdown(): Buffer {
  return buildHeadOnly(Type.Shutdown);
}

function buildShutdown2(): Buffer {
  return buildHeadOnly(Type.Shutdown2);
}

function buildDummyData(id: number, size: number): Buffer {
  const buf = Buffer.alloc(size + 8);
  buf.writeInt16BE(Type.DummyData, 0);
  buf.writeInt16BE(id, 2);
  buf.writeInt32BE(size, 4);
  return buf;
}

const Builder = {
  nego: BuildNego,
  shutdown: buildShutdown,
  shutdown2: buildShutdown2,
  dummyData: buildDummyData,
};

export default Builder;
