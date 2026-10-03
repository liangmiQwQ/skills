import { expect, it } from "vite-plus/test";

import { add } from "../src/index.ts";

it("adds two numbers", () => {
  expect(add(1, 2)).toBe(3);
});
