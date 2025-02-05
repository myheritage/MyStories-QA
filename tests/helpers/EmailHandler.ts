import { MailSlurp, Email as MailSlurpEmail } from 'mailslurp-client';
import { Browser, Page, TestInfo, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { TestDataGenerator, StoryTellerDetails } from './TestDataGenerator';
import { QuestionsPage } from '../pages/QuestionsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { EMAIL_CONFIG } from '../data/test.config';

export enum EmailMode {
  MAILSLURP = 'mailslurp',    // Use MailSlurp for real temp emails
  HARDCODED = 'hardcoded',    // Use configured hardcoded emails
  FAKE = 'fake'               // Use TestDataGenerator's fake emails
}

export interface Email {
  id: string;
  subject: string;
  body: string;
  html?: string;
  from: string;
  to: string[];
  timestamp: Date;
}

interface EmailConfig {
  mode: EmailMode;
  mailslurpApiKey?: string;   // Required for MAILSLURP mode
  hardcodedEmails?: {         // Required for HARDCODED mode
    purchaser: string;        // For self-purchase or gift giver
    recipient?: string;       // For gift recipient (in gift flow)
  };
  testDataGenerator?: TestDataGenerator;  // Required for GENERATED mode
  isSandboxMode?: boolean;    // Optional: Used for weekly question email intervals
}

enum EmailType {
  WELCOME = 'welcome',
  GIFT_RECEIVE = 'gift_receive',
  GIFT_OPENED = 'gift_opened',
  WEEKLY_QUESTION = 'weekly_question',
  LOGIN = 'login'
}

export class EmailHandler {
  private client: MailSlurp | null = null;
  private readonly inboxes: Map<string, string> = new Map(); // email -> inboxId
  private browser: Browser | null = null;
  private mode: EmailMode;
  private hardcodedEmails?: { purchaser: string; recipient?: string };
  private testDataGenerator?: TestDataGenerator;
  private isSandboxMode: boolean = false;
  constructor(config: EmailConfig, browser?: Browser) {
    console.log('\n=== Initializing EmailHandler ===');
    
    // Set email mode and sandbox mode
    this.mode = config.mode;
    this.isSandboxMode = config.isSandboxMode || false;
    if (this.isSandboxMode) {
      console.log('🏦 Sandbox mode enabled - affects weekly question email intervals');
    }
    
    // For email tests (emails.spec.ts), always use MailSlurp if mode is fake
    const isEmailTest = process.env.TEST_FILE?.includes('emails.spec.ts');
    if (this.mode === EmailMode.FAKE && isEmailTest) {
      console.log('📧 Email test detected - using MailSlurp for fake mode');
      this.mode = EmailMode.MAILSLURP;
    }
    
    console.log(`📧 Email mode: ${this.mode}`);

    switch (this.mode) {
      case EmailMode.MAILSLURP:
        if (!config.mailslurpApiKey) {
          throw new Error('MAILSLURP_API_KEY is required when using MAILSLURP mode');
        }
        this.client = new MailSlurp({ apiKey: config.mailslurpApiKey });
        console.log('📧 Using MailSlurp for real email testing');
        break;

      case EmailMode.HARDCODED:
        if (!config.hardcodedEmails?.purchaser) {
          throw new Error('Purchaser email is required when using HARDCODED mode');
        }
        this.hardcodedEmails = config.hardcodedEmails;
        console.log(`📧 Using hardcoded purchaser email: ${this.hardcodedEmails.purchaser}`);
        if (this.hardcodedEmails.recipient) {
          console.log(`📧 Using hardcoded recipient email: ${this.hardcodedEmails.recipient}`);
        }
        break;

      case EmailMode.FAKE:
        if (!config.testDataGenerator) {
          throw new Error('TestDataGenerator is required when using GENERATED mode');
        }
        this.testDataGenerator = config.testDataGenerator;
        console.log('📧 Using TestDataGenerator for fake emails');
        break;

      default:
        throw new Error(`Invalid email mode: ${this.mode}`);
    }

    this.browser = browser || null;
    console.log('=================================\n');
  }

  setBrowser(browser: Browser) {
    this.browser = browser;
  }

  private shouldUseMailSlurp(): boolean {
    return this.mode === EmailMode.MAILSLURP || this.mode === EmailMode.FAKE;
  }

  private async ensureClient(): Promise<void> {
    if (this.shouldUseMailSlurp() && !this.client) {
      throw new Error('MailSlurp client not initialized');
    }
  }

  private async ensureBrowser(): Promise<void> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Please provide browser instance.');
    }
  }

  private formatSubject(template: string, params: {
    giverFirstName?: string;
    receiverFirstName?: string;
    firstName?: string;
    question?: string;
  }): string {
    console.log(`\n📝 Formatting email subject template: "${template}"`);
    let subject = template;
    if (params.giverFirstName) {
      subject = subject.replace('{giverFirstName}', params.giverFirstName);
    }
    if (params.receiverFirstName) {
      subject = subject.replace('{receiverFirstName}', params.receiverFirstName);
    }
    if (params.firstName) {
      subject = subject.replace('{firstName}', params.firstName);
    }
    if (params.question) {
      subject = subject.replace('{question}', params.question);
    }
    console.log(`📝 Formatted subject: "${subject}"\n`);
    return subject;
  }

  async createMailSlurpInbox(): Promise<string> {
    console.log('\n📬 Creating new MailSlurp inbox...');
    await this.ensureClient();
    const inbox = await this.client!.createInbox();
    this.inboxes.set(inbox.emailAddress, inbox.id);
    console.log(`📬 Created inbox: ${inbox.emailAddress} (ID: ${inbox.id})\n`);
    return inbox.emailAddress;
  }

  async registerInbox(email: string, isRecipient: boolean = false): Promise<void> {
    console.log(`\n📬 Registering inbox for: ${email}`);

    switch (this.mode) {
      case EmailMode.MAILSLURP:
        if (!this.inboxes.has(email)) {
          throw new Error(`No MailSlurp inbox found for ${email}. Create one first with createMailSlurpInbox()`);
        }
        console.log('📬 Using existing MailSlurp inbox\n');
        break;

      case EmailMode.HARDCODED:
        const hardcodedEmail = isRecipient ? 
          this.hardcodedEmails!.recipient : 
          this.hardcodedEmails!.purchaser;
        if (email === hardcodedEmail) {
          this.inboxes.set(email, 'hardcoded-inbox-id');
          console.log('📬 Using hardcoded email inbox\n');
        }
        break;

      case EmailMode.FAKE:
        this.inboxes.set(email, `generated-inbox-${Date.now()}`);
        console.log('📬 Using generated email inbox\n');
        break;
    }
  }

  private async getInboxId(email: string, isRecipient: boolean = false): Promise<string> {
    const inboxId = this.inboxes.get(email);
    if (!inboxId) {
      throw new Error(`No inbox found for email: ${email}`);
    }
    return inboxId;
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    description: string,
    retries = EMAIL_CONFIG.TIMEOUTS.MAX_RETRIES,
    baseDelay = EMAIL_CONFIG.TIMEOUTS.POLL_INTERVAL
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`\n🔄 ${description} - Attempt ${attempt}/${retries}`);
        return await operation();
      } catch (error) {
        console.log(`❌ ${description} - Attempt ${attempt} failed:`, error);
        if (attempt === retries) throw error;
        const delay = baseDelay * Math.pow(1.5, attempt - 1);
        console.log(`⏳ Retrying in ${delay/1000} seconds...\n`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Should not reach here');
  }

  private async waitForEmail(inboxId: string, options: {
    subject?: string;
    from?: string;
    timeout?: number;
    isRecipient?: boolean;
  }): Promise<Email> {
    console.log('\n📨 Waiting for email:', {
      inboxId,
      subject: options.subject,
      from: options.from,
      timeout: options.timeout || EMAIL_CONFIG.TIMEOUTS.DEFAULT_WAIT
    });

    if (!this.shouldUseMailSlurp()) {
      console.log('📨 Using mock email - returning mock content\n');
      const mockEmail = options.isRecipient ? 
        this.hardcodedEmails?.recipient :
        (this.mode === EmailMode.HARDCODED ? this.hardcodedEmails?.purchaser : 'generated@example.com');
      
      return {
        id: `mock-email-${Date.now()}`,
        subject: options.subject || 'Mock Subject',
        body: 'Mock email body',
        html: '<div>Mock email body</div>',
        from: options.from || 'mock@sender.com',
        to: [mockEmail!],
        timestamp: new Date()
      };
    }

    return this.retryOperation(
      async () => {
        try {
          const email = await this.client!.waitForLatestEmail(
            inboxId,
            30000  // Short timeout per attempt
          );

          // Check subject and sender before proceeding
          if (options.subject && email.subject !== options.subject) {
            throw new Error(`Expected subject "${options.subject}" but got "${email.subject}"`);
          }
          if (options.from && email.from !== options.from) {
            throw new Error(`Expected sender "${options.from}" but got "${email.from}"`);
          }

          const fullEmail = await this.client!.emailController.getEmail({ emailId: email.id });

          console.log('📨 Email received:', {
            id: email.id,
            subject: email.subject,
            from: email.from,
            timestamp: email.createdAt
          });

          return {
            id: email.id,
            subject: email.subject || '',
            body: fullEmail.body || '',
            html: typeof fullEmail.html === 'string' ? fullEmail.html : undefined,
            from: email.from || '',
            to: email.to || [],
            timestamp: new Date(email.createdAt || Date.now())
          };
        } catch (error) {
          // Force retry by throwing error with clear message
          throw new Error('Email not found or did not match criteria');
        }
      },
      `Waiting for email${options.subject ? ` with subject "${options.subject}"` : ''}`,
      EMAIL_CONFIG.TIMEOUTS.MAX_RETRIES,
      EMAIL_CONFIG.TIMEOUTS.POLL_INTERVAL
    );
  }

  async waitForWelcomeEmail(email: string): Promise<Email> {
    console.log(`\n👋 Waiting for welcome email to: ${email}`);
    return this.waitForEmail(await this.getInboxId(email), {
      subject: EMAIL_CONFIG.SUBJECTS.WELCOME,
      from: EMAIL_CONFIG.SENDERS.STORIES
    });
  }

  async waitForLoginEmail(email: string): Promise<Email> {
    console.log(`\n🔑 Waiting for login email to: ${email}`);
    return this.waitForEmail(await this.getInboxId(email), {
      subject: EMAIL_CONFIG.SUBJECTS.LOGIN,
      from: EMAIL_CONFIG.SENDERS.STORIES
    });
  }

  async waitForGiftReceiveEmail(email: string, params: {
    giverFirstName: string;
    receiverFirstName: string;
  }): Promise<Email> {
    console.log(`\n🎁 Waiting for gift receive email to: ${email}`);
    const subject = this.formatSubject(EMAIL_CONFIG.SUBJECTS.GIFT_RECEIVE, params);
    return this.waitForEmail(await this.getInboxId(email, true), {
      subject,
      from: EMAIL_CONFIG.SENDERS.STORIES,
      isRecipient: true
    });
  }

  async waitForGiftOpenedEmail(email: string): Promise<Email> {
    console.log(`\n📢 Waiting for gift opened notification to: ${email}`);
    return this.waitForEmail(await this.getInboxId(email), {
      subject: EMAIL_CONFIG.SUBJECTS.GIFT_OPENED,
      from: EMAIL_CONFIG.SENDERS.STORIES
    });
  }

  async waitForWeeklyQuestionEmail(email: string, params: {
    firstName: string;
    testMode?: boolean;
  }): Promise<Email> {
    console.log(`\n❓ Handling weekly question email for: ${email}`);
    if (!params.testMode || this.isSandboxMode) {
      const reason = this.isSandboxMode ? 'sandbox mode' : 'test mode disabled';
      console.log(`❓ Using mock email (${reason})\n`);
      return {
        id: 'mock-weekly-question',
        subject: `${params.firstName}, What is your earliest childhood memory?`,
        from: EMAIL_CONFIG.SENDERS.QUESTIONS,
        to: [email],
        body: 'Mock weekly question email content',
        html: '<div>Mock weekly question email content</div>',
        timestamp: new Date()
      };
    }
    
    console.log('❓ Test mode enabled - waiting for real email');
    const receivedEmail = await this.waitForEmail(await this.getInboxId(email), {
      from: EMAIL_CONFIG.SENDERS.QUESTIONS
    });

    if (!receivedEmail.subject.startsWith(params.firstName)) {
      throw new Error(`Expected email subject to start with "${params.firstName}" but got "${receivedEmail.subject}"`);
    }

    return receivedEmail;
  }

  private async extractLinkByButtonText(email: Email, buttonText: string): Promise<string> {
    console.log(`\n🔗 Extracting link for button: "${buttonText}"`);
    
    if (!this.shouldUseMailSlurp()) {
      const mockLink = `${EMAIL_CONFIG.LINK_PATTERNS.BASE}mock-link`;
      console.log(`🔗 Using mock link: ${mockLink}\n`);
      return mockLink;
    }

    await this.ensureClient();
    const emailContent = await this.client!.emailController.getEmail({ emailId: email.id });
    const buttonMatch = emailContent.body?.match(new RegExp(`<a[^>]+href="([^"]+)"[^>]*>.*?${buttonText}.*?<\/a>`, 'i'));
    
    if (!buttonMatch || !buttonMatch[1]) {
      throw new Error(`No link found for button text: "${buttonText}"`);
    }

    const link = buttonMatch[1];
    if (!link.startsWith(EMAIL_CONFIG.LINK_PATTERNS.BASE)) {
      throw new Error(`Invalid link domain: ${link}`);
    }

    console.log(`🔗 Found link: ${link}\n`);
    return link;
  }

  async extractLoginLink(email: Email): Promise<string> {
    console.log('\n🔑 Extracting login link');
    return this.extractLinkByButtonText(email, 'Log in to MyStories');
  }

  async extractWelcomeLink(email: Email): Promise<string> {
    console.log('\n👋 Extracting welcome link');
    return this.extractLinkByButtonText(email, 'Visit MyStories');
  }

  async extractActivationLink(email: Email): Promise<string> {
    console.log('\n✨ Extracting activation link');
    return this.extractLinkByButtonText(email, 'Get started');
  }

  async extractQuestionLink(email: Email): Promise<string> {
    console.log('\n❓ Extracting question link');
    return this.extractLinkByButtonText(email, 'Answer');
  }

  async takeEmailScreenshot(emailId: string): Promise<string> {
    console.log(`\n📸 Taking screenshot of email: ${emailId}`);
    await this.ensureClient();
    await this.ensureBrowser();
    
    if (!this.shouldUseMailSlurp()) {
      console.log('📸 Using mock email - skipping screenshot\n');
      return 'mock-screenshot.png';
    }
    
    const emailContent = await this.client!.emailController.getEmail({ emailId });
    const page = await this.browser!.newPage();
    try {
      await page.setViewportSize({ width: 800, height: 600 });
      await page.setContent(emailContent.body || '');
      
      const screenshotDir = path.join('test-results', 'emails');
      await fs.mkdir(screenshotDir, { recursive: true });
      
      const screenshotPath = path.join(screenshotDir, `${emailId}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true
      });
      
      console.log(`📸 Screenshot saved: ${screenshotPath}\n`);
      return screenshotPath;
    } finally {
      await page.close();
    }
  }

  async getEmailContent(email: Email): Promise<{
    html: string;
    text: string;
    screenshot: string;
    links: {
      login?: string;
      activation?: string;
      question?: string;
    };
  }> {
    console.log(`\n📧 Getting complete content for email: ${email.id}`);
    
    if (!this.shouldUseMailSlurp()) {
      console.log('📧 Using mock email - returning mock content\n');
      return {
        html: '<div>Mock email content</div>',
        text: 'Mock email content',
        screenshot: 'mock-screenshot.png',
        links: {
          login: `${EMAIL_CONFIG.LINK_PATTERNS.BASE}mock-login-link`,
          activation: `${EMAIL_CONFIG.LINK_PATTERNS.BASE}mock-activation-link`,
          question: `${EMAIL_CONFIG.LINK_PATTERNS.BASE}mock-question-link`
        }
      };
    }

    await this.ensureClient();
    const emailContent = await this.client!.emailController.getEmail({ emailId: email.id });
    const screenshot = await this.takeEmailScreenshot(email.id);
    // Find links by button text
    const links: { [key: string]: string } = {};

    // Welcome/Login links
    const welcomeButton = emailContent.body?.match(/<a[^>]+href="([^"]+)"[^>]*>.*?Visit MyStories.*?<\/a>/i);
    const loginButton = emailContent.body?.match(/<a[^>]+href="([^"]+)"[^>]*>.*?Log in to MyStories.*?<\/a>/i);
    if (welcomeButton) {
      links.login = welcomeButton[1];  // Use login key for both welcome and login links
    } else if (loginButton) {
      links.login = loginButton[1];
    }

    // Activation link - "Get started" button
    const activateButton = emailContent.body?.match(/<a[^>]+href="([^"]+)"[^>]*>.*?Get started.*?<\/a>/i);
    if (activateButton) {
      links.activation = activateButton[1];
    }

    // Question link - "Answer" button
    const answerButton = emailContent.body?.match(/<a[^>]+href="([^"]+)"[^>]*>.*?Answer.*?<\/a>/i);
    if (answerButton) {
      links.question = answerButton[1];
    }
    
    const result = {
      html: emailContent.body || '',
      text: emailContent.body || '',
      screenshot,
      links
    };

    console.log('📧 Email content retrieved:', {
      hasHtml: !!result.html,
      hasText: !!result.text,
      screenshot: result.screenshot,
      foundLinks: Object.entries(result.links)
        .filter(([_, v]) => v)
        .map(([k]) => k)
    });

    return result;
  }

  async verifyEmailContent(
    email: Email, 
    testInfo: TestInfo,
    options: {
      expectedSubject?: string;
      expectedSender?: string;
      requiredLinks?: ('login' | 'activation' | 'question')[];
    }
  ): Promise<void> {
    console.log('\n=== Verifying Email Content ===');
    console.log('Subject:', email.subject);
    console.log('From:', email.from);
    
    const content = await this.getEmailContent(email);
    
    if (options.expectedSubject) {
      console.log('Verifying subject:', options.expectedSubject);
      expect(email.subject).toBe(options.expectedSubject);
    }
    if (options.expectedSender) {
      console.log('Verifying sender:', options.expectedSender);
      expect(email.from).toBe(options.expectedSender);
    }
    
    if (options.requiredLinks) {
      console.log('Verifying required links:', options.requiredLinks);
      for (const linkType of options.requiredLinks) {
        expect(content.links[linkType], `Email should contain ${linkType} link`).toBeDefined();
        expect(content.links[linkType]).toMatch(/^https:\/\/e\.customeriomail\.com\//);
      }
    }
    
    await testInfo.attach('email-screenshot', {
      path: content.screenshot,
      contentType: 'image/png'
    });
    
    console.log('Email verification completed');
    console.log('=============================\n');
  }

  async verifyLoginProcess(page: Page, userDetails: StoryTellerDetails, testInfo: TestInfo) {
    console.log('\n🔑 Starting login verification process');
    
    const loginEmail = await this.waitForLoginEmail(userDetails.email);
    await this.verifyEmailContent(loginEmail, testInfo, {
      expectedSubject: EMAIL_CONFIG.SUBJECTS.LOGIN,
      expectedSender: EMAIL_CONFIG.SENDERS.STORIES,
      requiredLinks: ['login']
    });

    const loginLink = await this.extractLoginLink(loginEmail);
    await page.goto(loginLink);
    
    const questionsPage = new QuestionsPage(page);
    const settingsPage = new SettingsPage(page);
    
    await questionsPage.waitForDashboard();
    await settingsPage.verifyUserEmail(userDetails.email);
    
    console.log('🔑 Login verification completed\n');
  }

  /**
   * Reply to an email with optional attachments
   * Sends a reply to the original sender using the same subject line.
   * 
   * @param email The email to reply to
   * @param answer The reply text content
   * @param attachments Optional array of file paths to attach (images only)
   * @throws Error if email not found or sending fails
   */
  async replyToEmail(email: Email, answer: string, attachments?: string[]): Promise<void> {
    console.log('Replying to email:', email.subject);
    console.log('Answer:', answer);
    
    await this.ensureClient();
    const inboxId = await this.getInboxId(email.to[0]);
    
    // Send reply with same subject
    await this.client!.sendEmail(inboxId, {
      to: [email.from],
      subject: email.subject,  // Keep original subject
      body: answer,
      attachments
    });
    
    console.log('Reply sent');
  }

  async verifyWelcomeProcess(page: Page, userDetails: StoryTellerDetails, testInfo: TestInfo) {
    console.log('\n👋 Starting welcome verification process');
    
    const welcomeEmail = await this.waitForWelcomeEmail(userDetails.email);
    await this.verifyEmailContent(welcomeEmail, testInfo, {
      expectedSubject: EMAIL_CONFIG.SUBJECTS.WELCOME,
      expectedSender: EMAIL_CONFIG.SENDERS.STORIES,
      requiredLinks: ['login']
    });

    const welcomeLink = await this.extractWelcomeLink(welcomeEmail);
    await page.goto(welcomeLink);
    
    const questionsPage = new QuestionsPage(page);
    const settingsPage = new SettingsPage(page);
    
    await questionsPage.waitForDashboard();
    await settingsPage.verifyUserEmail(userDetails.email);
    
    console.log('👋 Welcome verification completed\n');
  }
}
