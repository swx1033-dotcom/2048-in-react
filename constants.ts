/**
 * Game Layout
 */
export const containerWidthMobile = 288; // px

export const containerWidthDesktop = 464; // px

export const defaultTileCountPerDimension = 4;

export const infiniteModeThreshold = 4096;

export const obstacleTileValue = 0;

/**
 * Animations
 */
export const mergeAnimationDuration = 100; // ms

export const moveAnimationDuration = 200; // ms

/**
 * Game setup
 */
export const gameWinTileValue = 2048;

/**
 * Board sizes
 */
export const boardSizes = [4, 5, 6] as const;

export type BoardSize = typeof boardSizes[number] | 'infinite';
