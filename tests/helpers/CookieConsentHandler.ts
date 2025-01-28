import { Page } from '@playwright/test';
import { CookieConsentOption } from '../pages/BasePage';

export class CookieConsentHandler {
    private readonly cookieDialog = this.page.getByRole('dialog', { name: 'This website uses cookies' });
    private readonly allowAllButton = this.page.getByRole('button', { name: 'Allow all' });
    private readonly denyButton = this.page.getByRole('button', { name: 'Deny' });

    constructor(private readonly page: Page) {}

    /**
     * Handle the cookie consent banner
     * @param option CookieConsentOption to either allow all or deny cookies
     */
    async handle(option: CookieConsentOption): Promise<void> {
        try {
            // Wait for cookie dialog to be visible
            await this.cookieDialog.waitFor({ state: 'visible', timeout: 10000 });
            console.log('Cookie dialog found');

            // Get and click appropriate button
            const button = option === CookieConsentOption.ALLOW_ALL 
                ? this.allowAllButton 
                : this.denyButton;

            await button.waitFor({ state: 'visible', timeout: 5000 });
            console.log(`Found ${option} button`);
            
            await button.click();
            console.log(`Clicked ${option} button`);

            // Verify dialog disappears
            await this.cookieDialog.waitFor({ state: 'hidden', timeout: 5000 });
            console.log('Cookie dialog disappeared');
        } catch (error) {
            console.error('Error handling cookie consent:', error);
            throw error;
        }
    }

    /**
     * Check if the cookie consent banner is visible
     */
    async isVisible(): Promise<boolean> {
        return await this.cookieDialog.isVisible();
    }

    /**
     * Wait for the cookie consent banner to disappear
     */
    async waitForHidden(timeout = 5000): Promise<void> {
        await this.cookieDialog.waitFor({ state: 'hidden', timeout });
    }
}
