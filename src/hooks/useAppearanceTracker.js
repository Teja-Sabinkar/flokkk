import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook to track when a post appears in viewport
 * @param {string} postId - The ID of the post to track
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Percentage of element that must be visible (0.5 = 50%)
 * @param {number} options.timeThreshold - Time in milliseconds element must be visible (1000 = 1 second)
 * @returns {Object} - { elementRef, hasAppeared }
 */
export const useAppearanceTracker = (postId, options = {}) => {
  const {
    threshold = 0.5, // 50% of element must be visible
    timeThreshold = 1000, // 1 second
  } = options;

  const elementRef = useRef(null);
  const [hasAppeared, setHasAppeared] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const timeoutRef = useRef(null);
  const observerRef = useRef(null);

  // Function to track appearance via API
  const trackAppearance = useCallback(async (postId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token found for appearance tracking');
        return;
      }

      console.log(`🔍 TRACKING APPEARANCE for post ID: ${postId}`);

      const response = await fetch(`/api/posts/${postId}/track-appear`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ Failed to track appearance:', response.status, errorData);
      } else {
        const data = await response.json();
        console.log('✅ Appearance tracked successfully:', data);
        console.log('📊 Updated counts:', data.counts);
      }
    } catch (error) {
      console.error('❌ Error tracking appearance:', error);
    }
  }, []);

  // Check if document/tab is visible (not in background)
  const isDocumentVisible = useCallback(() => {
    return !document.hidden && document.visibilityState === 'visible';
  }, []);

  // Intersection Observer callback
  const handleIntersection = useCallback((entries) => {
    const [entry] = entries;
    
    // Only proceed if document is visible and we haven't already tracked this post
    if (!isDocumentVisible() || hasAppeared || isTracking) {
      return;
    }

    if (entry.isIntersecting) {
      // Element is visible - start timer
      console.log(`👁️ Post ${postId} is visible, starting ${timeThreshold}ms timer...`);
      setIsTracking(true);
      timeoutRef.current = setTimeout(() => {
        // Still visible after time threshold and document is still visible
        if (elementRef.current && isDocumentVisible()) {
          console.log(`⏰ Timer completed for post ${postId}, tracking appearance...`);
          trackAppearance(postId);
          setHasAppeared(true);
          setIsTracking(false);
          
          // Clean up observer after tracking
          if (observerRef.current) {
            observerRef.current.disconnect();
          }
        } else {
          console.log(`❌ Post ${postId} no longer visible or document hidden, canceling...`);
        }
      }, timeThreshold);
    } else {
      // Element is no longer visible - cancel timer
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsTracking(false);
    }
  }, [postId, hasAppeared, isTracking, timeThreshold, trackAppearance, isDocumentVisible]);

  // Handle visibility change (tab switching)
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && timeoutRef.current) {
      // Tab became hidden - cancel any pending tracking
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setIsTracking(false);
    }
  }, []);

  useEffect(() => {
    // Don't set up observer if already appeared or no postId
    if (hasAppeared || !postId) return;

    const element = elementRef.current;
    if (!element) return;

    // Create Intersection Observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold: threshold,
      // Add some margin to trigger slightly before/after exact intersection
      rootMargin: '0px 0px -10px 0px'
    });

    // Start observing
    observerRef.current.observe(element);

    // Listen for visibility changes (tab switching)
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [postId, hasAppeared, threshold, handleIntersection, handleVisibilityChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    elementRef,
    hasAppeared,
    isTracking
  };
};