import React, { useState } from 'react';
import styles from './DeleteAccountModal.module.css';

const DeleteAccountModal = ({ onClose, onDelete }) => {
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate confirmation text
        if (confirmText.toLowerCase() !== 'delete') {
            setError('Please type "delete" to confirm');
            return;
        }

        setIsDeleting(true);
        setError(null);

        try {
            await onDelete();
            // onDelete should handle redirect on success
        } catch (error) {
            console.error('Error deleting account:', error);
            setIsDeleting(false);
            setError(error.message || 'Failed to delete account. Please try again.');
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Delete Account</h2>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Close"
                        disabled={isDeleting}
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={styles.modalBody}>
                        <div className={styles.warningMessage}>
                            <p>Warning: This action cannot be undone. This will permanently delete your account and all content associated with it.</p>
                            <p>Please type <strong>delete</strong> to confirm.</p>
                        </div>

                        {error && (
                            <div className={styles.errorMessage}>
                                {error}
                            </div>
                        )}

                        <div className={styles.inputGroup}>
                            <input
                                type="text"
                                className={styles.input}
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="Type 'delete' to confirm"
                                disabled={isDeleting}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className={styles.modalFooter}>
                        <button
                            type="button"
                            className={styles.cancelButton}
                            onClick={onClose}
                            disabled={isDeleting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.deleteButton}
                            disabled={isDeleting || confirmText.toLowerCase() !== 'delete'}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DeleteAccountModal;