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

interface OverviewPageProps {
  ctx: AddonContext;
}

export function OverviewPage({}: OverviewPageProps) {
  return (
    <Page>
      <PageHeader>
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-semibold sm:text-xl">Plaid Sync</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your connected financial accounts
          </p>
        </div>
      </PageHeader>
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
    </Page>
  );
}
