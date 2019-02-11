import { SuperLink } from "./superlink";
import { Endpoint, Mode as EndpointMode } from "./endpoint";
import { Socket } from "net";

export enum ChannelState {
  INIT = 0,
  CONNECTING = 1,
  CONNECTED = 2,
  CLOSED = 3,
  ERROR = 4,
}

export interface Options {
  id: number;
  link: SuperLink;
  endpoint: Endpoint;
  socket?: Socket;
}


export class Channel {
  state: ChannelState = ChannelState.INIT;
  id: number = -1;
  mode: EndpointMode = EndpointMode.UNSET;
  link: SuperLink;
  endpoint: Endpoint;
  s!: Socket;

  constructor(opts: Options) {
    this.id = opts.id;
    this.link = opts.link;
    this.endpoint = opts.endpoint;
    this.mode = opts.endpoint.mode;

    if (opts.socket !== undefined) {
      this.socket = opts.socket;
    }

    this.state = ChannelState.INIT;
  }

  get socket(): Socket {
    return this.s;
  }

  set socket(s: Socket) {
    this.s = s;
  }

  start() {
    if (this.mode == EndpointMode.IN) {
      this.serverStart();
    } else {
      this.agentStart();
    }
  }

  agentStart() {
    // create socket
    // connect to target
    // TODO:empty;
  }

  serverStart() {
    // send connect command to peer
    // wait connected/error message
  }
}
