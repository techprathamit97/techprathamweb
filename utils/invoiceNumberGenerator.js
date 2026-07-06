import mongoose from 'mongoose';

/**
 * Generate a unique invoice number across both Invoice and ManualInvoice collections
 * @param {number} maxAttempts - Maximum number of attempts to generate unique number
 * @returns {Promise<string>} - Unique invoice number
 */
export async function generateUniqueInvoiceNumber(maxAttempts = 10) {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      // Get models (they might not be loaded yet)
      const Invoice = mongoose.models.Invoice;
      const ManualInvoice = mongoose.models.ManualInvoice;
      
      // Count all invoices for sequential numbering
      let count = 0;
      if (Invoice) count += await Invoice.countDocuments();
      if (ManualInvoice) count += await ManualInvoice.countDocuments();
      
      // Generate invoice number with attempt offset to handle race conditions
      const invoiceNumber = `INV-${String(count + 1 + attempts).padStart(5, '0')}`;
      
      // Check if this number already exists in either collection
      const existingInvoice = await Promise.all([
        Invoice ? Invoice.findOne({ invoiceNumber }) : null,
        ManualInvoice ? ManualInvoice.findOne({ invoiceNumber }) : null
      ]);
      
      // If number is unique, return it
      if (!existingInvoice[0] && !existingInvoice[1]) {
        return invoiceNumber;
      }
      
      attempts++;
    } catch (error) {
      console.error(`Error generating invoice number (attempt ${attempts + 1}):`, error);
      attempts++;
    }
  }
  
  // Fallback to timestamp-based number if all attempts fail
  const fallbackNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  console.warn(`Using fallback invoice number: ${fallbackNumber}`);
  return fallbackNumber;
}

/**
 * Validate if an invoice number is unique across both collections
 * @param {string} invoiceNumber - Invoice number to validate
 * @returns {Promise<boolean>} - True if unique, false if duplicate
 */
export async function isInvoiceNumberUnique(invoiceNumber) {
  try {
    const Invoice = mongoose.models.Invoice;
    const ManualInvoice = mongoose.models.ManualInvoice;
    
    const existingInvoice = await Promise.all([
      Invoice ? Invoice.findOne({ invoiceNumber }) : null,
      ManualInvoice ? ManualInvoice.findOne({ invoiceNumber }) : null
    ]);
    
    return !existingInvoice[0] && !existingInvoice[1];
  } catch (error) {
    console.error('Error validating invoice number uniqueness:', error);
    return false;
  }
}