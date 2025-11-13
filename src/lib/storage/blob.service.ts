/**
 * Storage Service
 * - Vercel Blob (production)
 * - Local filesystem (development fallback)
 */

import { put, del } from '@vercel/blob';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';

export interface BlobUploadResult {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
}

const HAS_BLOB_TOKEN = !!process.env.BLOB_READ_WRITE_TOKEN;
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

/**
 * Upload file to Vercel Blob or local filesystem
 */
export async function uploadToBlob(
  file: File | Buffer,
  fileName: string,
  folder: string = 'kyc-documents'
): Promise<BlobUploadResult> {
  try {
    // PRODUCTION: Use Vercel Blob
    if (HAS_BLOB_TOKEN) {
      return await uploadToVercelBlob(file, fileName, folder);
    }
    
    // DEVELOPMENT: Use local filesystem
    return await uploadToLocalFS(file, fileName, folder);
  } catch (error: any) {
    console.error('❌ [STORAGE] Upload failed:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Upload to Vercel Blob (production)
 */
async function uploadToVercelBlob(
  file: File | Buffer,
  fileName: string,
  folder: string
): Promise<BlobUploadResult> {
  const pathname = `${folder}/${Date.now()}-${fileName}`;
  
  const blob = await put(pathname, file, {
    access: 'public',
    addRandomSuffix: true
  });

  console.log('✅ [BLOB] File uploaded to Vercel Blob:', {
    url: blob.url,
    pathname: blob.pathname,
    size: blob.size
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType || 'application/octet-stream',
    size: blob.size
  };
}

/**
 * Upload to local filesystem (development)
 */
async function uploadToLocalFS(
  file: File | Buffer,
  fileName: string,
  folder: string
): Promise<BlobUploadResult> {
  // Ensure upload directory exists
  const folderPath = path.join(UPLOAD_DIR, folder);
  await mkdir(folderPath, { recursive: true });

  // Generate unique filename
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueName = `${timestamp}-${safeName}`;
  const filePath = path.join(folderPath, uniqueName);

  // Convert File to Buffer if needed
  let buffer: Buffer;
  if (Buffer.isBuffer(file)) {
    buffer = file;
  } else {
    const arrayBuffer = await (file as File).arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }

  // Write file
  await writeFile(filePath, buffer);

  // Generate public URL (folder already contains full path like 'kyc/userId')
  const publicUrl = `/uploads/${folder}/${uniqueName}`;

  console.log('✅ [LOCAL] File uploaded to local filesystem:', {
    url: publicUrl,
    path: filePath,
    size: buffer.length
  });

  return {
    url: publicUrl,
    pathname: path.relative(UPLOAD_DIR, filePath),
    contentType: 'application/octet-stream', // Could detect from file extension
    size: buffer.length
  };
}

/**
 * Delete file from Vercel Blob or local filesystem
 */
export async function deleteFromBlob(url: string): Promise<void> {
  try {
    // PRODUCTION: Delete from Vercel Blob
    if (HAS_BLOB_TOKEN && url.includes('blob.vercel-storage.com')) {
      await del(url);
      console.log('✅ [BLOB] File deleted from Vercel Blob:', url);
      return;
    }
    
    // DEVELOPMENT: Delete from local filesystem
    if (url.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', url);
      await unlink(filePath);
      console.log('✅ [LOCAL] File deleted from local filesystem:', filePath);
      return;
    }

    console.warn('⚠️ [STORAGE] Unable to delete file (unknown storage):', url);
  } catch (error: any) {
    console.error('❌ [STORAGE] Delete failed:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}
