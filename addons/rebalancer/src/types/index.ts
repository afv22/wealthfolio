// Export your type definitions here
// Example:
// export interface AddonConfig {
//   enabled: boolean;
//   settings: Record<string, any>;
// }
//
// export type AddonPageProps = {
//   onSettingsChange: (settings: Record<string, any>) => void;
// };

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
