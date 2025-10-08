/**
 * Cross-chain fixture interface for CoinFlip tests
 * This interface abstracts away the differences between ZKsync and EVM deployments/interactions
 */

export interface DeployedContracts {
  coinFlip: any;
  mockVRF: any;
  owner: string;
  player1: string;
  player2: string;
  accounts: string[];
}

export interface FlipCommittedEvent {
  player: string;
  betAmount: bigint;
  choice: bigint;
  requestId: bigint;
}

export interface FlipRevealedEvent {
  player: string;
  betAmount: bigint;
  choice: bigint;
  result: bigint;
  didWin: boolean;
  payout: bigint;
  requestId: bigint;
}

export interface GameStats {
  houseEdgePercent: bigint;
  winChance: bigint;
  payoutMultiplier: bigint;
  currentBalance: bigint;
  minBetAmount: bigint;
  maxBetAmount: bigint;
}

/**
 * Fixture interface that both ZK and EVM fixtures must implement
 */
export interface CoinFlipFixture {
  /**
   * Deploy CoinFlip and MockVRF contracts
   */
  deploy(): Promise<DeployedContracts>;

  /**
   * Place a flip bet and extract the requestId from the event
   */
  flipAndGetRequestId(
    coinFlip: any,
    playerAddress: string,
    choice: 0 | 1,
    betWei: bigint
  ): Promise<FlipCommittedEvent>;

  /**
   * Trigger VRF callback to resolve a flip
   */
  triggerCallback(
    mockVRF: any,
    coinFlipAddr: string,
    requestId: bigint,
    randomNumber: bigint
  ): Promise<FlipRevealedEvent>;

  /**
   * Get the balance of an address
   */
  getBalance(address: string): Promise<bigint>;

  /**
   * Read contract balance from CoinFlip
   */
  getContractBalance(coinFlip: any): Promise<bigint>;

  /**
   * Read game stats from CoinFlip
   */
  getGameStats(coinFlip: any): Promise<GameStats>;

  /**
   * Deposit funds into CoinFlip contract (owner only)
   */
  depositFunds(coinFlip: any, ownerAddress: string, amount: bigint): Promise<void>;

  /**
   * Withdraw funds from CoinFlip contract (owner only)
   */
  withdrawFunds(coinFlip: any, ownerAddress: string, amount: bigint): Promise<void>;

  /**
   * Transfer ownership of CoinFlip contract
   */
  transferOwnership(coinFlip: any, currentOwner: string, newOwner: string): Promise<void>;

  /**
   * Set VRF address in CoinFlip contract
   */
  setVRFAddress(coinFlip: any, ownerAddress: string, newVRF: string): Promise<void>;

  /**
   * Set minimum bet in CoinFlip contract
   */
  setMinBet(coinFlip: any, ownerAddress: string, minBet: bigint): Promise<void>;

  /**
   * Set max reward percent in CoinFlip contract
   */
  setMaxRewardPercent(coinFlip: any, ownerAddress: string, percent: bigint): Promise<void>;

  /**
   * Set house edge in CoinFlip contract
   */
  setHouseEdge(coinFlip: any, ownerAddress: string, houseEdge: bigint): Promise<void>;

  /**
   * Read owner from CoinFlip contract
   */
  getOwner(coinFlip: any): Promise<string>;

  /**
   * Read VRF address from CoinFlip contract
   */
  getVRFAddress(coinFlip: any): Promise<string>;

  /**
   * Read min bet from CoinFlip contract
   */
  getMinBet(coinFlip: any): Promise<bigint>;

  /**
   * Read max reward percent from CoinFlip contract
   */
  getMaxRewardPercent(coinFlip: any): Promise<bigint>;

  /**
   * Read house edge from CoinFlip contract
   */
  getHouseEdge(coinFlip: any): Promise<bigint>;

  /**
   * Check if a bet can be placed
   */
  canPlaceBet(coinFlip: any, betAmount: bigint): Promise<{ canBet: boolean; reason: string }>;

  /**
   * Get bet limits
   */
  getBetLimits(coinFlip: any): Promise<{ minBetAmount: bigint; maxBetAmount: bigint }>;

  /**
   * Calculate payout for a bet amount
   */
  calculatePayout(coinFlip: any, betAmount: bigint): Promise<bigint>;

  /**
   * Send ETH directly to contract (owner only)
   */
  sendETH(coinFlip: any, from: string, amount: bigint): Promise<void>;

  /**
   * Emergency withdraw all funds
   */
  emergencyWithdraw(coinFlip: any, ownerAddress: string): Promise<void>;

  /**
   * Get actual balance of contract
   */
  getActualBalance(coinFlip: any): Promise<bigint>;
}

