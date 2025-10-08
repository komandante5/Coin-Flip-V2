import hre from "hardhat";
import { parseEther, formatEther } from "viem";
import path from "node:path";
import { readFile } from "node:fs/promises";

function toPct(n: number) {
  return `${(n * 100).toFixed(3)}%`;
}

async function main() {
  console.log("Simulating CoinFlip profitability with many trials...");

  // Config via CLI/env
  const trials = Number(process.env.TRIALS ?? process.argv[2] ?? 2000);
  const betEth = String(process.env.BET ?? process.argv[3] ?? "0.1");
  const initialBankrollEth = String(process.env.BANKROLL ?? process.argv[4] ?? "100");

  const { viem } = hre;
  const [owner, player] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  // Deploy or attach to existing contracts
  let coinFlip: Awaited<ReturnType<typeof viem.deployContract<"CoinFlip">>>;
  let mockVRF: Awaited<ReturnType<typeof viem.deployContract<"MockVRF">>>;

  try {
    const networkName = hre.network.name;
    const file = path.join(process.cwd(), "deployments", `${networkName}.json`);
    const saved = JSON.parse(await readFile(file, "utf8")) as {
      coinFlip: string; mockVRF: string;
    };
    console.log(`Loaded addresses from ${file}`);
    mockVRF = await viem.getContractAt("MockVRF", saved.mockVRF as `0x${string}`) as typeof mockVRF;
    coinFlip = await viem.getContractAt("CoinFlip", saved.coinFlip as `0x${string}`) as typeof coinFlip;
  } catch {
    console.log("No saved addresses; deploying new instances...");
    mockVRF = await viem.deployContract("MockVRF");
    coinFlip = await viem.deployContract("CoinFlip", [
      owner.account.address,
      mockVRF.address
    ]);
  }

  // Fund the house
  const fundHash = await coinFlip.write.depositFunds({
    account: owner.account,
    value: parseEther(initialBankrollEth)
  });
  await publicClient.waitForTransactionReceipt({ hash: fundHash });

  const [
    houseEdge,
    winChance,
    payoutMultiplier,
    currentBalance,
    minBetAmount,
    maxBetAmount
  ] = await coinFlip.read.getGameStats();

  const betWeiConfigured = parseEther(betEth);
  const betWei = betWeiConfigured > maxBetAmount ? maxBetAmount : betWeiConfigured;
  if (betWei < minBetAmount) {
    throw new Error(`Configured bet ${betEth} ETH < min bet ${formatEther(minBetAmount)} ETH`);
  }

  console.log("Game params:");
  console.log(`- House Edge:  ${Number(houseEdge) / 1e6}%`);
  console.log(`- Win Chance:  ${Number(winChance) / 1e6}%`);
  console.log(`- Payout Mult: ${Number(payoutMultiplier) / 1e8}x`);
  console.log(`- Min Bet:     ${formatEther(minBetAmount)} ETH`);
  console.log(`- Max Bet:     ${formatEther(maxBetAmount)} ETH`);
  console.log(`- Using Bet:   ${formatEther(betWei)} ETH`);
  console.log(`- Trials:      ${trials}`);

  const initialContractBalance = await coinFlip.read.contractBalance();

  let totalWagered = 0n;
  let totalPayout = 0n;
  let wins = 0;
  let losses = 0;

  // Precompute expected edge from contract constants:
  const expectedEdge = 1 - 0.5 * (Number(payoutMultiplier) / 1e8);

  for (let i = 0; i < trials; i++) {
    // Place bet
    const choice = Math.random() < 0.5 ? 0 : 1;
    const flipHash = await coinFlip.write.flipCoin([choice], {
      account: player.account,
      value: betWei
    });
    await publicClient.waitForTransactionReceipt({ hash: flipHash });

    // Get the request ID from MockVRF - it should be the current counter before we trigger callback
    const nextRequestId = await mockVRF.read.getNextRequestId();
    const reqId = nextRequestId - 1n; // The request we just made
    if (!reqId || reqId <= 0n) throw new Error("Failed to obtain valid requestId");

    // Trigger VRF callback with random number
    const rand = BigInt(Math.floor(Math.random() * 2 ** 31));
    const cbHash = await mockVRF.write.triggerCallback([coinFlip.address, reqId, rand]);
    await publicClient.waitForTransactionReceipt({ hash: cbHash });

    // Get the latest FlipRevealed event
    const reveals = await coinFlip.getEvents.FlipRevealed();
    const last = reveals[reveals.length - 1];
    if (!last) throw new Error("Failed to find FlipRevealed event");
    const didWin: boolean = last.args.didWin;
    const payout: bigint = last.args.payout;

    totalWagered += betWei;
    totalPayout += payout;
    if (didWin) wins++; else losses++;

    if ((i + 1) % Math.max(1, Math.floor(trials / 10)) === 0) {
      const profit = totalWagered - totalPayout;
      const realizedEdge = Number(profit) / Number(totalWagered);
      console.log(
        `Progress ${i + 1}/${trials} | profit=${formatEther(profit)} ETH | edge=${toPct(realizedEdge)}`
      );
    }
  }

  const finalContractBalance = await coinFlip.read.contractBalance();
  const houseProfit = totalWagered - totalPayout;
  const realizedEdge = Number(houseProfit) / Number(totalWagered);

  console.log("\nSimulation results:");
  console.log(`- Wagered:       ${formatEther(totalWagered)} ETH`);
  console.log(`- Payouts:       ${formatEther(totalPayout)} ETH`);
  console.log(`- House Profit:  ${formatEther(houseProfit)} ETH`);
  console.log(`- Wins/Losses:   ${wins}/${losses}`);
  console.log(`- Realized Edge: ${toPct(realizedEdge)} (expected ≈ ${toPct(expectedEdge)})`);
  console.log(`- Balance Δ:     ${formatEther(BigInt(finalContractBalance) - BigInt(initialContractBalance))} ETH`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Simulation failed:", err);
    process.exit(1);
  });
