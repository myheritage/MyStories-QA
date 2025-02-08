/**
 * Real Card Configuration Loader
 * 
 * This file loads credit card details from real-card.yml.
 * The YAML file is not committed to the repository and must be created locally.
 * 
 * Setup:
 * 1. Copy real-card.yml.example to real-card.yml
 * 2. Update real-card.yml with actual card details
 * 3. Never commit real-card.yml
 * 
 * IMPORTANT: All real card tests use promo code MH99 for 99% discount ($1.00 final price)
 * This minimizes actual charges while still testing the payment flow.
 */
import * as fs from 'fs';
import * as yaml from 'yaml';
import { StripeCard } from '../pages/PaymentPage';

function loadRealCardConfig(): StripeCard {
  try {
    const configPath = __dirname + '/real-card.yml';
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.parse(configContent);

    return {
      number: config.card.number,
      expiry: config.card.expiry,
      cvc: config.card.cvc,
      scenario: 'success',
      description: 'Real card payment'
    };
  } catch (error) {
    throw new Error(
      '❌ real-card.yml not found or invalid.\n' +
      'Please follow these steps:\n' +
      '1. Copy real-card.yml.example to real-card.yml\n' +
      '2. Update real-card.yml with actual card details\n' +
      '3. Never commit real-card.yml'
    );
  }
}

export const REAL_CARD = loadRealCardConfig();
