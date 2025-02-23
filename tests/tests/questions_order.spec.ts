import { expect, test } from '@playwright/test';
import { QuestionsPage } from '../pages/QuestionsPage';
import { TestDataGenerator } from '../helpers/TestDataGenerator';
import { TestFlowHelper } from '../helpers/TestFlowHelper';
import { CookieConsentHandler } from '../helpers/CookieConsentHandler';
import { CookieConsentOption } from '../pages/BasePage';

/**

Questions Order and Schedule Tests
These tests verify the functionality of:
Question reordering via drag and drop (using keyboard drag)
Schedule date updates after reordering
Schedule updates after answering questions
Schedule updates after question management (add/delete) */

test.describe('Questions Order and Schedule', { tag: ['@Full', '@Questions'] }, () => {
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

    // Complete order flow to access questions.
    const userDetails = await testData.generateGiftGiver({ withState: true });
    await TestFlowHelper.completeOrderFlow(page, userDetails);
    await TestFlowHelper.goToDashboard(page);
  });

  /**
  
  Verify question reordering (dates stay with positions)
  Steps:
  Complete purchase flow to access questions
  Get initial question text and dates
  Move question from position 1 to position 3 using keyboard drag approach
  Verify question moved but dates stayed with positions */

  test('verify question reordering', { // Generate test data and complete order flow
      tag: ['@Full']
  }, async ({ page }) => { 

    // Initialize questions page
    const questionsPage = new QuestionsPage(page);

    // Get initial state
    const initialQuestions = await questionsPage.getAllQuestionsInfo();
    console.log('Initial questions state:', initialQuestions);

    // Move first question to third position using keyboard drag approach
    const dragHandle = page.locator('[aria-roledescription="sortable"]').first();
    await dragHandle.focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);

    // Verify both content and dates after reordering
    await questionsPage.verifyQuestionOrder(initialQuestions, 1, 3);
    console.log('Verified question order and dates');
  });

  /**
  
  Verify answered question affects scheduling
  Steps:
  Complete purchase flow to access questions
  Get initial schedule dates
  Answer question 2
  Verify:
  Question 2 shows as answered
  Question 2 has no schedule date
  Later questions' dates shifted up */

  test('verify answered question updates schedule', async ({ page }) => { // Generate test data and complete order flow

    // Initialize questions page
    const questionsPage = new QuestionsPage(page);

    // Get initial state (schedule dates)
    const initialDates = await questionsPage.getAllScheduleDates();
    console.log('Initial schedule dates:', initialDates);

    // Answer the second question
    await questionsPage.startWriting(2);
    await questionsPage.writeAnswer('This is a test answer for the second question.');
    await questionsPage.saveAnswer();
    await page.waitForTimeout(2000);
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
    // Position 1 remains unchanged (e.g., Feb 12 remains the same)
    expect(updatedDates[0]).toBe(initialDates[0]);
    // Position 3 should now reflect the former position 2's date (e.g., Feb 19)
    expect(updatedDates[2]).toBe(initialDates[1]);
    // Position 4 should now reflect the former position 3's date (e.g., Feb 26)
    expect(updatedDates[3]).toBe(initialDates[2]);
  });

  /**
  
  Verify question management affects schedule
  Steps:
  Complete purchase flow to access questions
  Get initial schedule dates
  Delete a question and verify schedule updates
  Add a new question and verify schedule updates */

  test('verify question delete and add affects schedule', async ({ page }) => {

    // Initialize questions page
    const questionsPage = new QuestionsPage(page);

    // Retrieve the initial state.
    const initialQuestions = await questionsPage.getAllQuestionsInfo();
    const initialDates = await questionsPage.getAllScheduleDates();
    console.log('Initial questions:', initialQuestions);
    console.log('Initial schedule dates:', initialDates);

    // Ensure there are enough questions.
    expect(initialQuestions.length).toBeGreaterThanOrEqual(4);

    // Save the original last schedule date for later validation.
    const originalLastDate = initialDates[initialDates.length - 1];

    // --- Deletion Part ---
    // Delete the 2nd question.
    await questionsPage.deleteQuestion(2);
    await page.waitForTimeout(1000); // Wait for animations and update.

    // Retrieve state after deletion.
    const questionsAfterDelete = await questionsPage.getAllQuestionsInfo();
    const datesAfterDelete = await questionsPage.getAllScheduleDates();
    console.log('After deletion - questions:', questionsAfterDelete);
    console.log('After deletion - schedule dates:', datesAfterDelete);

    // Verify question strings after deletion:
    //   - Position 1 remains unchanged.
    //   - Position 2 should now be the original 3rd question.
    //   - Position 3 should now be the original 4th question.
    expect(questionsAfterDelete[0].text).toEqual(initialQuestions[0].text);
    expect(questionsAfterDelete[1].text).toEqual(initialQuestions[2].text);
    expect(questionsAfterDelete[2].text).toEqual(initialQuestions[3].text);

    // Verify schedule dates after deletion:
    //   - Position 1 remains the same.
    //   - Position 2 remains the same as initial (from the deleted Q2).
    //   - The last question's schedule date now should equal the previous question's date before deletion.
    //     That is, if initialDates were [D1, D2, D3, D4], then after deletion we expect [D1, D2, D3],
    //     so the last date after deletion should be initialDates[initialDates.length - 2].
    expect(datesAfterDelete[0]).toEqual(initialDates[0]);
    expect(datesAfterDelete[1]).toEqual(initialDates[1]);
    const expectedDeletionLastDate = initialDates[initialDates.length - 2];
    expect(datesAfterDelete[datesAfterDelete.length - 1]).toEqual(expectedDeletionLastDate);

    // --- Addition Part ---
    // Add a new custom question.
    const newQuestion = '@@@ New Added question to test send schedule @@@';
    await questionsPage.addCustomQuestion(newQuestion);
    await page.waitForTimeout(1000); // Wait for update.

    // Retrieve state after adding the new question.
    const questionsAfterAdd = await questionsPage.getAllQuestionsInfo();
    const datesAfterAdd = await questionsPage.getAllScheduleDates();
    console.log('After addition - questions:', questionsAfterAdd);
    console.log('After addition - schedule dates:', datesAfterAdd);

    // Verify that the new custom question is appended as the last question.
    expect(questionsAfterAdd[questionsAfterAdd.length - 1].text).toEqual(newQuestion);

    // Verify that the scheduled send date for the new question is the same as the original last schedule date.
    expect(datesAfterAdd[datesAfterAdd.length - 1]).toEqual(originalLastDate);
  });
});