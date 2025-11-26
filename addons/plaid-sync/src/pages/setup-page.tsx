import type { AddonContext } from '@wealthfolio/addon-sdk';
import { Page, PageContent, PageHeader } from '@wealthfolio/ui';
import { SetupWizard } from '../components/setup-wizard';

interface SetupPageProps {
  ctx: AddonContext;
  onComplete: () => void;
}

export function SetupPage({ ctx, onComplete }: SetupPageProps) {
  return (
    <Page>
      <PageHeader>
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-semibold sm:text-xl">Setup Plaid Sync</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Configure your Plaid credentials to get started
          </p>
        </div>
      </PageHeader>
      <PageContent>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 sm:gap-6">
          <SetupWizard ctx={ctx} onComplete={onComplete} />
        </div>
      </PageContent>
    </Page>
  );
}
