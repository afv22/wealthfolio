import type { RebalanceInput, RebalanceResult, RebalanceOptions } from '../../types';

/**
 * Strategy interface - all rebalancing algorithms must implement this
 *
 * This pattern allows swapping calculation algorithms without changing
 * the rest of the codebase. New strategies (tax-aware, minimize-trades, etc.)
 * can be added by implementing this interface.
 */
export interface RebalanceStrategy {
  /** Human-readable name of the strategy */
  readonly name: string;

  /** Short description of what the strategy does */
  readonly description: string;

  /**
   * Calculate trade recommendations to reach target allocations
   * @param input Current portfolio state and targets
   * @param options Configuration options
   * @returns Complete rebalance result with recommendations
   */
  calculate(input: RebalanceInput, options: Required<RebalanceOptions>): RebalanceResult;
}

/**
 * Registry type for available strategies
 */
export type StrategyRegistry = Record<string, RebalanceStrategy>;
