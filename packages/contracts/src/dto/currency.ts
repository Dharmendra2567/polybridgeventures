/**
 * ISO-4217 Currency Code type.
 */
export type CurrencyCode =
  "USD" | "EUR" | "GBP" | "AED" | "SGD" | "CNY" | string;

/**
 * Monetary value representation contract for APIs.
 * Ensures decimal strings are exchanged across network boundaries,
 * avoiding IEEE 754 floating-point inaccuracies.
 */
export interface MonetaryAmount {
  amount: string; // Decimal string e.g., "12500.5000"
  currency: CurrencyCode;
}
