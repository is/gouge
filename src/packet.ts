export interface Packet {
  message: Buffer|Buffer[];
  head: number;
  payload(): Buffer;
}

class InPacket implements Packet {
  message: Buffer;
  head: number;
  _payload!: Buffer;

  constructor(buf: Buffer) {
    this.message = buf;
    this.head = buf.readUInt16BE(0);
  }
  payload(): Buffer {
    if (this._payload == undefined) {
      this._payload = this.message.slice(2);
    }
    return this._payload;
  }
}

export function NewInPacket(buffer: Buffer): Packet {
  return new InPacket(buffer);
}

class OutPacket implements Packet {
  message: Buffer[];
  head: number;

  constructor(head: number, buf: Buffer) {
    this.message = [Buffer.alloc(2), buf];
    this.message[0].writeInt16BE(head, 0);
    this.head = head;
  }

  payload(): Buffer {
    return this.message[1];
  }
}

export function NewOutPacket(head: number, buffer: Buffer): Packet {
  return new OutPacket(head, buffer);
}
