import React, { useEffect, useState } from 'react';
import styles from './AboutTab.module.css';

const AboutTab = ({ profileData = {
  username: 'User',
  joinDate: 'January 2022',
  bio: 'Welcome to our channel! We create exciting content about technology, programming, and digital creativity. Join us on this amazing journey as we explore the latest trends.',
  website: 'https://example.com',
  location: 'San Francisco, CA',
  socialLinks: [
    { platform: 'Twitter', url: 'https://twitter.com/example' },
    { platform: 'GitHub', url: 'https://github.com/example' },
    { platform: 'LinkedIn', url: 'https://linkedin.com/in/example' }
  ]
}}) => {
  // Keep a local state that updates when props change
  const [localProfileData, setLocalProfileData] = useState(profileData);
  
  // Update local state when profileData changes
  useEffect(() => {
    setLocalProfileData(profileData);
  }, [profileData]);

  return (
    <div className={styles.aboutTabContainer}>
      <div className={styles.aboutSection}>
        <h2 className={styles.sectionTitle}>About</h2>
        <p className={styles.bioText}>{localProfileData.bio}</p>
        
        <div className={styles.infoGrid}>
          {localProfileData.location && (
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Location</span>
              </div>
              <div className={styles.infoValue}>{localProfileData.location}</div>
            </div>
          )}
          
          {localProfileData.website && (
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Website</span>
              </div>
              <a href={localProfileData.website} target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                {localProfileData.website.replace(/(^\w+:|^)\/\//, '')}
              </a>
            </div>
          )}
          
          {localProfileData.joinDate && (
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 10C20 14.4183 12 22 12 22C12 22 4 14.4183 4 10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 11C12.5523 11 13 10.5523 13 10C13 9.44772 12.5523 9 12 9C11.4477 9 11 9.44772 11 10C11 10.5523 11.4477 11 12 11Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Joined</span>
              </div>
              <div className={styles.infoValue}>{localProfileData.joinDate}</div>
            </div>
          )}
        </div>
      </div>

      {localProfileData.socialLinks && localProfileData.socialLinks.length > 0 && (
        <div className={styles.socialSection}>
          <h2 className={styles.sectionTitle}>Social Links</h2>
          <div className={styles.socialLinks}>
            {localProfileData.socialLinks.map((link, index) => (
              <a 
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
              >
                <div className={styles.socialPlatform}>
                  {link.platform === 'Twitter' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 4.01C21 4.5 20.02 4.69 19 4.82C18.46 4.24 17.73 3.83 16.92 3.64C16.1 3.45 15.26 3.5 14.49 3.78C13.72 4.06 13.05 4.56 12.57 5.22C12.08 5.88 11.79 6.68 11.79 7.5V8.5C10.11 8.53 8.46 8.09 7.01 7.24C5.56 6.38 4.37 5.14 3.58 3.66C3.58 3.66 -0.42 12.74 7.79 16.44C5.85 17.7 3.54 18.34 1.17 18.28C9.38 23 19.38 18.28 19.38 7.48C19.38 7.21 19.36 6.94 19.32 6.68C20.36 5.65 21.14 4.37 22 4.01V4.01Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {link.platform === 'GitHub' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 19C4 20.5 4 16.5 2 16M16 22V18.13C16.0375 17.6532 15.9731 17.1738 15.811 16.7238C15.6489 16.2738 15.3929 15.8634 15.06 15.52C18.2 15.17 21.5 13.98 21.5 8.52C21.4997 7.12383 20.9627 5.7812 20 4.77C20.4559 3.54851 20.4236 2.19835 19.91 0.999999C19.91 0.999999 18.73 0.649999 16 2.48C13.708 1.85882 11.292 1.85882 9 2.48C6.27 0.649999 5.09 0.999999 5.09 0.999999C4.57638 2.19835 4.54414 3.54851 5 4.77C4.03013 5.7887 3.49252 7.14346 3.5 8.55C3.5 13.97 6.8 15.16 9.94 15.55C9.611 15.89 9.35726 16.2954 9.19531 16.7399C9.03335 17.1844 8.96681 17.6581 9 18.13V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {link.platform === 'LinkedIn' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 8C17.5913 8 19.1174 8.63214 20.2426 9.75736C21.3679 10.8826 22 12.4087 22 14V21H18V14C18 13.4696 17.7893 12.9609 17.4142 12.5858C17.0391 12.2107 16.5304 12 16 12C15.4696 12 14.9609 12.2107 14.5858 12.5858C14.2107 12.9609 14 13.4696 14 14V21H10V14C10 12.4087 10.6321 10.8826 11.7574 9.75736C12.8826 8.63214 14.4087 8 16 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 9H2V21H6V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 6C5.10457 6 6 5.10457 6 4C6 2.89543 5.10457 2 4 2C2.89543 2 2 2.89543 2 4C2 5.10457 2.89543 6 4 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  <span>{link.platform}</span>
                </div>
                <div className={styles.socialUsername}>{link.url.split('/').pop()}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutTab;