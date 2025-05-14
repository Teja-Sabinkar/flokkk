// app/api/upload/blob/route.js
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image');
    
    // Upload to the posts/ directory within your Blob storage
    const blob = await put(`posts/${Date.now()}-${file.name}`, file, {
      access: 'public',
    });
    
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}