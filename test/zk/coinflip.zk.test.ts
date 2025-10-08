import { shouldBehaveLikeCoinFlip } from "../shared/coinflip.behavior.js";
import { createZKFixture } from "./fixtures.js";

describe("CoinFlip on ZKsync", function () {
  shouldBehaveLikeCoinFlip(createZKFixture);
});

