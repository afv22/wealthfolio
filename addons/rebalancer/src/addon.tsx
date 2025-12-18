import { QueryClientProvider } from "@tanstack/react-query";
import type { AddonContext, AddonEnableFunction, QueryClient } from "@wealthfolio/addon-sdk";
import { Icons, Page, PageContent, PageHeader } from "@wealthfolio/ui";
import React from "react";
import { DivergingBarChart, HeaderActions, RecommendationsCard } from "./components";
import { useAllocationTargets, usePortfolioAllocation } from "./hooks";

function RebalancerContent({ ctx }: { ctx: AddonContext }) {
  const { isLoading: allocationLoading, error: allocationError } = usePortfolioAllocation({ ctx });
  const { isLoading: targetsLoading, error: targetsError } = useAllocationTargets({ ctx });

  const PageWrapper = ({ children }: { children: React.ReactNode }) => (
    <Page>
      <PageHeader heading="Rebalancer" actions={<HeaderActions ctx={ctx} />} />
      <PageContent>{children}</PageContent>
    </Page>
  );

  const ErrorPageWrapper = ({ err }: { err: Error }) => (
    <PageWrapper>
      <div className="flex items-center justify-center py-8">
        <div className="text-destructive">Error: {err.message}</div>
      </div>
    </PageWrapper>
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

  if (allocationError) return <ErrorPageWrapper err={allocationError} />;
  if (targetsError) return <ErrorPageWrapper err={targetsError} />;

  return (
    <PageWrapper>
      <div className="space-y-6">
        <DivergingBarChart ctx={ctx} />
        <RecommendationsCard ctx={ctx} />
      </div>
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
      const sharedQueryClient = context.api.query.getClient() as QueryClient;
      return (
        <QueryClientProvider client={sharedQueryClient}>
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
