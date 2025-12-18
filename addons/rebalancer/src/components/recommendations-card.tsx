import type { AddonContext } from "@wealthfolio/addon-sdk";
import {
  Alert,
  AlertDescription,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  GainAmount,
  Icons,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@wealthfolio/ui";
import { useMemo, useState } from "react";
import { useRebalanceCalculation } from "../hooks";
import { getAvailableStrategies } from "../lib";
import type { RebalanceOptions, RebalanceSummary, TradeRecommendation } from "../types";

interface RecommendationsCardProps {
  ctx: AddonContext;
  className?: string;
}

function getActionBadgeVariant(action: "BUY" | "SELL" | "HOLD") {
  switch (action) {
    case "BUY":
      return "success";
    case "SELL":
      return "destructive";
    case "HOLD":
      return "secondary";
  }
}

function formatPercent(value: number, showSign = false): string {
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 flex-1" />
        </div>
      ))}
    </div>
  );
}

// Empty state when no targets
function NoTargetsState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icons.Goal className="text-muted-foreground mb-3 h-10 w-10" />
      <h3 className="mb-1 font-medium">Set Target Allocations First</h3>
      <p className="text-muted-foreground text-sm">
        Add target allocations to see rebalancing recommendations
      </p>
    </div>
  );
}

// State when portfolio is already balanced
function BalancedState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icons.CheckCircle className="text-success mb-3 h-10 w-10" />
      <h3 className="mb-1 font-medium">Portfolio is Balanced</h3>
      <p className="text-muted-foreground text-sm">
        Your portfolio is already aligned with your targets
      </p>
    </div>
  );
}

// Individual recommendation row
function RecommendationRow({ rec, currency }: { rec: TradeRecommendation; currency: string }) {
  return (
    <div
      className={cn(
        "grid gap-2 rounded-lg border p-3",
        "grid-cols-1 sm:grid-cols-[1fr_auto_1fr_1fr_1fr]",
      )}
    >
      {/* Asset name + symbol */}
      <div className="flex flex-col">
        <span className="font-medium">{rec.assetClass}</span>
        {rec.symbol && rec.symbol !== rec.assetClass && (
          <span className="text-muted-foreground text-xs">{rec.symbol}</span>
        )}
      </div>

      {/* Action badge */}
      <div className="flex items-center">
        <Badge variant={getActionBadgeVariant(rec.action)}>{rec.action}</Badge>
      </div>

      {/* Current */}
      <div className="text-right">
        <div className="text-muted-foreground text-xs sm:hidden">Current</div>
        <div className="text-sm">
          {new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
          }).format(rec.currentValue)}
        </div>
        <div className="text-muted-foreground text-xs">{formatPercent(rec.currentPercent)}</div>
      </div>

      {/* Target */}
      <div className="text-right">
        <div className="text-muted-foreground text-xs sm:hidden">Target</div>
        <div className="text-sm">
          {new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
          }).format(rec.targetValue)}
        </div>
        <div className="text-muted-foreground text-xs">{formatPercent(rec.targetPercent)}</div>
      </div>

      {/* Delta */}
      <div className="text-right">
        <div className="text-muted-foreground text-xs sm:hidden">Trade</div>
        <GainAmount value={rec.deltaValue} currency={currency} displayDecimal={false} />
        <div
          className={cn(
            "text-xs",
            rec.deltaPercent > 0
              ? "text-success"
              : rec.deltaPercent < 0
                ? "text-destructive"
                : "text-muted-foreground",
          )}
        >
          {formatPercent(rec.deltaPercent, true)}
        </div>
      </div>
    </div>
  );
}

// Summary section
function SummarySection({ summary, currency }: { summary: RebalanceSummary; currency: string }) {
  return (
    <div className="mt-6 border-t pt-4">
      <h4 className="mb-3 text-sm font-medium">Summary</h4>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-muted-foreground text-xs">Total Buy</div>
          <GainAmount
            value={summary.totalBuyAmount}
            currency={currency}
            className="justify-center font-semibold"
            displayDecimal={false}
          />
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Total Sell</div>
          <GainAmount
            value={-summary.totalSellAmount}
            currency={currency}
            className="justify-center font-semibold"
            displayDecimal={false}
          />
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Net Cash Flow</div>
          <GainAmount
            value={summary.netCashFlow}
            currency={currency}
            className="justify-center font-semibold"
            displayDecimal={false}
          />
        </div>
      </div>

      {/* Trade count */}
      <div className="text-muted-foreground mt-3 text-center text-sm">
        {summary.tradeCount} trade{summary.tradeCount !== 1 ? "s" : ""} recommended
      </div>
    </div>
  );
}

// Warnings section
function WarningsSection({ warnings }: { warnings: { message: string }[] }) {
  if (warnings.length === 0) return null;

  return (
    <Alert variant="warning" className="mb-4">
      <Icons.AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <ul className="list-disc space-y-1 pl-4">
          {warnings.map((w, i) => (
            <li key={i} className="text-sm">
              {w.message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

// Main component
export default function RecommendationsCard({ ctx, className }: RecommendationsCardProps) {
  const [strategy, setStrategy] = useState<string>("simple");

  const options: RebalanceOptions = useMemo(
    () => ({
      strategy: strategy as "simple",
    }),
    [strategy],
  );

  const { result, isLoading } = useRebalanceCalculation({
    ctx,
    options,
  });

  const currency = result?.metadata.baseCurrency ?? "USD";
  const strategies = getAvailableStrategies();

  // Filter out HOLD recommendations for cleaner display
  const actionableRecommendations =
    result?.recommendations.filter((r) => r.action !== "HOLD") ?? [];

  // Determine content to render
  const renderContent = () => {
    if (isLoading) {
      return <LoadingSkeleton />;
    }

    if (!result) {
      return <NoTargetsState />;
    }

    if (result.summary.isBalanced || actionableRecommendations.length === 0) {
      return <BalancedState />;
    }

    return (
      <>
        <WarningsSection warnings={result.warnings} />

        {/* Column headers - desktop only */}
        <div className="text-muted-foreground mb-2 hidden grid-cols-[1fr_auto_1fr_1fr_1fr] gap-2 text-xs font-medium sm:grid">
          <div>Asset</div>
          <div className="w-14 text-center">Action</div>
          <div className="text-right">Current</div>
          <div className="text-right">Target</div>
          <div className="text-right">Trade</div>
        </div>

        {/* Recommendations list */}
        <div className="space-y-2">
          {actionableRecommendations.map((rec) => (
            <RecommendationRow key={rec.assetClass} rec={rec} currency={currency} />
          ))}
        </div>

        <SummarySection summary={result.summary} currency={currency} />
      </>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle>Rebalancing Recommendations</CardTitle>
          <CardDescription>Trade recommendations to reach your targets</CardDescription>
        </div>
        <Select value={strategy} onValueChange={setStrategy}>
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue placeholder="Strategy" />
          </SelectTrigger>
          <SelectContent>
            {strategies.map((s) => (
              <SelectItem key={s} value={s}>
                {capitalize(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
