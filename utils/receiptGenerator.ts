/**
 * Generates a receipt number in the format TP + 8 random digits
 * Example: TP12345678
 */
export const generateReceiptNumber = (): string => {
  // Generate 8 random digits
  const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
  return `TP${randomDigits}`;
};