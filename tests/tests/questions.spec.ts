import { test } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { OrderPage } from '../pages/OrderPage';
import { StoryDetailsPage } from '../pages/StoryDetailsPage';
import { PaymentPage, stripeTestCards } from '../pages/PaymentPage';
import { QuestionsPage } from '../pages/QuestionsPage';
import { TestDataGenerator } from '../helpers/TestDataGenerator';
import { ScreenshotHelper } from '../helpers/ScreenshotHelper';
import * as fs from 'fs/promises';
import * as path from 'path';

const testData = new TestDataGenerator();

test.describe('Questions Page', {
  tag: ['@Full']
}, () => {
  test('complete answer workflow', {
    tag: ['@Sanity']
  }, async ({ page }, testInfo) => {
    test.setTimeout(60000); // 60 seconds since payment flow can take time
    
    try {
      // First complete a purchase to get to the questions page
      const homePage = new HomePage(page);
      const orderPage = new OrderPage(page);
      const storyDetailsPage = new StoryDetailsPage(page);
      const paymentPage = new PaymentPage(page);
      const questionsPage = new QuestionsPage(page);

      // Generate test data
      const giftGiver = await testData.generateGiftGiver({ withState: true });
      console.log('Generated test data:', giftGiver);

      // Complete purchase flow
      await homePage.startOrderFlow();
      await orderPage.selectOrderType('I will');
      await storyDetailsPage.fillGiftGiverDetails(giftGiver);
      await paymentPage.completePayment(stripeTestCards.success);
      
      // Wait for success page to load fully before proceeding
      await page.waitForLoadState('networkidle');
      await paymentPage.visitDashboard();

      // Verify we're on the questions page
      await questionsPage.waitForDashboard();

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
      
      await previewPage.close();

      // Edit the answer
      await questionsPage.editAnswer('This is my edited answer to the first question.');

      // Filter questions
      await questionsPage.filterQuestions('completed');
      await questionsPage.filterQuestions('all');
    } catch (error) {
      // On failure, take a full page screenshot of the main page
      await ScreenshotHelper.takeFullPageScreenshot(page, 'complete-answer-workflow-failed');
      throw error;
    }
  });

  test('question management', async ({ page }) => {
    test.setTimeout(60000); // 60 seconds since payment flow can take time
    
    try {
      // First complete a purchase to get to the questions page
      const homePage = new HomePage(page);
      const orderPage = new OrderPage(page);
      const storyDetailsPage = new StoryDetailsPage(page);
      const paymentPage = new PaymentPage(page);
      const questionsPage = new QuestionsPage(page);

      // Generate test data
      const giftGiver = await testData.generateGiftGiver({ withState: true });
      console.log('Generated test data:', giftGiver);

      // Complete purchase flow
      await homePage.startOrderFlow();
      await orderPage.selectOrderType('I will');
      await storyDetailsPage.fillGiftGiverDetails(giftGiver);
      await paymentPage.completePayment(stripeTestCards.success);
      
      // Wait for success page to load fully before proceeding
      await page.waitForLoadState('networkidle');
      await paymentPage.visitDashboard();

      // Verify we're on the questions page
      await questionsPage.waitForDashboard();

      // Add a custom question
      const customQuestion = 'What is your favorite childhood memory?';
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
    } catch (error) {
      // On failure, take a full page screenshot
      await ScreenshotHelper.takeFullPageScreenshot(page, 'question-management-failed');
      throw error;
    }
  });
});
