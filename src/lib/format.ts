/**
 * Monetary values are stored as integer minor units (piastres):
 * 100 piastres = 1 EGP. Never store floats in the database.
 */

/** Format piastres as a display string, e.g. 12500 -> "£125.00" */
export function formatEGP(piastres: number, symbol: string = "£"): string {
  const sign = piastres < 0 ? "-" : "";
  const abs = Math.abs(piastres);
  const pounds = Math.floor(abs / 100);
  const remainder = abs % 100;
  return `${sign}${symbol}${pounds.toLocaleString("en-EG")}.${remainder
    .toString()
    .padStart(2, "0")}`;
}

/** Truncated numeric display without currency symbol, e.g. 12500 -> "125.00" */
export function formatAmount(piastres: number): string {
  return (piastres / 100).toFixed(2);
}
