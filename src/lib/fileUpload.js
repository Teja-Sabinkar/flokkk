import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs/promises';
import path from 'path';

// Function to save a file to the public directory
export const saveFile = async (file, directory = 'posts') => {
  try {
    // Create directory if it doesn't exist
    const publicDir = path.join(process.cwd(), 'public', directory);
    try {
      await fs.access(publicDir);
    } catch {
      await fs.mkdir(publicDir, { recursive: true });
    }
    
    // Generate a unique filename
    const filename = `${uuidv4()}_${file.name.replace(/\s+/g, '_')}`;
    const filepath = path.join(publicDir, filename);
    
    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filepath, buffer);
    
    // Return the path relative to the public directory
    return `/${directory}/${filename}`;
  } catch (error) {
    console.error('File upload error:', error);
    throw new Error('File upload failed');
  }
};

export const deleteFile = async (filepath) => {
  try {
    // Skip if file path is a placeholder
    if (filepath.startsWith('/api/placeholder')) return true;
    
    // Remove leading slash and construct full path
    const fullPath = path.join(process.cwd(), 'public', filepath.substring(1));
    
    // Check if file exists and delete
    try {
      await fs.access(fullPath);
      await fs.unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  } catch (error) {
    console.error('File deletion error:', error);
    return false;
  }
};