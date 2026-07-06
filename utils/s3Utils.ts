import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

/**
 * Extract S3 key from full S3 URL
 * @param url - Full S3 URL (e.g., https://bucket.s3.region.amazonaws.com/path/file.jpg)
 * @returns S3 key (e.g., path/file.jpg) or null if invalid URL
 */
export function extractS3KeyFromUrl(url: string): string | null {
  try {
    if (!url || typeof url !== 'string') {
      return null;
    }

    // Handle different S3 URL formats
    const bucketName = process.env.BUCKET_NAME;
    const region = process.env.REGION;
    
    if (!bucketName || !region) {
      console.error('Missing S3 configuration: BUCKET_NAME or REGION');
      return null;
    }

    // Format 1: https://bucket.s3.region.amazonaws.com/key
    const format1Pattern = new RegExp(`https://${bucketName}\\.s3\\.${region}\\.amazonaws\\.com/(.+)`);
    const format1Match = url.match(format1Pattern);
    if (format1Match) {
      return decodeURIComponent(format1Match[1]);
    }

    // Format 2: https://s3.region.amazonaws.com/bucket/key
    const format2Pattern = new RegExp(`https://s3\\.${region}\\.amazonaws\\.com/${bucketName}/(.+)`);
    const format2Match = url.match(format2Pattern);
    if (format2Match) {
      return decodeURIComponent(format2Match[1]);
    }

    // Format 3: https://bucket.s3.amazonaws.com/key (legacy)
    const format3Pattern = new RegExp(`https://${bucketName}\\.s3\\.amazonaws\\.com/(.+)`);
    const format3Match = url.match(format3Pattern);
    if (format3Match) {
      return decodeURIComponent(format3Match[1]);
    }

    console.warn('Could not extract S3 key from URL:', url);
    return null;
  } catch (error) {
    console.error('Error extracting S3 key from URL:', error);
    return null;
  }
}

/**
 * Delete a single file from S3
 * @param url - Full S3 URL or S3 key
 * @returns Promise<boolean> - true if successful, false if failed
 */
export async function deleteFromS3(url: string): Promise<boolean> {
  try {
    if (!url || typeof url !== 'string') {
      console.warn('Invalid URL provided for S3 deletion:', url);
      return false;
    }

    // Extract S3 key from URL
    let key = extractS3KeyFromUrl(url);
    
    // If extraction failed, assume the input is already a key
    if (!key) {
      key = url;
    }

    if (!key) {
      console.warn('Could not determine S3 key for deletion:', url);
      return false;
    }

    console.log('Attempting to delete S3 object:', key);

    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.BUCKET_NAME!,
      Key: key,
    });

    await s3Client.send(deleteCommand);
    console.log('Successfully deleted S3 object:', key);
    return true;

  } catch (error: any) {
    // Don't throw errors for S3 deletion failures to avoid breaking invoice deletion
    console.error('Error deleting from S3:', error);
    
    // Log specific error details for debugging
    if (error.name === 'NoSuchKey') {
      console.warn('S3 object not found (may have been already deleted):', url);
    } else if (error.name === 'AccessDenied') {
      console.error('Access denied for S3 deletion:', url);
    } else {
      console.error('Unknown S3 deletion error:', error.message);
    }
    
    return false;
  }
}

/**
 * Delete multiple files from S3
 * @param urls - Array of S3 URLs
 * @returns Promise<{successful: number, failed: number}> - Deletion results
 */
export async function deleteMultipleFromS3(urls: string[]): Promise<{successful: number, failed: number}> {
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return { successful: 0, failed: 0 };
  }

  console.log(`Attempting to delete ${urls.length} files from S3`);
  
  let successful = 0;
  let failed = 0;

  // Delete files sequentially to avoid overwhelming S3
  for (const url of urls) {
    const result = await deleteFromS3(url);
    if (result) {
      successful++;
    } else {
      failed++;
    }
  }

  console.log(`S3 deletion results: ${successful} successful, ${failed} failed`);
  return { successful, failed };
}

/**
 * Collect all image URLs from an invoice document
 * @param invoice - Invoice document with potential image URLs
 * @returns Array of image URLs to delete
 */
export function collectInvoiceImageUrls(invoice: any): string[] {
  const imageUrls: string[] = [];

  try {
    // Collect main payment screenshot
    if (invoice.paymentScreenshot && typeof invoice.paymentScreenshot === 'string') {
      imageUrls.push(invoice.paymentScreenshot);
    }

    // Collect payment screenshots array
    if (invoice.paymentScreenshots && Array.isArray(invoice.paymentScreenshots)) {
      invoice.paymentScreenshots.forEach((screenshot: any) => {
        if (screenshot && screenshot.url && typeof screenshot.url === 'string') {
          imageUrls.push(screenshot.url);
        }
      });
    }

    // Remove duplicates
    const uniqueUrls = [...new Set(imageUrls)];
    
    console.log(`Collected ${uniqueUrls.length} unique image URLs from invoice`);
    return uniqueUrls;

  } catch (error) {
    console.error('Error collecting image URLs from invoice:', error);
    return [];
  }
}