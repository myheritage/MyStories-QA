# MyStories Test Automation

Automated testing suite for MyStories web application using Playwright and TypeScript.

## Features

- Page Object Model design pattern
- TypeScript for type safety
- Centralized configuration
- Visual regression testing
- Security testing and compliance
- Performance monitoring
- Link validation
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

3. Visual Regression Tests
   - Core page layouts
   - Order flow states
   - Email templates
   - Responsive design checks

4. Security Tests
   - Input validation and sanitization
   - Payment form security
   - Privacy compliance
   - Cookie consent compliance

5. Performance Tests
   - Page load times
   - API response times
   - Resource optimization
   - Core Web Vitals

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
npx playwright test tests/tests/selfOrder.spec.ts
```

Run in UI mode:
```bash
npx playwright test --ui
```

Run specific test types:
```bash
# Visual tests
npx playwright test tests/tests/visual.spec.ts

# Security tests
npx playwright test tests/tests/security/

# Performance tests
npx playwright test tests/tests/performance.spec.ts
```

## Project Structure

```
├── tests/
│   ├── data/           # Test data and configurations
│   │   ├── cookies.config.ts    # Cookie testing settings
│   │   ├── performance.config.ts # Performance thresholds
│   │   ├── security.config.ts   # Security testing rules
│   │   ├── test.config.ts      # General test configuration
│   │   └── visual.config.ts    # Visual testing settings
│   ├── debug/          # Debug test files
│   ├── helpers/        # Helper functions and utilities
│   │   ├── EmailHandler.ts     # Email testing utilities
│   │   ├── LinkCheckerHelper.ts # Link validation
│   │   ├── PerformanceReporter.ts # Performance metrics
│   │   ├── SecurityHelper.ts   # Security testing utilities
│   │   ├── VisualTestHelper.ts # Visual comparison tools
│   │   └── ...
│   ├── pages/         # Page Object Models
│   └── tests/         # Test scenarios
│       ├── security/  # Security test suites
│       └── ...       # Other test suites
├── playwright.config.ts
└── package.json
```

## Visual Testing

The visual testing infrastructure allows for:
- Pixel-by-pixel comparison with baseline images
- Configurable threshold for differences
- Responsive design validation
- Email template verification

Configure visual testing in `tests/data/visual.config.ts`:
- Set sensitivity threshold
- Choose pages to test
- Define email templates to verify

## Security Testing

Security tests cover:
- Input validation and sanitization
- Payment form security
- Privacy compliance
- Cookie consent handling

Configure security tests in `tests/data/security.config.ts`:
- Define security rules
- Set compliance requirements
- Configure test parameters

## Performance Testing

Performance monitoring includes:
- Page load metrics
- API response times
- Resource loading
- Core Web Vitals

Configure performance tests in `tests/data/performance.config.ts`:
- Set performance budgets
- Define thresholds
- Configure monitoring parameters

## CI/CD Integration

This project includes GitHub Actions workflows for automated testing:
- Runs on push to main branch
- Runs on pull requests
- Can be triggered manually
- Generates and uploads test reports

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Run tests to ensure nothing is broken
4. Submit a pull request

## License

MIT
