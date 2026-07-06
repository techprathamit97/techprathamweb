export type BlogImageUploadResponse = {
  url: string;
  fileKey: string;
  message: string;
};

export async function uploadBlogImageToS3(
  file: File
): Promise<BlogImageUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/blog/upload-image", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Upload failed");
  }

  const data = await res.json();

  return {
    url: data.url,
    fileKey: data.fileKey,
    message: data.message,
  };
}

export async function deleteBlogImageFromS3(fileKey: string): Promise<void> {
  const res = await fetch("/api/blog/upload-image", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileKey }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Delete failed");
  }
}

// Extract file key from S3 URL
export function extractFileKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    // Remove leading slash
    return pathname.startsWith('/') ? pathname.substring(1) : pathname;
  } catch {
    return null;
  }
}