import { Page } from '@playwright/test';
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
  
  // Question editing
  private readonly answerEditor = this.page.locator('[data-slate-node="element"]');
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

  async waitForDashboard() {
    await this.page.waitForURL('https://app.mystories.com/');
    await this.myStoriesHeading.waitFor({ state: 'visible' });
    console.log('Dashboard loaded');
  }

  async startWriting(questionIndex: number) {
    console.log(`Starting to write answer for question ${questionIndex}`);
    await this.startWritingButton(questionIndex).click();
  }

  async writeAnswer(text: string) {
    console.log('Writing answer:', text);
    // Click the editor to focus it
    await this.answerEditor.click();
    
    // Type the text using keyboard
    await this.page.keyboard.type(text);
  }

  async saveAnswer() {
    console.log('Saving answer');
    await this.saveButton.click();
  }

  async previewAnswer() {
    console.log('Opening answer preview');
    // Add wait for PDF generation
    await this.page.waitForTimeout(5000); // Initial wait for PDF generation
    
    // Wait for popup before clicking to ensure proper event handling
    const previewPromise = this.page.waitForEvent('popup');
    await this.previewButton.click();
    const previewPage = await previewPromise;
    
    // Capture PDF and screenshot
    await ScreenshotHelper.capturePdfPage(previewPage, 'answer-preview');
    
    return previewPage;
  }

  async editAnswer(text: string) {
    console.log('Editing answer');
    // First go back to main questions page
    await this.goBack();
    
    // Now click edit and proceed with changes
    await this.editButton.click();
    await this.answerEditor.click();
    await this.page.keyboard.type(text);
    await this.saveAnswer();
  }

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
    await this.backButton.click();
  }
}
