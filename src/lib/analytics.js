// src/lib/analytics.js
/**
 * Utility functions for tracking user actions with Vercel Web Analytics
 */

/**
 * Track a specific user action in a non-blocking way
 * @param {string} eventName - The name of the event to track
 * @param {Object} [properties] - Optional properties to include with the event
 */
export function trackEvent(eventName, properties = {}) {
    // Use a setTimeout to ensure this doesn't block
    setTimeout(() => {
        try {
            // Check if the web-vitals analytics object exists
            if (typeof window !== 'undefined' && window.va) {
                // Call Vercel Analytics event function
                window.va.event(eventName, properties);
                if (process.env.NODE_ENV === 'development') {
                    console.log(`📊 Analytics event tracked: ${eventName}`, properties);
                }
            }
        } catch (error) {
            // Never let analytics errors affect the main application
            console.error('Analytics error (non-fatal):', error);
        }
    }, 0);
}

/**
 * Track button clicks in a non-blocking way
 * @param {string} buttonName - Name identifier for the button
 * @param {Object} [additionalData] - Any additional data to track with the event
 */
export function trackButtonClick(buttonName, additionalData = {}) {
    trackEvent('button_click', {
        button_name: buttonName,
        page_path: typeof window !== 'undefined' ? window.location.pathname : '',
        ...additionalData
    });
}