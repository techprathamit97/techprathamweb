export type S3UploadResponse = {
  url: string;
  fileKey: string;
};

export async function uploadImageToS3(
  file: File
): Promise<S3UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload-image-courses", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Upload failed");
  }

  const data = await res.json();

  // ✅ IMPORTANT
  return {
    url: data.url,
    fileKey: data.fileKey,
  };
}
