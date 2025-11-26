import React, { useState, useEffect } from 'react';
import type { AddonContext } from '@wealthfolio/addon-sdk';
import { Icons } from '@wealthfolio/ui';
import { usePlaidConfig } from './hooks/use-plaid-config';
import { SetupPage } from './pages/setup-page';
import { OverviewPage } from './pages/overview-page';

function PlaidSyncPage({ ctx }: { ctx: AddonContext }) {
  const { loading, isConfigured, reloadConfig } = usePlaidConfig(ctx);
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    if (isConfigured) {
      setSetupComplete(true);
    }
  }, [isConfigured]);

  const handleSetupComplete = () => {
    setSetupComplete(true);
    reloadConfig();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Icons.Loader className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!setupComplete || !isConfigured) {
    return <SetupPage ctx={ctx} onComplete={handleSetupComplete} />;
  }

  return <OverviewPage ctx={ctx} />;
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
