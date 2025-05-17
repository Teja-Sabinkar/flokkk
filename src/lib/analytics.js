// src/lib/analytics.js
/**
 * Utility functions for tracking user actions with Vercel Web Analytics
 */

/**
 * Track a specific user action
 * @param {string} eventName - The name of the event to track
 * @param {Object} [properties] - Optional properties to include with the event
 */
export function trackEvent(eventName, properties = {}) {
    // Check if the web-vitals analytics object exists
    if (typeof window !== 'undefined' && window.va) {
        // Call Vercel Analytics event function
        window.va.event(eventName, properties);
        console.log(`📊 Analytics event tracked: ${eventName}`, properties);
    } else {
        console.warn('Vercel Analytics not available');
    }
}

/**
 * Track button clicks
 * @param {string} buttonName - Name identifier for the button
 * @param {Object} [additionalData] - Any additional data to track with the event
 */
export function trackButtonClick(buttonName, additionalData = {}) {
    trackEvent('button_click', {
        button_name: buttonName,
        page_path: window.location.pathname,
        ...additionalData
    });
}