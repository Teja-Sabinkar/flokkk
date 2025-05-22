import { useEffect, useRef, useState, useCallback } from 'react';

export const useAppearanceTracker = (postId, options = {}) => {
  const { threshold = 0.5, timeThreshold = 1000 } = options;
  const elementRef = useRef(null);
  const [hasAppeared, setHasAppeared] = useState(false);
  const timeoutRef = useRef(null);
  const observerRef = useRef(null);
  const hasTriggeredRef = useRef(false);

  const trackAppearance = useCallback(async (postId) => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/posts/${postId}/track-appear`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setHasAppeared(true);
      }
    } catch (error) {
      // Silent fail in production
    }
  }, []);

  const handleIntersection = useCallback((entries) => {
    if (hasAppeared || hasTriggeredRef.current) return;

    const [entry] = entries;
    
    if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        trackAppearance(postId);
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      }, timeThreshold);
    } else if (!entry.isIntersecting && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [postId, hasAppeared, threshold, timeThreshold, trackAppearance]);

  useEffect(() => {
    if (hasAppeared || !postId || hasTriggeredRef.current) return;

    const element = elementRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0],
      rootMargin: '0px'
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [postId, hasAppeared, handleIntersection]);

  return { elementRef, hasAppeared };
};