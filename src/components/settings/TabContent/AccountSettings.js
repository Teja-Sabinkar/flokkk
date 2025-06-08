// AccountSettings.js

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';
import styles from './AccountSettings.module.css';
import ContactInfoEditModal from './ContactInfoEditModal';
import DeleteAccountModal from './DeleteAccountModal';

const AccountSettings = () => {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [clearHistoryMessage, setClearHistoryMessage] = useState('');
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('No authentication token found. Please log in again.');
          setLoading(false);
          return;
        }
        
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch user data');
        }
        
        const userData = await response.json();
        setUser(userData);
      } catch (err) {
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  // Add this new function to handle clearing watch history
  const handleClearHistory = async () => {
    setIsClearingHistory(true);
    setClearHistoryMessage('');
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch('/api/recently-viewed/clear', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to clear history');
      }
      
      setClearHistoryMessage('Watch history cleared successfully');
      
    } catch (err) {
      setClearHistoryMessage(`Error: ${err.message}`);
    } finally {
      setIsClearingHistory(false);
    }
  };

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const handleContactInfoUpdate = async (newContactInfo) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch('/api/settings/account', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contactInfo: newContactInfo
        })
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to update contact info');
      }
      
      setUser({
        ...user,
        contactInfo: newContactInfo
      });
      
      setIsContactModalOpen(false);
    } catch (err) {
      console.error('Error updating contact info:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Add this new function to handle account deletion
  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete account');
      }
      
      // Clear local token and redirect to login page
      localStorage.removeItem('token');
      router.push('/login');
      
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading user data...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.sectionTitle}>Account</h2>
      
      {/* Personal Settings Section */}
      <div className={styles.settingsSection}>
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <h3 className={styles.settingTitle}>Email Address</h3>
          </div>
          <div className={styles.settingAction}>
            <span className={styles.settingValue}>{user?.email || 'Email not available'}</span>
          </div>
        </div>
        
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <h3 className={styles.settingTitle}>Contact Info</h3>
          </div>
          <div 
            className={`${styles.settingAction} ${styles.clickable}`}
            onClick={() => setIsContactModalOpen(true)}
          >
            <span className={styles.settingValue}>
              {user?.contactInfo ? truncateText(user.contactInfo, 20) : 'Add contact info'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Theme Section */}
      <h2 className={styles.sectionTitle}>Theme</h2>
      <div className={styles.settingsSection}>
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <h3 className={styles.settingTitle}>Dark / Light Mode</h3>
            <p className={styles.settingDescription}>
              Toggle between dark and light themes for the application.
            </p>
          </div>
          <div className={styles.settingAction}>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={theme === 'light'}
                onChange={toggleTheme}
              />
              <span className={styles.slider}>
                <span className={`${styles.icon} ${styles.sunIcon}`}>☀️</span>
                <span className={`${styles.icon} ${styles.moonIcon}`}>🌙</span>
              </span>
            </label>
          </div>
        </div>
      </div>
      
      {/* Advanced Section */}
      <h2 className={styles.sectionTitle}>Advanced</h2>
      <div className={styles.settingsSection}>
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <h3 className={styles.settingTitle}>Clear History</h3>
            {clearHistoryMessage && (
              <p className={styles.settingDescription} style={{ 
                color: clearHistoryMessage.startsWith('Error') ? 'var(--danger-color)' : 'var(--success-color)'
              }}>
                {clearHistoryMessage}
              </p>
            )}
          </div>
          <div className={styles.settingAction}>
            <button 
              className={styles.actionButton}
              onClick={handleClearHistory}
              disabled={isClearingHistory}
            >
              {isClearingHistory ? 'Clearing...' : 'Clear'}
              <span className={`material-icons ${styles.arrowIcon}`}>history</span>
            </button>
          </div>
        </div>
        
        <div className={styles.settingItem}>
          <div className={styles.settingInfo}>
            <h3 className={styles.settingTitle}>Account Deletion</h3>
            <p className={styles.settingDescription}>
              This will permanently delete your account and all your content.
            </p>
          </div>
          <div className={styles.settingAction}>
            <button 
              className={`${styles.actionButton} ${styles.dangerButton}`}
              onClick={() => setIsDeleteModalOpen(true)}
            >
              Delete
              <span className={`material-icons ${styles.arrowIcon}`}>Account</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Contact Info Edit Modal */}
      {isContactModalOpen && (
        <ContactInfoEditModal
          contactInfo={user?.contactInfo || ''}
          onClose={() => setIsContactModalOpen(false)}
          onSave={handleContactInfoUpdate}
        />
      )}
      
      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <DeleteAccountModal
          onClose={() => setIsDeleteModalOpen(false)}
          onDelete={handleDeleteAccount}
        />
      )}
    </div>
  );
};

export default AccountSettings;