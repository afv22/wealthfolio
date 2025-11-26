# Plaid Sync Add-on Design Document

## Overview

The Plaid Sync add-on enables users to connect their financial accounts (investment, banking, etc.) to Wealthfolio via the Plaid API. This add-on automatically syncs transactions and holdings from connected accounts, maintaining them as Wealthfolio accounts with proper transaction history.

**Key Principles:**
- User-provided credentials (open source, BYOK - Bring Your Own Keys)
- Manual sync trigger (no automatic polling on app load)
- Transaction-based synchronization (holdings → activities)
- Proper account lifecycle management
- Secure credential storage

---

## Architecture

### Add-on Structure

```
plaid-sync/
├── manifest.json                    # Add-on metadata, permissions
├── src/
│   ├── addon.tsx                   # Entry point, context initialization
│   ├── components/
│   │   ├── setup-wizard.tsx        # Initial credential setup flow
│   │   ├── account-list.tsx        # Connected accounts overview
│   │   ├── account-card.tsx        # Individual account status
│   │   ├── sync-status.tsx         # Last sync time, sync button
│   │   └── plaid-link-button.tsx   # Plaid Link integration
│   ├── hooks/
│   │   ├── use-plaid-config.ts     # Credential management
│   │   ├── use-plaid-link.ts       # Plaid Link SDK wrapper
│   │   ├── use-sync-manager.ts     # Sync orchestration
│   │   └── use-account-mapping.ts  # Plaid ↔ Wealthfolio mapping
│   ├── lib/
│   │   ├── plaid-client.ts         # Plaid API client
│   │   ├── transaction-mapper.ts   # Plaid → Activity conversion
│   │   ├── holdings-mapper.ts      # Initial holdings sync
│   │   └── types.ts                # TypeScript types
│   └── pages/
│       ├── setup-page.tsx          # Credential setup screen
│       └── overview-page.tsx       # Main dashboard
└── package.json
```

### Data Flow

```
┌─────────────────┐
│  User Action    │
│  (Sync Button)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  Sync Manager (Frontend)    │
│  • Fetch credentials         │
│  • Initiate sync per account │
│  • Update UI state           │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Plaid API Client           │
│  • Exchange public token     │
│  • Fetch accounts            │
│  • Fetch transactions        │
│  • Fetch holdings            │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Transaction Mapper         │
│  • Map Plaid → Activities    │
│  • Deduplicate               │
│  • Validate                  │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Wealthfolio API            │
│  • Create/update accounts    │
│  • Bulk import activities    │
│  • Update metadata           │
└─────────────────────────────┘
```

---

## Security & Credential Management

### Secrets Storage

**Using Add-on Secrets API:**
```typescript
// Store credentials (OS keyring via Wealthfolio core)
await ctx.api.secrets.set('plaid-client-id', clientId);
await ctx.api.secrets.set('plaid-secret', secret);
await ctx.api.secrets.set('plaid-env', 'sandbox' | 'production');

// Store per-account access tokens
await ctx.api.secrets.set(`plaid-access-token-${accountId}`, accessToken);
```

**Security Properties:**
- Scoped to add-on (`addon_plaid-sync_*` prefix automatically applied)
- Stored in OS keyring (no plaintext files)
- Never logged or exposed in UI
- Cleared on add-on uninstall

### Plaid Environment

Users select environment during setup:
- **Sandbox**: Testing with fake institutions and data (no real credentials needed)
- **Production**: Real financial institutions (requires Plaid approval and production credentials)

---

## User Experience Flow

### First-Time Setup

1. **Welcome Screen:**
   - Explain requirements (Plaid account, client ID, secret)
   - Link to Plaid dashboard signup
   - Environment selection

2. **Credential Input:**
   - Form for client ID, secret, environment
   - Validation and test connection
   - Store in secrets API
   - Transition to overview

3. **Add First Account:**
   - Launch Plaid Link flow
   - User selects institution and authenticates
   - Receive public token
   - Exchange for access token
   - Store access token securely

### Existing User Flow

1. **Overview Dashboard:**
   - Grid/list of connected accounts
   - Each card shows:
     - Institution name and logo
     - Account name and type
     - Last sync timestamp
     - Current sync status (idle, syncing, error)
     - Quick actions (sync, disconnect, view details)

2. **Add New Account:**
   - Button to launch Plaid Link
   - Same flow as first-time setup
   - New account appears in list

3. **Manual Sync:**
   - Per-account sync button
   - Global "Sync All" button
   - Shows progress indicator
   - Updates timestamp on completion
   - Error handling with retry options

---

## Account Management

### Creating Wealthfolio Accounts

When a Plaid account is connected:

```typescript
const newAccount = {
  name: plaidAccount.name,
  account_type: mapPlaidAccountType(plaidAccount.type), // SECURITIES, CASH
  currency: plaidAccount.balances.iso_currency_code || 'USD',
  platform_id: plaidInstitution.institution_id, // Link to platform
  group: plaidInstitution.name, // Group by institution
  is_active: true,
  is_default: false,
};

const wealthfolioAccount = await ctx.api.accounts.create(newAccount);
```

### Account Mapping Storage

Store mapping between Plaid and Wealthfolio accounts:

```typescript
// Store in addon-managed data structure (localStorage or separate DB table)
interface AccountMapping {
  wealthfolioAccountId: string;
  plaidAccountId: string;
  plaidItemId: string;
  institutionId: string;
  institutionName: string;
  lastSyncDate: string | null;
  lastSuccessfulSync: string | null;
  syncEnabled: boolean;
  isPlaidManaged: boolean; // Flag to prevent manual edits
}
```

**Storage Options:**
1. **LocalStorage** (simple, client-side only):
   ```typescript
   localStorage.setItem('plaid-sync-mappings', JSON.stringify(mappings));
   ```

2. **Account Metadata** (future enhancement):
   - Store as JSON in account comment/metadata field
   - Requires schema extension

### Preventing Manual Edits

**Implementation Strategy:**

To prevent users from manually editing Plaid-managed accounts and activities:

1. **Mark Accounts as Plaid-Managed:**
   ```typescript
   // Store in account mapping
   const mapping: AccountMapping = {
     // ...other fields
     isPlaidManaged: true,
   };
   ```

2. **UI Guards in Wealthfolio:**

   Since the add-on cannot directly modify Wealthfolio's UI, we need to:

   **Option A: Account Name Convention**
   ```typescript
   // Prefix Plaid accounts with indicator
   const accountName = `[Plaid] ${plaidAccount.name}`;
   ```

   **Option B: Use Account Group**
   ```typescript
   // Group all Plaid accounts together
   const newAccount = {
     // ...other fields
     group: `🔗 Plaid: ${institutionName}`,
   };
   ```

   **Option C: Use Comment Field (Preferred)**
   ```typescript
   // Not currently available in account model, but could be added
   // Store metadata in a dedicated field
   ```

3. **Add-on Level Protection:**

   The add-on should:
   - Display clear warnings in its own UI
   - Detect conflicts during sync (manual edits since last sync)
   - Provide option to: "Overwrite with Plaid data" or "Disconnect account"

   ```typescript
   // Detect conflicts during sync
   async function detectManualEdits(accountId: string, lastSync: string) {
     const activities = await ctx.api.activities.getAll(accountId);

     // Check for activities created/modified after last sync
     // that don't have Plaid transaction IDs
     const manualEdits = activities.filter(
       a => a.updatedAt > lastSync && !a.comment?.startsWith('Plaid:')
     );

     if (manualEdits.length > 0) {
       return {
         hasConflicts: true,
         conflictCount: manualEdits.length,
         conflicts: manualEdits,
       };
     }

     return { hasConflicts: false };
   }
   ```

4. **User Warning in Add-on UI:**
   ```tsx
   <Alert variant="warning">
     <AlertIcon />
     <AlertTitle>Plaid-Managed Account</AlertTitle>
     <AlertDescription>
       This account is synchronized with Plaid. Manual edits in Wealthfolio
       will be overwritten during sync. To make changes, update your account
       at the source institution or disconnect this account from Plaid Sync.
     </AlertDescription>
   </Alert>
   ```

**Future Enhancement:**
- Request Wealthfolio core to add an `is_readonly` flag to account model
- Add-ons could mark accounts as read-only
- Main UI would enforce this at the form level

### Platform Management

Create platform entries for Plaid institutions:

```typescript
// Check if platform exists, create if not
const platform = await ctx.api.getPlatform(institutionId)
  || await ctx.api.createPlatform({
    id: institutionId,
    name: institutionName,
    url: institutionWebsite,
  });
```

---

## Transaction Synchronization

### Sync Strategy

**Initial Sync (New Account):**
1. Fetch maximum available transaction history from Plaid (`/investments/transactions/get`)
   - Request 2 years back (maximum for most institutions)
   - Handle cases where less history is available
2. If sufficient transaction history (≥90 days):
   - Convert all transactions to activities
   - Bulk import via `ctx.api.activities.import()`
3. If limited transaction history (<90 days):
   - Fetch current holdings from Plaid (`/investments/holdings/get`)
   - Create aggregated opening balance activities:
     - One `ADD_HOLDING` activity per position
     - Date: earliest available transaction date
     - Quantity: current holding quantity
     - Unit price: cost basis / quantity
     - Comment: `Plaid: Opening balance - limited historical data available`
   - Then import available transactions
4. Show user: "Synced X transactions from [earliest_date] to [latest_date]"

**Incremental Sync:**
1. Fetch transactions since last sync date
2. Deduplicate based on Plaid transaction ID
3. Map new transactions to activities
4. Bulk import
5. Update last sync timestamp

### Transaction Mapping

**Plaid Transaction Types → Wealthfolio Activity Types:**

| Plaid Type | Subtype | Wealthfolio Activity |
|-----------|---------|---------------------|
| `buy` | - | `BUY` |
| `sell` | - | `SELL` |
| `cash` | `deposit` | `DEPOSIT` |
| `cash` | `withdrawal` | `WITHDRAWAL` |
| `cash` | `dividend` | `DIVIDEND` |
| `cash` | `interest` | `INTEREST` |
| `transfer` | `in` | `TRANSFER_IN` |
| `transfer` | `out` | `TRANSFER_OUT` |
| `fee` | - | `FEE` |
| `tax` | - | `TAX` |

**Mapping Logic:**

```typescript
function mapPlaidTransaction(
  tx: PlaidTransaction,
  accountId: string
): NewActivity {
  return {
    account_id: accountId,
    asset_id: mapPlaidSecurity(tx.security_id), // or $CASH-{currency}
    activity_type: mapActivityType(tx.type, tx.subtype),
    activity_date: tx.date,
    quantity: tx.quantity ?? undefined,
    unit_price: tx.price ?? undefined,
    currency: tx.iso_currency_code || 'USD',
    fee: tx.fees ?? 0,
    amount: tx.amount,
    comment: `Plaid: ${tx.transaction_id}`, // For deduplication
    is_draft: false,
  };
}
```

### Holdings Synchronization

**Initial Holdings Import:**

```typescript
async function syncInitialHoldings(
  plaidAccountId: string,
  wealthfolioAccountId: string
) {
  const holdings = await plaidClient.getHoldings(plaidAccountId);

  const activities = holdings.map(holding => ({
    account_id: wealthfolioAccountId,
    asset_id: mapSecurityId(holding.security_id),
    activity_type: 'ADD_HOLDING',
    activity_date: new Date().toISOString(),
    quantity: holding.quantity,
    unit_price: holding.cost_basis / holding.quantity,
    currency: holding.iso_currency_code || 'USD',
    comment: `Plaid: Initial sync - ${holding.security_id}`,
  }));

  await ctx.api.activities.import(wealthfolioAccountId, activities);
}
```

**Notes:**
- Holdings are only synced on initial connection
- Subsequent updates come from transaction stream
- Holdings can be manually refreshed if needed

### Deduplication Strategy

**Prevent Duplicate Imports:**

1. **Transaction ID Tracking:**
   - Store Plaid transaction ID in activity `comment` field
   - Pattern: `Plaid: {transaction_id}`
   - Check existing activities before import

2. **Implementation:**
   ```typescript
   async function deduplicateTransactions(
     accountId: string,
     transactions: PlaidTransaction[]
   ): Promise<PlaidTransaction[]> {
     // Get existing activities with Plaid IDs
     const existingActivities = await ctx.api.activities.getAll(accountId);
     const existingPlaidIds = new Set(
       existingActivities
         .map(a => a.comment?.match(/Plaid: (.+)/)?.[1])
         .filter(Boolean)
     );

     // Filter out already-imported transactions
     return transactions.filter(
       tx => !existingPlaidIds.has(tx.transaction_id)
     );
   }
   ```

3. **Date Range Optimization:**
   - Track last successful sync date per account
   - Only fetch transactions after last sync
   - Reduces API calls and deduplication overhead

---

## Asset Management

### Security Symbol Resolution

**Mapping Plaid Securities to Wealthfolio Assets:**

```typescript
async function mapSecurityId(plaidSecurityId: string): Promise<string> {
  const security = await plaidClient.getSecurity(plaidSecurityId);

  // Preferred: Use ticker symbol
  if (security.ticker_symbol) {
    return security.ticker_symbol;
  }

  // Fallback: CUSIP or ISIN
  if (security.cusip) {
    return security.cusip;
  }

  if (security.isin) {
    return security.isin;
  }

  // Last resort: Plaid security ID
  return plaidSecurityId;
}
```

**Asset Creation:**
- Wealthfolio's `get_or_create_asset` handles both existing and new securities
- New assets created with `data_source: MANUAL`
- Add-on doesn't need to pre-create assets

### Cash Activities

For cash-only transactions (deposits, withdrawals, fees):
```typescript
const assetId = `$CASH-${currency}`; // e.g., $CASH-USD
```

---

## Error Handling

### Error Categories

1. **Configuration Errors:**
   - Missing credentials
   - Invalid client ID/secret
   - Environment mismatch

2. **Authentication Errors:**
   - Expired access token
   - User revoked access
   - Institution connection issues

3. **Data Errors:**
   - Invalid transaction data
   - Asset mapping failures
   - Import validation failures

4. **Network Errors:**
   - Plaid API timeouts
   - Rate limiting
   - Connection failures

### Recovery Strategies

**Token Expiration:**
```typescript
try {
  await syncAccount(accountId);
} catch (error) {
  if (error.error_code === 'ITEM_LOGIN_REQUIRED') {
    // Prompt user to re-authenticate via Plaid Link
    await launchPlaidLinkUpdate(itemId);
  }
}
```

**Rate Limiting:**
```typescript
// Exponential backoff with jitter
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.error_code === 'RATE_LIMIT_EXCEEDED') {
        const delay = Math.min(1000 * Math.pow(2, i) + Math.random() * 1000, 10000);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}
```

**Import Validation:**
```typescript
// Use checkImport to validate before importing
const validation = await ctx.api.activities.checkImport(accountId, activities);

if (validation.some(v => v.is_valid === false)) {
  // Log errors, show user which transactions failed
  console.error('Import validation failed:', validation.filter(v => !v.is_valid));

  // Import only valid activities
  const validActivities = activities.filter((_, i) => validation[i].is_valid);
  await ctx.api.activities.import(accountId, validActivities);
}
```

---

## UI Components

### Setup Wizard

**Step 1: Environment Selection**
```tsx
<Card>
  <h2>Choose Plaid Environment</h2>
  <RadioGroup>
    <Radio value="sandbox">
      Sandbox (Testing with fake data)
    </Radio>
    <Radio value="production">
      Production (Real financial institutions)
    </Radio>
  </RadioGroup>
  <Alert>
    Production requires Plaid approval and production credentials.
    Start with Sandbox for testing.
  </Alert>
</Card>
```

**Step 2: Credentials**
```tsx
<Form>
  <Input
    label="Client ID"
    type="text"
    placeholder="Enter Plaid Client ID"
  />
  <Input
    label="Secret"
    type="password"
    placeholder="Enter Plaid Secret"
  />
  <Button onClick={testAndSave}>Save & Test Connection</Button>
</Form>
```

### Overview Dashboard

```tsx
<Page>
  <Header>
    <h1>Plaid Sync</h1>
    <Button onClick={syncAll}>Sync All</Button>
    <PlaidLinkButton />
  </Header>

  <Grid cols={2}>
    {accounts.map(account => (
      <AccountCard
        key={account.id}
        account={account}
        mapping={getMapping(account.id)}
        onSync={handleSync}
        onDisconnect={handleDisconnect}
      />
    ))}
  </Grid>
</Page>
```

### Account Card

```tsx
<Card>
  <Header>
    <InstitutionLogo src={institutionLogo} />
    <div>
      <h3>{accountName}</h3>
      <Badge>{accountType}</Badge>
    </div>
  </Header>

  <Body>
    <SyncStatus
      lastSync={lastSyncDate}
      status={syncStatus}
    />
  </Body>

  <Footer>
    <Button
      onClick={onSync}
      loading={syncing}
      disabled={syncing}
    >
      {syncing ? 'Syncing...' : 'Sync Now'}
    </Button>
    <Button variant="ghost" onClick={onDisconnect}>
      Disconnect
    </Button>
  </Footer>
</Card>
```

---

## Permissions

Required permissions in `manifest.json`:

```json
{
  "permissions": [
    "accounts",      // Create and manage accounts
    "activities",    // Import transactions
    "assets",        // Resolve securities
    "secrets",       // Store credentials and tokens
    "ui",            // Sidebar and routes
    "query",         // Invalidate cache after sync
    "events"         // Listen to portfolio updates (optional)
  ]
}
```

**Rationale:**
- **accounts**: Create Plaid-linked accounts
- **activities**: Bulk import transactions
- **assets**: Map Plaid securities to Wealthfolio assets
- **secrets**: Secure credential storage
- **ui**: Add navigation and routes
- **query**: Force refresh after sync
- **events**: (Optional) React to external portfolio changes

---

## Implementation Phases

### Phase 1: MVP - Manual Sync

**Scope:**
- Setup wizard with credential storage
- Plaid Link integration for account connection
- Manual sync button per account
- Basic transaction mapping (buy, sell, cash)
- Holdings import on initial connection
- Error handling and retry logic

**Deliverables:**
- Working add-on installable via dev server
- Documentation for obtaining Plaid credentials
- Basic UI with account list and sync status

### Phase 2: Enhanced Features

**Scope:**
- Advanced transaction mapping (transfers, fees, taxes, stock splits)
- Multi-currency support with FX rate handling
- Transaction history view within add-on (filterable, searchable)
- Manual edit detection and conflict resolution
- Account reconnection flow (token refresh)
- Bulk account operations (sync all, disconnect all)

### Phase 3: Polish & Optimization

**Scope:**
- Incremental sync optimization (smarter date range queries)
- Performance improvements for large transaction volumes
- Enhanced error reporting with actionable suggestions
- Sync logs and audit trail
- Better handling of edge cases (splits, mergers, etc.)
- Improved institution/account type detection
- (Web mode only) Optional webhook support for real-time updates

---

## Technical Considerations

### Plaid API Integration

**SDK:**
```bash
npm install plaid
```

**Client Initialization:**
```typescript
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments[environment],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': clientId,
      'PLAID-SECRET': secret,
    },
  },
});

const plaidClient = new PlaidApi(configuration);
```

### Plaid Link Integration

**React Hook:**
```typescript
import { usePlaidLink } from 'react-plaid-link';

const { open, ready } = usePlaidLink({
  token: linkToken,
  onSuccess: async (publicToken, metadata) => {
    // Exchange public token for access token
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    // Store access token securely
    await ctx.api.secrets.set(
      `plaid-access-token-${metadata.accounts[0].id}`,
      response.data.access_token
    );

    // Create Wealthfolio account
    await createAccountFromPlaid(metadata);
  },
});
```

### Date Handling

**Plaid Dates:**
- Transactions: YYYY-MM-DD format
- Use midnight UTC for consistency

```typescript
function plaidDateToISO(date: string): string {
  return `${date}T00:00:00.000Z`;
}
```

### Currency Handling

**Multi-Currency Support:**
- Plaid provides `iso_currency_code` for each transaction
- Wealthfolio auto-registers FX pairs when activity currency differs from account currency
- No manual currency conversion needed

---

## Testing Strategy

### Unit Tests

- Transaction mapping logic
- Deduplication algorithm
- Date/currency conversion
- Error handling

### Integration Tests

- Plaid API client (use sandbox environment)
- Wealthfolio API calls (mock or test database)
- Full sync flow

### Manual Testing

- Connect sandbox accounts
- Trigger sync and verify activities
- Test error scenarios (expired token, network failure)
- Verify UI states (loading, error, success)

---

## Documentation

### User Documentation

1. **Setup Guide:**
   - How to obtain Plaid credentials
   - Environment selection guide
   - First-time connection flow

2. **Usage Guide:**
   - How to connect accounts
   - Manual sync process
   - Troubleshooting common issues

3. **FAQ:**
   - Security and privacy
   - Data ownership
   - Cost considerations (Plaid pricing)

### Developer Documentation

1. **Architecture Overview:**
   - Component diagram
   - Data flow
   - API integration

2. **Code Structure:**
   - Module responsibilities
   - Key functions and hooks
   - Extension points

3. **Deployment:**
   - Building and bundling
   - Installation process
   - Version management

---

## Security & Privacy

### Data Handling

- **No Cloud Storage**: All data stored locally via Wealthfolio core
- **Credential Security**: OS keyring via secrets API
- **Minimal Data**: Only fetch required transaction data
- **User Control**: Manual sync prevents unexpected data transfer

### Plaid Security

- **OAuth Flow**: Plaid Link uses secure OAuth2
- **Scoped Tokens**: Access tokens scoped to specific accounts
- **Token Rotation**: Support for token refresh when needed
- **Revocation**: Users can revoke access via Plaid dashboard

### Add-on Isolation

- Secrets scoped to add-on (no cross-add-on access)
- Permission system enforces capabilities
- No network access except to Plaid API

---

## Design Decisions & Future Considerations

### Decided for MVP

1. **Webhooks: Out of Scope**
   - Plaid webhooks require public endpoints (not feasible for desktop app)
   - Manual sync is sufficient for MVP
   - Future: Could add webhook support for web mode only

2. **Account Reconciliation: Prevent Manual Edits**
   - Plaid-linked accounts should be read-only in Wealthfolio UI
   - Prevent manual transaction edits/additions to synced accounts
   - Implementation: Mark accounts with metadata flag `plaid_managed: true`
   - UI should show warning: "This account is managed by Plaid Sync add-on"
   - Future: If needed, allow manual edits with conflict resolution

3. **Historical Data Depth: Best Effort with Fallback**
   - Strategy:
     1. Request maximum available history (typically 2 years)
     2. If limited data available, fetch what's available
     3. For accounts with <90 days history, create aggregated opening balance:
        - Use current holdings at first available date
        - Create single `ADD_HOLDING` activity per position
        - Include note: "Opening balance - limited historical data"
   - Show user: "Synced X transactions from [date]"

4. **Institution-Specific Quirks: Out of Scope**
   - Not all institutions support investment accounts
   - Data quality varies by institution
   - MVP will work with well-supported institutions
   - Log unsupported account types, show user-friendly message
   - Future: Institution-specific handling as needed

5. **Sync Scheduling: Manual Only**
   - No automatic/scheduled syncs in MVP
   - User initiates all syncs via button click
   - Desktop app may not be running continuously
   - Future: Could add optional scheduled sync for web mode

6. **Transaction Categorization: Direct Mapping Only**
   - Plaid transaction types map directly to Wealthfolio activity types
   - No user customization in MVP
   - No learning/AI categorization
   - Future: Allow user to customize mappings per institution

---

## Success Metrics

1. **Functionality:**
   - Successfully connect accounts
   - Accurately import transactions
   - Handle errors gracefully

2. **Usability:**
   - Setup time < 5 minutes
   - Clear sync status indicators
   - Intuitive error messages

3. **Performance:**
   - Sync 1000 transactions in < 10 seconds
   - Minimal UI lag during sync
   - Efficient deduplication

4. **Reliability:**
   - < 1% failed syncs (excluding auth issues)
   - Proper error recovery
   - Data consistency maintained

---

## Implementation Blockers

### CORS Limitation - Requires Backend Changes

**Status:** Blocked - Cannot be implemented as self-contained addon

**Problem:**
Plaid's API does not support CORS (Cross-Origin Resource Sharing), which prevents direct API calls from browser-based environments, including Tauri's webview. This is a fundamental architectural limitation:

1. **Browser CORS Policy:**
   - Tauri uses native browser engines (WebKit on macOS, WebView2 on Windows)
   - These engines enforce CORS security policies
   - Plaid's API does not include `Access-Control-Allow-Origin` headers
   - Browser blocks all direct requests to Plaid API endpoints

2. **Affected API Calls:**
   - `/link/token/create` - Create link token (required for Plaid Link)
   - `/item/public_token/exchange` - Exchange public for access token
   - `/accounts/get` - Fetch account information
   - `/investments/transactions/get` - Fetch transaction history
   - `/investments/holdings/get` - Fetch current holdings
   - `/institutions/get_by_id` - Get institution details

3. **Why Plaid Doesn't Support CORS:**
   - **Security by design:** API calls require `PLAID-CLIENT-ID` and `PLAID-SECRET` headers
   - **Secrets in client:** If browser could call directly, secrets would be exposed in:
     - JavaScript bundles
     - Browser DevTools Network tab
     - Memory inspection
   - **Server-side only:** Plaid expects all API calls from trusted backend servers

**Attempted Solutions:**

1. ✗ **Direct fetch() calls:** Blocked by CORS preflight (OPTIONS request fails with 404)
2. ✗ **Tauri HTTP plugin:** Would only work in desktop mode, not web mode
3. ✗ **Self-contained addon:** Not possible without backend proxy

**Required Solution:**

Backend proxy endpoints are required for this addon to function. Two options:

**Option A: Generic HTTP Proxy**
- Add generic `POST /api/http-proxy` endpoint
- Accepts: `{ url, method, headers, body }`
- Proxies requests to any external API
- ⚠️ **Security risks:**
  - SSRF (Server-Side Request Forgery) attacks
  - Abuse for scanning internal networks
  - Resource exhaustion
  - Legal liability for proxied traffic
- ✅ **Benefits:**
  - Future addons can use it
  - Works for any API integration

**Option B: Plaid-Specific Proxy** (Recommended)
- Add dedicated Plaid proxy endpoints:
  - `POST /api/plaid/link-token/create`
  - `POST /api/plaid/public-token/exchange`
  - `POST /api/plaid/accounts/get`
  - `POST /api/plaid/institutions/get-by-id`
- Each endpoint:
  - Accepts Plaid credentials in request body
  - Makes request to Plaid API server-side
  - Returns Plaid response to client
- ✅ **Benefits:**
  - Limited attack surface (only Plaid endpoints)
  - Can validate request structure
  - Audit logging for Plaid calls
  - Rate limiting per user
- ⚠️ **Trade-offs:**
  - Secrets pass through request body (acceptable for local-first app)
  - Backend doesn't store secrets (stateless proxy)
  - Works in both desktop and web modes

**Implementation Requirements:**

Both Tauri (desktop) and Axum (web server) need proxy implementations:

```rust
// Tauri command (src-tauri/src/commands/plaid.rs)
#[tauri::command]
pub async fn plaid_request(
    endpoint: String,
    client_id: String,
    secret: String,
    environment: String,
    body: Value,
) -> Result<Value, String> {
    // Forward request to Plaid API
}

// Axum endpoint (src-server/src/api.rs)
pub async fn plaid_proxy(
    Json(request): Json<PlaidProxyRequest>,
) -> Result<Json<Value>, (StatusCode, String)> {
    // Forward request to Plaid API
}
```

**Security Considerations:**
- Rate limiting per user/session
- Request timeout limits (30 seconds)
- Request/response size limits (1MB)
- Audit logging for all Plaid calls
- Optional domain allowlist for generic proxy

**Impact on Addon Architecture:**

The addon would call backend endpoints instead of Plaid directly:

```typescript
// Current (doesn't work):
const response = await fetch('https://sandbox.plaid.com/link/token/create', {
  headers: {
    'PLAID-CLIENT-ID': clientId,
    'PLAID-SECRET': secret,
  },
  body: JSON.stringify(payload),
});

// Required (with backend proxy):
const response = await fetch('/api/plaid/link-token/create', {
  method: 'POST',
  body: JSON.stringify({
    client_id: clientId,
    secret: secret,
    environment: 'sandbox',
    ...payload,
  }),
});
```

**Conclusion:**
This addon **cannot be implemented as a self-contained add-on** without platform changes. Backend proxy endpoints are a hard requirement. This requires a separate PR to the main Wealthfolio repository and coordination with the core team.

**Recommendation:**
Proceed with Option B (Plaid-specific proxy) as it provides the best security/functionality balance for a local-first application where secrets in the client are acceptable.

---

## Conclusion

This design provides a comprehensive blueprint for implementing Plaid integration in Wealthfolio as an add-on. However, due to CORS limitations with Plaid's API, this addon **requires backend changes** and cannot be implemented as a fully self-contained addon.

The architecture otherwise leverages the existing add-on framework, follows security best practices, and provides a user-friendly experience for connecting and syncing financial accounts.

The phased approach ensures an MVP can be delivered quickly once backend proxy support is added. The focus on manual sync, secure credential storage, and proper transaction mapping ensures the add-on will be reliable and trustworthy for managing users' financial data.
