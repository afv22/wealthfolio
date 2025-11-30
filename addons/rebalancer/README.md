# Rebalancer

Track portfolio allocation against target percentages and get rebalancing
guidance.

## Overview

The Rebalancer add-on helps you maintain your desired asset allocation by
comparing your current portfolio against target percentages. Set allocation
targets for individual assets and visualize deviations using intuitive data
visualization.

## Roadmap

**Stage 1 (✓)**: Allocation Drift

- Set target allocation percentages for individual assets
- View current portfolio allocation across all accounts
- Visual comparison of current vs. target allocations
- Automatic aggregation of cash and money market positions
- Persistent target storage across sessions

**Stage 2**: Rebalancing Calculations

- Calculate exact buy/sell amounts needed to rebalance
- Show rebalancing actions in dollar amounts
- Consider transaction costs and minimum trade sizes

**Stage 3**: Advanced Strategies

- Asset class grouping (e.g., "US Stocks", "International Bonds")
- Tax-aware rebalancing suggestions
- Multiple portfolio strategies (aggressive, conservative, etc.)
- Rebalancing frequency recommendations

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev:server

# Build for production
npm run build

# Package addon
npm run bundle
```

## License

MIT
