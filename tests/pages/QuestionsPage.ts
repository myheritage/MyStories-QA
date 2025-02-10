import { Locator, Page, expect } from '@playwright/test';
import { URLS } from '../data/test.config';
import { BasePage } from './BasePage';
import { ScreenshotHelper } from '../helpers/ScreenshotHelper';

export class QuestionsPage extends BasePage {
  // Page header
  private readonly myStoriesHeading = this.page.getByRole('heading', { name: 'My stories' });
  
  // Question actions
  private readonly startWritingButton = (index: number) => {
    if (index === 1) {
      return this.page.locator('a > .ant-btn').first();
    }
    return this.page.locator(`div:nth-child(${index}) > .story-quick-actions > .question-main-action-button > a > .ant-btn`);
  };
  private readonly editButton = this.page.getByRole('button', { name: 'Edit story' });
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly backButton = this.page.getByText('Back');
  private readonly previewButton = this.page.getByRole('button', { name: 'Preview' });
  private readonly previewBookButton = this.page.getByRole('button', { name: '📖 Preview book' });
  
  // Question management
  private readonly addQuestionsButton = this.page.getByRole('button', { name: '📖 Add questions' });
  private readonly addOwnQuestionButton = this.page.getByRole('button', { name: 'Add your own question' });
  private readonly questionInput = this.page.getByRole('textbox', { name: 'Enter your question' });
  private readonly questionsDialog = this.page.getByRole('dialog', { name: 'Add questions to your book' });
  private readonly addQuestionsDoneButton = this.questionsDialog.getByRole('button', { name: 'Done' });
  private readonly customQuestionDoneButton = this.page.getByLabel('Add your own question').getByRole('button', { name: 'Done' });
  
  // Editor elements
  private readonly editorContainer = this.page.locator('#root > div > div.layout-content > div > div.inner > div > div.story-section > div.answer-input-wrapper');
  private readonly answerEditor = this.editorContainer.locator('[contenteditable="true"]').first();
  
  // Question editing controls
  private readonly questionOptionsButton = (index: number) => this.page.locator(`div:nth-child(${index}) > .story-quick-actions > div:nth-child(3) > .ant-dropdown-trigger > svg`);
  private readonly editQuestionOption = this.page.getByText('Edit question');
  private readonly deleteQuestionOption = this.page.getByRole('menuitem', { name: 'Delete Delete question' }).locator('span');
  private readonly questionEditInput = this.page.getByRole('textbox').filter({ hasText: /.*/ });
  
  // Filters
  private readonly allTab = this.page.getByRole('tab', { name: /^All/ });
  private readonly notStartedTab = this.page.getByRole('tab', { name: /^Not started/ });
  private readonly completedTab = this.page.getByRole('tab', { name: /^Completed/ });

  constructor(page: Page) {
    super(page);
  }

  // Private helper methods
  private async waitForEditorReady() {
    console.log('Waiting for editor to be ready');
    await this.editorContainer.waitFor({ state: 'visible', timeout: 5000 });
    await this.answerEditor.waitFor({ state: 'visible', timeout: 5000 });
    
    // Wait for any animations
    await this.page.waitForTimeout(300);
    
    // Wait for editor to be interactive
    await this.page.waitForFunction(() => {
      const wrapper = document.querySelector('#root > div > div.layout-content > div > div.inner > div > div.story-section > div.answer-input-wrapper');
      const editor = wrapper?.querySelector('[contenteditable="true"]');
      return editor && window.getComputedStyle(editor).display !== 'none';
    }, { timeout: 5000 });
    
    console.log('Editor is ready');
  }

  // Navigation and initialization
  async waitForDashboard() {
    await this.page.waitForURL(URLS.APP);
    await this.myStoriesHeading.waitFor({ state: 'visible' });
    console.log('Dashboard loaded');
  }

  // Answer writing and editing
  async startWriting(questionIndex: number) {
    console.log(`Starting to write answer for question ${questionIndex}`);
    
    // Click and wait for navigation
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle' }),
      this.startWritingButton(questionIndex).click()
    ]);
    
    // Wait for editor to be ready
    await this.waitForEditorReady();
    
    // Log editor state for debugging
    const editorState = await this.answerEditor.evaluate((element: HTMLElement) => {
      const style = window.getComputedStyle(element);
      return {
        isVisible: style.display !== 'none' && style.visibility !== 'hidden',
        isContentEditable: element.isContentEditable,
        hasParentEditor: !!element.closest('[contenteditable="true"]'),
        isSlateNode: element.hasAttribute('data-slate-node')
      };
    });
    console.log('Editor state:', editorState);
    
    console.log('Editor is ready and initialized');
  }

  async writeAnswer(text: string) {
    console.log('Writing answer:', text);
    
    // Wait for editor to be ready
    await this.waitForEditorReady();
    
    // Try to focus the editor multiple times if needed
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Focus attempt ${attempt}/3`);
      
      // Focus and click the editor
      await this.answerEditor.click();
      await this.answerEditor.evaluate((element: HTMLElement) => {
        (element as HTMLElement & { isContentEditable: boolean }).focus();
      });
      
      // Verify we have focus and can type
      const hasFocus = await this.answerEditor.evaluate((el: HTMLElement) => {
        const isActive = document.activeElement === el;
        const isEditable = el.isContentEditable;
        const hasParentEditor = !!el.closest('[contenteditable="true"]');
        console.log('Focus check:', { isActive, isEditable, hasParentEditor });
        return isActive && isEditable && hasParentEditor;
      });
      if (hasFocus) {
        console.log('Successfully focused editor');
        break;
      }
      
      if (attempt === 3) {
        console.error('Failed to focus editor after 3 attempts');
        throw new Error('Could not focus editor');
      }
      
      // Wait briefly before next attempt
      await this.page.waitForTimeout(100);
    }
    
    // Type the new text with a delay to ensure stability
    await this.page.keyboard.type(text, { delay: 50 });
    
    // Wait a moment for Slate to process the changes
    await this.page.waitForTimeout(100);
    
    // Verify text was entered
    const content = await this.answerEditor.textContent();
    if (!content?.includes(text)) {
      console.error('Editor content:', content);
      throw new Error('Failed to enter text into editor');
    }
    
    console.log('Answer text entered successfully');
  }

  async saveAnswer() {
    console.log('Saving answer');
    await this.saveButton.click();
    
    // Wait for save to complete and editor to update
    await this.page.waitForLoadState('networkidle');
    console.log('Save completed');
  }

  async previewAnswer() {
    console.log('Opening answer preview');
    // Add wait for PDF generation
    await this.page.waitForTimeout(5000); // Initial wait for PDF generation
    
    // Wait for popup before clicking to ensure proper event handling
    console.log('Waiting for popup event...');
    const previewPromise = this.page.waitForEvent('popup');
    console.log('Clicking preview button...');
    await this.previewButton.click();
    console.log('Waiting for popup page...');
    const previewPage = await previewPromise;
    console.log('Popup opened:', await previewPage.url());
    
    // Capture PDF and screenshot
    await ScreenshotHelper.capturePdfPage(previewPage, 'answer-preview');
    
    return previewPage;
  }

  async editAnswer(text: string) {
    console.log('Editing answer');
    // First go back to main questions page
    await this.goBack();
    
    // Click edit and wait for navigation
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle' }),
      this.editButton.click()
    ]);
    
    // Wait for editor to be ready
    await this.waitForEditorReady();
    console.log('Editor is ready for editing');
    
    // Reuse writeAnswer logic for consistency
    await this.writeAnswer(text);
    await this.saveAnswer();
  }

  // Question management
  async editQuestion(index: number, newText: string) {
    console.log(`Editing question ${index} to: ${newText}`);
    await this.questionOptionsButton(index).click();
    await this.editQuestionOption.click();
    
    // Wait for the edit dialog to be ready
    await this.page.waitForTimeout(500);
    
    // Find and fill the input
    await this.questionEditInput.fill(newText);
    await this.saveButton.click();
  }

  async deleteQuestion(index: number) {
    console.log(`Deleting question ${index}`);
    await this.questionOptionsButton(index).click();
    await this.deleteQuestionOption.click();
  }

  async addPrewrittenQuestion() {
    console.log('Adding a prewritten question');
    await this.addQuestionsButton.click();
    
    // Wait for the dialog to be visible
    await this.questionsDialog.waitFor({ state: 'visible' });
    
    // Get the first question's div and its text
    const firstQuestionDiv = this.questionsDialog
      .locator('div[style*="display: flex"]')
      .first();
    
    // Get the question text from the typography span
    const questionText = await firstQuestionDiv
      .locator('span.ant-typography')
      .first()
      .textContent();
    
    // Click the Add button for this question
    await firstQuestionDiv
      .locator('button')
      .click();
    
    // Click Done in the dialog
    await this.addQuestionsDoneButton.click();
    
    // Wait for the dialog to close
    await this.questionsDialog.waitFor({ state: 'hidden' });
    
    // Return the question text for verification
    return questionText?.trim();
  }

  async addCustomQuestion(questionText: string) {
    console.log('Adding custom question:', questionText);
    await this.addQuestionsButton.click();
    await this.addOwnQuestionButton.click();
    await this.questionInput.fill(questionText);
    await this.customQuestionDoneButton.click();
  }

  async verifyQuestionExists(questionText: string) {
    console.log('Verifying question exists:', questionText);
    // Use a more specific locator to target just the question title
    const question = this.page.locator('.title', { hasText: questionText });
    await question.waitFor({ state: 'visible' });
  }

  // Filtering and navigation
  async filterQuestions(filter: 'all' | 'not-started' | 'completed') {
    console.log('Filtering questions:', filter);
    
    // If filtering completed questions, make sure we're on the main page first
    if (filter === 'completed') {
      await this.goBack();
    }
    
    switch (filter) {
      case 'all':
        await this.allTab.click();
        break;
      case 'not-started':
        await this.notStartedTab.click();
        break;
      case 'completed':
        await this.completedTab.click();
        break;
    }
  }

  async previewBook() {
    console.log('Opening book preview');
    // Add wait for PDF generation
    await this.page.waitForTimeout(5000); // Initial wait for PDF generation
    
    // Wait for popup before clicking to ensure proper event handling
    const previewPromise = this.page.waitForEvent('popup');
    await this.previewBookButton.click();
    const previewPage = await previewPromise;
    
    // Capture PDF and screenshot
    await ScreenshotHelper.capturePdfPage(previewPage, 'book-preview');
    
    return previewPage;
  }

  async reorderQuestion(fromIndex: number, toIndex: number) {
    console.log(`Reordering question from ${fromIndex} to ${toIndex}`);
    const sourceLocator = this.page.locator(`div:nth-child(${fromIndex}) > .index-and-sorter > .sorter`);
    const targetLocator = this.page.locator(`div:nth-child(${toIndex}) > .index-and-sorter > .sorter`);
    
    await sourceLocator.click();
    await targetLocator.click();
  }

  async goBack() {
    console.log('Going back to main questions page');
    // Wait for navigation after clicking back
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle' }),
      this.backButton.click()
    ]);
    // Wait for page to stabilize
    await this.page.waitForLoadState('domcontentloaded');
  }

  // Verification methods
  async verifyLoggedInUser(firstName: string) {
    console.log('Verifying logged in as:', firstName);
    await this.myStoriesHeading.waitFor({ state: 'visible' });
    await this.page.getByText(firstName).waitFor({ state: 'visible' });
  }

  /**
   * Verify the answer text for a specific question
   * Finds the question by its text and verifies its answer matches the expected text.
   * 
   * @param question The question text to find
   * @param expectedAnswer The expected answer text
   * @throws Error if question not found or answer doesn't match
   * @example
   * ```typescript
   * await questionsPage.verifyAnswerText(
   *   "What is your earliest childhood memory?",
   *   "I remember playing in the garden..."
   * );
   * ```
   */
  async verifyAnswerText(question: string, expectedAnswer: string): Promise<void> {
    console.log('Verifying answer for question:', question);
    
    // Wait for the editor to be ready
    await this.waitForEditorReady();
    
    // Get the answer text
    const answerText = await this.editorContainer
      .locator('[contenteditable="true"]')
      .first()
      .textContent();

    // Verify the answer matches
    expect(answerText?.trim()).toBe(expectedAnswer.trim());
    console.log('Answer verified');
  }
}
