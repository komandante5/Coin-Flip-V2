import hre from "hardhat";
import { parseEther, formatEther } from "viem";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

async function main() {
  console.log("Deploying CoinFlip + MockVRF to ZKsync network...");

  // Check if we're on a ZKsync network
  const isZkSync = hre.network.config.zksync;
  console.log(`Network: ${hre.network.name}, ZKsync: ${isZkSync}`);

  if (isZkSync) {
    // For ZKsync networks, use zkSync-specific deployment
    await deployWithZkSync();
  } else {
    // For regular networks, use standard viem deployment
    await deployWithViem();
  }
}

async function deployWithZkSync() {
  console.log("Using ZKsync deployment method...");
  
  // Import ZKsync deployer
  const { Deployer } = await import("@matterlabs/hardhat-zksync");
  const { Wallet, Provider } = await import("zksync-ethers");
  
  // Get the first account from hardhat config
  const accounts = hre.network.config.accounts as string[];
  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts configured for this network");
  }
  
  // Create provider for the ZKsync network
  const provider = new Provider(hre.network.config.url);
  
  // Create wallet using the first private key and connect to provider
  const wallet = new Wallet(accounts[0], provider);
  console.log(`Owner (deployer): ${wallet.address}`);
  
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
  
  // 3) Fund CoinFlip contract
  console.log("Funding CoinFlip with 10 ETH...");
  const fundTx = await coinFlip.depositFunds({ value: parseEther("10") });
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

async function deployWithViem() {
  console.log("Using standard viem deployment method...");
  
  // Get viem helpers from hardhat runtime environment.
  const { viem } = hre;
  
  // The first wallet client is used as the deployer/owner.
  const [owner] = await viem.getWalletClients();
  console.log(`Owner (deployer): ${owner.account.address}`);

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

  // 3) Fund CoinFlip so payouts can happen during local testing.
  console.log("Funding CoinFlip with 10 ETH...");
  const fundHash = await coinFlip.write.depositFunds({
    account: owner.account,
    value: parseEther("10")
  });

  // Wait for the funding tx to be mined before reading state.
  const publicClient = await viem.getPublicClient();
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