import hre from "hardhat";
import { parseEther, formatEther } from "viem";
// Use the addresses from the deployment file
const addresses = {
  coinFlip: "0xd7385ba726A7b72933E63FCb0Dfee8Bcae63478c",
  mockVRF: "0x82778c3185fD0666d3f34F8930B4287405D9fBe4",
  owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
};

async function main() {
  console.log("Testing CoinFlip contracts...");

  // Get viem helpers from hardhat runtime environment.
  const { viem } = hre;
  
  // The first wallet client is used as the tester.
  const [tester] = await viem.getWalletClients();
  console.log(`Tester address: ${tester.account.address}`);

  // Get contract instances
  const coinFlip = await viem.getContractAt("CoinFlip", addresses.coinFlip as `0x${string}`);
  const mockVRF = await viem.getContractAt("MockVRF", addresses.mockVRF as `0x${string}`);

  console.log(`CoinFlip address: ${addresses.coinFlip}`);
  console.log(`MockVRF address: ${addresses.mockVRF}`);

  // Test 1: Check contract state
  console.log("\n=== Test 1: Contract State ===");
  try {
    const balance = await coinFlip.read.contractBalance();
    const gameStats = await coinFlip.read.getGameStats();
    
    console.log(`Contract Balance: ${formatEther(balance)} ETH`);
    console.log(`Min Bet: ${formatEther(gameStats[4])} ETH`);
    console.log(`Max Bet: ${formatEther(gameStats[5])} ETH`);
  } catch (error) {
    console.error("Error reading contract state:", error);
  }

  // Test 2: Check if we can place a bet
  console.log("\n=== Test 2: Bet Validation ===");
  try {
    const betAmount = parseEther("0.01");
    const canBet = await coinFlip.read.canPlaceBet([betAmount]);
    console.log(`Can place 0.01 ETH bet:`, canBet);
  } catch (error) {
    console.error("Error checking bet validation:", error);
  }

  // Test 3: Try to place a small bet
  console.log("\n=== Test 3: Place Bet ===");
  try {
    const betAmount = parseEther("0.01");
    console.log(`Placing bet of ${formatEther(betAmount)} ETH...`);
    
    // Place bet (Heads = 0)
    const txHash = await coinFlip.write.flipCoin([0], {
      account: tester.account,
      value: betAmount,
      gas: BigInt(500000)
    });
    
    console.log(`Bet transaction hash: ${txHash}`);
    
    // Wait for transaction
    const publicClient = await viem.getPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);
    
    // Check for events
    const events = receipt.logs.filter(log => 
      log.address.toLowerCase() === addresses.coinFlip.toLowerCase()
    );
    console.log(`Found ${events.length} events from CoinFlip contract`);
    
    if (events.length > 0) {
      console.log("Events found - bet was successful!");
    }
    
  } catch (error) {
    console.error("Error placing bet:", error);
  }

  // Test 4: Check MockVRF
  console.log("\n=== Test 4: MockVRF Test ===");
  try {
    const nextRequestId = await mockVRF.read.getNextRequestId();
    console.log(`Next request ID: ${nextRequestId}`);
    
    // Test requesting a random number
    const requestId = await mockVRF.write.requestRandomNumberWithTraceId([0], {
      account: tester.account,
      gas: BigInt(100000)
    });
    console.log(`Random number request ID: ${requestId}`);
    
  } catch (error) {
    console.error("Error testing MockVRF:", error);
  }

  console.log("\n=== Test Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
