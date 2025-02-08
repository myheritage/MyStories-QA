# MyStories Test Automation

Comprehensive automated testing suite for MyStories web application using Playwright and TypeScript. This project provides extensive test coverage including visual regression, security, performance, and email testing capabilities.

## Features & Test Categories

### Core Test Suites
- **Homepage Tests**: Navigation, content verification, responsive design
- **Self-Order Flow**: Complete purchase journey validation
- **Gift Order Flow**: Gift purchase and recipient notification flow
- **Cookie Consent**: Compliance and persistence testing
- **Question Flow**: Form validation and submission testing

### Advanced Testing Capabilities
- **Visual Regression Testing** (@Visual)
  - Pixel-by-pixel comparison
  - HTML reports with side-by-side diffs
  - Configurable baseline management
  - Support for multiple viewports

- **Security Testing** (@Security)
  - XSS prevention (script/event/HTML injection)
  - Payment security (price tampering, promo codes)
  - Privacy compliance (GDPR, cookie consent)
  - Input validation and sanitization

- **Performance Testing** (@Performance)
  - Desktop & Mobile metrics tracking
  - Customizable thresholds
  - Comprehensive timing metrics
  - Resource usage monitoring

- **Email Testing**
  - Multiple email modes with different behaviors:
    * Regular tests: respect EMAIL_MODE setting
    * Email tests (emails.spec.ts): if fake, use mailslurp
    * Real card tests: always use mailslurp
  - Real email testing with MailSlurp
  - Development mode with fake emails
  - Local testing with hardcoded addresses
  - Email reply functionality
  - Answer verification
  - Photo attachments (coming soon)
  - Weekly question flow:
    * Question email verification
    * Web-based answering
    * Email-based answering
    * Answer synchronization verification

## Installation & Setup

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9
- Chrome/Chromium browser

### Quick Start
1. Clone and install dependencies:
```bash
npm install
```

2. Set up environment configuration:
```bash
cp .env.example .env
# Edit .env with your settings
```

3. Install Playwright browsers:
```bash
npx playwright install
```

## Configuration

### Environment Variables (.env)
Key configurations:

```bash
# Email Testing Mode
EMAIL_MODE=fake|mailslurp|hardcoded  # Required
MAILSLURP_API_KEY=your-key           # Required for mailslurp mode
HARDCODED_EMAIL=email@example.com    # Required for hardcoded mode

# Test Environment
TEST_ENVIRONMENT=sandbox
SANDBOX_URL=https://app.mystories.com/order?coupon=testmode
STRIPE_SANDBOX=true

# Browser Settings
BROWSER=chromium
HEADLESS=true
SLOW_MO=0  # Milliseconds between actions

# Timeouts (ms)
DEFAULT_TIMEOUT=30000    # Global timeout
EXPECT_TIMEOUT=5000      # Assertion timeout
```

### Performance Thresholds
Desktop metrics:
- First Paint: < 1.8s
- First Contentful Paint: < 2.0s
- Largest Contentful Paint: < 2.5s
- DOM Content Loaded: < 2.5s
- Load Complete: < 3.0s

Mobile metrics:
- First Paint: < 2.0s
- First Contentful Paint: < 2.2s
- Largest Contentful Paint: < 2.7s
- DOM Content Loaded: < 2.7s
- Load Complete: < 3.5s

## Running Tests

### Available Scripts
```bash
# Run all tests
npm test

# UI mode for debugging
npm run test:ui

# Debug mode
npm run test:debug

# Headed mode (non-headless)
npm run test:headed

# Specific flows
npm run test:self    # Self-order flow
npm run test:gift    # Gift order flow

# View test report
npm run show-report

# Generate test code
npm run codegen
```

### Running Specific Test Categories

```bash
# Visual Tests
npx playwright test tests/tests/visual.spec.ts
FORCE_BASELINE=true npx playwright test tests/tests/visual.spec.ts  # Update baseline

# Security Tests
npx playwright test tests/tests/security/  # All security tests
npx playwright test tests/tests/security/input.spec.ts  # Specific suite

# Performance Tests
npx playwright test tests/tests/performance.spec.ts

# Email Tests
# Different modes have different behaviors:
# - Regular tests: respect EMAIL_MODE setting
# - Email tests (emails.spec.ts): if fake, use mailslurp
# - Real card tests: always use mailslurp
npx playwright test tests/tests/emails.spec.ts

# Run email mode unit tests
npx playwright test tests/helpers/__tests__/EmailHandler.test.ts
```

## Project Structure

```
├── tests/
│   ├── data/           # Test configurations
│   │   ├── cookies.config.ts    # Cookie settings
│   │   ├── performance.config.ts # Performance thresholds
│   │   ├── security.config.ts   # Security rules
│   │   ├── test.config.ts      # General config
│   │   └── visual.config.ts    # Visual test settings
│   │
│   ├── helpers/        # Utility functions
│   │   ├── CookieConsentHandler.ts  # Cookie management
│   │   ├── EmailHandler.ts     # Email testing
│   │   ├── ImageComparisonUtil.ts # Visual diff
│   │   ├── LinkCheckerHelper.ts  # Link validation
│   │   ├── PerformanceReporter.ts # Metrics
│   │   ├── ReportGenerator.ts    # HTML reports
│   │   ├── SecurityHelper.ts    # Security utils
│   │   ├── TestDataGenerator.ts # Test data
│   │   └── VisualTestHelper.ts  # Visual testing
│   │
│   ├── pages/         # Page Object Models
│   │   ├── BasePage.ts
│   │   ├── HomePage.ts
│   │   ├── OrderPage.ts
│   │   ├── PaymentPage.ts
│   │   ├── QuestionsPage.ts
│   │   ├── SettingsPage.ts
│   │   └── StoryDetailsPage.ts
│   │
│   └── tests/         # Test suites
│       ├── cookies.spec.ts
│       ├── emails.spec.ts
│       ├── giftOrder.spec.ts
│       ├── homepage.spec.ts
│       ├── performance.spec.ts
│       ├── questions.spec.ts
│       ├── selfOrder.spec.ts
│       ├── visual.spec.ts
│       └── security/
│           ├── input.spec.ts
│           ├── payment.spec.ts
│           └── privacy.spec.ts
```

## Debug & Development

### UI Mode
```bash
npm run test:ui
```
- Interactive test runner
- Step-by-step execution
- Real-time browser state
- Network request inspection

### Debug Mode
```bash
npm run test:debug
```
- Breakpoint support
- Console logging
- Network monitoring
- Step debugging

### Test Generation
```bash
npm run codegen
```
- Record and generate tests
- Interactive selector picking
- Automatic code generation
- Support for multiple browsers

## Best Practices

1. **Test Organization**
   - Use page objects for UI interactions
   - Group related tests in spec files
   - Maintain test data in config files

2. **Visual Testing**
   - Review baselines before committing
   - Use appropriate viewport sizes
   - Document visual changes

3. **Performance Testing**
   - Run tests on consistent environments
   - Monitor trends over time
   - Adjust thresholds as needed

4. **Security Testing**
   - Regular dependency updates
   - Comprehensive input validation
   - Environment-specific configurations

## Common Issues & Solutions

1. **Visual Test Failures**
   - Check for dynamic content
   - Verify viewport sizes
   - Review recent UI changes

2. **Performance Failures**
   - Check system resources
   - Verify network conditions
   - Review recent code changes

3. **Email Test Issues**
   - Verify API keys and mode configuration:
     * EMAIL_MODE must be set to fake, mailslurp, or hardcoded
     * MAILSLURP_API_KEY required for mailslurp mode
     * HARDCODED_EMAIL required for hardcoded mode
   - Check test type:
     * Regular tests use configured EMAIL_MODE
     * Email tests (emails.spec.ts) force mailslurp if mode=fake
     * Real card tests always use mailslurp
   - Review spam filters

## Contributing

1. Create feature branch
2. Run tests locally
3. Update documentation
4. Submit pull request

## License

MIT
