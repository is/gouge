import yaml from "js-yaml";
import { GougeConfig } from "../config";


test("Config0", () => {
  const cfstr = `
node: t0
links:
  - label: t0,t1
    code: heloworl32103210
  - label: t0,t3
    code: heloworlt0t33210
  - label: t0,t5
    code: heloworlt0t53210
`;
  const cf = <GougeConfig> yaml.load(cfstr);

  expect(cf.links.length).toBe(3);
  expect(cf.node).toBe("t0");
  expect(cf.listen).toBeUndefined();

  const c0 = cf.links.filter((i) => i.label.split(",")[0] == "t0");
  expect(c0.length).toBe(3);

  const c1 = cf.links.filter((i) => i.label.split(",")[1] == "t3");
  expect(c1.length).toBe(1);

  const c2 = cf.links.filter((i) => i.label.split(",")[0] == "tx");
  expect(c2.length).toBe(0);
});