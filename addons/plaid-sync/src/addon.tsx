import React from 'react';
import type { AddonContext } from '@wealthfolio/addon-sdk';
import { Icons, Page, PageContent, PageHeader, Card, CardContent } from '@wealthfolio/ui';

function PlaidSyncPage({ ctx }: { ctx: AddonContext }) {
  return (
    <Page>
      <PageHeader>
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-semibold sm:text-xl">Plaid Sync</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Connect and sync your financial accounts with Plaid
          </p>
        </div>
      </PageHeader>
      <PageContent>
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h3 className="font-semibold mb-2">Getting Started</h3>
                  <p className="text-sm text-muted-foreground">
                    This addon allows you to securely connect your financial institutions
                    and automatically sync your transactions and balances.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </Page>
  );
}

export default function enable(ctx: AddonContext) {
  // Add a sidebar item
  const sidebarItem = ctx.sidebar.addItem({
    id: 'plaid-sync',
    label: 'Plaid Sync',
    icon: <Icons.Blocks className="h-5 w-5" />,
    route: '/addon/plaid-sync',
    order: 100,
  });

  // Add a route
  const Wrapper = () => <PlaidSyncPage ctx={ctx} />;
  ctx.router.add({
    path: '/addon/plaid-sync',
    component: React.lazy(() => Promise.resolve({ default: Wrapper })),
  });

  ctx.api.logger.info('Plaid Sync addon loaded');

  // Cleanup on disable
  ctx.onDisable(() => {
    try {
      sidebarItem.remove();
      ctx.api.logger.info('Plaid Sync addon disabled');
    } catch (err) {
      ctx.api.logger.error('Failed to remove sidebar item:', err);
    }
  });
}
