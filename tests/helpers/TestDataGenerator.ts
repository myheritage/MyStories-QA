export interface StoryTellerDetails {
  firstName: string;
  lastName: string;
  email: string;
  giftDate?: string;
  message?: string;
  giftGiverName?: string;
}

export interface GiftGiverDetails {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  state?: string;
  copies: number;
}

export class TestDataGenerator {
  private readonly firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma'];
  private readonly lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
  private readonly domains = ['example.com', 'test.com', 'demo.com', 'testtest.com', 'testtesttest.com', 'testtesttesttest.com'];
  private readonly countries = ['United States', 'Canada', 'United Kingdom'];
  private readonly usStates = ['California', 'New York', 'Texas', 'Florida', 'Arizona'];

  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private generateEmail(firstName: string, lastName: string): string {
    const domain = this.getRandomElement(this.domains);
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
  }

  private generateGiftMessage(): string {
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    return `This is an automated test message created at ${timestamp}. I wanted to give you something special - a chance to share your amazing life stories. Looking forward to reading them!`;
  }

  async generateStoryTeller(): Promise<StoryTellerDetails> {
    const firstName = this.getRandomElement(this.firstNames);
    const lastName = this.getRandomElement(this.lastNames);
    
    return {
      firstName,
      lastName,
      email: this.generateEmail(firstName, lastName)
    };
  }

  async generateGiftStoryTeller(futureDate?: string): Promise<StoryTellerDetails> {
    const firstName = this.getRandomElement(this.firstNames);
    const lastName = this.getRandomElement(this.lastNames);
    const giftGiverName = `${this.getRandomElement(this.firstNames)} ${this.getRandomElement(this.lastNames)}`;
    
    // If no date provided, don't set one (defaults to today)
    const giftDate = futureDate || undefined;
    
    return {
      firstName,
      lastName,
      email: this.generateEmail(firstName, lastName),
      giftDate,
      message: this.generateGiftMessage(),
      giftGiverName
    };
  }

  async generateGiftGiver(withState = false): Promise<GiftGiverDetails> {
    const firstName = this.getRandomElement(this.firstNames);
    const lastName = this.getRandomElement(this.lastNames);
    const country = withState ? 'United States' : this.getRandomElement(this.countries);
    
    return {
      firstName,
      lastName,
      email: this.generateEmail(firstName, lastName),
      country,
      state: withState ? this.getRandomElement(this.usStates) : undefined,
      copies: 1
    };
  }
}
