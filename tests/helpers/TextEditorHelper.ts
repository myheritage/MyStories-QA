import { Page } from '@playwright/test';
import { ScreenshotHelper } from './ScreenshotHelper';

export class TextEditorHelper {
  // Reuse the working selector from QuestionsPage
  private readonly editorSelector = '[contenteditable="true"]';
  
  constructor(private readonly page: Page) {}

  /**
   * Wait for the Slate editor to be visible and ready
   */
  async waitForEditor() {
    console.log('Waiting for Slate editor to be ready');
    await this.page.locator(this.editorSelector).waitFor({ state: 'visible' });
    // Wait for any initial animations/transitions
    await this.page.waitForTimeout(500);
  }

  /**
   * Fill the Slate editor with text
   * @param text Text to enter into the editor
   */
  async fillEditor(text: string) {
    console.log('Filling Slate editor with text:', text);
    try {
      await this.waitForEditor();
      await this.page.locator(this.editorSelector).click();
      await this.page.keyboard.type(text);
    } catch (error) {
      console.error('Error filling editor:', error);
      await ScreenshotHelper.takeFullPageScreenshot(this.page, 'editor-fill-error');
      throw error;
    }
  }

  /**
   * Get the current content of the Slate editor
   * @returns Promise<string> The editor's text content
   */
  async getEditorContent(): Promise<string> {
    console.log('Getting Slate editor content');
    await this.waitForEditor();
    return (await this.page.locator(this.editorSelector).innerText()) || '';
  }

  /**
   * Clear the editor content
   */
  async clearEditor() {
    console.log('Clearing Slate editor content');
    await this.waitForEditor();
    await this.page.locator(this.editorSelector).click();
    await this.page.keyboard.press('Meta+A');
    await this.page.keyboard.press('Backspace');
  }

  /**
   * Verify if specific content exists in the editor
   * @param content Content to verify
   * @returns Promise<boolean>
   */
  async verifyContent(content: string): Promise<boolean> {
    console.log('Verifying Slate editor content');
    const editorContent = await this.getEditorContent();
    return editorContent.includes(content);
  }
}
