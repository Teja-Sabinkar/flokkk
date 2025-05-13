'use client';

import React, { useState, useEffect } from 'react';
import styles from './ReportModal.module.css';

const reportReasons = [
  { id: 'sexual', label: 'Sexual content' },
  { id: 'violent', label: 'Violent or repulsive content' },
  { id: 'hateful', label: 'Hateful or abusive content' },
  { id: 'harmful', label: 'Harmful or dangerous acts' },
  { id: 'spam', label: 'Spam or misleading' },
  { id: 'child_abuse', label: 'Child abuse' },
  { id: 'other', label: 'Other' }
];

const ReportModal = ({ isOpen, onClose, onSubmit, contentDetails }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset the form when it's opened - this hook must be BEFORE any conditional returns
  useEffect(() => {
    if (isOpen) {
      setSelectedReason('');
      setOtherReason('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Early return AFTER all hooks are defined
  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedReason) {
      alert('Please select a reason for reporting');
      return;
    }

    setIsSubmitting(true);

    // Get selected reason label
    const reasonLabel = selectedReason === 'other'
      ? `Other: ${otherReason}`
      : reportReasons.find(r => r.id === selectedReason)?.label || selectedReason;

    // Add reason to content details
    const reportData = {
      ...contentDetails,
      reason: reasonLabel,
      reportedAt: new Date().toISOString()
    };

    try {
      await onSubmit(reportData);
      // The setIsSubmitting(false) will be handled in the useEffect when the modal is closed
    } catch (error) {
      console.error('Error submitting report:', error);
      // Important: Reset the submitting state on error
      setIsSubmitting(false);
      alert('Failed to submit report. Please try again.');
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Report Content</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            disabled={isSubmitting}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className={styles.modalBody}>
          <p>Please select a reason for reporting this content:</p>

          <form onSubmit={handleSubmit} className={styles.reportForm}>
            {reportReasons.map(reason => (
              <div key={reason.id} className={styles.reasonOption}>
                <input
                  type="radio"
                  id={reason.id}
                  name="reportReason"
                  value={reason.id}
                  checked={selectedReason === reason.id}
                  onChange={() => setSelectedReason(reason.id)}
                  disabled={isSubmitting}
                />
                <label htmlFor={reason.id}>{reason.label}</label>
              </div>
            ))}

            {selectedReason === 'other' && (
              <textarea
                className={styles.otherReasonInput}
                placeholder="Please explain the reason for your report..."
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                required
                disabled={isSubmitting}
              />
            )}

            <div className={styles.contentPreview}>
              <h3>Content being reported:</h3>
              <p><strong>{contentDetails?.title || 'Untitled'}</strong></p>

              {/* Use dangerouslySetInnerHTML to render formatted HTML content */}
              <div
                className={styles.contentPreviewText}
                dangerouslySetInnerHTML={{
                  __html: contentDetails?.content?.substring(0, 300) || 'No content'
                }}
              />
              {contentDetails?.content?.length > 300 && <span>...</span>}
            </div>

            <div className={styles.actionButtons}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={!selectedReason || isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;