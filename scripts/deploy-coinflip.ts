import hre from "hardhat";
import { parseEther, formatEther } from "viem";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import * as readline from "readline/promises";

// Interface for user prompts
interface DeploymentConfig {
  accountIndex: number;
  initialFunding: string;
}

async function promptUser(): Promise<DeploymentConfig> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\n=== CoinFlip Deployment Configuration ===\n");
  
  // Display current network info
  const isZk = hre.network.config.zksync ? " (ZKsync)" : " (EVM)";
  console.log(`Deploying to network: ${hre.network.name}${isZk}`);

  // Get accounts for the current network
  const accounts = hre.network.config.accounts as string[];

  console.log(`\nAvailable wallets:`);
  if (Array.isArray(accounts)) {
    accounts.forEach((_, index) => {
      console.log(`  ${index + 1}. Account ${index + 1}`);
    });
  } else {
    console.log("  1. Default account from mnemonic/private key");
  }

  const accountChoice = await rl.question("\nSelect wallet (number): ");
  const accountIndex = parseInt(accountChoice) - 1;

  if (accountIndex < 0 || (Array.isArray(accounts) && accountIndex >= accounts.length)) {
    rl.close();
    throw new Error("Invalid wallet selection");
  }

  // Get initial funding amount
  const fundingAmount = await rl.question(
    "\nEnter initial house balance in ETH (e.g., 10): "
  );

  if (isNaN(parseFloat(fundingAmount)) || parseFloat(fundingAmount) <= 0) {
    rl.close();
    throw new Error("Invalid funding amount");
  }

  console.log("\n=== Configuration Summary ===");
  console.log(`Network: ${hre.network.name}${isZk}`);
  console.log(`Wallet: Account ${accountIndex + 1}`);
  console.log(`Initial House Balance: ${fundingAmount} ETH`);

  const confirm = await rl.question("\nProceed with deployment? (yes/no): ");

  rl.close();

  if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
    throw new Error("Deployment cancelled by user");
  }

  return {
    accountIndex,
    initialFunding: fundingAmount,
  };
}

async function main() {
  console.log("=== Interactive CoinFlip Deployment ===");

  // Get deployment configuration from user
  const config = await promptUser();

  console.log("\n=== Starting Deployment ===\n");

  // Check if we're on a ZKsync network
  const isZkSync = hre.network.config.zksync;

  if (isZkSync) {
    // For ZKsync networks, use zkSync-specific deployment
    await deployWithZkSync(config);
  } else {
    // For regular networks, use standard viem deployment
    await deployWithViem(config);
  }
}

async function deployWithZkSync(config: DeploymentConfig) {
  console.log("Using ZKsync deployment method...");
  
  // Import ZKsync deployer
  const { Deployer } = await import("@matterlabs/hardhat-zksync");
  const { Wallet, Provider } = await import("zksync-ethers");
  
  // Get the accounts from hardhat config
  const accounts = hre.network.config.accounts as string[];
  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts configured for this network");
  }
  
  // Use the selected account
  if (config.accountIndex >= accounts.length) {
    throw new Error(`Account index ${config.accountIndex} out of range`);
  }
  
  // Create provider for the ZKsync network
  const provider = new Provider(hre.network.config.url);
  
  // Create wallet using the selected private key and connect to provider
  const wallet = new Wallet(accounts[config.accountIndex], provider);
  console.log(`Owner (deployer): ${wallet.address}`);
  
  // Check wallet balance
  const walletBalance = await provider.getBalance(wallet.address);
  console.log(`Wallet balance: ${formatEther(walletBalance)} ETH`);
  
  // Create deployer instance
  const deployer = new Deployer(hre, wallet);
  
  // 1) Deploy MockVRF
  console.log("Deploying MockVRF...");
  const mockVRFArtifact = await deployer.loadArtifact("MockVRF");
  const mockVRF = await deployer.deploy(mockVRFArtifact, []);
  console.log(`MockVRF deployed at: ${await mockVRF.getAddress()}`);
  
  // 2) Deploy CoinFlip with constructor parameters
  console.log("Deploying CoinFlip...");
  const coinFlipArtifact = await deployer.loadArtifact("CoinFlip");
  const coinFlip = await deployer.deploy(coinFlipArtifact, [
    wallet.address,
    await mockVRF.getAddress()
  ]);
  console.log(`CoinFlip deployed at: ${await coinFlip.getAddress()}`);
  
  // 3) Fund CoinFlip contract with user-specified amount
  console.log(`Funding CoinFlip with ${config.initialFunding} ETH...`);
  const fundTx = await coinFlip.depositFunds({ value: parseEther(config.initialFunding) });
  await fundTx.wait();
  
  // 4) Read contract state
  const balance = await coinFlip.contractBalance();
  const gameStats = await coinFlip.getGameStats();
  
  console.log("Deployment summary:");
  console.log(`- Owner: ${wallet.address}`);
  console.log(`- MockVRF: ${await mockVRF.getAddress()}`);
  console.log(`- CoinFlip: ${await coinFlip.getAddress()}`);
  console.log(`- Contract Balance: ${formatEther(balance)} ETH`);
  
  console.log("Game parameters:");
  console.log(`- House Edge: ${Number(gameStats[0]) / 1e6}%`);
  console.log(`- Win Chance: ${Number(gameStats[1]) / 1e6}%`);
  console.log(`- Payout Multiplier: ${Number(gameStats[2]) / 1e8}x`);
  console.log(`- Min Bet: ${formatEther(gameStats[4])} ETH`);
  console.log(`- Max Bet: ${formatEther(gameStats[5])} ETH`);
  
  // 5) Save deployment addresses
  const outDir = path.join(process.cwd(), "deployments");
  await mkdir(outDir, { recursive: true });
  const networkName = hre.network.name;
  const outFile = path.join(outDir, `${networkName}.json`);
  await writeFile(
    outFile,
    JSON.stringify(
      {
        network: networkName,
        coinFlip: await coinFlip.getAddress(),
        mockVRF: await mockVRF.getAddress(),
        owner: wallet.address
      },
      null,
      2
    )
  );
  console.log(`Addresses saved to ${outFile}`);
}

async function deployWithViem(config: DeploymentConfig) {
  console.log("Using standard viem deployment method...");
  
  // Get viem helpers from hardhat runtime environment.
  const { viem } = hre;
  
  // Get all wallet clients and select the one specified by user
  const walletClients = await viem.getWalletClients();
  
  if (config.accountIndex >= walletClients.length) {
    throw new Error(`Account index ${config.accountIndex} out of range`);
  }
  
  const owner = walletClients[config.accountIndex];
  console.log(`Owner (deployer): ${owner.account.address}`);
  
  // Get public client for reading state
  const publicClient = await viem.getPublicClient();
  
  // Check wallet balance
  const walletBalance = await publicClient.getBalance({ address: owner.account.address });
  console.log(`Wallet balance: ${formatEther(walletBalance)} ETH`);

  // 1) Deploy MockVRF (used to simulate randomness).
  console.log("Deploying MockVRF...");
  const mockVRF = await viem.deployContract("MockVRF");
  console.log(`MockVRF deployed at: ${mockVRF.address}`);

  // 2) Deploy CoinFlip with the owner address and the MockVRF address.
  console.log("Deploying CoinFlip...");
  const coinFlip = await viem.deployContract("CoinFlip", [
    owner.account.address,
    mockVRF.address
  ]);
  console.log(`CoinFlip deployed at: ${coinFlip.address}`);

  // 3) Fund CoinFlip with user-specified amount.
  console.log(`Funding CoinFlip with ${config.initialFunding} ETH...`);
  const fundHash = await coinFlip.write.depositFunds({
    account: owner.account,
    value: parseEther(config.initialFunding)
  });

  // Wait for the funding tx to be mined before reading state.
  await publicClient.waitForTransactionReceipt({ hash: fundHash });

  // 4) Read and print useful stats for quick sanity check.
  const balance = await coinFlip.read.contractBalance();
  const [
    houseEdge,
    winChance,
    payoutMultiplier,
    currentBalance,
    minBetAmount,
    maxBetAmount
  ] = await coinFlip.read.getGameStats();

  console.log("Deployment summary:");
  console.log(`- Owner: ${owner.account.address}`);
  console.log(`- MockVRF: ${mockVRF.address}`);
  console.log(`- CoinFlip: ${coinFlip.address}`);
  console.log(`- Contract Balance: ${formatEther(balance)} ETH`);

  console.log("Game parameters:");
  console.log(`- House Edge: ${Number(houseEdge) / 1e6}%`);
  console.log(`- Win Chance: ${Number(winChance) / 1e6}%`);
  console.log(`- Payout Multiplier: ${Number(payoutMultiplier) / 1e8}x`);
  console.log(`- Min Bet: ${formatEther(minBetAmount)} ETH`);
  console.log(`- Max Bet: ${formatEther(maxBetAmount)} ETH`);

  // 5) Persist addresses for the test script.
  const outDir = path.join(process.cwd(), "deployments");
  await mkdir(outDir, { recursive: true });
  const networkName = hre.network.name;
  const outFile = path.join(outDir, `${networkName}.json`);
  await writeFile(
    outFile,
    JSON.stringify(
      {
        network: networkName,
        coinFlip: coinFlip.address,
        mockVRF: mockVRF.address,
        owner: owner.account.address
      },
      null,
      2
    )
  );
  console.log(`Addresses saved to ${outFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Deployment failed:", err);
    process.exit(1);
  });