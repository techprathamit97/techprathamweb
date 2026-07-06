/**
 * Certificate utility functions for TechPratham LMS
 */

/**
 * Generates a unique certificate ID in the format TP####BZ
 * 
 * Format explanation:
 * - TP: TechPratham prefix
 * - ####: 4-character unique identifier (timestamp + random)
 * - BZ: Suffix (could represent batch/zone or just branding)
 * 
 * @returns {string} Unique certificate ID like "TP1977BZ"
 */
export function generateCertificateId(): string {
  const timestamp = Date.now().toString();
  const randomPart = Math.random().toString(36).substr(2, 2).toUpperCase();
  
  // Use last 2 digits of timestamp + 2 random characters
  const numberPart = timestamp.slice(-2) + randomPart;
  
  return `TP${numberPart}BZ`;
}

/**
 * Validates certificate ID format
 * @param {string} certificateId - Certificate ID to validate
 * @returns {boolean} True if valid format
 */
export function validateCertificateId(certificateId: string): boolean {
  // Check if it matches the pattern TP####BZ where #### is alphanumeric
  const pattern = /^TP[A-Z0-9]{4}BZ$/;
  return pattern.test(certificateId);
}

/**
 * Formats date for certificate display
 * @param {string | Date} date - Date to format
 * @returns {string} Formatted date (DD/MM/YYYY)
 */
export function formatCertificateDate(date?: string | Date): string {
  if (!date) {
    return new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formats training date for certificate display
 * @param {string | Date} date - Date to format
 * @returns {string} Formatted date (e.g., "6th October 2025")
 */
export function formatTrainingDate(date?: string | Date): string {
  if (!date) return 'N/A';
  
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Certificate data interface
 */
export interface CertificateData {
  studentId?: string;
  studentName: string;
  studentEmail?: string;
  courseId?: string;
  courseName: string;
  certificateId?: string;
  certificateNo?: string;
  completionDate?: string | Date;
  startDate?: string | Date;
  issueDate?: string | Date;
  grade?: string;
  score?: number;
  status?: 'pending' | 'issued' | 'revoked';
  batchId?: string;
}

/**
 * Generates certificate URL for preview
 * @param {CertificateData} certificate - Certificate data
 * @returns {string} Preview URL
 */
export function getCertificatePreviewUrl(certificate: CertificateData): string {
  const params = new URLSearchParams();
  params.set('name', certificate.studentName);
  params.set('course', certificate.courseName);
  params.set('id', certificate.certificateId || generateCertificateId());
  
  return `/api/lms/certificates/preview?${params.toString()}`;
}

/**
 * Generates certificate print URL
 * @param {CertificateData} certificate - Certificate data
 * @returns {string} Print URL
 */
export function getCertificatePrintUrl(certificate: CertificateData): string {
  const previewUrl = getCertificatePreviewUrl(certificate);
  return `${previewUrl}&print=true`;
}