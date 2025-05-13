// src/components/report/reportService.js

/**
 * Submits a report to the server and sends an email notification
 * @param {Object} reportData - Data about the content being reported
 * @returns {Promise} - Promise resolving to the server response
 */
export const submitReport = async (reportData) => {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('Authentication required');
    }

    const response = await fetch('/api/reports/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reportData)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit report');
    }

    return await response.json();
};