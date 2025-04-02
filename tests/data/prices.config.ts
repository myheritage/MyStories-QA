/**
 * Configuration file for pricing and related business rules
 */

export const PRICES = {
  // Base price for a single book subscription
  MARKET_PRICE: '99.00',
  
  // Price for each additional book copy beyond the first
  ADDITIONAL_COPY_PRICE: '49.00',
  
  // Promo code configurations
  PROMO_CODES: {
    FULL_DISCOUNT: {
      code: 'MH100',        // Code to apply in tests
      discountPercentage: '100',   // Full discount (100%)
      finalPrice: '0.00'           // Expected price after discount
    },
    REAL_CARD_TEST: {
      code: 'MH99',         // Special code for real card tests
      discountPercentage: '99',    // 99% discount
      finalPrice: '1.00'          // $1.00 final price
    }
  },
  
  // Test ID selectors for price-related elements
  SELECTORS: {
    LINE_ITEM_TOTAL: 'line-item-total',  // Individual line item price
    TOTAL_AMOUNT: '#ProductSummary-totalAmount > div > div.mr2.flex-item.width-fixed > span'  // Total order amount
  }
};

/**
 * List of US states that require users to acknowledge the recurring subscription
 * during the purchase flow. This acknowledgment is only required for self-orders,
 * not for gift orders.
 * 
 * When a user from these states makes a purchase:
 * 1. A checkbox will appear after state selection
 * 2. User must check it to acknowledge the recurring subscription
 * 3. The checkbox text explains this is an annual subscription
 * 4. It also mentions they can cancel anytime from account settings
 * 5. Reminds them they'll get email reminders before renewal
 */
export const STATES_REQUIRING_ACKNOWLEDGMENT = [
  'California',  // Required by CA state law
  'New York',    // Required by NY state law
  'Florida'      // Required by FL state law
];

/**
 * Calculates the total price for a given number of book copies
 * 
 * @param copies - Number of book copies (must be between 1 and 11)
 * @returns Formatted price string with 2 decimal places
 * 
 * Price calculation:
 * - First copy: MARKET_PRICE ($99.00)
 * - Each additional copy: ADDITIONAL_COPY_PRICE ($49.00)
 * 
 * Examples:
 * - 1 copy = $99.00
 * - 2 copies = $99.00 + $49.00 = $148.00
 * - 3 copies = $99.00 + (2 × $49.00) = $197.00
 */
export function calculateTotalPrice(copies: number): string {
  if (copies <= 0) {
    throw new Error('Number of copies must be greater than 0');
  }

  const basePrice = parseFloat(PRICES.MARKET_PRICE);
  const additionalCopyPrice = parseFloat(PRICES.ADDITIONAL_COPY_PRICE);
  
  if (copies === 1) {
    return basePrice.toFixed(2);
  }

  const totalPrice = basePrice + (additionalCopyPrice * (copies - 1));
  return totalPrice.toFixed(2);
}
