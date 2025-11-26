import { useState, useEffect, useCallback } from 'react';
import type { AddonContext } from '@wealthfolio/addon-sdk';
import type { PlaidConfig, PlaidEnvironment } from '../lib/types';

/**
 * Hook to manage Plaid configuration (credentials stored in secrets)
 */
export function usePlaidConfig(ctx: AddonContext) {
  const [config, setConfig] = useState<PlaidConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load Plaid configuration from secrets
   */
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [clientId, secret, environment] = await Promise.all([
        ctx.api.secrets.get('plaid-client-id'),
        ctx.api.secrets.get('plaid-secret'),
        ctx.api.secrets.get('plaid-env'),
      ]);

      if (clientId && secret && environment) {
        setConfig({
          clientId,
          secret,
          environment: environment as PlaidEnvironment,
        });
      } else {
        setConfig(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load configuration';
      setError(message);
      ctx.api.logger.error('Failed to load Plaid config:', err);
    } finally {
      setLoading(false);
    }
  }, [ctx]);

  /**
   * Save Plaid configuration to secrets
   */
  const saveConfig = useCallback(
    async (newConfig: PlaidConfig) => {
      try {
        setLoading(true);
        setError(null);

        await Promise.all([
          ctx.api.secrets.set('plaid-client-id', newConfig.clientId),
          ctx.api.secrets.set('plaid-secret', newConfig.secret),
          ctx.api.secrets.set('plaid-env', newConfig.environment),
        ]);

        setConfig(newConfig);
        ctx.api.logger.info('Plaid configuration saved successfully');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save configuration';
        setError(message);
        ctx.api.logger.error('Failed to save Plaid config:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [ctx]
  );

  /**
   * Clear Plaid configuration
   */
  const clearConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await Promise.all([
        ctx.api.secrets.delete('plaid-client-id'),
        ctx.api.secrets.delete('plaid-secret'),
        ctx.api.secrets.delete('plaid-env'),
      ]);

      setConfig(null);
      ctx.api.logger.info('Plaid configuration cleared');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear configuration';
      setError(message);
      ctx.api.logger.error('Failed to clear Plaid config:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [ctx]);

  /**
   * Check if configuration is complete
   */
  const isConfigured = config !== null;

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    loading,
    error,
    isConfigured,
    saveConfig,
    clearConfig,
    reloadConfig: loadConfig,
  };
}
