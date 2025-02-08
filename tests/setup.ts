import path from 'path';
import fs from 'fs';

// Load environment variables from .env file
console.log('\n=== Loading Environment ===');
console.log('Loading environment from:', path.join(__dirname, '..', '.env'));
require('dotenv').config({
  path: path.join(__dirname, '..', '.env')
});
console.log('Loaded EMAIL_MODE:', process.env.EMAIL_MODE);
console.log('Loaded MAILSLURP_API_KEY:', process.env.MAILSLURP_API_KEY ? 
  `${process.env.MAILSLURP_API_KEY.slice(0, 8)}...${process.env.MAILSLURP_API_KEY.slice(-4)}` : 
  'undefined');
console.log('=========================\n');

// Set TEST_FILE from command line argument if provided
const testFileArg = process.argv.find(arg => arg.endsWith('.spec.ts'));
if (testFileArg) {
  process.env.TEST_FILE = testFileArg;
  console.log('Running test file:', process.env.TEST_FILE);
}

// Set default values for required environment variables
process.env.TEST_ENV = process.env.TEST_ENV || 'local';
process.env.SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || 'test-results/screenshots';

// Email mode configuration
if (!process.env.EMAIL_MODE) {
  throw new Error(
    'EMAIL_MODE is not set. Please add EMAIL_MODE to your .env file.\n' +
    'Valid values are: mailslurp, fake, hardcoded\n' +
    'Example: EMAIL_MODE=fake'
  );
}

// Validate email mode configuration
const validEmailModes = ['mailslurp', 'fake', 'hardcoded'];
if (!validEmailModes.includes(process.env.EMAIL_MODE)) {
  throw new Error(`Invalid EMAIL_MODE: ${process.env.EMAIL_MODE}. Must be one of: ${validEmailModes.join(', ')}`);
}

// Validate mode-specific requirements
if (process.env.EMAIL_MODE === 'mailslurp' && !process.env.MAILSLURP_API_KEY) {
  throw new Error('MAILSLURP_API_KEY is required when EMAIL_MODE is set to mailslurp');
}
if (process.env.EMAIL_MODE === 'hardcoded' && !process.env.HARDCODED_EMAIL) {
  throw new Error('HARDCODED_EMAIL is required when EMAIL_MODE is set to hardcoded');
}

// Create screenshot directory if it doesn't exist
const screenshotDir = process.env.SCREENSHOT_DIR;
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// Global setup function
async function globalSetup() {
  // Any additional setup can be added here
  console.log('Test Environment:', process.env.TEST_ENV);
  console.log('Using Static Emails:', process.env.USE_STATIC_EMAILS === 'true');
}

export default globalSetup;
