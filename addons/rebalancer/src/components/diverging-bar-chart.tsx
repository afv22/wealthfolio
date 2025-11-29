import { Card, CardContent, CardHeader, CardTitle, cn } from "@wealthfolio/ui";

export interface AllocationDataPoint {
  assetClass: string;
  current: number;
  target: number;
}

interface DivergingBarChartProps {
  data: AllocationDataPoint[];
  title?: string;
  className?: string;
}

export function DivergingBarChart({
  data,
  title = "Portfolio Allocation vs Target",
  className,
}: DivergingBarChartProps) {
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
                      <div className="grid grid-cols-2 items-center gap-0">
                        {/* Left side - Target allocation */}
                        <div className="relative flex h-8 items-center justify-end pr-1">
                          {/* Light target bar */}
                          <div
                            className="h-6 rounded-l bg-green-500/20"
                            style={{ width: `${targetScaled}%` }}
                          />

                          {/* Target percentage label */}
                          <div className="text-foreground absolute right-2 text-xs font-medium">
                            {item.target.toFixed(1)}%
                          </div>
                        </div>

                        {/* Right side - Current allocation */}
                        <div className="relative flex h-8 items-center justify-start pl-1">
                          {/* Light current bar */}
                          <div
                            className="h-6 rounded-r bg-blue-500/20"
                            style={{ width: `${currentScaled}%` }}
                          />

                          {/* Current percentage label */}
                          <div className="text-foreground absolute left-2 text-xs font-medium">
                            {item.current.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      {/* Center axis line */}
                      <div className="bg-border absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2" />

                      {/* Overlay bar showing deviation - extends from center to the end of whichever is larger */}
                      {deviation !== 0 && (
                        <div
                          className={cn(
                            "absolute top-1/2 h-6 -translate-y-1/2 rounded",
                            isCurrentLarger
                              ? "left-1/2 bg-blue-500/60" // Current is larger, extends right
                              : "right-1/2 bg-green-500/60", // Target is larger, extends left
                          )}
                          style={{
                            width: `${isCurrentLarger ? currentScaled / 2 : targetScaled / 2}%`,
                          }}
                        >
                          {/* Deviation label */}
                          <div
                            className={cn(
                              "absolute top-1/2 -translate-y-1/2 text-xs font-bold whitespace-nowrap text-white",
                              isCurrentLarger
                                ? "left-1/2 -translate-x-1/2"
                                : "right-1/2 translate-x-1/2",
                            )}
                          >
                            {deviation > 0 ? "+" : ""}
                            {deviation.toFixed(1)}%
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Simple horizontal bar for current allocation only */}
                      <div className="relative flex h-8 items-center">
                        <div
                          className="h-6 rounded bg-blue-500/60"
                          style={{ width: `${currentScaled}%` }}
                        />
                        <div className="text-foreground absolute left-2 text-xs font-medium">
                          {item.current.toFixed(1)}%
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Deviation indicator below - only show if targets exist */}
                {hasTargets && (
                  <div className="text-center text-xs">
                    {deviation > 0 && (
                      <span className="font-medium text-blue-600">
                        {deviation.toFixed(1)}% over target
                      </span>
                    )}
                    {deviation < 0 && (
                      <span className="font-medium text-green-600">
                        Need {Math.abs(deviation).toFixed(1)}% more
                      </span>
                    )}
                    {deviation === 0 && <span className="text-muted-foreground">On target</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
