// src/components/currentprofile/TabContent/ContributionsTab.js
'use client';

import React, { useState, useEffect } from 'react';
import styles from './ContributionsTab.module.css';

const ContributionsTab = () => {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  // Add tab mode to distinguish between received and contributed
  const [tabMode, setTabMode] = useState('received');

  // Fetch contributions when tab changes or mode changes
  useEffect(() => {
    const fetchContributions = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }

        // Use tabMode to determine which type of contributions to fetch
        const response = await fetch(`/api/link-contributions?status=${activeTab}&type=${tabMode}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch contributions');
        }

        const data = await response.json();
        setContributions(data.contributions || []);
      } catch (error) {
        console.error('Error fetching contributions:', error);
        setError(error.message || 'Failed to load contributions');
      } finally {
        setLoading(false);
      }
    };

    fetchContributions();
  }, [activeTab, tabMode]);

  // Handle approve/reject actions
  const handleAction = async (contributionId, action) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Find the contribution in our current state to get post details
      const contribution = contributions.find(c => c.id === contributionId);
      if (!contribution) {
        throw new Error('Contribution not found');
      }

      const response = await fetch(`/api/link-contributions/${contributionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} contribution`);
      }

      // Update local state
      if (action === 'approve' || action === 'reject') {
        setContributions(prev => prev.filter(c => c.id !== contributionId));
      }

      // Show a custom success message for approval
      if (action === 'approve') {
        alert(`The link has been approved and will now appear in the Community Links section of your post.`);

        // Optional: If the discussion page is currently open, we could dispatch a custom event
        // to notify it to refresh the community links data
        try {
          window.dispatchEvent(new CustomEvent('contribution-approved', {
            detail: { postId: contribution.postId }
          }));
        } catch (e) {
          console.log('Event dispatch not critical:', e);
        }
      } else {
        alert(`Contribution ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      }

    } catch (error) {
      console.error(`Error ${action}ing contribution:`, error);
      alert(error.message || `Failed to ${action} contribution`);
    }
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const getBadgeClass = () => {
      switch (status) {
        case 'approved':
          return styles.approvedBadge;
        case 'declined':
          return styles.rejectedBadge;
        default:
          return styles.pendingBadge;
      }
    };

    return (
      <span className={`${styles.statusBadge} ${getBadgeClass()}`}>
        {status === 'declined' ? 'Rejected' : status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className={styles.contributionsContainer}>
      {/* Add tab mode selector */}
      <div className={styles.tabModeSelector}>
        <button
          className={`${styles.tabModeButton} ${tabMode === 'received' ? styles.active : ''}`}
          onClick={() => {
            setTabMode('received');
            setActiveTab('pending'); // Reset to pending when switching modes
          }}
        >
          Received
        </button>
        <button
          className={`${styles.tabModeButton} ${tabMode === 'sent' ? styles.active : ''}`}
          onClick={() => {
            setTabMode('sent');
            setActiveTab('all'); // Show all contributed links initially
          }}
        >
          Contributed
        </button>
      </div>

      {/* Status tab selector - conditional based on mode */}
      {tabMode === 'received' ? (
        <div className={styles.tabSelector}>
          <button
            className={`${styles.tabButton} ${activeTab === 'pending' ? styles.active : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'approved' ? styles.active : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            Approved
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'declined' ? styles.active : ''}`}
            onClick={() => setActiveTab('declined')}
          >
            Rejected
          </button>
        </div>
      ) : (
        <div className={styles.tabSelector}>
          <button
            className={`${styles.tabButton} ${activeTab === 'all' ? styles.active : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'pending' ? styles.active : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'approved' ? styles.active : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            Approved
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'declined' ? styles.active : ''}`}
            onClick={() => setActiveTab('declined')}
          >
            Rejected
          </button>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading contributions...</p>
        </div>
      ) : error ? (
        <div className={styles.errorMessage}>
          <p>{error}</p>
          <button
            onClick={() => setActiveTab(activeTab)}
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      ) : contributions.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No {activeTab !== 'all' ? activeTab : ''} contributions found.</p>
          {tabMode === 'received' && activeTab === 'pending' &&
            <p>When users contribute links to your posts, they'll appear here for review.</p>
          }
          {tabMode === 'sent' &&
            <p>Links you contribute to other users' discussions will appear here.</p>
          }
        </div>
      ) : (
        <div className={styles.contributionsList}>
          {contributions.map(contribution => (
            <div key={contribution.id} className={styles.contributionCard}>
              <div className={styles.contributionHeader}>

                <span className={styles.contributorInfo}>
                  Contributed by: {contribution.contributorUsername}
                </span>

                <span className={styles.contributionTime}>{contribution.timeAgo}</span>

                {/* Show status badge for "Contributed" tab */}
                {tabMode === 'sent' && (
                  <StatusBadge status={contribution.status} />
                )}

              </div>

              <div className={styles.contributionMeta}>
                {tabMode === 'received' ? (
                  <>

                    <span className={styles.postInfo}>
                      For your post: {contribution.postTitle}
                    </span>
                    <h3 className={styles.contributionTitle}>{contribution.title}</h3>
                  </>
                ) : (
                  <span className={styles.contributorInfo}>
                    Contributed to: {contribution.postTitle}
                  </span>
                )}
              </div>

              <div className={styles.contributionContent}>

                {contribution.description && (
                  <p className={styles.contributionDescription}>
                    {contribution.description}
                  </p>
                )}

                <div className={styles.urlDisplay}>
                  <a href={contribution.url} target="_blank" rel="noopener noreferrer">
                    {contribution.url}
                  </a>
                </div>

              </div>

              {/* Only show action buttons for received pending contributions */}
              {tabMode === 'received' && activeTab === 'pending' && (
                <div className={styles.actionButtons}>
                  <button
                    className={styles.approveButton}
                    onClick={() => handleAction(contribution.id, 'approve')}
                  >
                    Approve
                  </button>
                  <button
                    className={styles.rejectButton}
                    onClick={() => handleAction(contribution.id, 'reject')}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContributionsTab;