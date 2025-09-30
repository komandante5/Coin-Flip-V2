import hre from "hardhat";
import { parseEther, formatEther } from "viem";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

async function main() {
  console.log("Deploying CoinFlip to Sepolia testnet...");

  // Get viem helpers from hardhat runtime environment
  const { viem } = hre;

  // Get the deployer account
  const [owner] = await viem.getWalletClients();
  console.log(`Owner (deployer): ${owner.account.address}`);

  // Check owner balance
  const balance = await viem.getPublicClient().getBalance({ address: owner.account.address });
  console.log(`Owner balance: ${formatEther(balance)} ETH`);

  // For Sepolia, you'll need to deploy with a real VRF implementation
  // For now, let's deploy with a placeholder VRF address that you'll update later
  // You can use Chainlink VRF or any other VRF service
  
  // Placeholder VRF address - UPDATE THIS with actual Sepolia VRF address
  const vrfAddress = "0x0000000000000000000000000000000000000000"; // PLACEHOLDER
  
  console.log("Deploying CoinFlip with VRF address:", vrfAddress);
  
  const coinFlip = await viem.deployContract("CoinFlip", [
    owner.account.address,
    vrfAddress
  ]);
  
  console.log(`CoinFlip deployed at: ${coinFlip.address}`);

  // Fund the contract (optional, but recommended for testing)
  console.log("Funding CoinFlip with 0.1 ETH...");
  const fundHash = await coinFlip.write.depositFunds({
    account: owner.account,
    value: parseEther("0.1")
  });

  await viem.getPublicClient().waitForTransactionReceipt({ hash: fundHash });

  // Save deployment info
  const outDir = path.join(process.cwd(), "deployments");
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, "sepolia.json");
  await writeFile(
    outFile,
    JSON.stringify(
      {
        network: "sepolia",
        coinFlip: coinFlip.address,
        vrfAddress: vrfAddress,
        owner: owner.account.address,
        deploymentTx: fundHash
      },
      null,
      2
    )
  );
  
  console.log(`Deployment info saved to ${outFile}`);
  console.log("\nDeployment successful!");
  console.log(`- CoinFlip: ${coinFlip.address}`);
  console.log(`- Owner: ${owner.account.address}`);
  console.log(`- VRF Address: ${vrfAddress}`);
  console.log("\nIMPORTANT: Update the VRF address with a real Sepolia VRF implementation!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Deployment failed:", err);
    process.exit(1);
  });
