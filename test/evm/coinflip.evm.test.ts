import { shouldBehaveLikeCoinFlip } from "../shared/coinflip.behavior.js";
import { createEVMFixture } from "./fixtures.js";

describe("CoinFlip on EVM", function () {
  shouldBehaveLikeCoinFlip(createEVMFixture);
});

