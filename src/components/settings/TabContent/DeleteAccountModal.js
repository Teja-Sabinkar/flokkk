import React, { useState } from 'react';
import styles from './DeleteAccountModal.module.css';

const DeleteAccountModal = ({ onClose, onConfirm }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState(null);
    const [confirmText, setConfirmText] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Additional check that confirmation text is correct
        if (confirmText.toLowerCase() !== 'delete') {
            setError('Please type "delete" to confirm');
            return;
        }

        setIsDeleting(true);
        setError(null);

        try {
            await onConfirm();
            // If the onConfirm function doesn't throw, it will redirect
            // so we don't need to do anything else here
        } catch (err) {
            setError(err.message || 'Failed to delete account. Please try again.');
            setIsDeleting(false);
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
                            <p><strong>Warning:</strong> This action cannot be undone.</p>
                            <p>Deleting your account will:</p>
                            <ul>
                                <li>Remove all your discussions and posts</li>
                                <li>Delete all your playlists and saved content</li>
                                <li>Remove your profile and all personal information</li>
                                <li>Sign you out of the app on all devices</li>
                            </ul>
                            <p>Are you absolutely sure you want to continue?</p>
                        </div>

                        {error && (
                            <div className={styles.errorMessage}>{error}</div>
                        )}

                        <div className={styles.inputGroup}>
                            <label htmlFor="confirmText" className={styles.label}>
                                Type <strong>delete</strong> to confirm
                            </label>
                            <input
                                id="confirmText"
                                type="text"
                                className={styles.input}
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder="delete"
                                required
                                disabled={isDeleting}
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
                            {isDeleting ? 'Deleting Account...' : 'Delete Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DeleteAccountModal;