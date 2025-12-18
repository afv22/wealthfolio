export interface AllocationData {
  assetClass: string; // Using this field name for compatibility, but will store symbol/name
  current: number;
  marketValue: number;
  symbol?: string;
  name?: string;
}

export interface AllocationTarget {
  assetClass: string;
  target: number;
}

export interface HoldingOption {
  name: string;
  symbol?: string;
}

// ============================================
// Rebalance Calculation Types
// ============================================

/**
 * Input for rebalance calculations - combines current state with targets
 */
export interface RebalanceInput {
  allocations: AllocationData[];
  targets: AllocationTarget[];
  totalPortfolioValue: number;
  baseCurrency: string;
}

/**
 * A single trade recommendation
 */
export interface TradeRecommendation {
  assetClass: string;
  symbol?: string;
  name?: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  currentValue: number;
  targetValue: number;
  currentPercent: number;
  targetPercent: number;
  deltaValue: number; // Positive = buy, Negative = sell
  deltaPercent: number; // Percentage point difference
}

/**
 * Complete result from rebalance calculation
 */
export interface RebalanceResult {
  recommendations: TradeRecommendation[];
  summary: RebalanceSummary;
  warnings: RebalanceWarning[];
  metadata: RebalanceMetadata;
}

/**
 * High-level summary of the rebalance
 */
export interface RebalanceSummary {
  totalBuyAmount: number;
  totalSellAmount: number;
  netCashFlow: number; // Positive if sells exceed buys
  tradeCount: number;
  isBalanced: boolean; // True if within tolerance
}

/**
 * Warning about potential issues
 */
export interface RebalanceWarning {
  type: 'ASSET_NO_TARGET' | 'TARGET_NO_ASSET' | 'SMALL_TRADE';
  assetClass: string;
  message: string;
}

/**
 * Metadata about the calculation
 */
export interface RebalanceMetadata {
  calculatedAt: Date;
  strategyUsed: string;
  baseCurrency: string;
  totalPortfolioValue: number;
}

/**
 * Options that can modify calculation behavior
 */
export interface RebalanceOptions {
  /** Ignore trades below this dollar amount */
  minimumTradeSize?: number;
  /** Tolerance for "close enough" - won't recommend trades within this % */
  tolerancePercent?: number;
  /** Strategy to use for calculations */
  strategy?: 'simple';
}

/**
 * Default options for rebalance calculations
 */
export const DEFAULT_REBALANCE_OPTIONS: Required<RebalanceOptions> = {
  minimumTradeSize: 0,
  tolerancePercent: 0,
  strategy: 'simple',
};
