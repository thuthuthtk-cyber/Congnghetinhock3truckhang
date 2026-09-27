export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  resource_type: string;
  bytes: number;
}

export const CLOUDINARY_CLOUD_NAME = 'tswpybbt';
export const CLOUDINARY_UPLOAD_PRESET = 'dayhoctk';

export async function uploadToCloudinary(
  file: File | Blob | string, 
  resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto'
): Promise<string> {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Tải lên Cloudinary thất bại. Vui lòng kiểm tra lại kết nối hoặc định dạng tệp.');
  }

  const data: CloudinaryUploadResult = await response.json();
  return data.secure_url;
}
