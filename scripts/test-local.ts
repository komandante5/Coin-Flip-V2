import hre from "hardhat";
import { parseEther, formatEther } from "viem";
import path from "node:path";
import { readFile } from "node:fs/promises";

async function main() {
  console.log("Testing CoinFlip locally (viem)...");

  // Connect and get viem helpers + common clients.
  const connection = await hre.network.connect();
  const { viem } = connection;

  // Grab a few funded accounts: owner (deployer), plus players.
  const [owner, player1, player2] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  // Attempt to attach to previously deployed contracts; otherwise deploy fresh.
  let coinFlip: Awaited<ReturnType<typeof viem.getContractAt>>;
  let mockVRF: Awaited<ReturnType<typeof viem.getContractAt>>;

  try {
    const file = path.join(process.cwd(), "deployments", "localhost.json");
    const saved = JSON.parse(
      await readFile(file, "utf8")
    ) as { coinFlip: string; mockVRF: string; owner?: string; network?: string };

    console.log(`Loaded addresses from ${file}`);
    mockVRF = await viem.getContractAt("MockVRF", saved.mockVRF as `0x${string}`);
    coinFlip = await viem.getContractAt("CoinFlip", saved.coinFlip as `0x${string}`);
  } catch {
    console.log("No saved addresses found; deploying temporary instances...");
    mockVRF = await viem.deployContract("MockVRF");
    coinFlip = await viem.deployContract("CoinFlip", [
      owner.account.address,
      mockVRF.address
    ]);
    // Fund CoinFlip for payouts.
    const fundHash = await coinFlip.write.depositFunds({
      account: owner.account,
      value: parseEther("10")
    });
    await publicClient.waitForTransactionReceipt({ hash: fundHash });
  }

  console.log(`Owner:   ${owner.account.address}`);
  console.log(`MockVRF: ${mockVRF.address}`);
  console.log(`CoinFlip:${coinFlip.address}`);

  // Quick snapshot of current game state.
  const [
    houseEdge,
    winChance,
    payoutMultiplier,
    currentBalance,
    minBetAmount,
    maxBetAmount
  ] = await coinFlip.read.getGameStats();

  console.log("Current game stats:");
  console.log(`- Contract Balance: ${formatEther(currentBalance)} ETH`);
  console.log(`- Min Bet:          ${formatEther(minBetAmount)} ETH`);
  console.log(`- Max Bet:          ${formatEther(maxBetAmount)} ETH`);
  console.log(`- House Edge:       ${Number(houseEdge) / 1e6}%`);
  console.log(`- Win Chance:       ${Number(winChance) / 1e6}%`);
  console.log(`- Payout Mult:      ${Number(payoutMultiplier) / 1e8}x`);

  // Player 1 places a bet on HEADS (0).
  console.log("\nPlayer1 placing 0.1 ETH bet on HEADS...");
  const bet1 = parseEther("0.1");
  const flipHash1 = await coinFlip.write.flipCoin([0], {
    account: player1.account,
    value: bet1
  });
  await publicClient.waitForTransactionReceipt({ hash: flipHash1 });

  // Find the latest FlipCommitted to get the requestId needed for the VRF callback.
  const committed1 = await coinFlip.getEvents.FlipCommitted();
  const reqId1 = committed1[committed1.length - 1]?.args.requestId;
  console.log(`FlipCommitted requestId: ${reqId1}`);

  // Trigger VRF with a random number; the contract will derive HEADS/TAILS.
  const rand1 = BigInt(Math.floor(Math.random() * 1_000_000));
  const cbHash1 = await mockVRF.write.triggerCallback([
    coinFlip.address,
    reqId1,
    rand1
  ]);
  await publicClient.waitForTransactionReceipt({ hash: cbHash1 });

  // Show the reveal details.
  const revealed1 = await coinFlip.getEvents.FlipRevealed();
  const lastReveal1 = revealed1[revealed1.length - 1];
  console.log(
    `Result #1: choice=${lastReveal1.args.choice === 0 ? "HEADS" : "TAILS"}, ` +
    `result=${lastReveal1.args.result === 0 ? "HEADS" : "TAILS"}, ` +
    `didWin=${lastReveal1.args.didWin}, payout=${formatEther(lastReveal1.args.payout)} ETH`
  );

  // Player 2 places a bet on TAILS (1).
  console.log("\nPlayer2 placing 0.05 ETH bet on TAILS...");
  const bet2 = parseEther("0.05");
  const flipHash2 = await coinFlip.write.flipCoin([1], {
    account: player2.account,
    value: bet2
  });
  await publicClient.waitForTransactionReceipt({ hash: flipHash2 });

  const committed2 = await coinFlip.getEvents.FlipCommitted();
  const reqId2 = committed2[committed2.length - 1]?.args.requestId;

  const rand2 = BigInt(Math.floor(Math.random() * 1_000_000));
  const cbHash2 = await mockVRF.write.triggerCallback([
    coinFlip.address,
    reqId2,
    rand2
  ]);
  await publicClient.waitForTransactionReceipt({ hash: cbHash2 });

  const revealed2 = await coinFlip.getEvents.FlipRevealed();
  const lastReveal2 = revealed2[revealed2.length - 1];
  console.log(
    `Result #2: choice=${lastReveal2.args.choice === 0 ? "HEADS" : "TAILS"}, ` +
    `result=${lastReveal2.args.result === 0 ? "HEADS" : "TAILS"}, ` +
    `didWin=${lastReveal2.args.didWin}, payout=${formatEther(lastReveal2.args.payout)} ETH`
  );

  // Final balances.
  const player1Bal = await publicClient.getBalance({ address: player1.account.address });
  const contractBal = await coinFlip.read.contractBalance();
  console.log(`\nPlayer1 balance:   ${formatEther(player1Bal)} ETH`);
  console.log(`Contract balance:  ${formatEther(contractBal)} ETH`);

  console.log("\nLocal test completed.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test script failed:", err);
    process.exit(1);
  });