import path from 'path';
import fs from 'fs';

// Load environment variables from .env file
require('dotenv').config({
  path: path.join(__dirname, '..', '.env')
});

// Set default values for required environment variables
process.env.TEST_ENV = process.env.TEST_ENV || 'local';
process.env.USE_STATIC_EMAILS = process.env.USE_STATIC_EMAILS || 'true';
process.env.SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || 'test-results/screenshots';

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
