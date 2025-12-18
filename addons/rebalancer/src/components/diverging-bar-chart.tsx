import { AddonContext } from "@wealthfolio/addon-sdk";
import { Card, CardContent, CardHeader, CardTitle, cn } from "@wealthfolio/ui";
import { useMemo } from "react";
import { useAllocationTargets, usePortfolioAllocation } from "../hooks";

interface DivergingBarChartProps {
  ctx: AddonContext;
  title?: string;
  className?: string;
}

export default ({
  ctx,
  title = "Portfolio Allocation vs Target",
  className,
}: DivergingBarChartProps) => {
  const { data: allocations = [] } = usePortfolioAllocation({ ctx });
  const { targets } = useAllocationTargets({ ctx });

  // Merge current allocations with target allocations
  const data = useMemo(() => {
    // Create a map of all asset classes (current + targets)
    const allAssetClasses = new Set<string>();
    allocations.forEach((a) => allAssetClasses.add(a.assetClass));
    targets.forEach((t) => allAssetClasses.add(t.assetClass));

    // Build chart data
    return Array.from(allAssetClasses)
      .map((assetClass) => {
        const currentData = allocations.find((a) => a.assetClass === assetClass);
        const targetData = targets.find((t) => t.assetClass === assetClass);
        const target = targetData?.target || 0;
        const current = currentData?.current || 0;

        return {
          assetClass,
          current,
          target,
        };
      })
      .filter((d) => d.current > 0 || d.target > 0) // Only show asset classes with data
      .sort((a, b) => {
        // Sort by whichever is larger (current or target)
        const aMax = Math.max(a.current, a.target);
        const bMax = Math.max(b.current, b.target);
        return bMax - aMax;
      });
  }, [allocations, targets]);

  // Check if any targets are set
  const hasTargets = data.some((d) => d.target > 0);

  // Find max value for scaling
  const maxValue = Math.max(...data.flatMap((d) => [d.current, d.target]), 0);
  const scale = maxValue > 0 ? 100 / maxValue : 1;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Header labels - only show if targets exist */}
        {hasTargets && (
          <div className="text-muted-foreground grid grid-cols-2 gap-4 text-sm font-medium">
            <div className="pr-2 text-right">Target</div>
            <div className="pl-2 text-left">Current</div>
          </div>
        )}

        {/* Chart rows */}
        <div className="space-y-6">
          {data.map((item, index) => {
            const deviation = item.current - item.target;
            const currentScaled = item.current * scale;
            const targetScaled = item.target * scale;

            // Determine which side is larger
            const isCurrentLarger = item.current > item.target;

            return (
              <div key={index} className="space-y-1">
                {/* Asset class label */}
                <div className="text-sm font-medium">{item.assetClass}</div>

                {/* Bar container */}
                <div className="relative">
                  {hasTargets ? (
                    <>
                      {/* Grid container for left (target) and right (current) */}
                      <div className="relative grid grid-cols-2 items-center gap-0">
                        {/* Left side - Target allocation */}
                        <div className="relative flex h-8 items-center pr-1">
                          {/* Target bar - positioned absolutely from right edge */}
                          <div
                            className="absolute right-1 h-6 rounded-l"
                            style={{
                              width: `${targetScaled}%`,
                              backgroundColor: "rgba(118, 141, 33, 0.3)",
                            }}
                          />

                          {/* Target percentage label */}
                          <div className="text-foreground absolute right-2 z-10 text-xs font-medium">
                            {item.target.toFixed(1)}%
                          </div>
                        </div>

                        {/* Right side - Current allocation */}
                        <div className="relative flex h-8 items-center justify-start pl-1">
                          {/* Current bar */}
                          <div
                            className="h-6 rounded-r"
                            style={{
                              width: `${currentScaled}%`,
                              backgroundColor: "rgba(49, 113, 178, 0.3)",
                            }}
                          />

                          {/* Current percentage label */}
                          <div className="text-foreground absolute left-2 z-10 text-xs font-medium">
                            {item.current.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      {/* Center axis line */}
                      <div className="bg-border absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2" />

                      {/* Overlay bar showing deviation - only the delta amount */}
                      {deviation !== 0 && (
                        <div
                          className={cn(
                            "absolute top-1 h-6",
                            isCurrentLarger ? "rounded-r" : "rounded-l",
                          )}
                          style={{
                            width: `${(Math.abs(deviation) * scale) / 2}%`,
                            backgroundColor: isCurrentLarger
                              ? "rgba(49, 113, 178, 0.6)"
                              : "rgba(118, 141, 33, 0.6)",
                            ...(isCurrentLarger
                              ? { left: "calc(50% + 4px)" }
                              : { right: "calc(50% + 4px)" }),
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      {/* Centered horizontal bar for current allocation only */}
                      <div className="grid grid-cols-2 items-center gap-0">
                        {/* Left spacer */}
                        <div className="relative flex h-8 items-center justify-end pr-1" />

                        {/* Right side - Current allocation extending from center */}
                        <div className="relative flex h-8 items-center justify-start pl-1">
                          <div
                            className="h-6 rounded-r"
                            style={{
                              width: `${currentScaled}%`,
                              backgroundColor: "rgba(49, 113, 178, 0.6)",
                            }}
                          />
                          <div className="text-foreground absolute left-2 text-xs font-medium">
                            {item.current.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      {/* Center axis line */}
                      <div className="bg-border absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2" />
                    </>
                  )}
                </div>

                {/* Deviation indicator below - always show if targets exist and there's a delta */}
                {hasTargets && Math.abs(deviation) > 0 && (
                  <div className="text-center text-xs">
                    <span className="text-muted-foreground">
                      {deviation > 0 ? "+" : ""}
                      {deviation.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
