import hre from "hardhat";
import path from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";

/**
 * Export ABIs from artifacts to src/abi/ directory
 * Automatically detects whether to use zk or standard artifacts based on network config
 */
async function main() {
  console.log(`Exporting ABIs for network: ${hre.network.name}`);
  
  // Determine which artifacts directory to use
  const isZkSync = hre.network.config.zksync;
  const artifactsDir = isZkSync ? "artifacts-zk" : "artifacts";
  
  console.log(`Using ${artifactsDir} directory (ZKsync: ${isZkSync})`);
  
  // Contracts to export
  const contracts = [
    { name: "CoinFlip", path: "contracts/CoinFlip.sol" },
    { name: "MockVRF", path: "contracts/MockVRF.sol" }
  ];
  
  // Output directory
  const outDir = path.join(process.cwd(), "src", "abi");
  await mkdir(outDir, { recursive: true });
  
  // Copy each contract's ABI
  for (const contract of contracts) {
    const artifactPath = path.join(
      process.cwd(),
      artifactsDir,
      contract.path,
      `${contract.name}.json`
    );
    
    try {
      const artifactContent = await readFile(artifactPath, "utf8");
      const outPath = path.join(outDir, `${contract.name}.json`);
      
      await writeFile(outPath, artifactContent, "utf8");
      console.log(`✓ Exported ${contract.name}.json`);
    } catch (error) {
      console.error(`✗ Failed to export ${contract.name}:`, error);
      throw error;
    }
  }
  
  console.log(`\nABIs exported to ${outDir}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("ABI export failed:", err);
    process.exit(1);
  });

