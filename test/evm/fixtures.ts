import hre from "hardhat";
import { parseAbiItem } from "viem";
import type {
  CoinFlipFixture,
  DeployedContracts,
  FlipCommittedEvent,
  FlipRevealedEvent,
  GameStats
} from "../shared/types.js";

/**
 * EVM fixture implementation using Hardhat viem plugin
 */
export function createEVMFixture(): CoinFlipFixture {
  return {
    async deploy(): Promise<DeployedContracts> {
      const { viem } = hre;

      // Get wallet clients
      const [owner, player1, player2] = await viem.getWalletClients();

      // Deploy MockVRF
      const mockVRF = await viem.deployContract("MockVRF");

      // Deploy CoinFlip
      const coinFlip = await viem.deployContract("CoinFlip", [
        owner.account.address,
        mockVRF.address
      ]);

      return {
        coinFlip,
        mockVRF,
        owner: owner.account.address,
        player1: player1.account.address,
        player2: player2.account.address,
        accounts: [owner.account.address, player1.account.address, player2.account.address]
      };
    },

    async flipAndGetRequestId(
      coinFlip: any,
      playerAddress: string,
      choice: 0 | 1,
      betWei: bigint
    ): Promise<FlipCommittedEvent> {
      const { viem } = hre;
      const walletClients = await viem.getWalletClients();
      const player = walletClients.find((w) => w.account.address === playerAddress);
      if (!player) throw new Error(`Wallet for ${playerAddress} not found`);

      const hash = await coinFlip.write.flipCoin([choice], {
        account: player.account,
        value: betWei
      });

      const publicClient = await viem.getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Decode FlipCommitted event
      const log = receipt.logs.find((log) => {
        try {
          const decoded = publicClient.decodeEventLog({
            abi: coinFlip.abi,
            data: log.data,
            topics: log.topics
          });
          return decoded.eventName === "FlipCommitted";
        } catch {
          return false;
        }
      });

      if (!log) throw new Error("FlipCommitted event not found");

      const decoded = publicClient.decodeEventLog({
        abi: coinFlip.abi,
        data: log.data,
        topics: log.topics
      });

      return {
        player: (decoded.args as any).player,
        betAmount: (decoded.args as any).betAmount,
        choice: (decoded.args as any).choice,
        requestId: (decoded.args as any).requestId
      };
    },

    async triggerCallback(
      mockVRF: any,
      coinFlipAddr: string,
      requestId: bigint,
      randomNumber: bigint
    ): Promise<FlipRevealedEvent> {
      const { viem } = hre;
      const [owner] = await viem.getWalletClients();

      const hash = await mockVRF.write.triggerCallback([coinFlipAddr, requestId, randomNumber], {
        account: owner.account
      });

      const publicClient = await viem.getPublicClient();
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Decode FlipRevealed event
      const coinFlip = await viem.getContractAt("CoinFlip", coinFlipAddr as `0x${string}`);
      const log = receipt.logs.find((log) => {
        try {
          const decoded = publicClient.decodeEventLog({
            abi: coinFlip.abi,
            data: log.data,
            topics: log.topics
          });
          return decoded.eventName === "FlipRevealed";
        } catch {
          return false;
        }
      });

      if (!log) throw new Error("FlipRevealed event not found");

      const decoded = publicClient.decodeEventLog({
        abi: coinFlip.abi,
        data: log.data,
        topics: log.topics
      });

      return {
        player: (decoded.args as any).player,
        betAmount: (decoded.args as any).betAmount,
        choice: (decoded.args as any).choice,
        result: (decoded.args as any).result,
        didWin: (decoded.args as any).didWin,
        payout: (decoded.args as any).payout,
        requestId: (decoded.args as any).requestId
      };
    },

    async getBalance(address: string): Promise<bigint> {
      const { viem } = hre;
      const publicClient = await viem.getPublicClient();
      return await publicClient.getBalance({ address: address as `0x${string}` });
    },

    async getContractBalance(coinFlip: any): Promise<bigint> {
      return await coinFlip.read.contractBalance();
    },

    async getGameStats(coinFlip: any): Promise<GameStats> {
      const stats = await coinFlip.read.getGameStats();
      return {
        houseEdgePercent: stats[0],
        winChance: stats[1],
        payoutMultiplier: stats[2],
        currentBalance: stats[3],
        minBetAmount: stats[4],
        maxBetAmount: stats[5]
      };
    },

    async depositFunds(coinFlip: any, ownerAddress: string, amount: bigint): Promise<void> {
      const { viem } = hre;
      const [owner] = await viem.getWalletClients();

      const hash = await coinFlip.write.depositFunds({
        account: owner.account,
        value: amount
      });

      const publicClient = await viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
    },

    async withdrawFunds(coinFlip: any, ownerAddress: string, amount: bigint): Promise<void> {
      const { viem } = hre;
      const [owner] = await viem.getWalletClients();

      const hash = await coinFlip.write.withdrawFunds([amount], {
        account: owner.account
      });

      const publicClient = await viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
    },

    async transferOwnership(coinFlip: any, currentOwner: string, newOwner: string): Promise<void> {
      const { viem } = hre;
      const [owner] = await viem.getWalletClients();

      const hash = await coinFlip.write.transferOwnership([newOwner], {
        account: owner.account
      });

      const publicClient = await viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
    },

    async setVRFAddress(coinFlip: any, ownerAddress: string, newVRF: string): Promise<void> {
      const { viem } = hre;
      const [owner] = await viem.getWalletClients();

      const hash = await coinFlip.write.setVRFAddress([newVRF], {
        account: owner.account
      });

      const publicClient = await viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
    },

    async setMinBet(coinFlip: any, ownerAddress: string, minBet: bigint): Promise<void> {
      const { viem } = hre;
      const [owner] = await viem.getWalletClients();

      const hash = await coinFlip.write.setMinBet([minBet], {
        account: owner.account
      });

      const publicClient = await viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
    },

    async setMaxRewardPercent(coinFlip: any, ownerAddress: string, percent: bigint): Promise<void> {
      const { viem } = hre;
      const [owner] = await viem.getWalletClients();

      const hash = await coinFlip.write.setMaxRewardPercent([percent], {
        account: owner.account
      });

      const publicClient = await viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
    },

    async setHouseEdge(coinFlip: any, ownerAddress: string, houseEdge: bigint): Promise<void> {
      const { viem } = hre;
      const [owner] = await viem.getWalletClients();

      const hash = await coinFlip.write.setHouseEdge([houseEdge], {
        account: owner.account
      });

      const publicClient = await viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
    },

    async getOwner(coinFlip: any): Promise<string> {
      return await coinFlip.read.owner();
    },

    async getVRFAddress(coinFlip: any): Promise<string> {
      return await coinFlip.read.vrfAddress();
    },

    async getMinBet(coinFlip: any): Promise<bigint> {
      return await coinFlip.read.minBet();
    },

    async getMaxRewardPercent(coinFlip: any): Promise<bigint> {
      return await coinFlip.read.maxRewardPercent();
    },

    async getHouseEdge(coinFlip: any): Promise<bigint> {
      return await coinFlip.read.houseEdge();
    },

    async canPlaceBet(coinFlip: any, betAmount: bigint): Promise<{ canBet: boolean; reason: string }> {
      const result = await coinFlip.read.canPlaceBet([betAmount]);
      return { canBet: result[0], reason: result[1] };
    },

    async getBetLimits(coinFlip: any): Promise<{ minBetAmount: bigint; maxBetAmount: bigint }> {
      const limits = await coinFlip.read.getBetLimits();
      return { minBetAmount: limits[0], maxBetAmount: limits[1] };
    },

    async calculatePayout(coinFlip: any, betAmount: bigint): Promise<bigint> {
      return await coinFlip.read.calculatePayout([betAmount]);
    },

    async sendETH(coinFlip: any, from: string, amount: bigint): Promise<void> {
      const { viem } = hre;
      const [owner] = await viem.getWalletClients();

      const hash = await owner.sendTransaction({
        to: coinFlip.address,
        value: amount
      });

      const publicClient = await viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
    },

    async emergencyWithdraw(coinFlip: any, ownerAddress: string): Promise<void> {
      const { viem } = hre;
      const [owner] = await viem.getWalletClients();

      const hash = await coinFlip.write.emergencyWithdraw({
        account: owner.account
      });

      const publicClient = await viem.getPublicClient();
      await publicClient.waitForTransactionReceipt({ hash });
    },

    async getActualBalance(coinFlip: any): Promise<bigint> {
      return await coinFlip.read.getActualBalance();
    }
  };
}

