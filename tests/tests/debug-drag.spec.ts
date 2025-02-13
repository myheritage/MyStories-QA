import { expect, test } from '@playwright/test';
import { QuestionsPage } from '../pages/QuestionsPage';
import { TestDataGenerator } from '../helpers/TestDataGenerator';
import { TestFlowHelper } from '../helpers/TestFlowHelper';


test.describe('Debug Drag and Drop', () => {
  let testData: TestDataGenerator;
  let questionsPage: QuestionsPage;

  test.beforeEach(async ({ page }) => {
    testData = new TestDataGenerator();
    
    // Complete order flow to get to questions page
    const userDetails = await testData.generateGiftGiver({ withState: true });
    await TestFlowHelper.completeOrderFlow(page, userDetails);
    await TestFlowHelper.goToDashboard(page);
    
    questionsPage = new QuestionsPage(page);
  });

  test('try different drag approaches', async ({ page }) => {
    // Get initial state
    const initialQuestions = await questionsPage.getAllQuestionsInfo();
    console.log('Initial questions:', initialQuestions);

    // Test Case 1: Move first question down by 1
    console.log('\n=== Test Case 1: Move Q1 to Q2 ===');
    await questionsPage.dragQuestionToPosition(1, 2);
    await page.waitForTimeout(2000);
    let currentQuestions = await questionsPage.getAllQuestionsInfo();
    console.log('After moving Q1 to Q2:', currentQuestions);

    // Test Case 2: Move last question up by 1
    console.log('\n=== Test Case 2: Move last Q up ===');
    const lastIndex = currentQuestions.length;
    await questionsPage.dragQuestionToPosition(lastIndex, lastIndex - 1);
    await page.waitForTimeout(2000);
    currentQuestions = await questionsPage.getAllQuestionsInfo();
    console.log('After moving last Q up:', currentQuestions);

    // Test Case 3: Move middle question up by 2
    console.log('\n=== Test Case 3: Move middle Q up by 2 ===');
    const middleIndex = Math.floor(currentQuestions.length / 2);
    await questionsPage.dragQuestionToPosition(middleIndex, middleIndex - 2);
    await page.waitForTimeout(2000);
    currentQuestions = await questionsPage.getAllQuestionsInfo();
    console.log('After moving middle Q up:', currentQuestions);

    // Test Case 4: Move middle question down by 2
    console.log('\n=== Test Case 4: Move middle Q down by 2 ===');
    await questionsPage.dragQuestionToPosition(middleIndex, middleIndex + 2);
    await page.waitForTimeout(2000);
    currentQuestions = await questionsPage.getAllQuestionsInfo();
    console.log('After moving middle Q down:', currentQuestions);

    // Test Case 5: Long distance move (Q1 to last)
    console.log('\n=== Test Case 5: Move Q1 to last ===');
    await questionsPage.dragQuestionToPosition(1, lastIndex);
    await page.waitForTimeout(2000);
    currentQuestions = await questionsPage.getAllQuestionsInfo();
    console.log('After moving Q1 to last:', currentQuestions);

    // Test Case 6: Long distance move (last to Q1)
    console.log('\n=== Test Case 6: Move last to Q1 ===');
    await questionsPage.dragQuestionToPosition(lastIndex, 1);
    await page.waitForTimeout(2000);
    currentQuestions = await questionsPage.getAllQuestionsInfo();
    console.log('After moving last to Q1:', currentQuestions);

    // Take final screenshot
    await page.screenshot({ 
      path: 'test-results/debug-drag-final.png',
      fullPage: true 
    });
  });

  test('try keyboard drag approach', async ({ page }) => {
    // Get initial state
    const initialQuestions = await questionsPage.getAllQuestionsInfo();
    console.log('Initial questions:', initialQuestions);

    // Try keyboard-based drag
    console.log('\n=== Test Case: Keyboard Drag Q1 to Q3 ===');
    
    // Focus the drag handle
    const dragHandle = page.locator('[aria-roledescription="sortable"]').first();
    await dragHandle.focus();
    
    // Start drag with Space
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    
    // Move down twice
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    
    // Drop with Space
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);
    
    // Get final state
    const finalQuestions = await questionsPage.getAllQuestionsInfo();
    console.log('After keyboard drag:', finalQuestions);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/debug-keyboard-drag.png',
      fullPage: true 
    });
  });

  test('try mouse drag approach', async ({ page }) => {
    // Get initial state
    const initialQuestions = await questionsPage.getAllQuestionsInfo();
    console.log('Initial questions:', initialQuestions);

    // Try mouse-based drag
    console.log('\n=== Test Case: Mouse Drag Q1 to Q3 ===');
    
    // Get source and target elements
    const sourceHandle = page.locator('[aria-roledescription="sortable"]').first();
    const targetHandle = page.locator('[aria-roledescription="sortable"]').nth(2);
    
    // Get positions
    const sourceBox = await sourceHandle.boundingBox();
    const targetBox = await targetHandle.boundingBox();
    
    if (!sourceBox || !targetBox) {
      throw new Error('Could not get element positions');
    }
    
    // Perform drag with mouse actions
    await page.mouse.move(
      sourceBox.x + sourceBox.width / 2,
      sourceBox.y + sourceBox.height / 2
    );
    await page.mouse.down();
    await page.waitForTimeout(500);
    
    // Move to target in steps
    const steps = 10;
    const deltaX = (targetBox.x - sourceBox.x) / steps;
    const deltaY = (targetBox.y - sourceBox.y) / steps;
    
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(
        sourceBox.x + deltaX * i,
        sourceBox.y + deltaY * i
      );
      await page.waitForTimeout(50);
    }
    
    await page.waitForTimeout(500);
    await page.mouse.up();
    await page.waitForTimeout(1000);
    
    // Get final state
    const finalQuestions = await questionsPage.getAllQuestionsInfo();
    console.log('After mouse drag:', finalQuestions);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/debug-mouse-drag.png',
      fullPage: true 
    });
  });
});
