/**
 * Utility functions for managing bet timestamps
 * 
 * These utilities handle timestamp caching for local development where
 * block timestamps may not be reliable.
 */

import { TIMESTAMP_CACHE_KEY } from '@/config/constants';

/**
 * Get all cached timestamps from localStorage
 */
export function getTimestampCache(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const cached = localStorage.getItem(TIMESTAMP_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

/**
 * Cache a timestamp for a specific request ID
 */
export function setTimestampInCache(requestId: string, timestamp: number): void {
  if (typeof window === 'undefined') return;
  try {
    const cache = getTimestampCache();
    cache[requestId] = timestamp;
    localStorage.setItem(TIMESTAMP_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Failed to cache timestamp:', error);
  }
}

/**
 * Get cached timestamp for a specific request ID
 */
export function getCachedTimestamp(requestId: string): number | null {
  const cache = getTimestampCache();
  return cache[requestId] || null;
}

/**
 * Determine the best timestamp to use for a bet
 * Priority: cached > block (if reasonable) > estimated from block number
 */
export function getBestTimestamp(
  requestIdStr: string,
  blockTimestamp: number,
  blockNumber: bigint,
  latestBlockNumber: bigint
): number {
  const now = Math.floor(Date.now() / 1000);
  
  // Try cached timestamp first
  const cachedTimestamp = getCachedTimestamp(requestIdStr);
  if (cachedTimestamp) {
    return cachedTimestamp;
  }
  
  // Check if block timestamp is reasonable (within last 24 hours or not too far in future)
  const isReasonable = blockTimestamp > 0 && 
                      blockTimestamp > now - 86400 && 
                      blockTimestamp <= now + 3600;
  
  if (isReasonable) {
    return blockTimestamp;
  }
  
  // Fallback: estimate from block number (assume ~2 seconds per block)
  const blocksAgo = Number(latestBlockNumber - blockNumber);
  return now - (blocksAgo * 2);
}

/**
 * Format timestamp as relative time string
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  // Handle invalid/future timestamps
  if (diff < 0 || timestamp === 0) return 'Just now';
  
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return 'Over a week ago';
}

