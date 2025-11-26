import { useState } from 'react';
import type { AddonContext } from '@wealthfolio/addon-sdk';
import {
  Page,
  PageContent,
  PageHeader,
  Card,
  CardContent,
  Button,
  Icons,
} from '@wealthfolio/ui';
import { usePlaidConfig } from '../hooks/use-plaid-config';
import { SettingsModal } from '../components/settings-modal';

interface OverviewPageProps {
  ctx: AddonContext;
}

export function OverviewPage({ ctx }: OverviewPageProps) {
  const { config, reloadConfig } = usePlaidConfig(ctx);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <Page>
      <PageHeader
        heading="Plaid Sync"
        text="Manage your connected financial accounts"
        actions={
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Icons.Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        }
      />
      <PageContent>
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Connected Accounts</h3>
                    <p className="text-sm text-muted-foreground">
                      No accounts connected yet
                    </p>
                  </div>
                  <Button>
                    <Icons.Plus className="mr-2 h-4 w-4" />
                    Connect Account
                  </Button>
                </div>

                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Icons.Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h4 className="mt-4 font-semibold">No accounts yet</h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Connect your first financial account to start syncing transactions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>

      {config && (
        <SettingsModal
          ctx={ctx}
          config={config}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onConfigUpdate={reloadConfig}
        />
      )}
    </Page>
  );
}
