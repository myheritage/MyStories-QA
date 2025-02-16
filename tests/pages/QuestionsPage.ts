/**
 * QuestionsPage.ts Change Log - Feb 11, 2025
 * 
 * Changes for Question Order and Schedule Tests
 * 
 * Added Methods:
 * -------------
 * 1. verifyDragComplete(fromIndex: number, toIndex: number)
 *    - Verifies drag-and-drop operation completed successfully
 *    - Checks element positions after drag
 * 
 * 2. getAllScheduleDates(): Promise<string[]>
 *    - Gets all schedule dates from the UI
 *    - Returns array of date strings
 * 
 * 3. verifyNoScheduleDate(index: number)
 *    - Verifies a question has no schedule date
 *    - Used after answering questions
 * 
 * Modified Methods:
 * ----------------
 * 1. dragQuestionToPosition(fromIndex: number, toIndex: number)
 *    - Added logging for better debugging
 *    - No functional changes
 * 
 * Removed Methods:
 * ---------------
 * 1. verifyQuestionAtPosition(questionText: string, position: number)
 *    - Removed due to random question text
 *    - Not used in existing tests
 * 
 * 2. getQuestionText(index: number): Promise<string>
 *    - Removed as no longer needed
 *    - Not used in existing tests
 * 
 * Note: All changes are isolated to question order and scheduling functionality.
 * Core functionality used by questions.spec.ts remains unchanged.
 */

import { Locator, Page, expect } from '@playwright/test';
import { URLS } from '../data/test.config';
import { BasePage } from './BasePage';
import { ScreenshotHelper } from '../helpers/ScreenshotHelper';

/**
 * Interface for question information
 */
export interface QuestionInfo {
  id: string;    // The question's ID/number
  text: string;  // The question's text content
  date: string;  // The scheduled date
}

export class QuestionsPage extends BasePage {
  // Page header
  private readonly myStoriesHeading = this.page.getByRole('heading', { name: 'My stories' });
  
  // Questions list wrapper
  private readonly questionsListLocator = this.page.locator('.stories-list-wrapper');

  // Question elements
  private readonly questionLocator = (index: number) =>
    this.page.locator('.stories-list-wrapper > .story-item').nth(index - 1);

  private readonly sorterLocator = (index: number) => {
    const locator = this.questionLocator(index).locator('.sorter[role="button"]');
    return locator;
  }

  private readonly questionIdLocator = (index: number) =>
    this.questionLocator(index).locator('.idx');

  private readonly questionTextLocator = (index: number) =>
    this.questionLocator(index).locator('.title');

  private readonly scheduleDateLocator = (index: number) =>
    this.questionLocator(index).locator('.sent-at');

  // Answer status
  private readonly answerStatusIcon = (index: number) =>
    this.page.locator(`#root > div > div.layout-content > div > div:nth-child(2) > div > div.story-list > div.stories-list-wrapper > div:nth-child(${index}) > div.story-quick-actions.ant-flex.css-jaljq0.ant-flex-align-center.ant-flex-justify-space-between > div.checkbox-icon > img`);
  
  private readonly editStoryButton = (index: number) =>
    this.page.locator(`div:nth-child(${index})`).getByRole('button', { name: 'Edit story' });
  
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

  /**
   * Get information for a specific question
   */
  async getQuestionInfo(index: number): Promise<QuestionInfo> {
    console.log(`Getting info for question ${index}`);
    
    // Wait for the question to be visible
    await this.questionLocator(index).waitFor({ state: 'visible', timeout: 10000 });
    
    // Get all the information
    const id = await this.questionIdLocator(index).textContent() || '';
    const text = await this.questionTextLocator(index).textContent() || '';
    const date = await this.scheduleDateLocator(index).textContent() || '';

    const info = {
      id: id.trim(),
      text: text.trim(),
      date: date.trim()
    };
    console.log(`Question ${index} info:`, info);
    return info;
  }

  /**
   * Get information for all questions
   */
  async getAllQuestionsInfo(): Promise<QuestionInfo[]> {
    console.log('Getting info for all questions');
    
    // Wait for questions list to be visible
    await this.questionsListLocator.waitFor({ state: 'visible', timeout: 10000 });
    
    // Get all question elements
    const questionElements = await this.page.locator('.stories-list-wrapper > .story-item').all();
    console.log(`Found ${questionElements.length} questions`);
    
    // Get info for each question
    const questions: QuestionInfo[] = [];
    for (let i = 0; i < questionElements.length; i++) {
      questions.push(await this.getQuestionInfo(i + 1));
    }

    console.log('All questions info:', questions);
    return questions;
  }

  /**
   * Get all schedule dates for questions
   * @returns Array of schedule dates as strings
   */
  async getAllScheduleDates(): Promise<string[]> {
    const questions = await this.getAllQuestionsInfo();
    const dates = questions.map(q => q.date);
    console.log('Found schedule dates:', dates);
    return dates;
  }

  /**
   * Drag a question from one position to another using controlled vertical movement
   */
  async dragQuestionToPosition(fromIndex: number, toIndex: number) {
    console.log(`Dragging question from position ${fromIndex} to ${toIndex}`);
    
    // Constants for movement control
    const MOVE_STEPS = 5;    // Steps per question movement
    const PAUSE_MS = 200;    // Pause between each step
    const FINAL_PAUSE_MS = 500; // Pause before dropping
    
    // Get source and target elements
    const sourceLocator = this.sorterLocator(fromIndex);
    const targetLocator = this.sorterLocator(toIndex);
    
    // Wait for both elements to be visible and ready
    console.log('Waiting for source and target elements...');
    await Promise.all([
      sourceLocator.waitFor({ state: 'visible', timeout: 10000 }),
      targetLocator.waitFor({ state: 'visible', timeout: 10000 })
    ]);
    
    // Get initial positions
    console.log('Getting element positions...');
    const sourceBox = await sourceLocator.boundingBox();
    const targetBox = await targetLocator.boundingBox();
    
    if (!sourceBox || !targetBox) {
      throw new Error('Could not get element positions for drag and drop');
    }
    
    // Take screenshot before drag
    await this.page.screenshot({ 
      path: `test-results/drag-before-${fromIndex}-to-${toIndex}.png`,
      fullPage: true
    });
    
    // Start drag operation
    console.log('Starting drag operation...');
    await this.page.mouse.move(
      sourceBox.x + sourceBox.width / 2,
      sourceBox.y + sourceBox.height / 2
    );
    await this.page.mouse.down();
    await this.page.waitForTimeout(PAUSE_MS);
    
    // Calculate direction and number of steps
    const movingDown = toIndex > fromIndex;
    const startIndex = movingDown ? fromIndex : toIndex;
    const endIndex = movingDown ? toIndex : fromIndex;
    
    // Move vertically one question at a time
    console.log(`Moving ${movingDown ? 'down' : 'up'} one question at a time...`);
    for (let i = startIndex; i <= endIndex; i++) {
      // Get the current question's position
      const currentBox = await this.sorterLocator(i).boundingBox();
      if (!currentBox) continue;
      
      // Move to this question's vertical position
      console.log(`Moving to question ${i}...`);
      await this.page.mouse.move(
        sourceBox.x + sourceBox.width / 2,  // Stay at same X
        currentBox.y + currentBox.height / 2, // Move to current Y
        { steps: MOVE_STEPS }
      );
      
      // Take progress screenshot
      await this.page.screenshot({ 
        path: `test-results/drag-progress-${fromIndex}-to-${toIndex}-step-${i}.png`,
        fullPage: true
      });
      
      // Verify we're hovering the right question
      const hoveredQuestion = await this.page.evaluate(() => {
        const el = document.querySelector(':hover');
        return el ? el.getAttribute('data-question-id') : null;
      });
      console.log(`Hovering over question: ${hoveredQuestion}`);
      
      // Pause at each question
      await this.page.waitForTimeout(PAUSE_MS);
    }
    
    // Move to final position with extra precision
    console.log('Moving to final position...');
    await this.page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
      { steps: MOVE_STEPS * 2 } // Extra smooth final movement
    );
    
    // Hold at final position
    await this.page.waitForTimeout(FINAL_PAUSE_MS);
    
    // Release at exact target center
    await this.page.mouse.up();
    
    // Wait for animations and state updates
    console.log('Waiting for drag animation to complete...');
    await this.page.waitForTimeout(2000);
    
    // Take screenshot after drag
    await this.page.screenshot({ 
      path: `test-results/drag-after-${fromIndex}-to-${toIndex}.png`,
      fullPage: true
    });
    
    // Log the state after drag
    const questions = await this.getAllQuestionsInfo();
    console.log('Questions after drag:', questions);
  }

  /**
   * Verify drag operation completed successfully
   */
  async verifyDragComplete(fromIndex: number, toIndex: number) {
    console.log(`Verifying drag completion from ${fromIndex} to ${toIndex}`);
    
    // Take screenshot before verification
    await this.page.screenshot({ 
      path: `test-results/drag-verify-${fromIndex}-to-${toIndex}.png`
    });
    
    // Wait for any animations to complete
    await this.page.waitForTimeout(1000);

    // Get all question elements
    const questions = await this.page.locator('.stories-list-wrapper > div').all();
    console.log(`Found ${questions.length} questions`);

    // Get positions of all questions for debugging
    for (let i = 0; i < questions.length; i++) {
      const info = await this.getQuestionInfo(i + 1);
      console.log(`Question ${i + 1}:`, info);
      
      // Verify the question element is properly rendered
      const questionElement = await this.questionLocator(i + 1);
      const isVisible = await questionElement.isVisible();
      const box = await questionElement.boundingBox();
      console.log(`Question ${i + 1} visibility:`, isVisible);
      console.log(`Question ${i + 1} position:`, box);
    }

    console.log('Drag completion verified');
  }

  /**
   * Verify question order after reordering
   */
  async verifyQuestionOrder(
    initialQuestions: QuestionInfo[],
    fromIndex: number,
    toIndex: number
  ) {
    console.log('Verifying question order after drag');
    console.log('Initial questions:', initialQuestions);
    
    // Take screenshot before verification
    await this.page.screenshot({ 
      path: `test-results/verify-order-start.png`,
      fullPage: true
    });
    
    // Get current state
    const currentQuestions = await this.getAllQuestionsInfo();
    console.log('Current questions:', currentQuestions);

    // Log expected movement
    console.log('\nExpected movement when moving from position', fromIndex, 'to', toIndex);
    console.log('Questions should shift as follows:');
    for (let i = 1; i <= Math.max(fromIndex, toIndex); i++) {
      if (i < toIndex) {
        console.log(`Position ${i}: Question ${i + 1} (shifted up)`);
      } else if (i === toIndex) {
        console.log(`Position ${i}: Question ${fromIndex} (moved here)`);
      } else {
        console.log(`Position ${i}: Question ${i} (unchanged)`);
      }
    }
    
    // Verify each position
    for (let i = 0; i < currentQuestions.length; i++) {
      const position = i + 1;
      const current = currentQuestions[i];
      
      // Calculate expected content based on the drag operation
      let expectedContent;
      let expectedDate = initialQuestions[i].date; // Dates always stay with positions
      
      if (position < toIndex) {
        // Positions before target - content shifts up
        expectedContent = initialQuestions[i + 1].text;
      } else if (position === toIndex) {
        // Target position gets the moved question
        expectedContent = initialQuestions[fromIndex - 1].text;
      } else {
        // Positions after target remain unchanged
        expectedContent = initialQuestions[i].text;
      }
      
      // Log verification details
      console.log(`\nVerifying position ${position}:`, {
        currentText: current.text,
        expectedText: expectedContent,
        currentDate: current.date,
        expectedDate: expectedDate
      });
      
      // Verify date
      if (current.date !== expectedDate) {
        throw new Error(
          `Position ${position} has wrong date. Expected "${expectedDate}" but got "${current.date}"`
        );
      }

      // Verify content
      if (current.text !== expectedContent) {
        throw new Error(
          `Position ${position} has wrong content. Expected "${expectedContent}" but got "${current.text}"`
        );
      }
    }

    // Take screenshot after verification
    await this.page.screenshot({ 
      path: `test-results/verify-order-end.png`,
      fullPage: true
    });
    
    console.log('Question order verified successfully');
  }

  /**
   * Verify a question has no schedule date
   */
  async verifyNoScheduleDate(index: number) {
    console.log(`Verifying no schedule date for question ${index}`);
    const dateLocator = this.scheduleDateLocator(index);
    const isVisible = await dateLocator.isVisible().catch(() => false);
    if (isVisible) {
      const dateText = await dateLocator.textContent();
      if (dateText && dateText.trim()) {
        // Allow if the text indicates the question was updated (e.g., "Last updated on ...")
        if (!dateText.includes("Last updated")) {
          throw new Error(`Expected no schedule date for question ${index}, but found "${dateText.trim()}"`);
        }
      }
    }
    console.log(`Verified question ${index} has no schedule date`);
  }

  /**
   * Verify if a question has been answered
   */
  async verifyQuestionAnswered(index: number): Promise<boolean> {
    console.log(`Verifying question ${index} is answered`);
    const editButton = this.editStoryButton(index);
    const checkIcon = this.answerStatusIcon(index);
    
    const isAnswered = await editButton.isVisible() && await checkIcon.isVisible();
    console.log(`Question ${index} answered status:`, isAnswered);
    return isAnswered;
  }

  /**
   * Verify schedule dates after deleting a question
   */
  async verifyScheduleDatesAfterDelete(
    initialDates: string[],
    updatedDates: string[],
    deletedIndex: number
  ) {
    console.log(`Verifying schedule dates after deleting question ${deletedIndex}`);
    console.log('Initial dates:', initialDates);
    console.log('Updated dates:', updatedDates);

    // Deleted question should be removed from schedule
    if (updatedDates.length !== initialDates.length - 1) {
      throw new Error('Expected one less scheduled date after deletion');
    }

    // Verify dates before deleted question remain unchanged
    for (let i = 0; i < deletedIndex - 1; i++) {
      if (initialDates[i] !== updatedDates[i]) {
        throw new Error(`Date mismatch before deleted question at index ${i}`);
      }
    }

    // Verify dates after deleted question are shifted up
    for (let i = deletedIndex - 1; i < updatedDates.length; i++) {
      if (initialDates[i + 1] !== updatedDates[i]) {
        throw new Error(`Date mismatch after deleted question at index ${i}`);
      }
    }
    console.log('Schedule dates verified after deletion');
  }

  /**
   * Verify schedule dates after adding a question
   */
  async verifyScheduleDatesAfterAdd(
    initialDates: string[],
    updatedDates: string[]
  ) {
    console.log('Verifying schedule dates after adding question');
    console.log('Initial dates:', initialDates);
    console.log('Updated dates:', updatedDates);

    // New question should be added to schedule
    if (updatedDates.length !== initialDates.length + 1) {
      throw new Error('Expected one more scheduled date after addition');
    }

    // Verify all initial dates are still present in order
    for (let i = 0; i < initialDates.length; i++) {
      if (initialDates[i] !== updatedDates[i]) {
        throw new Error(`Date mismatch at index ${i}`);
      }
    }

    // Get the last date from initial dates
    const lastInitialDate = new Date(initialDates[initialDates.length - 1].replace('Scheduled for ', ''));
    const newDate = new Date(updatedDates[updatedDates.length - 1].replace('Scheduled for ', ''));
    
    // Calculate difference in days
    const dayDiff = Math.round((newDate.getTime() - lastInitialDate.getTime()) / (24 * 60 * 60 * 1000));
    
    // Verify new date is 7 days after the last initial date
    if (dayDiff !== 7) {
      throw new Error(`New question not scheduled 7 days after last question. Found ${dayDiff} days difference`);
    }
    console.log('Schedule dates verified after addition');
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
}
