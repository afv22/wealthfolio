import { useState } from 'react';
import type { AddonContext } from '@wealthfolio/addon-sdk';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Alert,
  AlertDescription,
  AlertTitle,
  Icons,
} from '@wealthfolio/ui';
import type { PlaidConfig, PlaidEnvironment } from '../lib/types';

interface SettingsModalProps {
  ctx: AddonContext;
  config: PlaidConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigUpdate: () => void;
}

export function SettingsModal({
  ctx,
  config,
  open,
  onOpenChange,
  onConfigUpdate,
}: SettingsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [environment, setEnvironment] = useState<PlaidEnvironment>(config.environment);
  const [clientId, setClientId] = useState('');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const maskString = (str: string, visibleChars = 4) => {
    if (str.length <= visibleChars) {
      return '*'.repeat(str.length);
    }
    const lastChars = str.slice(-visibleChars);
    const masked = '*'.repeat(str.length - visibleChars);
    return masked + lastChars;
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setError(null);
    setSuccess(false);
    setClientId('');
    setSecret('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEnvironment(config.environment);
    setClientId('');
    setSecret('');
    setError(null);
    setSuccess(false);
  };

  const handleSave = async () => {
    if (!clientId.trim() || !secret.trim()) {
      setError('Please provide both client ID and secret');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Save new credentials
      await ctx.api.secrets.set('plaid-client-id', clientId.trim());
      await ctx.api.secrets.set('plaid-secret', secret.trim());
      await ctx.api.secrets.set('plaid-env', environment);

      ctx.api.logger.info('Plaid credentials updated successfully');
      setSuccess(true);
      setIsEditing(false);
      setClientId('');
      setSecret('');

      // Notify parent to reload config
      onConfigUpdate();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update credentials';
      setError(message);
      ctx.api.logger.error('Failed to update Plaid credentials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      handleCancel();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Plaid Settings</DialogTitle>
          <DialogDescription>
            Manage your Plaid API credentials and environment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {success && (
            <Alert variant="default" className="bg-green-50 dark:bg-green-950/20">
              <Icons.CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-600 dark:text-green-400">Success</AlertTitle>
              <AlertDescription className="text-green-600 dark:text-green-400">
                Credentials updated successfully
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <Icons.AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isEditing ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Environment
                  </label>
                  <p className="mt-1 text-sm font-medium capitalize">{config.environment}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Client ID
                  </label>
                  <p className="mt-1 font-mono text-sm">{maskString(config.clientId)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Secret</label>
                  <p className="mt-1 font-mono text-sm">{maskString(config.secret)}</p>
                </div>
              </div>

              <Alert>
                <Icons.Info className="h-4 w-4" />
                <AlertDescription>
                  Credentials are securely stored in your system keyring. Only the last 4
                  characters are visible for verification.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={handleStartEdit}>
                  <Icons.Pencil className="mr-2 h-4 w-4" />
                  Update Credentials
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Environment</label>
                  <div className="grid gap-2">
                    <button
                      onClick={() => setEnvironment('sandbox')}
                      className={`rounded-lg border-2 p-3 text-left text-sm transition-colors ${
                        environment === 'sandbox'
                          ? 'border-primary bg-accent'
                          : 'border-muted hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Sandbox</span>
                        {environment === 'sandbox' && (
                          <Icons.Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">
                        Testing environment
                      </p>
                    </button>

                    <button
                      onClick={() => setEnvironment('production')}
                      className={`rounded-lg border-2 p-3 text-left text-sm transition-colors ${
                        environment === 'production'
                          ? 'border-primary bg-accent'
                          : 'border-muted hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Production</span>
                        {environment === 'production' && (
                          <Icons.Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">
                        Real financial institutions
                      </p>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="new-client-id" className="text-sm font-medium">
                    New Client ID
                  </label>
                  <input
                    id="new-client-id"
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Enter new Plaid Client ID"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="new-secret" className="text-sm font-medium">
                    New Secret
                  </label>
                  <input
                    id="new-secret"
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Enter new Plaid Secret"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={loading}
                  />
                </div>
              </div>

              <Alert>
                <Icons.AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Updating credentials will affect all connected accounts. Make sure your new
                  credentials are valid before saving.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancel} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? (
                    <>
                      <Icons.Loader className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icons.Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
