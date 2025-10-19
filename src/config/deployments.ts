import { getDeploymentsFile, getSelectedNetwork } from "@/config/networks";

// Static imports for all deployment files
import abstractMainnetDeployments from "@/deployments.abstractMainnet.json";
import abstractTestnetDeployments from "@/deployments.abstractTestnet.json";
import localhostDeployments from "@/deployments.localhost.json";
import inMemoryNodeDeployments from "@/deployments.inMemoryNode.json";

export type DeploymentAddresses = {
  network: string;
  coinFlip: `0x${string}`;
  mockVRF: `0x${string}`;
  owner: `0x${string}`;
};

// Map deployment files to their imported JSON
const deploymentMap: Record<string, DeploymentAddresses> = {
  "abstractMainnet.json": abstractMainnetDeployments as DeploymentAddresses,
  "abstractTestnet.json": abstractTestnetDeployments as DeploymentAddresses,
  "localhost.json": localhostDeployments as DeploymentAddresses,
  "inMemoryNode.json": inMemoryNodeDeployments as DeploymentAddresses,
};

export function getDeployments(): DeploymentAddresses {
  const filename = getDeploymentsFile();
  const deployments = deploymentMap[filename];

  if (!deployments) {
    throw new Error(
      `Deployment addresses not found for network ${getSelectedNetwork().label} (${filename}). Ensure the deployments file exists.`
    );
  }

  if (!deployments.coinFlip || !deployments.mockVRF) {
    throw new Error(
      `Invalid deployment data for network ${getSelectedNetwork().label}. Missing required addresses.`
    );
  }

  return deployments;
}
