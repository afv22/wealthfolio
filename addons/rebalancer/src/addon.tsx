import { QueryClientProvider } from "@tanstack/react-query";
import type { AddonContext, AddonEnableFunction } from "@wealthfolio/addon-sdk";
import { Icons, Page, PageContent, PageHeader } from "@wealthfolio/ui";
import React from "react";
import { DivergingBarChart } from "./components/diverging-bar-chart";
import { HeaderActions } from "./components/header-actions";
import { useAllocationTargets } from "./hooks/use-allocation-targets";
import { usePortfolioAllocation } from "./hooks/use-portfolio-allocation";

function RebalancerContent({ ctx }: { ctx: AddonContext }) {
  const { isLoading: allocationLoading, error: allocationError } = usePortfolioAllocation({ ctx });
  const { isLoading: targetsLoading, error: targetsError } = useAllocationTargets({ ctx });

  const PageWrapper = ({ children }: { children: React.ReactNode }) => (
    <Page>
      <PageHeader heading="Rebalancer" actions={<HeaderActions ctx={ctx} />} />
      <PageContent>{children}</PageContent>
    </Page>
  );

  if (allocationLoading || targetsLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading portfolio data...</div>
        </div>
      </PageWrapper>
    );
  }

  if (allocationError) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center py-8">
          <div className="text-destructive">
            Error loading portfolio allocation data:{" "}
            {allocationError instanceof Error ? allocationError.message : "Unknown error"}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (targetsError) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center py-8">
          <div className="text-destructive">
            Error loading allocation target data:{" "}
            {targetsError instanceof Error ? targetsError.message : "Unknown error"}
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageContent>
        <DivergingBarChart ctx={ctx} />
      </PageContent>
    </PageWrapper>
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
          <RebalancerContent ctx={context} />
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
