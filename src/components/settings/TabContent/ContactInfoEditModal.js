import React, { useState } from 'react';
import styles from './ContactInfoEditModal.module.css';

const ContactInfoEditModal = ({ contactInfo, onClose, onSave }) => {
  const [value, setValue] = useState(contactInfo || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    console.log("Submitting contact info:", value);

    try {
      await onSave(value);
      // onSave should handle closing the modal
    } catch (error) {
      console.error('Error saving contact info:', error);
      setIsSubmitting(false);
      setError('Failed to save. Please try again.');
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Edit Contact Information</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}
            <div className={styles.inputGroup}>
              <label htmlFor="contactInfo" className={styles.label}>
                Contact Information
              </label>
              <input
                id="contactInfo"
                type="text"
                className={styles.input}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Phone, email, etc."
                maxLength={20}
              />
              <small className={styles.helpText}>
                Add your preferred contact method (20 characters max)
              </small>
            </div>
          </div>

          <div className={styles.modalFooter}>
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
              className={styles.saveButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactInfoEditModal;