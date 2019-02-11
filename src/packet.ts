import ws from "ws";
import { SmartBuffer } from "smart-buffer";
import { NEGOTIATE_SIGN } from "./constants";

export interface Packet {
  data(): Buffer|Buffer[];
}

export enum Type {
  Base = 16384,
  Nego = 16385,
  Open,
  Open2,
  Ack,
  Data,
  Close,
  Close2,
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

export interface Open {
  cmd: Type;
  tunnel: number;
  channel: number;
}

export interface Open2 {
  cmd: Type;
  channel: number;
}

export interface Ack {
  cmd: Type;
  seq: number;
  channel: number;
  size: number;
}

export interface Data {
  cmd: Type;
  seq: number;
  channel: number;
  payload: Buffer;
  origin: Buffer;
}

export interface Close {
  cmd: Type;
  seq: number;
  channel: number;
}





export function PLEN(p: ws.Data) {
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

export function buildNego(sign: string, id: number): Buffer {
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

export function buildOpen(tunnelId: number, channelId: number): Buffer {
  const writer = new SmartBuffer();
  writer.writeInt16BE(Type.Open);
  writer.writeInt32BE(tunnelId);
  writer.writeInt32BE(channelId);
  return writer.toBuffer();
}

export function parseOpen(b: Buffer): Open {
  const r = SmartBuffer.fromBuffer(b);
  return {
    cmd: r.readInt16BE(),
    tunnel: r.readInt32BE(),
    channel: r.readInt32BE(),
  };
}


export function buildOpen2(channelId: number): Buffer {
  const writer = new SmartBuffer();
  writer.writeInt16BE(Type.Open2);
  writer.writeInt32BE(channelId);
  return writer.toBuffer();
}

export function parseOpen2(b: Buffer): Open2 {
  const r = SmartBuffer.fromBuffer(b);
  return {
    cmd: r.readInt16BE(),
    channel: r.readInt32BE(),
  };
}


export function buildData(ch: number, serial: number, data: Buffer): Array<Buffer> {
  const w = SmartBuffer.fromBuffer(Buffer.allocUnsafe(8));
  w.writeInt16BE(Type.Data);
  w.writeInt16BE(serial);
  w.writeInt32BE(ch);
  return [w.toBuffer(), data];
}

export function parseData(data: Buffer): Data {
  const r = SmartBuffer.fromBuffer(data);
  return {
    cmd: r.readInt16BE(),
    seq: r.readInt16BE(),
    channel: r.readUInt32BE(),
    payload: data.slice(r.readOffset),
    origin: data,
  };
}

export function buildAck(channel: number, seq: number, size: number): Buffer {
  const w = new SmartBuffer();
  w.writeInt16BE(Type.Ack);
  w.writeInt16BE(seq);
  w.writeInt32BE(channel);
  w.writeInt32BE(size);
  return w.toBuffer();
}

export function parseAck(data: Buffer): Ack {
  const r = SmartBuffer.fromBuffer(data);
  return {
    cmd: r.readInt16BE(),
    seq: r.readInt16BE(),
    channel: r.readInt32BE(),
    size: r.readInt32BE(),
  };
}

export function buildClose(channel: number, seq: number): Buffer {
  const w = new SmartBuffer({size: 8});
  w.writeInt16BE(Type.Close);
  w.writeInt16BE(seq);
  w.writeInt32BE(channel);
  return w.toBuffer();
}

export function parseClose(data: Buffer): Close {
  const r = SmartBuffer.fromBuffer(data);
  return {
    cmd: r.readInt16BE(),
    seq: r.readInt16BE(),
    channel: r.readInt32BE()
  };
}


export interface Close2 {
  cmd: Type;
  channel: number;
  code: number;
  where: number;
}

export function buildClose2(channel: number, code: number, where: number): Buffer {
  const w = new SmartBuffer();
  w.writeInt16BE(Type.Close2);
  w.writeInt32BE(channel);
  w.writeInt32BE(code);
  w.writeInt32BE(where);
  return w.toBuffer();
}

export function parseClose2(data: Buffer): Close2 {
  const r = SmartBuffer.fromBuffer(data);
  return {
    cmd: r.readInt16BE(),
    channel: r.readInt32BE(),
    code: r.readInt32BE(),
    where: r.readInt32BE(),
  };
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

export const Builder = {
  nego: buildNego,
  open: buildOpen,
  open2: buildOpen2,
  data: buildData,
  ack: buildAck,
  close: buildClose,
  close2: buildClose2,
  shutdown: buildShutdown,
  shutdown2: buildShutdown2,
  dummyData: buildDummyData,
};

export const Parser = {
  open: parseOpen,
  open2: parseOpen2,
  data: parseData,
  ack: parseAck,
  close: parseClose,
  close2: parseClose2,
};

// export default Builder;
