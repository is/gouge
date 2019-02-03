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
    this.state = ChannelState.INIT;
  }

  setup() {
    if (this.mode == EndpointMode.IN) {
      this.serverStart();
    } else {
      this.agentStart();
    }
  }

  agentStart() {
    // TODO:empty;
  }

  serverStart() {
    // TODO:empty;
  }
}
