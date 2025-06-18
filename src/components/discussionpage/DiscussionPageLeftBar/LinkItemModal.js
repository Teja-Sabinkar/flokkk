// src/components/discussionpage/DiscussionPageLeftBar/LinkItemModal.js
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './LinkItemModal.module.css';

export default function LinkItemModal({ link, section, onClose, onVote, userVote, isVoting, currentUser }) {
  const router = useRouter(); // Add router for navigation
  const modalRef = useRef(null);
  // Add a state to track whether to show share UI
  const [isShareView, setIsShareView] = useState(false);
  // Add state for copy success indicator
  const [copySuccess, setCopySuccess] = useState(false);
  // Add state for verification prompt
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  
  // Create the link URL to be shared
  const linkUrl = link?.url || '#';

  // Log the link data for debugging
  useEffect(() => {
    console.log("Modal received link:", link);
    console.log("URL value:", link?.url);
  }, [link]);

  // Handle click outside to close modal
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    }

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Prevent scrolling when modal is open
    document.body.style.overflow = 'hidden';

    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  // Handle escape key press
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);
  
  // Auto-hide verification prompt after 3 seconds
  useEffect(() => {
    if (showVerificationPrompt) {
      const timer = setTimeout(() => {
        setShowVerificationPrompt(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [showVerificationPrompt]);

  // Ensure we have a valid link object
  if (!link) {
    return null;
  }
  
  // Check if user is verified
  const isUserVerified = () => {
    return currentUser?.isEmailVerified === true;
  };
  
  // Handle verification prompt
  const handleVerificationPrompt = () => {
    setShowVerificationPrompt(true);
  };

  // Function to handle opening the URL
  const handleOpenUrl = (e) => {
    e.preventDefault();
    
    if (link.url && link.url !== '#') {
      console.log(`Opening link URL from modal: ${link.url}`);
      window.open(link.url, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('Cannot open invalid URL from modal');
    }
  };

  // Function to navigate to user profile
  const navigateToUserProfile = (e, username, userId) => {
    // Stop event propagation to prevent modal from closing
    e.preventDefault();
    e.stopPropagation();
    
    // Check if the contributor is the current user
    const isCurrentUser = currentUser && 
      (currentUser.username === username || currentUser.id === userId);
    
    // Choose the appropriate profile route based on whether it's the current user
    const profilePath = isCurrentUser
      ? `/currentprofile/${username}`
      : `/otheruserprofile/${username}`;
    
    // Navigate to the profile using the router
    if (userId) {
      router.push(`${profilePath}?id=${userId}`);
    } else {
      router.push(profilePath);
    }
    
    // Close the modal
    onClose();
  };
  
  // Handle vote with verification check
  const handleVote = (linkId, section, isUpvote) => {
    // Check if user is verified before allowing vote
    if (!isUserVerified()) {
      handleVerificationPrompt();
      return;
    }
    
    // Proceed with vote if verified
    onVote(linkId, section, isUpvote);
  };

  // Sharing functions
  const copyToClipboard = () => {
    if (link.url && link.url !== '#') {
      navigator.clipboard.writeText(link.url)
        .then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
        });
    }
  };

  const shareToTwitter = () => {
    if (link.url && link.url !== '#') {
      const text = `Check out this link: ${link.title}`;
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link.url)}`;
      window.open(url, '_blank');
    }
  };

  const shareToFacebook = () => {
    if (link.url && link.url !== '#') {
      const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link.url)}`;
      window.open(url, '_blank');
    }
  };

  const shareToLinkedIn = () => {
    if (link.url && link.url !== '#') {
      const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link.url)}`;
      window.open(url, '_blank');
    }
  };

  const shareToReddit = () => {
    if (link.url && link.url !== '#') {
      const url = `https://www.reddit.com/submit?url=${encodeURIComponent(link.url)}&title=${encodeURIComponent(link.title)}`;
      window.open(url, '_blank');
    }
  };

  const shareByEmail = () => {
    if (link.url && link.url !== '#') {
      const subject = `Check out this link: ${link.title}`;
      const body = `I thought you might be interested in this link:\n\n${link.title}\n\n${link.url}`;
      const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(url);
    }
  };

  // Toggle between normal view and share view
  const toggleShareView = () => {
    setIsShareView(!isShareView);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} ref={modalRef}>
        <button className={styles.closeButton} onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        {/* Verification prompt */}
        {showVerificationPrompt && (
          <div className={styles.verificationPrompt}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Please verify your email to vote on links</span>
          </div>
        )}

        {/* Check which view to show */}
        {isShareView ? (
          // Share view
          <div className={styles.shareView}>
            <div className={styles.shareHeader}>
              <button className={styles.backButton} onClick={toggleShareView}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            </div>
            
            <div className={styles.shareContent}>
              <div className={styles.linkInfo}>
                <h4>{link.title}</h4>
                <p className={styles.linkUrl}>{link.url}</p>
              </div>
              
              <div className={styles.shareOptions}>
                <button className={`${styles.shareButton} ${styles.twitter}`} onClick={shareToTwitter}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                  </svg>
                  Twitter/X
                </button>
                
                <button className={`${styles.shareButton} ${styles.facebook}`} onClick={shareToFacebook}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                  Facebook
                </button>
                
                <button className={`${styles.shareButton} ${styles.linkedin}`} onClick={shareToLinkedIn}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                    <rect x="2" y="9" width="4" height="12"></rect>
                    <circle cx="4" cy="4" r="2"></circle>
                  </svg>
                  LinkedIn
                </button>
                
                <button className={`${styles.shareButton} ${styles.reddit}`} onClick={shareToReddit}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="9" r="3"></circle>
                    <path d="M6.7 14.3c-.9 0-1.7-.8-1.7-1.7s.8-1.7 1.7-1.7"></path>
                    <path d="M17.3 14.3c.9 0 1.7-.8 1.7-1.7s-.8-1.7-1.7-1.7"></path>
                    <path d="M6.7 12.6C7.1 15 9.3 17 12 17s4.9-2 5.3-4.4"></path>
                  </svg>
                  Reddit
                </button>
                
                <button className={`${styles.shareButton} ${styles.email}`} onClick={shareByEmail}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  Email
                </button>
              </div>
              
              <div className={styles.copyLinkSection}>
                <button 
                  className={`${styles.copyLinkButton} ${copySuccess ? styles.success : ''}`}
                  onClick={copyToClipboard}
                >
                  {copySuccess ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                      </svg>
                      Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Normal view
          <div className={styles.linkItemExpanded}>
            <div className={styles.linkHeader}>
              <h2 className={styles.linkTitle}>{link.title}</h2>
            </div>

            <div className={styles.linkDescription}>
              {link.description || 'No description provided'}
            </div>

            {/* Display URL if available */}
            {link.url && link.url !== '#' && (
              <div className={styles.linkUrl}>
                <a 
                  href={link.url} 
                  onClick={handleOpenUrl}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.urlLink}
                >
                  {link.url}
                </a>
              </div>
            )}

            {/* Display contributor info for community links - UPDATED with current user check */}
            {section === 'community' && link.contributorUsername && (
              <div className={styles.contributorInfo}>
                Contributed by: {' '}
                <a 
                  href="#"
                  onClick={(e) => navigateToUserProfile(e, link.contributorUsername, link.contributorId)}
                  className={styles.contributorName}
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {link.contributorUsername}
                </a>
              </div>
            )}

            <div className={styles.linkMeta}>
              <div className={styles.linkTags}>
                <Link href="/tags" className={styles.linkTag}></Link>
              </div>
            </div>

            <div className={styles.linkActions}>
              <div className={`${styles.voteContainer} ${isVoting ? styles.voting : ''}`}>
                <button
                  className={`${styles.voteButton} ${styles.upvoteButton} ${userVote === 'up' ? styles.active : ''}`}
                  onClick={() => handleVote(link.id, section, true)}
                  disabled={isVoting}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 4l8 8h-16l8-8z" />
                  </svg>
                </button>
                <span className={styles.voteCount}>{link.votes}</span>
                <button
                  className={`${styles.voteButton} ${styles.downvoteButton} ${userVote === 'down' ? styles.active : ''}`}
                  onClick={() => handleVote(link.id, section, false)}
                  disabled={isVoting}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20l-8-8h16l-8 8z" />
                  </svg>
                </button>
              </div>
              <button className={styles.actionButton} onClick={toggleShareView}>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                share
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}