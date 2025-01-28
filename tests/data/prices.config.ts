export const PRICES = {
  MARKET_PRICE: '99.00',
  ADDITIONAL_COPY_PRICE: '38.00',
  SELECTORS: {
    LINE_ITEM_TOTAL: 'line-item-total-amount',
    SUBTOTAL_AMOUNT: '#OrderDetailsFooter-SubtotalAmount',
    TOTAL_AMOUNT: '#OrderDetails-TotalAmount'
  },
  PROMO_CODES: {
    FULL_DISCOUNT: {
      code: 'MH100',
      discountPercentage: '100',
      finalPrice: '0.00'
    },
    // Add more promo codes as needed
    // Example:
    // HALF_OFF: {
    //   code: 'HALF50',
    //   discountPercentage: '50',
    //   finalPrice: '49.50'
    // }
  }
} as const;

export function calculateTotalPrice(copies: number): string {
  if (copies <= 0) return '0.00';
  if (copies === 1) return PRICES.MARKET_PRICE;
  
  const basePrice = parseFloat(PRICES.MARKET_PRICE);
  const additionalCopies = copies - 1;
  const additionalPrice = additionalCopies * parseFloat(PRICES.ADDITIONAL_COPY_PRICE);
  
  return (basePrice + additionalPrice).toFixed(2);
}
