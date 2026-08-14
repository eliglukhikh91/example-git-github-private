// Single source of truth for Luma Pro pricing.
//
// These live here rather than inside a component so the upgrade modal (where
// a plan is chosen) and the profile screen (where the active subscription is
// shown) can never drift apart — which is exactly what happened when the
// manage-subscription copy still advertised an older $8/month price.
export const MONTHLY_PRICE = 9.99;
export const ANNUAL_PRICE = 79;
export const ANNUAL_MONTHLY_EQUIVALENT = (ANNUAL_PRICE / 12).toFixed(2);

/** Formats a price the way the UI shows it: "$9.99", "$79". */
export function formatPrice(amount: number): string {
  return `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

/** The amount actually charged on each renewal for a given billing cycle. */
export function priceForCycle(billingCycle?: 'monthly' | 'annual'): number {
  return billingCycle === 'annual' ? ANNUAL_PRICE : MONTHLY_PRICE;
}
