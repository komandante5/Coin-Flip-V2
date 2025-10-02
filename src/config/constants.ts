/**
 * Application constants
 */

// Default bet amounts
export const DEFAULT_BET_AMOUNT = "0.01";
export const DEFAULT_MIN_BET = 0.01;
export const DEFAULT_MAX_BET = 7.4703;

// Quick bet preset values
export const QUICK_BET_PRESETS = [
  { label: '0.01', value: '0.01' },
  { label: '0.1', value: '0.1' },
  { label: '0.5', value: '0.5' },
  { label: '1.0', value: '1' },
];

// Network configuration
export const EXPECTED_CHAIN_ID = 260; // anvilZkSync

// Animation durations (in milliseconds)
export const ANIMATION_DURATIONS = {
  REVEAL: 3000,
  REVEAL_SHOW_RESULT: 2500,
  WIN_CELEBRATION: 3000,
  BALANCE_UPDATE_DELAY: 3000,
  BET_SLIDE_IN: 600,
};

// Polling intervals (in milliseconds)
export const POLLING_INTERVALS = {
  BET_HISTORY: 30000, // 30 seconds
  GAME_STATS: 30000,  // 30 seconds
  CONTRACT_BALANCE: 10000, // 10 seconds
};

// Cache configuration
export const CACHE_CONFIG = {
  STALE_TIME: 30000, // 30 seconds
  REFETCH_INTERVAL: 30000, // 30 seconds
  BALANCE_REFETCH_INTERVAL: 10000, // 10 seconds
};

// Timestamp cache key for localStorage
export const TIMESTAMP_CACHE_KEY = 'coinflip_bet_timestamps';

// Maximum number of recent flips to display
export const MAX_RECENT_FLIPS = 20;

// Leaderboard configuration
export const LEADERBOARD_CONFIG = {
  MAX_HISTORY_BLOCKS: 10000n,
  MAX_DISPLAYED_WINNERS: 100,
};

