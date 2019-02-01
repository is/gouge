import { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } from "constants";

test("ObjectArray", () => {
  interface S0 {
    f0: number;
    f1?: string;
  }

  type S0A = Array<S0>;

  const sa: S0A = new Array(10);
  expect(sa[0]).toBeUndefined();
  sa[0] = {f0: 123, f1: undefined};
  expect(sa[0].f0).toBe(123);
  delete sa[0];
  expect(sa[0]).toBeUndefined();
});
