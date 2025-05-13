'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CommentRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const commentId = searchParams.get('id');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCommentAndRedirect() {
      if (!commentId) {
        router.push('/home');
        return;
      }

      try {
        setIsLoading(true);
        // Get the token from local storage
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }

        // Fetch the comment to get its postId
        const response = await fetch(`/api/comments/${commentId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch comment data');
        }

        const commentData = await response.json();
        
        // Check if we have a postId
        if (!commentData.postId) {
          throw new Error('Comment does not have a post ID');
        }

        // Redirect to the discussion page with the post ID
        router.push(`/discussion?id=${commentData.postId}`);
      } catch (error) {
        console.error('Error in comment redirect:', error);
        setError(error.message);
        // After a delay, redirect to home as fallback
        setTimeout(() => {
          router.push('/home');
        }, 3000);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCommentAndRedirect();
  }, [commentId, router]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '20px' }}>Loading discussion...</div>
          <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '20px' }}>Error: {error}</div>
          <div>Redirecting to home page...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div>Finding your discussion...</div>
      </div>
    </div>
  );
}