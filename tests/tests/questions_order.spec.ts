import { expect, test } from '@playwright/test';
import { QuestionsPage } from '../pages/QuestionsPage';
import { TestDataGenerator } from '../helpers/TestDataGenerator';
import { TestFlowHelper } from '../helpers/TestFlowHelper';
import { CookieConsentHandler } from '../helpers/CookieConsentHandler';
import { CookieConsentOption } from '../pages/BasePage';

/**
 * Questions Order and Schedule Tests
 * 
 * These tests verify the functionality of:
 * - Question reordering via drag and drop
 * - Schedule date updates after reordering
 * - Schedule updates after answering questions
 * - Schedule updates after question management (add/delete)
 */
test.describe('Questions Order and Schedule', {
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
   * Verify question reordering (dates stay with positions)
   * 
   * Steps:
   * 1. Complete purchase flow to access questions
   * 2. Get initial question text and dates
   * 3. Move question from position 1 to position 3
   * 4. Verify question moved but dates stayed with positions
   */
  test('verify question reordering', async ({ page }) => {
    // Generate test data and complete order flow
    const userDetails = await testData.generateGiftGiver({ withState: true });
    await TestFlowHelper.completeOrderFlow(page, userDetails);
    await TestFlowHelper.goToDashboard(page);

    // Initialize questions page
    const questionsPage = new QuestionsPage(page);

    // Get initial state
    const initialQuestions = await questionsPage.getAllQuestionsInfo();
    console.log('Initial questions state:', initialQuestions);

    // Move first question to third position
    await questionsPage.dragQuestionToPosition(1, 3);
    await page.waitForTimeout(1000); // Wait for any animations

    // Verify both content and dates after reordering
    await questionsPage.verifyQuestionOrder(initialQuestions, 1, 3);
    console.log('Verified question order and dates');
  });

  /**
   * Verify answered question affects scheduling
   * 
   * Steps:
   * 1. Complete purchase flow to access questions
   * 2. Get initial schedule dates
   * 3. Answer question 2
   * 4. Verify:
   *    - Question 2 shows as answered
   *    - Question 2 has no schedule date
   *    - Later questions' dates shifted up
   */
  test('verify answered question updates schedule', async ({ page }) => {
    // Generate test data and complete order flow
    const userDetails = await testData.generateGiftGiver({ withState: true });
    await TestFlowHelper.completeOrderFlow(page, userDetails);
    await TestFlowHelper.goToDashboard(page);

    // Initialize questions page
    const questionsPage = new QuestionsPage(page);

    // Get initial state
    const initialDates = await questionsPage.getAllScheduleDates();
    console.log('Initial schedule dates:', initialDates);

    // Answer the second question
    await questionsPage.startWriting(2);
    await questionsPage.writeAnswer('This is a test answer for the second question.');
    await questionsPage.saveAnswer();
    await questionsPage.goBack();

    // Verify question shows as answered
    await questionsPage.verifyQuestionAnswered(2);
    console.log('Verified question 2 is answered');

    // Verify question 2 has no schedule date
    await questionsPage.verifyNoScheduleDate(2);
    console.log('Verified question 2 has no schedule date');

    // Get updated schedule dates
    const updatedDates = await questionsPage.getAllScheduleDates();
    console.log('Updated schedule dates:', updatedDates);

    // Verify dates shifted correctly:
    // Position 1 -> Feb 12 (unchanged)
    expect(updatedDates[0]).toBe(initialDates[0]);
    // Position 3 -> Feb 19 (shifted up)
    expect(updatedDates[2]).toBe(initialDates[1]);
    // Position 4 -> Feb 26 (shifted up)
    expect(updatedDates[3]).toBe(initialDates[2]);
  });

  /**
   * Verify question management affects schedule
   * 
   * Steps:
   * 1. Complete purchase flow to access questions
   * 2. Get initial schedule dates
   * 3. Delete a question and verify schedule updates
   * 4. Add a new question and verify schedule updates
   */
  test('verify question management affects schedule', async ({ page }) => {
    // Generate test data and complete order flow
    const userDetails = await testData.generateGiftGiver({ withState: true });
    await TestFlowHelper.completeOrderFlow(page, userDetails);
    await TestFlowHelper.goToDashboard(page);

    // Initialize questions page
    const questionsPage = new QuestionsPage(page);

    // Get initial schedule dates
    const initialDates = await questionsPage.getAllScheduleDates();
    console.log('Initial schedule dates:', initialDates);

    // Delete the second question
    await questionsPage.deleteQuestion(2);
    await page.waitForTimeout(1000); // Wait for any animations

    // Get schedule dates after deletion
    const datesAfterDelete = await questionsPage.getAllScheduleDates();
    console.log('Schedule dates after deletion:', datesAfterDelete);

    // Verify schedule dates have been updated after deletion
    await questionsPage.verifyScheduleDatesAfterDelete(initialDates, datesAfterDelete, 2);

    // Add a new custom question
    const newQuestion = 'What is your most cherished family tradition?';
    await questionsPage.addCustomQuestion(newQuestion);
    await page.waitForTimeout(1000); // Wait for any animations

    // Get schedule dates after adding new question
    const datesAfterAdd = await questionsPage.getAllScheduleDates();
    console.log('Schedule dates after adding question:', datesAfterAdd);

    // Verify schedule dates have been updated after adding question
    await questionsPage.verifyScheduleDatesAfterAdd(datesAfterDelete, datesAfterAdd);
  });
});
