export interface Email {
  subject: string;
  body: string;
  to: string;
  from: string;
}

export interface EmailProvider {
  createInbox(): Promise<string>;
  waitForEmail(email: string, timeout?: number): Promise<Email>;
  extractLoginLink(email: Email): Promise<string>;
}

export class StaticEmailProvider implements EmailProvider {
  private readonly mockEmails: Record<string, Email[]> = {
    'test@example.com': [
      {
        subject: 'Welcome to MyStories',
        body: 'Click here to log in: https://app.mystories.com/login?token=test-token',
        to: 'test@example.com',
        from: 'noreply@mystories.com'
      }
    ]
  };

  async createInbox(): Promise<string> {
    return 'test@example.com';
  }

  async waitForEmail(email: string, timeout = 5000): Promise<Email> {
    const mockEmail = this.mockEmails[email]?.[0];
    if (!mockEmail) {
      throw new Error(`No mock email found for ${email}`);
    }
    return mockEmail;
  }

  async extractLoginLink(email: Email): Promise<string> {
    const match = email.body.match(/https:\/\/app\.mystories\.com\/login\?token=[^\s]+/);
    if (!match) {
      throw new Error('No login link found in email');
    }
    return match[0];
  }
}

export class MailSlurpProvider implements EmailProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createInbox(): Promise<string> {
    // Implementation would use MailSlurp API to create an inbox
    throw new Error('MailSlurp implementation required');
  }

  async waitForEmail(email: string, timeout = 30000): Promise<Email> {
    // Implementation would use MailSlurp API to wait for and fetch email
    throw new Error('MailSlurp implementation required');
  }

  async extractLoginLink(email: Email): Promise<string> {
    const match = email.body.match(/https:\/\/app\.mystories\.com\/login\?token=[^\s]+/);
    if (!match) {
      throw new Error('No login link found in email');
    }
    return match[0];
  }
}

export class EmailHandler {
  private provider: EmailProvider;

  constructor(provider: EmailProvider) {
    this.provider = provider;
  }

  async createTestEmail(): Promise<string> {
    return this.provider.createInbox();
  }

  async waitForGiftNotification(recipientEmail: string): Promise<Email> {
    const email = await this.provider.waitForEmail(recipientEmail);
    if (!email.subject.includes('You received a MyStories gift')) {
      throw new Error('Unexpected email subject for gift notification');
    }
    return email;
  }

  async waitForGiftOpenedNotification(giverEmail: string): Promise<Email> {
    const email = await this.provider.waitForEmail(giverEmail);
    if (!email.subject.includes('Your gift was opened')) {
      throw new Error('Unexpected email subject for gift opened notification');
    }
    return email;
  }

  async extractActivationLink(email: Email): Promise<string> {
    return this.provider.extractLoginLink(email);
  }
}
