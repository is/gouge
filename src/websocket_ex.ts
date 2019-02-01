import ws from "ws";
import { Hyperlink } from "./hyperlink";


export interface WebSocketEx extends ws {
  hyperlink: Hyperlink;
  state: number; // state mode
  id: number; // position in hyperlink channels
  createTime: number;
}
