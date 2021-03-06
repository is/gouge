import fs from "fs";
import process from "process";
import { SuperlinkConfig, readConfig, GougeConfig } from "./config";
import { CONFIG_REPO_PATH, SUPERLINK_LABEL_SEPERATOR } from "./constants";
import yaml from "js-yaml";

const DV = {
  LINK_LIFECYCLE: 48000,
  LINK_SIZE: 4
};


interface NodeConfig {
  name: string;
  listen: any;
  target?: string;
}

interface Repository {
  revision: string;
  nodes: Array<NodeConfig>;
  links: Array<SuperlinkConfig>;
}

function buildNode(node: NodeConfig, big: Repository) {
  const o = {} as GougeConfig;
  const nodeName = node.name;

  o.revision = big.revision;
  o.node = node.name;
  o.listen = node.listen;

  o.links = big.links.filter(
    (s) => s.label.split(SUPERLINK_LABEL_SEPERATOR)
      .some((x) => x == node.name));
  o.links = o.links.map(x => ({...x}));

  let clink = 0;
  let ctunnel = 0;

  for (const l of o.links) {
    clink += 1;
    l.tunnels = l.tunnels.map(x => ({...x}));
    if (l.lifecycle === undefined) {
      l.lifecycle = DV.LINK_LIFECYCLE;
    }

    if (l.size == undefined) {
      l.size = DV.LINK_SIZE;
    }

    if (l.label.split(SUPERLINK_LABEL_SEPERATOR)[0] == nodeName) {
      if (l.target === undefined) {
        const remoteName = l.label.split(SUPERLINK_LABEL_SEPERATOR)[1];
        const n2 = big.nodes.filter((x) => x.name == remoteName)[0];
          l.target = n2.target;
      }
      for (const t of l.tunnels) {
        ctunnel += 1;
        if (t.remote !== undefined) {
          delete t.remote;
        }
      }
    } else {
      if (l.target) {
        delete l.target;
      }
      for (const t of l.tunnels) {
        ctunnel += 1;
        if (t.local !== undefined) {
          delete t.local;
        }
      }
    }
  }

  // console.log(o);
  const nodePath = `cfs/_/${nodeName}`;
  const cfPath = `${nodePath}/g.yml`;
  if (!fs.existsSync(nodePath)) {
    fs.mkdirSync(nodePath, {recursive: true});
  }
  fs.writeFileSync(cfPath, yaml.safeDump(o));
  console.log("%s - %s - %d links, %d tunnels",
    nodeName, cfPath, clink, ctunnel);
}


function buildAll() {
  let repoPath = CONFIG_REPO_PATH;
  if (process.argv.length > 2) {
    repoPath = process.argv[2];
  }
  const big = readConfig(repoPath) as Repository;
  const nodeNames = big.nodes.map(x => x.name);
  for (const node of big.nodes) {
    buildNode(node, big);
  }
}

buildAll();
