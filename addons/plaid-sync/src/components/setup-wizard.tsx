import { useState } from 'react';
import type { AddonContext } from '@wealthfolio/addon-sdk';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Alert,
  AlertDescription,
  AlertTitle,
  Icons,
} from '@wealthfolio/ui';
import type { PlaidEnvironment } from '../lib/types';

interface SetupWizardProps {
  ctx: AddonContext;
  onComplete: () => void;
}

export function SetupWizard({ ctx, onComplete }: SetupWizardProps) {
  const [step, setStep] = useState<'environment' | 'credentials'>('environment');
  const [environment, setEnvironment] = useState<PlaidEnvironment | null>(null);
  const [clientId, setClientId] = useState('');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnvironmentSelect = (env: PlaidEnvironment) => {
    setEnvironment(env);
  };

  const handleContinue = () => {
    if (environment) {
      setStep('credentials');
    }
  };

  const handleBack = () => {
    setStep('environment');
    setError(null);
  };

  const handleSave = async () => {
    if (!environment || !clientId.trim() || !secret.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Save credentials to secrets
      await ctx.api.secrets.set('plaid-client-id', clientId.trim());
      await ctx.api.secrets.set('plaid-secret', secret.trim());
      await ctx.api.secrets.set('plaid-env', environment);

      ctx.api.logger.info('Plaid credentials saved successfully');
      onComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save credentials';
      setError(message);
      ctx.api.logger.error('Failed to save Plaid credentials:', err);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'environment') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Choose Plaid Environment</CardTitle>
          <CardDescription>
            Select the environment for your Plaid integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <button
              onClick={() => handleEnvironmentSelect('sandbox')}
              className={`rounded-lg border-2 p-4 text-left transition-colors hover:bg-accent ${
                environment === 'sandbox'
                  ? 'border-primary bg-accent'
                  : 'border-muted'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Icons.Monitor className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Sandbox</h3>
                  <p className="text-sm text-muted-foreground">
                    Testing with fake institutions and data. Perfect for getting started.
                  </p>
                </div>
                {environment === 'sandbox' && (
                  <Icons.Check className="h-5 w-5 text-primary" />
                )}
              </div>
            </button>

            <button
              onClick={() => handleEnvironmentSelect('production')}
              className={`rounded-lg border-2 p-4 text-left transition-colors hover:bg-accent ${
                environment === 'production'
                  ? 'border-primary bg-accent'
                  : 'border-muted'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Icons.Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Production</h3>
                  <p className="text-sm text-muted-foreground">
                    Real financial institutions. Requires Plaid approval and production credentials.
                  </p>
                </div>
                {environment === 'production' && (
                  <Icons.Check className="h-5 w-5 text-primary" />
                )}
              </div>
            </button>
          </div>

          <Alert>
            <Icons.Info className="h-4 w-4" />
            <AlertTitle>Getting Started</AlertTitle>
            <AlertDescription>
              Production requires Plaid approval and production credentials.
              We recommend starting with Sandbox for testing.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end">
            <Button onClick={handleContinue} disabled={!environment}>
              Continue
              <Icons.ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plaid Credentials</CardTitle>
        <CardDescription>
          Enter your Plaid {environment} credentials. You can obtain these from your{' '}
          <a
            href="https://dashboard.plaid.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Plaid Dashboard
          </a>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <Icons.AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="client-id" className="text-sm font-medium">
              Client ID
            </label>
            <input
              id="client-id"
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Enter Plaid Client ID"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="secret" className="text-sm font-medium">
              Secret
            </label>
            <input
              id="secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter Plaid Secret"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={loading}
            />
          </div>

          <Alert>
            <Icons.Shield className="h-4 w-4" />
            <AlertTitle>Secure Storage</AlertTitle>
            <AlertDescription>
              Your credentials are securely stored in your system's keyring and never
              transmitted to third parties.
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack} disabled={loading}>
            <Icons.ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Icons.Loader className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save & Continue
                <Icons.Check className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
