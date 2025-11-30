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
