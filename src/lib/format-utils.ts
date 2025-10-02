/**
 * Formatting utility functions
 */

/**
 * Format Ethereum address to short format (0x1234...5678)
 */
export function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Format Ethereum address to even shorter format for small spaces
 */
export function formatShortAddress(addr: string): string {
  return `${addr.slice(0, 4)}...${addr.slice(-2)}`;
}

/**
 * Format ETH amount to fixed decimal places
 */
export function formatEth(value: bigint, decimals: number = 4): string {
  try {
    const formatted = Number(value) / 1e18;
    return formatted.toFixed(decimals);
  } catch {
    return '0.'.padEnd(decimals + 2, '0');
  }
}

