import type {
  AllocationData,
  AllocationTarget,
  RebalanceResult,
  RebalanceOptions,
} from '../types';
import { DEFAULT_REBALANCE_OPTIONS } from '../types';
import type { RebalanceStrategy, StrategyRegistry } from './strategies/types';
import { simpleRebalanceStrategy } from './strategies/simple-rebalance';

/**
 * Registry of available strategies
 * New strategies can be added here as they are implemented
 */
const strategyRegistry: StrategyRegistry = {
  simple: simpleRebalanceStrategy,
  // Future strategies:
  // 'tax-aware': taxAwareStrategy,
  // 'minimize-trades': minimizeTradesStrategy,
};

/**
 * Main calculation function - pure function for testability
 *
 * Computes the trade recommendations needed to move from current allocations
 * to target allocations. This is the primary entry point for the calculation engine.
 *
 * @param allocations Current portfolio allocations
 * @param targets User-defined target allocations
 * @param options Optional configuration (strategy, tolerances, etc.)
 * @returns Complete rebalance result with recommendations, summary, and warnings
 *
 * @example
 * ```typescript
 * const allocations = [
 *   { assetClass: 'Stocks', current: 40, marketValue: 4000, symbol: 'VTI' },
 *   { assetClass: 'Bonds', current: 60, marketValue: 6000, symbol: 'BND' },
 * ];
 * const targets = [
 *   { assetClass: 'Stocks', target: 60 },
 *   { assetClass: 'Bonds', target: 40 },
 * ];
 *
 * const result = calculateRebalance(allocations, targets);
 * // result.recommendations will show:
 * // - Stocks: BUY $2000 (40% -> 60%)
 * // - Bonds: SELL $2000 (60% -> 40%)
 * ```
 */
export function calculateRebalance(
  allocations: AllocationData[],
  targets: AllocationTarget[],
  options: RebalanceOptions = {}
): RebalanceResult {
  const opts: Required<RebalanceOptions> = { ...DEFAULT_REBALANCE_OPTIONS, ...options };

  // Calculate total portfolio value from allocations
  const totalPortfolioValue = allocations.reduce((sum, a) => sum + a.marketValue, 0);

  // Default base currency (could be passed as option in future)
  const baseCurrency = 'USD';

  // Get the appropriate strategy
  const strategy = strategyRegistry[opts.strategy];
  if (!strategy) {
    throw new Error(`Unknown rebalance strategy: ${opts.strategy}`);
  }

  // Execute calculation
  return strategy.calculate(
    {
      allocations,
      targets,
      totalPortfolioValue,
      baseCurrency,
    },
    opts
  );
}

/**
 * Get list of available strategy names
 *
 * Useful for UI dropdowns or configuration
 */
export function getAvailableStrategies(): string[] {
  return Object.keys(strategyRegistry);
}

/**
 * Get strategy description by name
 *
 * @param name Strategy name
 * @returns Description string or undefined if strategy not found
 */
export function getStrategyDescription(name: string): string | undefined {
  return strategyRegistry[name]?.description;
}

/**
 * Register a new strategy
 *
 * Allows extending the calculator with custom strategies at runtime.
 * Useful for plugins or advanced use cases.
 *
 * @param name Unique strategy name
 * @param strategy Strategy implementation
 */
export function registerStrategy(name: string, strategy: RebalanceStrategy): void {
  strategyRegistry[name] = strategy;
}
