import { test, expect } from '@playwright/test';
import { QuestionsPage } from '../pages/QuestionsPage';
import { TestDataGenerator } from '../helpers/TestDataGenerator';
import { ScreenshotHelper } from '../helpers/ScreenshotHelper';
import { TestFlowHelper } from '../helpers/TestFlowHelper';
import { CookieConsentHandler } from '../helpers/CookieConsentHandler';
import { CookieConsentOption } from '../pages/BasePage';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Questions Flow Tests
 * 
 * These tests verify the core functionality of the questions page:
 * - Writing and editing answers
 * - Adding and managing questions
 * - Preview and PDF generation
 * - Question filtering
 *  - Verify book name and author + edit book name
 */
test.describe('Questions Flow', {
  tag: ['@Full', '@Questions']
}, () => {
  let testData: TestDataGenerator;

  test.beforeEach(async ({ page }) => {
    testData = new TestDataGenerator();

    // Log console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
      }
    });

    // Handle cookie consent if it appears
    const cookieHandler = new CookieConsentHandler(page);
    if (await cookieHandler.isVisible()) {
      await cookieHandler.handle(CookieConsentOption.ALLOW_ALL);
    }
  });

  /**
   * Complete Answer Workflow Test
   * 
   * Steps:
   * 1. Complete purchase flow to access questions
   * 2. Write an answer to the first question
   * 3. Save and preview the answer
   *    - Captures screenshot
   *    - Saves PDF if available
   * 4. Test question filtering (completed/all)
   * 
   * @tags @Sanity
   */
  test('complete answer workflow', {
    tag: ['@Full']
  }, async ({ page }, testInfo) => {
    try {
      // Generate test data
      const userDetails = await testData.generateGiftGiver({ withState: true });
      console.log('Generated test data:', userDetails);

      // Complete purchase flow with helper
      await TestFlowHelper.completeOrderFlow(page, userDetails);
      await TestFlowHelper.goToDashboard(page);

      // Initialize pages
      const questionsPage = new QuestionsPage(page);

      // Start writing an answer
      await questionsPage.startWriting(1);
      await questionsPage.writeAnswer('This is my test answer to the first question.');
      await questionsPage.saveAnswer();

      // Preview the answer
      const previewPage = await questionsPage.previewAnswer();
      
      // Take screenshot and save PDF of preview
      await previewPage.waitForLoadState('networkidle');
      
      // Take full page screenshot of preview
      const screenshotPath = await ScreenshotHelper.takeFullPageScreenshot(previewPage, 'answer-preview');
      await testInfo.attach('answer-preview-screenshot', {
        path: screenshotPath,
        contentType: 'image/png'
      });
      
      // Save PDF content if URL indicates it's a PDF
      if (previewPage.url().includes('.pdf')) {
        const pdfBuffer = await previewPage.pdf();
        const pdfPath = path.join('test-results', 'pdfs', `answer-preview-${Date.now()}.pdf`);
        await fs.mkdir(path.dirname(pdfPath), { recursive: true });
        await fs.writeFile(pdfPath, pdfBuffer);
        await testInfo.attach('answer-preview-pdf', {
          path: pdfPath,
          contentType: 'application/pdf'
        });
      }
      
      // Close preview before proceeding
      await previewPage.close();

      // Filter questions
      await questionsPage.filterQuestions('completed');
      await questionsPage.filterQuestions('all');
    } catch (error) {
      // Take screenshot before throwing
      await ScreenshotHelper.takeFullPageScreenshot(page, 'complete-answer-workflow-failed');
      throw error;
    }
  });

  /**
   * Sanity Answer Workflow Test
   * 
   * Steps:
   * 1. Complete purchase flow to access questions
   * 2. Write an answer to the first question
   * 3. Save the answer
   * 4. Test question filtering (completed/all)
   * 
   * Note: This test skips preview functionality to avoid popup issues in CI
   * 
   * @tags @github-actions-debug
   */
  test('sanity answer workflow', {
    tag: ['@github-actions-debug']
  }, async ({ page }, testInfo) => {
    try {
      // Generate test data
      const userDetails = await testData.generateGiftGiver({ withState: true });
      console.log('Generated test data:', userDetails);

      // Complete purchase flow with helper
      await TestFlowHelper.completeOrderFlow(page, userDetails);
      await TestFlowHelper.goToDashboard(page);

      // Initialize pages
      const questionsPage = new QuestionsPage(page);

      // Start writing an answer
      await questionsPage.startWriting(1);
      await questionsPage.writeAnswer('This is my test answer to the first question.');
      await questionsPage.saveAnswer();

      // Filter questions
      await questionsPage.filterQuestions('completed');
      await questionsPage.filterQuestions('all');

      // Take final screenshot before test ends
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // Wait for any animations
      await ScreenshotHelper.takeFullPageScreenshot(page, 'sanity-answer-workflow-complete');
    } catch (error) {
      try {
        // Try to take error screenshot, but don't fail if it fails
        await ScreenshotHelper.takeFullPageScreenshot(page, 'sanity-answer-workflow-failed')
          .catch(screenshotError => console.error('Failed to take error screenshot:', screenshotError));
      } catch (screenshotError) {
        console.error('Failed to take error screenshot:', screenshotError);
      }
      throw error;
    }
  });

  /**
   * Question Management Test
   * 
   * Steps:
   * 1. Complete purchase flow to access questions
   * 2. Add a custom question
   *    - Verify it appears in the list
   * 3. Add a prewritten question
   *    - Verify it appears in the list
   * 4. Edit an existing question
   *    - Verify the changes are saved
   * 
   * @tags @Full
   */
  test('question management', {
    tag: ['@Full']
  }, async ({ page }, testInfo) => {
    try {
      // Generate test data
      const userDetails = await testData.generateGiftGiver({ withState: true });
      console.log('Generated test data:', userDetails);

      // Complete purchase flow with helper
      await TestFlowHelper.completeOrderFlow(page, userDetails);
      await TestFlowHelper.goToDashboard(page);

      // Initialize pages
      const questionsPage = new QuestionsPage(page);

      // Add a custom question
      const customQuestion = '@@@ This is a custom question for testing purposes. @@@';
      await questionsPage.addCustomQuestion(customQuestion);
      await questionsPage.verifyQuestionExists(customQuestion);

      // Add a prewritten question and verify it appears
      const prewrittenQuestionText = await questionsPage.addPrewrittenQuestion();
      if (prewrittenQuestionText) {
        await questionsPage.verifyQuestionExists(prewrittenQuestionText);
      }

      // Edit a question
      const newQuestionText = 'What was your most memorable vacation?';
      await questionsPage.editQuestion(2, newQuestionText);
      await questionsPage.verifyQuestionExists(newQuestionText);

      // Take final screenshot before test ends
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // Wait for any animations
      await ScreenshotHelper.takeFullPageScreenshot(page, 'question-management-complete');
    } catch (error) {
      try {
        // Try to take error screenshot, but don't fail if it fails
        await ScreenshotHelper.takeFullPageScreenshot(page, 'question-management-failed')
          .catch(screenshotError => console.error('Failed to take error screenshot:', screenshotError));
      } catch (screenshotError) {
        console.error('Failed to take error screenshot:', screenshotError);
      }
      throw error;
    }
  });

  /**
   * Verify Story Name and Author Test
   * 
   * Steps:
   * 1. Get to the questions page
   * 2. Get current Story name
   * 3. Verify Story author is the same name of the one who purchased the product
   * 4. Edit Book name by clicking on edit button
   * 5. Clear the text and type new text
   * 6. Click save
   * 7. Verify book name was updated
   * 
   * @tags @Full
   */
  test('verify story name and author', {
    tag: ['@Full']
  }, async ({ page }, testInfo) => {
    try {
      // Generate test data
      const userDetails = await testData.generateGiftGiver({ withState: true });
      console.log('Generated test data:', userDetails);

      // Construct full name from first name and last name
      const fullName = `${userDetails.firstName} ${userDetails.lastName}`;
      console.log('Full name:', fullName);

      // Complete purchase flow with helper
      await TestFlowHelper.completeOrderFlow(page, userDetails);
      await TestFlowHelper.goToDashboard(page);

      // Initialize pages
      const questionsPage = new QuestionsPage(page);

      // Get current Story name
      const storyName = await questionsPage.getStoryName();
      console.log('Current Story name:', storyName);

      // Verify Story author is the same name of the one who purchased the product
      const storyAuthor = await questionsPage.getStoryAuthor();
      const expectedAuthor = `By ${fullName}`;
      expect(storyAuthor).toBe(expectedAuthor);
      console.log('Verified Story author:', storyAuthor);

      // Edit Book name by clicking on edit button
      await questionsPage.clickEditBookNameButton();

      // Clear the text and type new text
      const newBookName = 'This is a text for automated test';
      await questionsPage.fillBookNameInput(newBookName);

      // Click save
      await questionsPage.clickSaveBookNameButton();

      // Verify book name was updated
      const updatedBookName = await questionsPage.getStoryName();
      expect(updatedBookName).toBe(newBookName);
      console.log('Verified updated book name:', updatedBookName);

      // Take final screenshot before test ends
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // Wait for any animations
      await ScreenshotHelper.takeFullPageScreenshot(page, 'verify-story-name-and-author-complete');
    } catch (error) {
      try {
        // Try to take error screenshot, but don't fail if it fails
        await ScreenshotHelper.takeFullPageScreenshot(page, 'verify-story-name-and-author-failed')
          .catch(screenshotError => console.error('Failed to take error screenshot:', screenshotError));
      } catch (screenshotError) {
        console.error('Failed to take error screenshot:', screenshotError);
      }
      throw error;
    }
  });
});
