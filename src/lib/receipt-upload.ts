import { createClient } from './supabase/client';

/**
 * Compresses an image file in the browser using HTML5 Canvas.
 * Reduces 5MB-15MB camera/gallery photos down to ~60KB-120KB for instant storage and loading.
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If SVG or non-image, handle directly
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // Draw image with smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG with specified compression quality
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };

      img.onerror = () => {
        // Fallback to raw data url if canvas decode fails
        resolve(event.target?.result as string);
      };
    };

    reader.onerror = (error) => reject(error);
  });
}

/**
 * Converts a Base64 data URL to a binary Blob for cloud upload.
 */
function dataURItoBlob(dataURI: string): Blob {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

export interface UploadReceiptResult {
  url: string;
  isCloud: boolean;
  fileName?: string;
}

/**
 * Uploads a receipt image with dual-layer reliability:
 * 1. Compresses image on client (zero-wait, mobile-friendly).
 * 2. Attempts upload to Supabase Storage bucket 'receipts'.
 * 3. If bucket is unavailable, RLS blocks, or offline, gracefully falls back to compressed Base64 data URI.
 */
export async function uploadReceiptFile(file: File): Promise<UploadReceiptResult> {
  // Mobile-friendly validation: some mobile browsers/camera uploads report empty file.type
  const isImageOrPdf =
    (file.type && (file.type.startsWith('image/') || file.type.includes('pdf'))) ||
    /\.(jpe?g|png|webp|gif|bmp|heic|heif|pdf)$/i.test(file.name);

  if (!isImageOrPdf) {
    throw new Error('Please select an image file (PNG, JPG, JPEG, WEBP).');
  }

  // 1. Compress image to web-optimized data URL
  const compressedDataUrl = await compressImage(file);

  try {
    const supabase = createClient();
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `receipts/${cleanFileName}`;

    const blob = dataURItoBlob(compressedDataUrl);

    // 2. Attempt Supabase Storage upload
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(filePath, blob, {
        contentType: blob.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (!error && data) {
      const { data: publicUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      if (publicUrlData && publicUrlData.publicUrl) {
        return {
          url: publicUrlData.publicUrl,
          isCloud: true,
          fileName: file.name,
        };
      }
    }
  } catch (err) {
    console.warn('Supabase storage upload fallback triggered:', err);
  }

  // 3. Resilient fallback to compressed Data URL (persists in PostgreSQL TEXT and localStorage)
  return {
    url: compressedDataUrl,
    isCloud: false,
    fileName: file.name,
  };
}

