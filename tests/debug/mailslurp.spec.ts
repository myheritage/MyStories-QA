import { test, expect } from '@playwright/test';
import { EmailHandler, EmailMode } from '../helpers/EmailHandler';
import { TestDataGenerator } from '../helpers/TestDataGenerator';

test.describe('MailSlurp Debug', () => {
  let testData: TestDataGenerator;

  test.beforeEach(() => {
    testData = new TestDataGenerator();
  });

  test('debug environment and mailslurp setup', async ({ browser }) => {
    // Log environment
    console.log('\n=== Environment Variables ===');
    console.log('EMAIL_MODE:', process.env.EMAIL_MODE);
    console.log('MAILSLURP_API_KEY:', process.env.MAILSLURP_API_KEY ? 
      `${process.env.MAILSLURP_API_KEY.slice(0, 8)}...${process.env.MAILSLURP_API_KEY.slice(-4)}` : 
      'undefined');
    console.log('HARDCODED_EMAIL:', process.env.HARDCODED_EMAIL);
    console.log('HARDCODED_RECIPIENT_EMAIL:', process.env.HARDCODED_RECIPIENT_EMAIL);
    console.log('===========================\n');

    // Create handler
    console.log('Creating EmailHandler with MAILSLURP mode...');
    const handler = new EmailHandler({
      mode: EmailMode.MAILSLURP,
      mailslurpApiKey: process.env.MAILSLURP_API_KEY
    }, browser);

    // Generate test data
    const userDetails = await testData.generateStoryTeller();
    console.log('\nGenerated test data:', userDetails);
    
    // Try basic operations
    console.log('\nCreating new MailSlurp inbox...');
    const testEmail = await handler.createMailSlurpInbox();
    await handler.registerInbox(testEmail);
    console.log('Inbox created successfully');
    
    // Try to wait for an email (should timeout quickly)
    console.log('\nTesting email wait (expecting timeout)...');
    try {
      await handler.waitForLoginEmail(testEmail);
    } catch (error: any) {
      console.log('Got expected timeout error:', error?.message || error);
    }

    console.log('\nMailSlurp debug test completed');
  });
});
