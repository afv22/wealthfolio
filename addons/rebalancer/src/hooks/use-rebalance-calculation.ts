import { useMemo } from "react";
import type { AddonContext } from "@wealthfolio/addon-sdk";
import { usePortfolioAllocation } from "./use-portfolio-allocation";
import { useAllocationTargets } from "./use-allocation-targets";
import { calculateRebalance } from "../lib/rebalance-calculator";
import type { RebalanceResult, RebalanceOptions } from "../types";

interface UseRebalanceCalculationOptions {
  ctx: AddonContext;
  enabled?: boolean;
  options?: RebalanceOptions;
}

interface UseRebalanceCalculationResult {
  result: RebalanceResult | null;
  isLoading: boolean;
  error: Error | null;
  totalPortfolioValue: number;
}

/**
 * Hook that combines portfolio data with targets and computes rebalance recommendations
 *
 * This hook orchestrates the data fetching and calculation, providing
 * a simple interface for components to display rebalancing recommendations.
 *
 * @example
 * ```tsx
 * function RebalancePanel({ ctx }: { ctx: AddonContext }) {
 *   const { result, isLoading, totalPortfolioValue } = useRebalanceCalculation({ ctx });
 *
 *   if (isLoading) return <Spinner />;
 *   if (!result) return <p>Set targets to see recommendations</p>;
 *
 *   return (
 *     <ul>
 *       {result.recommendations.map(rec => (
 *         <li key={rec.assetClass}>
 *           {rec.action} ${Math.abs(rec.deltaValue)} of {rec.assetClass}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useRebalanceCalculation({
  ctx,
  enabled = true,
  options = {},
}: UseRebalanceCalculationOptions): UseRebalanceCalculationResult {
  const {
    data: allocations = [],
    isLoading: allocationsLoading,
    error: allocationsError,
  } = usePortfolioAllocation({ ctx, enabled });

  const {
    targets,
    isLoading: targetsLoading,
    error: targetsError,
  } = useAllocationTargets({ ctx, enabled });

  const isLoading = allocationsLoading || targetsLoading;
  const error = allocationsError || targetsError || null;

  const totalPortfolioValue = useMemo(
    () => allocations.reduce((sum, a) => sum + a.marketValue, 0),
    [allocations]
  );

  const result = useMemo(() => {
    // Don't calculate if still loading or no data
    if (isLoading || allocations.length === 0) {
      return null;
    }

    // Don't calculate if no targets set
    if (targets.length === 0) {
      return null;
    }

    try {
      return calculateRebalance(allocations, targets, options);
    } catch (err) {
      ctx.api.logger.error("Rebalance calculation failed: " + (err as Error).message);
      return null;
    }
  }, [allocations, targets, options, isLoading, ctx.api.logger]);

  return {
    result,
    isLoading,
    error,
    totalPortfolioValue,
  };
}
