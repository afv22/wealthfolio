import { QueryClientProvider } from "@tanstack/react-query";
import type { AddonContext, AddonEnableFunction } from "@wealthfolio/addon-sdk";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Icons,
  Page,
  PageContent,
  PageHeader,
} from "@wealthfolio/ui";
import React from "react";
import { DivergingBarChart } from "./components/diverging-bar-chart";
import { TargetManager } from "./components/target-manager";
import { useAllocationTargets } from "./hooks/use-allocation-targets";
import { usePortfolioAllocation } from "./hooks/use-portfolio-allocation";

function RebalancerContent({ ctx }: { ctx: AddonContext }) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const { data: allocations = [], isLoading, error } = usePortfolioAllocation({ ctx });
  const {
    targets,
    updateTargets,
    isUpdating,
    isLoading: targetsLoading,
  } = useAllocationTargets({ ctx });

  // Get list of existing holdings for the dropdown with symbols
  const existingHoldings = React.useMemo(() => {
    return allocations.map((a) => ({
      name: a.assetClass,
      symbol: a.symbol,
    }));
  }, [allocations]);

  const handleSaveTargets = (newTargets: typeof targets) => {
    updateTargets(newTargets);
    setIsDialogOpen(false);
  };

  // Merge current allocations with target allocations
  const chartData = React.useMemo(() => {
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

  const headerActions = (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Icons.Settings className="mr-2 h-4 w-4" />
          Configure Targets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure Target Allocations</DialogTitle>
        </DialogHeader>
        <TargetManager
          targets={targets}
          existingHoldings={existingHoldings}
          onSave={handleSaveTargets}
          isSaving={isUpdating}
        />
      </DialogContent>
    </Dialog>
  );

  if (isLoading || targetsLoading) {
    return (
      <Page>
        <PageHeader heading="Rebalancer" actions={headerActions} />
        <PageContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading portfolio data...</div>
          </div>
        </PageContent>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <PageHeader heading="Rebalancer" actions={headerActions} />
        <PageContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-destructive">
              Error loading portfolio data:{" "}
              {error instanceof Error ? error.message : "Unknown error"}
            </div>
          </div>
        </PageContent>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader heading="Rebalancer" actions={headerActions} />
      <PageContent>
        <DivergingBarChart data={chartData} />
      </PageContent>
    </Page>
  );
}

function RebalancerAddon({ ctx }: { ctx: AddonContext }) {
  const sharedQueryClient = ctx.api.query.getClient();

  return (
    <QueryClientProvider client={sharedQueryClient as any}>
      <RebalancerContent ctx={ctx} />
    </QueryClientProvider>
  );
}

const enable: AddonEnableFunction = (context) => {
  context.api.logger.info("Rebalancer addon is being enabled!");

  try {
    // Add a sidebar item
    context.sidebar.addItem({
      id: "rebalancer",
      label: "Rebalancer",
      icon: <Icons.PieChart className="h-5 w-5" />,
      route: "/addon/rebalancer",
      order: 100,
    });

    // Create wrapper component with QueryClientProvider
    const RebalancerWrapper = () => {
      const sharedQueryClient = context.api.query.getClient();
      return (
        <QueryClientProvider client={sharedQueryClient as any}>
          <RebalancerAddon ctx={context} />
        </QueryClientProvider>
      );
    };

    // Add a route
    context.router.add({
      path: "/addon/rebalancer",
      component: React.lazy(() => Promise.resolve({ default: RebalancerWrapper })),
    });

    context.api.logger.info("Rebalancer addon enabled successfully");
  } catch (error) {
    context.api.logger.error("Failed to initialize addon: " + (error as Error).message);
    throw error;
  }

  // Cleanup on disable
  context.onDisable(() => {
    context.api.logger.info("Rebalancer addon is being disabled");
  });
};

export default enable;
