import type {
  AllocationData,
  AllocationTarget,
  RebalanceInput,
  RebalanceOptions,
  RebalanceResult,
  RebalanceSummary,
  RebalanceWarning,
  TradeRecommendation,
} from "../../types";
import type { RebalanceStrategy } from "./types";

/**
 * Asset data merged from current allocations and targets
 */
interface MergedAssetData {
  currentPercent: number;
  targetPercent: number;
  currentValue: number;
  symbol?: string;
  name?: string;
}

/**
 * Simple rebalancing strategy
 *
 * Calculates the delta between current and target values for each asset.
 * This is the baseline strategy - it simply computes what needs to be
 * bought or sold to reach exact target allocations.
 */
export class SimpleRebalanceStrategy implements RebalanceStrategy {
  readonly name = "simple";
  readonly description = "Calculate direct path to target allocations";

  calculate(input: RebalanceInput, options: Required<RebalanceOptions>): RebalanceResult {
    const warnings: RebalanceWarning[] = [];

    // Step 1: Build a merged map of all asset classes
    const assetMap = this.buildAssetMap(input.allocations, input.targets, warnings);

    // Step 2: Calculate recommendations for each asset
    const recommendations = this.calculateRecommendations(
      assetMap,
      input.totalPortfolioValue,
      options,
      warnings,
    );

    // Step 3: Build summary
    const summary = this.buildSummary(recommendations, options);

    return {
      recommendations,
      summary,
      warnings,
      metadata: {
        calculatedAt: new Date(),
        strategyUsed: this.name,
        baseCurrency: input.baseCurrency,
        totalPortfolioValue: input.totalPortfolioValue,
      },
    };
  }

  /**
   * Build unified map of all assets (current + targets)
   */
  private buildAssetMap(
    allocations: AllocationData[],
    targets: AllocationTarget[],
    warnings: RebalanceWarning[],
  ): Map<string, MergedAssetData> {
    const map = new Map<string, MergedAssetData>();

    // Add current allocations
    for (const allocation of allocations) {
      map.set(allocation.assetClass, {
        currentPercent: allocation.current,
        targetPercent: 0, // Will be updated if target exists
        currentValue: allocation.marketValue,
        symbol: allocation.symbol,
        name: allocation.name,
      });
    }

    // Merge in targets
    for (const target of targets) {
      const existing = map.get(target.assetClass);
      if (existing) {
        existing.targetPercent = target.target;
      } else {
        // Target exists but no current holding
        map.set(target.assetClass, {
          currentPercent: 0,
          targetPercent: target.target,
          currentValue: 0,
          name: target.assetClass,
        });
        warnings.push({
          type: "TARGET_NO_ASSET",
          assetClass: target.assetClass,
          message: `Target set for "${target.assetClass}" but no current holdings found`,
        });
      }
    }

    // Warn about assets without targets (only if they have value)
    for (const [assetClass, data] of map) {
      if (data.currentPercent > 0 && data.targetPercent === 0) {
        warnings.push({
          type: "ASSET_NO_TARGET",
          assetClass,
          message: `"${assetClass}" has holdings but no target allocation set`,
        });
      }
    }

    return map;
  }

  /**
   * Calculate trade recommendations from the asset map
   */
  private calculateRecommendations(
    assetMap: Map<string, MergedAssetData>,
    totalValue: number,
    options: Required<RebalanceOptions>,
    warnings: RebalanceWarning[],
  ): TradeRecommendation[] {
    const recommendations: TradeRecommendation[] = [];

    for (const [assetClass, data] of assetMap) {
      const currentValue = data.currentValue;
      const targetValue = (data.targetPercent / 100) * totalValue;
      const deltaValue = targetValue - currentValue;
      const deltaPercent = data.targetPercent - data.currentPercent;

      // Apply tolerance filter
      if (Math.abs(deltaPercent) <= options.tolerancePercent) {
        recommendations.push({
          assetClass,
          symbol: data.symbol,
          name: data.name,
          action: "HOLD",
          currentValue,
          targetValue,
          currentPercent: data.currentPercent,
          targetPercent: data.targetPercent,
          deltaValue: 0,
          deltaPercent: 0,
        });
        continue;
      }

      // Apply minimum trade size filter
      if (Math.abs(deltaValue) < options.minimumTradeSize && Math.abs(deltaValue) > 0) {
        warnings.push({
          type: "SMALL_TRADE",
          assetClass,
          message: `Trade of $${Math.abs(deltaValue).toFixed(2)} is below minimum of $${options.minimumTradeSize}`,
        });
        recommendations.push({
          assetClass,
          symbol: data.symbol,
          name: data.name,
          action: "HOLD",
          currentValue,
          targetValue,
          currentPercent: data.currentPercent,
          targetPercent: data.targetPercent,
          deltaValue: 0,
          deltaPercent: 0,
        });
        continue;
      }

      // Determine action
      let action: "BUY" | "SELL" | "HOLD";
      if (deltaValue > 0) {
        action = "BUY";
      } else if (deltaValue < 0) {
        action = "SELL";
      } else {
        action = "HOLD";
      }

      recommendations.push({
        assetClass,
        symbol: data.symbol,
        name: data.name,
        action,
        currentValue,
        targetValue,
        currentPercent: data.currentPercent,
        targetPercent: data.targetPercent,
        deltaValue,
        deltaPercent,
      });
    }

    // Sort by absolute delta (largest trades first)
    return recommendations.sort((a, b) => Math.abs(b.deltaValue) - Math.abs(a.deltaValue));
  }

  /**
   * Build summary statistics
   */
  private buildSummary(
    recommendations: TradeRecommendation[],
    options: Required<RebalanceOptions>,
  ): RebalanceSummary {
    const buys = recommendations.filter((r) => r.action === "BUY");
    const sells = recommendations.filter((r) => r.action === "SELL");

    const totalBuyAmount = buys.reduce((sum, r) => sum + r.deltaValue, 0);
    const totalSellAmount = Math.abs(sells.reduce((sum, r) => sum + r.deltaValue, 0));

    // Net cash flow: positive means sells provide more than buys need
    const netCashFlow = totalSellAmount - totalBuyAmount;

    const tradeCount = recommendations.filter((r) => r.action !== "HOLD").length;

    // Check if portfolio is balanced (all within tolerance)
    const isBalanced = recommendations.every(
      (r) => r.action === "HOLD" || Math.abs(r.deltaPercent) <= options.tolerancePercent,
    );

    return {
      totalBuyAmount,
      totalSellAmount,
      netCashFlow,
      tradeCount,
      isBalanced,
    };
  }
}

// Singleton instance for convenience
export const simpleRebalanceStrategy = new SimpleRebalanceStrategy();
