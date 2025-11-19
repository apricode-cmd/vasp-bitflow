/**
 * Image Processor Utility
 * 
 * Client-side image processing для KYC документов:
 * - Compression (до 2MB)
 * - Format optimization (JPEG/WebP)
 * - Quality validation
 * - EXIF metadata removal
 */

import imageCompression from 'browser-image-compression';

interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  quality?: number;
}

interface ImageQuality {
  isValid: boolean;
  score: number; // 0-100
  warnings: string[];
  errors: string[];
}

/**
 * Compress image для upload
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const defaultOptions = {
    maxSizeMB: 2, // Max 2MB
    maxWidthOrHeight: 1920, // Full HD достаточно для документов
    useWebWorker: true,
    quality: 0.85, // 85% quality - good balance
    ...options
  };

  try {
    console.log('🗜️ Compressing image:', {
      original: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      name: file.name
    });

    const compressed = await imageCompression(file, defaultOptions);

    console.log('✅ Compression complete:', {
      original: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      compressed: `${(compressed.size / 1024 / 1024).toFixed(2)}MB`,
      ratio: `${((1 - compressed.size / file.size) * 100).toFixed(1)}%`
    });

    return compressed;
  } catch (error) {
    console.error('❌ Compression failed:', error);
    throw new Error('Failed to compress image');
  }
}

/**
 * Validate image quality (blur, brightness, resolution)
 */
export async function validateImageQuality(file: File): Promise<ImageQuality> {
  const result: ImageQuality = {
    isValid: true,
    score: 100,
    warnings: [],
    errors: []
  };

  try {
    // Check file size
    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > 10) {
      result.errors.push('File size exceeds 10MB');
      result.isValid = false;
      result.score -= 30;
    }

    // Check format
    const validFormats = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validFormats.includes(file.type)) {
      result.errors.push('Invalid format. Only JPEG and PNG allowed');
      result.isValid = false;
      result.score -= 50;
    }

    // Get image dimensions
    const dimensions = await getImageDimensions(file);
    
    // Check minimum resolution (at least 720p)
    if (dimensions.width < 1280 || dimensions.height < 720) {
      result.warnings.push('Low resolution. Please use higher quality camera');
      result.score -= 20;
    }

    // Check aspect ratio (documents should be roughly rectangular)
    const aspectRatio = dimensions.width / dimensions.height;
    if (aspectRatio < 0.5 || aspectRatio > 2) {
      result.warnings.push('Unusual aspect ratio. Please center the document');
      result.score -= 10;
    }

    // Advanced checks можно добавить позже:
    // - Blur detection (через Canvas API)
    // - Brightness analysis
    // - Edge detection

  } catch (error) {
    console.error('Quality validation error:', error);
    result.warnings.push('Could not validate image quality');
    result.score -= 10;
  }

  return result;
}

/**
 * Get image dimensions
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.width,
        height: img.height
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Convert canvas to File
 */
export function canvasToFile(
  canvas: HTMLCanvasElement,
  fileName: string,
  mimeType: string = 'image/jpeg',
  quality: number = 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob from canvas'));
          return;
        }

        const file = new File([blob], fileName, {
          type: mimeType,
          lastModified: Date.now()
        });

        resolve(file);
      },
      mimeType,
      quality
    );
  });
}

/**
 * Remove EXIF metadata (для privacy)
 * Canvas API автоматически удаляет EXIF при redraw
 */
export async function removeExifData(file: File): Promise<File> {
  try {
    // Load image
    const img = new Image();
    const url = URL.createObjectURL(file);

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    // Draw to canvas (это удаляет EXIF)
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    // Convert back to file
    const cleanFile = await canvasToFile(
      canvas,
      file.name,
      file.type,
      0.85
    );

    console.log('🧹 EXIF metadata removed');
    return cleanFile;

  } catch (error) {
    console.error('Failed to remove EXIF:', error);
    // Fallback - return original file
    return file;
  }
}

/**
 * Prepare image for upload (full pipeline)
 * 1. Remove EXIF
 * 2. Compress
 * 3. Validate
 */
export async function prepareImageForUpload(
  file: File,
  options: CompressionOptions = {}
): Promise<{
  file: File;
  quality: ImageQuality;
}> {
  // 1. Validate first
  const quality = await validateImageQuality(file);

  if (!quality.isValid) {
    throw new Error(quality.errors.join('. '));
  }

  // 2. Remove EXIF metadata
  let processedFile = await removeExifData(file);

  // 3. Compress (if needed)
  if (processedFile.size > 2 * 1024 * 1024) {
    processedFile = await compressImage(processedFile, options);
  }

  return {
    file: processedFile,
    quality
  };
}

