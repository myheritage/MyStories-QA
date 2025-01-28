# MyStories Test Automation

Automated testing suite for MyStories web application using Playwright and TypeScript.

## Features

- Page Object Model design pattern
- TypeScript for type safety
- Centralized configuration
- Price verification
- Cookie consent handling
- Email verification
- Promo code testing

## Test Scenarios

1. Self Order Flow
   - Complete order with successful payment
   - Order with denied cookies
   - Handle declined payment
   - Apply promotion code

2. Gift Order Flow
   - Complete gift order with email verification
   - Schedule future gift delivery
   - Gift order with custom message
   - Gift order with multiple copies

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment example and configure:
```bash
cp .env.example .env
```

3. Install Playwright browsers:
```bash
npx playwright install
```

## Running Tests

Run all tests:
```bash
npm test
```

Run specific test file:
```bash
npx playwright test tests/e2e/selfOrder.spec.ts
```

Run in UI mode:
```bash
npx playwright test --ui
```

## Project Structure

```
├── tests/
│   ├── data/           # Test data and configurations
│   ├── debug/          # Debug test files
│   ├── e2e/           # End-to-end test scenarios
│   ├── helpers/       # Helper functions and utilities
│   └── pages/         # Page Object Models
├── playwright.config.ts
└── package.json
```

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Run tests to ensure nothing is broken
4. Submit a pull request

## License

MIT
