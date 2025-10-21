import hre from "hardhat";
import { parseAbi } from "viem";

async function main() {
  console.log("=== Updating VRF Address ===\n");

  const NEW_VRF_ADDRESS = "0xC04ae87CDd258994614f7fFB8506e69B7Fd8CF1D"; // Proof of Play vRNG
  const COINFLIP_ADDRESS = "0x9b2204b81328eA08785F35CE6B2ce99DCf02A3De"; // Your deployed CoinFlip
  const OWNER_ADDRESS = "0xddEe6D2C51B94AEE3E04b84e6885bA689a0A7401"; // Your owner wallet

  // Get viem client
  const { viem } = hre;
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();
  
  // Find the owner wallet client
  const ownerClient = walletClients.find(
    (client) => client.account.address.toLowerCase() === OWNER_ADDRESS.toLowerCase()
  );

  if (!ownerClient) {
    throw new Error("Owner wallet not found. Make sure you're using the correct account.");
  }

  console.log(`Network: ${hre.network.name}`);
  console.log(`CoinFlip Contract: ${COINFLIP_ADDRESS}`);
  console.log(`Current Owner: ${ownerClient.account.address}`);
  console.log(`New VRF Address: ${NEW_VRF_ADDRESS}\n`);

  // Read current VRF address
  const currentVRF = await publicClient.readContract({
    address: COINFLIP_ADDRESS as `0x${string}`,
    abi: parseAbi(["function vrfAddress() view returns (address)"]),
    functionName: "vrfAddress",
  });

  console.log(`Current VRF Address: ${currentVRF}`);

  if (currentVRF.toLowerCase() === NEW_VRF_ADDRESS.toLowerCase()) {
    console.log("VRF address is already set to the desired address. No update needed.");
    return;
  }

  // Update VRF address
  console.log("\nUpdating VRF address...");
  const hash = await ownerClient.writeContract({
    address: COINFLIP_ADDRESS as `0x${string}`,
    abi: parseAbi(["function setVRFAddress(address _newVRF) external"]),
    functionName: "setVRFAddress",
    args: [NEW_VRF_ADDRESS as `0x${string}`],
    account: ownerClient.account,
  });

  console.log(`Transaction hash: ${hash}`);
  console.log("Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

  // Verify the update
  const updatedVRF = await publicClient.readContract({
    address: COINFLIP_ADDRESS as `0x${string}`,
    abi: parseAbi(["function vrfAddress() view returns (address)"]),
    functionName: "vrfAddress",
  });

  console.log(`\n✅ VRF address successfully updated!`);
  console.log(`New VRF Address: ${updatedVRF}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Update failed:", err);
    process.exit(1);
  });
