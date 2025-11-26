/**
 * Plaid environment types
 */
export type PlaidEnvironment = 'sandbox' | 'production';

/**
 * Plaid configuration stored in secrets
 */
export interface PlaidConfig {
  clientId: string;
  secret: string;
  environment: PlaidEnvironment;
}

/**
 * Account mapping between Plaid and Wealthfolio
 */
export interface AccountMapping {
  wealthfolioAccountId: string;
  plaidAccountId: string;
  plaidItemId: string;
  institutionId: string;
  institutionName: string;
  lastSyncDate: string | null;
  lastSuccessfulSync: string | null;
  syncEnabled: boolean;
  isPlaidManaged: boolean;
}

/**
 * Sync status for an account
 */
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

/**
 * Account sync state
 */
export interface AccountSyncState {
  status: SyncStatus;
  lastSync: string | null;
  error: string | null;
  transactionCount?: number;
}

/**
 * Setup wizard state
 */
export interface SetupState {
  step: 'environment' | 'credentials' | 'complete';
  environment: PlaidEnvironment | null;
  clientId: string;
  secret: string;
  isValid: boolean;
  error: string | null;
}
