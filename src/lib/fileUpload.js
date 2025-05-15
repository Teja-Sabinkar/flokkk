// src/lib/fileUpload.js
import { put, del } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';

// Function to save a file to Vercel Blob Storage
export const saveFile = async (file, directory = 'posts') => {
  try {
    // Generate a unique filename
    const originalName = file.name || 'file';
    const filename = `${uuidv4()}_${originalName.replace(/\s+/g, '_')}`;
    const fullPath = `${directory}/${filename}`;
    
    // Upload to Vercel Blob
    const { url } = await put(fullPath, file, {
      access: 'public',
    });
    
    // Return the URL of the uploaded file
    return url;
  } catch (error) {
    console.error('File upload error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
};

export const deleteFile = async (fileUrl) => {
  try {
    // Skip if URL is a placeholder
    if (fileUrl.startsWith('/api/placeholder')) return true;
    
    // Check if it's a Vercel Blob URL (contains .public.blob.vercel-storage.com)
    if (fileUrl.includes('.public.blob.vercel-storage.com')) {
      await del(fileUrl);
      return true;
    }
    
    // For backward compatibility with old file paths
    console.warn('Attempted to delete a non-Blob Storage file:', fileUrl);
    return false;
  } catch (error) {
    console.error('File deletion error:', error);
    return false;
  }
};