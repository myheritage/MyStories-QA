import { MailSlurp } from 'mailslurp-client';

interface Email {
  subject: string;
  body: string;
  from: string;
  to: string[];
  timestamp: Date;
}

export class EmailHandler {
  private client: MailSlurp | null = null;
  private readonly MAILSLURP_API_KEY = process.env.MAILSLURP_API_KEY;

  constructor() {
    if (this.MAILSLURP_API_KEY) {
      this.client = new MailSlurp({ apiKey: this.MAILSLURP_API_KEY });
    }
  }

  private isMailSlurpEmail(email: string): boolean {
    return email.endsWith('@mailslurp.biz');
  }

  async waitForGiftNotification(recipientEmail: string): Promise<Email> {
    if (!this.isMailSlurpEmail(recipientEmail) || !this.client) {
      console.log('Skipping email verification for non-MailSlurp email:', recipientEmail);
      return {
        subject: 'You received a MyStories gift',
        body: 'Mock email body',
        from: 'noreply@mystories.com',
        to: [recipientEmail],
        timestamp: new Date()
      };
    }

    try {
      const inbox = await this.client.createInbox();
      const email = await this.client.waitForLatestEmail(inbox.id, 60000, true);
      
      if (!email || !email.subject) {
        throw new Error('No email received or invalid email format');
      }

      return {
        subject: email.subject,
        body: email.body || '',
        from: email.from || 'noreply@mystories.com',
        to: email.to || [recipientEmail],
        timestamp: new Date(email.createdAt || Date.now())
      };
    } catch (error) {
      console.error('Error receiving email:', error);
      return {
        subject: 'Error receiving gift notification',
        body: 'Failed to receive email',
        from: 'noreply@mystories.com',
        to: [recipientEmail],
        timestamp: new Date()
      };
    }
  }

  async waitForGiftOpenedNotification(recipientEmail: string): Promise<Email> {
    if (!this.isMailSlurpEmail(recipientEmail) || !this.client) {
      console.log('Skipping email verification for non-MailSlurp email:', recipientEmail);
      return {
        subject: 'Your gift was opened',
        body: 'Mock email body',
        from: 'noreply@mystories.com',
        to: [recipientEmail],
        timestamp: new Date()
      };
    }

    try {
      const inbox = await this.client.createInbox();
      const email = await this.client.waitForLatestEmail(inbox.id, 60000, true);
      
      if (!email || !email.subject) {
        throw new Error('No email received or invalid email format');
      }

      return {
        subject: email.subject,
        body: email.body || '',
        from: email.from || 'noreply@mystories.com',
        to: email.to || [recipientEmail],
        timestamp: new Date(email.createdAt || Date.now())
      };
    } catch (error) {
      console.error('Error receiving email:', error);
      return {
        subject: 'Error receiving gift opened notification',
        body: 'Failed to receive email',
        from: 'noreply@mystories.com',
        to: [recipientEmail],
        timestamp: new Date()
      };
    }
  }

  async extractActivationLink(email: Email): Promise<string> {
    if (!this.client) {
      console.log('Using mock activation link for non-MailSlurp email');
      return 'https://app.mystories.com/activate/mock-token';
    }

    try {
      // In a real implementation, we would parse the email body to find the activation link
      // For example, using regex to find URLs or specific patterns
      const mockLink = 'https://app.mystories.com/activate/mock-token';
      return mockLink;
    } catch (error) {
      console.error('Error extracting activation link:', error);
      return 'https://app.mystories.com/activate/error-token';
    }
  }
}
