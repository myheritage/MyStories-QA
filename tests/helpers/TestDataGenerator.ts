import { Page } from '@playwright/test';
import { EmailHandler, StaticEmailProvider } from './EmailHandler';

export interface GiftStoryTeller {
  firstName: string;
  lastName: string;
  email: string;
  giftDate?: string;
  message?: string;
}

export interface GiftGiver {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  state?: string;
  copies: number;
}

export class TestDataGenerator {
  readonly emailHandler: EmailHandler;

  constructor() {
    const useStaticEmails = process.env.USE_STATIC_EMAILS === 'true';
    const emailProvider = useStaticEmails ? new StaticEmailProvider() : null;
    if (!emailProvider) {
      throw new Error('Email provider not configured. Set USE_STATIC_EMAILS=true or implement MailSlurp provider');
    }
    this.emailHandler = new EmailHandler(emailProvider);
  }

  generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async generateStoryTeller() {
    const randomId = this.generateRandomString(8);
    return {
      firstName: `Test${randomId}`,
      lastName: 'User',
      email: `test.user+${randomId}@example.com`
    };
  }

  async generateGiftStoryTeller(): Promise<GiftStoryTeller> {
    const randomId = this.generateRandomString(8);
    return {
      firstName: `Gift${randomId}`,
      lastName: 'Recipient',
      email: await this.emailHandler.createTestEmail()
    };
  }

  async generateGiftGiver(withState = false): Promise<GiftGiver> {
    const randomId = this.generateRandomString(8);
    const giftGiver: GiftGiver = {
      firstName: `Giver${randomId}`,
      lastName: 'User',
      email: await this.emailHandler.createTestEmail(),
      country: withState ? 'United States' : 'United Kingdom',
      copies: 1
    };

    if (withState) {
      giftGiver.state = 'California';
    }

    return giftGiver;
  }
}
