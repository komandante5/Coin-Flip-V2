import hre from "hardhat";
import { parseEther, formatEther } from "viem";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

async function main() {
  console.log("Deploying CoinFlip + MockVRF to local Hardhat network (viem)...");

  // Establish a connection to the currently selected network and get viem helpers.
  const connection = await hre.network.connect();
  const { viem } = connection;

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
  const outFile = path.join(outDir, "localhost.json");
  await writeFile(
    outFile,
    JSON.stringify(
      {
        network: "localhost",
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