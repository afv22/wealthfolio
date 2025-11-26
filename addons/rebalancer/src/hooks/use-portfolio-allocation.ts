import { useQuery } from "@tanstack/react-query";
import { type AddonContext } from "@wealthfolio/addon-sdk";
import { useAccounts } from "./use-accounts";

interface AllocationData {
  assetClass: string; // Using this field name for compatibility, but will store symbol/name
  current: number;
  marketValue: number;
  symbol?: string;
  name?: string;
}

interface UsePortfolioAllocationOptions {
  ctx: AddonContext;
  enabled?: boolean;
}

export function usePortfolioAllocation({ ctx, enabled = true }: UsePortfolioAllocationOptions) {
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts({ ctx, enabled });

  return useQuery<AllocationData[]>({
    queryKey: ["portfolio-allocation", accounts.map((a) => a.id)],
    queryFn: async () => {
      // Fetch holdings for all accounts in parallel
      const holdingsArrays = await Promise.all(
        accounts.map((account) => ctx.api.portfolio.getHoldings(account.id)),
      );
      const allHoldings = holdingsArrays.flat();

      // Group by asset (symbol/name)
      const assetMap = new Map<
        string,
        { marketValue: number; symbol: string; name: string; count: number }
      >();
      let totalMarketValue = 0;

      for (const holding of allHoldings) {
        // Skip if no market value - use base currency value
        if (!holding.marketValue?.base) continue;

        const marketValue = holding.marketValue.base;
        totalMarketValue += marketValue;

        // Use symbol as the unique identifier, fallback to holding type
        let identifier: string;
        let displayName: string;
        let symbol = "";

        // Aggregate Cash and Money Market accounts
        if (
          holding.holdingType === "cash" ||
          (holding.instrument && holding.instrument.assetClass === "MONEY_MARKET")
        ) {
          identifier = "CASH";
          displayName = "Cash";
        } else if (holding.instrument) {
          symbol = holding.instrument.symbol || "";
          identifier = symbol;
          displayName = holding.instrument.name || symbol || "Unknown";
        } else {
          identifier = `UNKNOWN_${holding.id}`;
          displayName = "Unknown Asset";
        }

        const existing = assetMap.get(identifier) || {
          marketValue: 0,
          symbol: "",
          name: "",
          count: 0,
        };
        assetMap.set(identifier, {
          marketValue: existing.marketValue + marketValue,
          symbol: symbol || existing.symbol,
          name: displayName,
          count: existing.count + 1,
        });
      }

      // Convert to array and calculate percentages
      const allocations: AllocationData[] = Array.from(assetMap.entries()).map(([key, data]) => ({
        assetClass: data.name, // Use name for display
        current: totalMarketValue > 0 ? (data.marketValue / totalMarketValue) * 100 : 0,
        marketValue: data.marketValue,
        symbol: data.symbol,
        name: data.name,
      }));

      // Sort by market value descending
      allocations.sort((a, b) => b.marketValue - a.marketValue);

      return allocations;
    },
    enabled: enabled && !!ctx.api && !accountsLoading && accounts.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  });
}
