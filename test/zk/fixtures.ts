import hre from "hardhat";
import type {
  CoinFlipFixture,
  DeployedContracts,
  FlipCommittedEvent,
  FlipRevealedEvent,
  GameStats
} from "../shared/types.js";

/**
 * ZKsync fixture implementation using zksync-ethers and Hardhat ZK deployer
 */
export function createZKFixture(): CoinFlipFixture {
  return {
    async deploy(): Promise<DeployedContracts> {
      const { Deployer } = await import("@matterlabs/hardhat-zksync");
      const { Wallet, Provider } = await import("zksync-ethers");

      // Get accounts from hardhat config
      const accounts = hre.network.config.accounts as string[];
      const provider = new Provider(hre.network.config.url!);

      // Create wallets
      const owner = new Wallet(accounts[0], provider);
      const player1 = new Wallet(accounts[1], provider);
      const player2 = new Wallet(accounts[2], provider);

      // Create deployer
      const deployer = new Deployer(hre, owner);

      // Deploy MockVRF contract
      const mockVRFArtifact = await deployer.loadArtifact("MockVRF");
      const mockVRF = await deployer.deploy(mockVRFArtifact);
      await mockVRF.waitForDeployment();

      // Deploy CoinFlip contract
      const coinFlipArtifact = await deployer.loadArtifact("CoinFlip");
      const coinFlip = await deployer.deploy(coinFlipArtifact, [
        await owner.getAddress(),
        await mockVRF.getAddress()
      ]);
      await coinFlip.waitForDeployment();

      return {
        coinFlip,
        mockVRF,
        owner: await owner.getAddress(),
        player1: await player1.getAddress(),
        player2: await player2.getAddress(),
        accounts: [
          await owner.getAddress(),
          await player1.getAddress(),
          await player2.getAddress()
        ]
      };
    },

    async flipAndGetRequestId(
      coinFlip: any,
      playerAddress: string,
      choice: 0 | 1,
      betWei: bigint
    ): Promise<FlipCommittedEvent> {
      const { Wallet, Provider } = await import("zksync-ethers");
      const accounts = hre.network.config.accounts as string[];
      const provider = new Provider(hre.network.config.url!);

      // Find the wallet for the player
      let playerWallet: any;
      for (const acc of accounts) {
        const wallet = new Wallet(acc, provider);
        if ((await wallet.getAddress()) === playerAddress) {
          playerWallet = wallet;
          break;
        }
      }

      const tx = await coinFlip.connect(playerWallet).flipCoin(choice, { value: betWei });
      const receipt = await tx.wait();

      // Parse event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = coinFlip.interface.parseLog(log);
          return parsed?.name === "FlipCommitted";
        } catch {
          return false;
        }
      });

      if (!event) throw new Error("FlipCommitted event not found");
      const parsedEvent = coinFlip.interface.parseLog(event);

      return {
        player: parsedEvent!.args.player,
        betAmount: parsedEvent!.args.betAmount,
        choice: parsedEvent!.args.choice,
        requestId: parsedEvent!.args.requestId
      };
    },

    async triggerCallback(
      mockVRF: any,
      coinFlipAddr: string,
      requestId: bigint,
      randomNumber: bigint
    ): Promise<FlipRevealedEvent> {
      const { Wallet, Provider } = await import("zksync-ethers");
      const accounts = hre.network.config.accounts as string[];
      const provider = new Provider(hre.network.config.url!);
      const owner = new Wallet(accounts[0], provider);

      const tx = await mockVRF.connect(owner).triggerCallback(coinFlipAddr, requestId, randomNumber);
      const receipt = await tx.wait();

      // Parse event from CoinFlip contract
      const { Deployer } = await import("@matterlabs/hardhat-zksync");
      const deployer = new Deployer(hre, owner);
      const coinFlipArtifact = await deployer.loadArtifact("CoinFlip");
      const { Contract } = await import("zksync-ethers");
      const tempContract = new Contract(coinFlipAddr, coinFlipArtifact.abi, provider);
      const coinFlipInterface = tempContract.interface;

      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = coinFlipInterface.parseLog(log);
          return parsed?.name === "FlipRevealed";
        } catch {
          return false;
        }
      });

      if (!event) throw new Error("FlipRevealed event not found");
      const parsedEvent = coinFlipInterface.parseLog(event);

      return {
        player: parsedEvent!.args.player,
        betAmount: parsedEvent!.args.betAmount,
        choice: parsedEvent!.args.choice,
        result: parsedEvent!.args.result,
        didWin: parsedEvent!.args.didWin,
        payout: parsedEvent!.args.payout,
        requestId: parsedEvent!.args.requestId
      };
    },

    async getBalance(address: string): Promise<bigint> {
      const { Provider } = await import("zksync-ethers");
      const provider = new Provider(hre.network.config.url!);
      return await provider.getBalance(address);
    },

    async getContractBalance(coinFlip: any): Promise<bigint> {
      return await coinFlip.contractBalance();
    },

    async getGameStats(coinFlip: any): Promise<GameStats> {
      const stats = await coinFlip.getGameStats();
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
      const { Wallet, Provider } = await import("zksync-ethers");
      const accounts = hre.network.config.accounts as string[];
      const provider = new Provider(hre.network.config.url!);
      const owner = new Wallet(accounts[0], provider);

      const tx = await coinFlip.connect(owner).depositFunds({ value: amount });
      await tx.wait();
    },

    async withdrawFunds(coinFlip: any, ownerAddress: string, amount: bigint): Promise<void> {
      const { Wallet, Provider } = await import("zksync-ethers");
      const accounts = hre.network.config.accounts as string[];
      const provider = new Provider(hre.network.config.url!);
      const owner = new Wallet(accounts[0], provider);

      const tx = await coinFlip.connect(owner).withdrawFunds(amount);
      await tx.wait();
    },

    async transferOwnership(coinFlip: any, currentOwner: string, newOwner: string): Promise<void> {
      const { Wallet, Provider } = await import("zksync-ethers");
      const accounts = hre.network.config.accounts as string[];
      const provider = new Provider(hre.network.config.url!);
      const owner = new Wallet(accounts[0], provider);

      const tx = await coinFlip.connect(owner).transferOwnership(newOwner);
      await tx.wait();
    },

    async setVRFAddress(coinFlip: any, ownerAddress: string, newVRF: string): Promise<void> {
      const { Wallet, Provider } = await import("zksync-ethers");
      const accounts = hre.network.config.accounts as string[];
      const provider = new Provider(hre.network.config.url!);
      const owner = new Wallet(accounts[0], provider);

      const tx = await coinFlip.connect(owner).setVRFAddress(newVRF);
      await tx.wait();
    },

    async setMinBet(coinFlip: any, ownerAddress: string, minBet: bigint): Promise<void> {
      const { Wallet, Provider } = await import("zksync-ethers");
      const accounts = hre.network.config.accounts as string[];
      const provider = new Provider(hre.network.config.url!);
      const owner = new Wallet(accounts[0], provider);

      const tx = await coinFlip.connect(owner).setMinBet(minBet);
      await tx.wait();
    },

    async setMaxRewardPercent(coinFlip: any, ownerAddress: string, percent: bigint): Promise<void> {
      const { Wallet, Provider } = await import("zksync-ethers");
      const accounts = hre.network.config.accounts as string[];
      const provider = new Provider(hre.network.config.url!);
      const owner = new Wallet(accounts[0], provider);

      const tx = await coinFlip.connect(owner).setMaxRewardPercent(percent);
      await tx.wait();
    },

    async setHouseEdge(coinFlip: any, ownerAddress: string, houseEdge: bigint): Promise<void> {
      const { Wallet, Provider } = await import("zksync-ethers");
      const accounts = hre.network.config.accounts as string[];
      const provider = new Provider(hre.network.config.url!);
      const owner = new Wallet(accounts[0], provider);

      const tx = await coinFlip.connect(owner).setHouseEdge(houseEdge);
      await tx.wait();
    },

    async getOwner(coinFlip: any): Promise<string> {
      return await coinFlip.owner();
    },

    async getVRFAddress(coinFlip: any): Promise<string> {
      return await coinFlip.vrfAddress();
    },

    async getMinBet(coinFlip: any): Promise<bigint> {
      return await coinFlip.minBet();
    },

    async getMaxRewardPercent(coinFlip: any): Promise<bigint> {
      return await coinFlip.maxRewardPercent();
    },

    async getHouseEdge(coinFlip: any): Promise<bigint> {
      return await coinFlip.houseEdge();
    },

    async canPlaceBet(coinFlip: any, betAmount: bigint): Promise<{ canBet: boolean; reason: string }> {
      const result = await coinFlip.canPlaceBet(betAmount);
      return { canBet: result[0], reason: result[1] };
    },

    async getBetLimits(coinFlip: any): Promise<{ minBetAmount: bigint; maxBetAmount: bigint }> {
      const limits = await coinFlip.getBetLimits();
      return { minBetAmount: limits[0], maxBetAmount: limits[1] };
    },

    async calculatePayout(coinFlip: any, betAmount: bigint): Promise<bigint> {
      return await coinFlip.calculatePayout(betAmount);
    },

    async sendETH(coinFlip: any, from: string, amount: bigint): Promise<void> {
      const { Wallet, Provider } = await import("zksync-ethers");
      const accounts = hre.network.config.accounts as string[];
      const provider = new Provider(hre.network.config.url!);
      const owner = new Wallet(accounts[0], provider);

      const tx = await owner.sendTransaction({
        to: await coinFlip.getAddress(),
        value: amount
      });
      await tx.wait();
    },

    async emergencyWithdraw(coinFlip: any, ownerAddress: string): Promise<void> {
      const { Wallet, Provider } = await import("zksync-ethers");
      const accounts = hre.network.config.accounts as string[];
      const provider = new Provider(hre.network.config.url!);
      const owner = new Wallet(accounts[0], provider);

      const tx = await coinFlip.connect(owner).emergencyWithdraw();
      await tx.wait();
    },

    async getActualBalance(coinFlip: any): Promise<bigint> {
      return await coinFlip.getActualBalance();
    }
  };
}

