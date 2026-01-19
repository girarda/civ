/**
 * Turn estimation utilities for production.
 */

/** Overflow cap as percentage of next item's cost */
const OVERFLOW_CAP_PERCENT = 0.5;

/**
 * Calculate turns remaining to complete production.
 * @param progress Current accumulated progress
 * @param cost Total cost to complete
 * @param productionPerTurn Production yield per turn
 * @returns Number of turns remaining (minimum 1 if any progress needed)
 */
export function calculateTurnsToComplete(
  progress: number,
  cost: number,
  productionPerTurn: number
): number {
  if (productionPerTurn <= 0) return Infinity;
  const remaining = cost - progress;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / productionPerTurn);
}

/**
 * Calculate turns to complete for current production and all queued items.
 * Accounts for overflow between items (capped at 50%).
 *
 * @param currentProgress Progress on current item
 * @param currentCost Cost of current item
 * @param queueCosts Array of costs for queued items
 * @param productionPerTurn Production yield per turn
 * @returns Array of cumulative turn counts [currentTurns, queue0Turns, queue1Turns, ...]
 */
export function calculateQueueTurns(
  currentProgress: number,
  currentCost: number,
  queueCosts: number[],
  productionPerTurn: number
): number[] {
  if (productionPerTurn <= 0) {
    return [Infinity, ...queueCosts.map(() => Infinity)];
  }

  const results: number[] = [];
  let accumulatedTurns = 0;
  let overflow = 0;

  // Current item
  const currentRemaining = currentCost - currentProgress;
  const currentTurns = Math.ceil(currentRemaining / productionPerTurn);
  results.push(currentTurns);
  accumulatedTurns = currentTurns;

  // Calculate overflow from current item
  const totalProduced = currentProgress + currentTurns * productionPerTurn;
  overflow = totalProduced - currentCost;

  // Queue items
  for (const cost of queueCosts) {
    const cappedOverflow = Math.min(overflow, Math.floor(cost * OVERFLOW_CAP_PERCENT));
    const startingProgress = cappedOverflow;
    const remaining = cost - startingProgress;
    const turns = Math.ceil(remaining / productionPerTurn);

    // Store cumulative turn count for display purposes
    accumulatedTurns += turns;
    results.push(accumulatedTurns);

    // Calculate overflow for next item
    const totalProducedForItem = startingProgress + turns * productionPerTurn;
    overflow = totalProducedForItem - cost;
  }

  return results;
}
