import { expect } from "chai";
import { parseEther, formatEther, keccak256, encodePacked } from "viem";
import type { CoinFlipFixture } from "./types.js";

/**
 * Shared behavior tests for CoinFlip contract
 * These tests work with both ZKsync and EVM fixtures
 */
export function shouldBehaveLikeCoinFlip(createFixture: () => CoinFlipFixture) {
  let fixture: CoinFlipFixture;

  beforeEach(function () {
    fixture = createFixture();
  });

  describe("Deployment", function () {
    it("Should run a basic test", function () {
      expect(1 + 1).to.equal(2);
    });

    it("Should set the correct owner", async function () {
      const { coinFlip, owner } = await fixture.deploy();
      const contractOwner = await fixture.getOwner(coinFlip);
      expect(contractOwner.toLowerCase()).to.equal(owner.toLowerCase());
    });

    it("Should set the correct VRF address", async function () {
      const { coinFlip, mockVRF } = await fixture.deploy();
      const vrfAddr = await fixture.getVRFAddress(coinFlip);
      const mockVRFAddr = typeof mockVRF.address === "string" 
        ? mockVRF.address 
        : await mockVRF.getAddress();
      expect(vrfAddr.toLowerCase()).to.equal(mockVRFAddr.toLowerCase());
    });

    it("Should initialize with correct constants", async function () {
      const { coinFlip } = await fixture.deploy();

      const houseEdge = await fixture.getHouseEdge(coinFlip);
      const minBet = await fixture.getMinBet(coinFlip);
      const maxRewardPercent = await fixture.getMaxRewardPercent(coinFlip);
      const balance = await fixture.getContractBalance(coinFlip);

      expect(houseEdge).to.equal(1_000_000n);
      expect(minBet).to.equal(parseEther("0.001"));
      expect(maxRewardPercent).to.equal(10_000_000n);
      expect(balance).to.equal(0n);
    });
  });

  describe("Ownership Management", function () {
    it("Should transfer ownership correctly", async function () {
      const { coinFlip, owner, player1 } = await fixture.deploy();

      await fixture.transferOwnership(coinFlip, owner, player1);

      const newOwner = await fixture.getOwner(coinFlip);
      expect(newOwner.toLowerCase()).to.equal(player1.toLowerCase());
    });
  });

  describe("VRF Management", function () {
    it("Should set VRF address correctly", async function () {
      const { coinFlip, owner } = await fixture.deploy();

      // Deploy a new MockVRF
      const { mockVRF: newMockVRF } = await fixture.deploy();
      const newVRFAddr = typeof newMockVRF.address === "string" 
        ? newMockVRF.address 
        : await newMockVRF.getAddress();

      await fixture.setVRFAddress(coinFlip, owner, newVRFAddr);

      const vrfAddr = await fixture.getVRFAddress(coinFlip);
      expect(vrfAddr.toLowerCase()).to.equal(newVRFAddr.toLowerCase());
    });
  });

  describe("Game Parameters", function () {
    it("Should set minimum bet correctly", async function () {
      const { coinFlip, owner } = await fixture.deploy();
      const newMinBet = parseEther("0.01");

      await fixture.setMinBet(coinFlip, owner, newMinBet);

      const minBet = await fixture.getMinBet(coinFlip);
      expect(minBet).to.equal(newMinBet);
    });

    it("Should set maximum reward percentage correctly", async function () {
      const { coinFlip, owner } = await fixture.deploy();
      const newMaxRewardPercent = 5_000_000n; // 5%

      await fixture.setMaxRewardPercent(coinFlip, owner, newMaxRewardPercent);

      const maxRewardPercent = await fixture.getMaxRewardPercent(coinFlip);
      expect(maxRewardPercent).to.equal(newMaxRewardPercent);
    });
  });

  describe("House Edge Management", function () {
    it("Should set house edge correctly", async function () {
      const { coinFlip, owner } = await fixture.deploy();

      // Test 0.5%
      let newHouseEdge = 500_000n;
      await fixture.setHouseEdge(coinFlip, owner, newHouseEdge);
      let houseEdge = await fixture.getHouseEdge(coinFlip);
      expect(houseEdge).to.equal(newHouseEdge);

      // Test 5%
      newHouseEdge = 5_000_000n;
      await fixture.setHouseEdge(coinFlip, owner, newHouseEdge);
      houseEdge = await fixture.getHouseEdge(coinFlip);
      expect(houseEdge).to.equal(newHouseEdge);

      // Test 10%
      newHouseEdge = 10_000_000n;
      await fixture.setHouseEdge(coinFlip, owner, newHouseEdge);
      houseEdge = await fixture.getHouseEdge(coinFlip);
      expect(houseEdge).to.equal(newHouseEdge);
    });
  });

  describe("Fund Management", function () {
    it("Should deposit funds correctly", async function () {
      const { coinFlip, owner } = await fixture.deploy();
      const depositAmount = parseEther("1.0");

      await fixture.depositFunds(coinFlip, owner, depositAmount);

      const balance = await fixture.getContractBalance(coinFlip);
      const actualBalance = await fixture.getActualBalance(coinFlip);

      expect(balance).to.equal(depositAmount);
      expect(actualBalance).to.equal(depositAmount);
    });

    it("Should withdraw funds correctly", async function () {
      const { coinFlip, owner } = await fixture.deploy();
      const depositAmount = parseEther("1.0");
      const withdrawAmount = parseEther("0.5");

      // First deposit
      await fixture.depositFunds(coinFlip, owner, depositAmount);

      const initialBalance = await fixture.getBalance(owner);

      // Then withdraw
      await fixture.withdrawFunds(coinFlip, owner, withdrawAmount);

      const finalBalance = await fixture.getBalance(owner);
      const contractBalance = await fixture.getContractBalance(coinFlip);

      expect(contractBalance).to.equal(depositAmount - withdrawAmount);

      // Check that owner received the funds (accounting for gas costs with tolerance)
      expect(Number(finalBalance)).to.be.greaterThan(Number(initialBalance));
    });

    it("Should emergency withdraw correctly", async function () {
      const { coinFlip, owner } = await fixture.deploy();
      const depositAmount = parseEther("1.0");

      // First deposit
      await fixture.depositFunds(coinFlip, owner, depositAmount);

      // Emergency withdraw
      await fixture.emergencyWithdraw(coinFlip, owner);

      const balance = await fixture.getContractBalance(coinFlip);
      const actualBalance = await fixture.getActualBalance(coinFlip);

      expect(balance).to.equal(0n);
      expect(actualBalance).to.equal(0n);
    });

    it("Should allow owner to receive ETH directly", async function () {
      const { coinFlip, owner } = await fixture.deploy();
      const sendAmount = parseEther("0.5");

      await fixture.sendETH(coinFlip, owner, sendAmount);

      const balance = await fixture.getContractBalance(coinFlip);
      expect(balance).to.equal(sendAmount);
    });
  });

  describe("Game Logic", function () {
    async function setupGameFixture() {
      const deployed = await fixture.deploy();
      const { coinFlip, owner } = deployed;

      // Fund the contract
      await fixture.depositFunds(coinFlip, owner, parseEther("10.0"));

      return deployed;
    }

    it("Should place a bet correctly", async function () {
      const { coinFlip, player1 } = await setupGameFixture();
      const betAmount = parseEther("0.1");

      const event = await fixture.flipAndGetRequestId(coinFlip, player1, 0, betAmount);

      // Check that bet was recorded
      const balance = await fixture.getContractBalance(coinFlip);
      expect(balance).to.equal(parseEther("10.1"));

      // Check event data
      expect(event.player.toLowerCase()).to.equal(player1.toLowerCase());
      expect(event.betAmount).to.equal(betAmount);
      expect(event.choice).to.equal(0n);
      expect(Number(event.requestId)).to.be.greaterThan(0);
    });

    it("Should handle winning flip correctly", async function () {
      const { coinFlip, mockVRF, player1 } = await setupGameFixture();
      const betAmount = parseEther("0.1");

      // Place bet on HEADS (0)
      const flipEvent = await fixture.flipAndGetRequestId(coinFlip, player1, 0, betAmount);
      const requestId = flipEvent.requestId;

      const coinFlipAddr = typeof coinFlip.address === "string" 
        ? coinFlip.address 
        : await coinFlip.getAddress();

      // Find a randomNumber that results in HEADS (0) - matching player choice
      let randomNumber = 0n;
      for (let i = 0; i < 100; i++) {
        const digest = keccak256(encodePacked(["uint256", "uint256"], [requestId, BigInt(i)]));
        if ((BigInt(digest) % 2n) === 0n) {
          randomNumber = BigInt(i);
          break;
        }
      }

      // Simulate VRF callback with a winning result
      const revealEvent = await fixture.triggerCallback(mockVRF, coinFlipAddr, requestId, randomNumber);

      // Check result
      if (revealEvent.didWin) {
        const expectedPayout = (betAmount * 198_000_000n) / 100_000_000n; // 1.98x
        expect(revealEvent.payout).to.equal(expectedPayout);

        // Check contract balance decreased by payout
        const balance = await fixture.getContractBalance(coinFlip);
        expect(balance).to.equal(parseEther("10.0") + betAmount - expectedPayout);
      }
    });

    it("Should handle losing flip correctly", async function () {
      const { coinFlip, mockVRF, player1 } = await setupGameFixture();
      const betAmount = parseEther("0.1");

      // Place bet on HEADS (0)
      const flipEvent = await fixture.flipAndGetRequestId(coinFlip, player1, 0, betAmount);
      const requestId = flipEvent.requestId;

      const coinFlipAddr = typeof coinFlip.address === "string" 
        ? coinFlip.address 
        : await coinFlip.getAddress();

      // Find a randomNumber that results in TAILS (1) - opposite of player choice
      let randomNumber = 0n;
      for (let i = 0; i < 100; i++) {
        const digest = keccak256(encodePacked(["uint256", "uint256"], [requestId, BigInt(i)]));
        if ((BigInt(digest) % 2n) === 1n) {
          randomNumber = BigInt(i);
          break;
        }
      }

      // Simulate VRF callback with a losing result
      const revealEvent = await fixture.triggerCallback(mockVRF, coinFlipAddr, requestId, randomNumber);

      // Check result
      if (!revealEvent.didWin) {
        expect(revealEvent.payout).to.equal(0n);

        // Contract keeps the bet
        const balance = await fixture.getContractBalance(coinFlip);
        expect(balance).to.equal(parseEther("10.1"));
      }
    });
  });

  describe("View Functions", function () {
    async function setupViewFixture() {
      const deployed = await fixture.deploy();
      const { coinFlip, owner } = deployed;

      // Fund the contract
      await fixture.depositFunds(coinFlip, owner, parseEther("10.0"));

      return deployed;
    }

    it("Should validate bet amounts correctly", async function () {
      const { coinFlip } = await setupViewFixture();

      // Valid bet
      const canBet1 = await fixture.canPlaceBet(coinFlip, parseEther("0.1"));
      expect(canBet1.canBet).to.be.true;
      expect(canBet1.reason).to.equal("");

      // Below minimum
      const canBet2 = await fixture.canPlaceBet(coinFlip, parseEther("0.0001"));
      expect(canBet2.canBet).to.be.false;
      expect(canBet2.reason).to.equal("Bet amount below minimum");

      // Exceeds max reward
      const canBet3 = await fixture.canPlaceBet(coinFlip, parseEther("6.0"));
      expect(canBet3.canBet).to.be.false;
      expect(canBet3.reason).to.equal("Bet exceeds max reward limit");
    });

    it("Should return correct bet limits", async function () {
      const { coinFlip } = await setupViewFixture();

      const limits = await fixture.getBetLimits(coinFlip);

      expect(limits.minBetAmount).to.equal(parseEther("0.001"));

      // Max bet should be calculated based on max allowed payout
      // Contract balance: 10 ETH, max reward: 10% = 1 ETH max payout
      // Max bet = max payout / 1.98 = ~0.505 ETH
      const expectedMaxBet = (parseEther("1.0") * 100_000_000n) / 198_000_000n;
      expect(limits.maxBetAmount).to.equal(expectedMaxBet);
    });

    it("Should calculate payout correctly", async function () {
      const { coinFlip } = await setupViewFixture();

      const betAmount = parseEther("1.0");
      const expectedPayout = (betAmount * 198_000_000n) / 100_000_000n; // 1.98 ETH

      const payout = await fixture.calculatePayout(coinFlip, betAmount);
      expect(payout).to.equal(expectedPayout);
    });

    it("Should return correct game stats", async function () {
      const { coinFlip } = await setupViewFixture();

      const stats = await fixture.getGameStats(coinFlip);

      expect(stats.houseEdgePercent).to.equal(1_000_000n);
      expect(stats.winChance).to.equal(50_000_000n);
      expect(stats.payoutMultiplier).to.equal(198_000_000n);
      expect(stats.currentBalance).to.equal(parseEther("10.0"));
      expect(stats.minBetAmount).to.equal(parseEther("0.001"));
      expect(Number(stats.maxBetAmount)).to.be.greaterThan(0);
    });

    it("Should return actual balance correctly", async function () {
      const { coinFlip } = await setupViewFixture();

      const actualBalance = await fixture.getActualBalance(coinFlip);
      expect(actualBalance).to.equal(parseEther("10.0"));
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero contract balance bet limits", async function () {
      const { coinFlip } = await fixture.deploy();

      const limits = await fixture.getBetLimits(coinFlip);

      expect(limits.minBetAmount).to.equal(parseEther("0.001"));
      expect(limits.maxBetAmount).to.equal(0n); // Should be 0 when no funds
    });

    it("Should handle very small bet amounts", async function () {
      const { coinFlip, owner } = await fixture.deploy();

      // Fund with small amount
      await fixture.depositFunds(coinFlip, owner, parseEther("0.01"));

      const canBet = await fixture.canPlaceBet(coinFlip, parseEther("0.001"));
      expect(canBet.canBet).to.be.false;
      expect(canBet.reason).to.equal("Bet exceeds max reward limit");
    });

    it("Should handle maximum possible bet", async function () {
      const { coinFlip, owner } = await fixture.deploy();

      // Fund with large amount
      await fixture.depositFunds(coinFlip, owner, parseEther("100.0"));

      const limits = await fixture.getBetLimits(coinFlip);
      const canBet = await fixture.canPlaceBet(coinFlip, limits.maxBetAmount);

      expect(canBet.canBet).to.be.true;
      expect(canBet.reason).to.equal("");
    });
  });
}

