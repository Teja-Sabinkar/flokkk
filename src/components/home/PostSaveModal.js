'use client';

import React, { useState, useEffect } from 'react';
import styles from './PostSaveModal.module.css';
import { getPlaylists, createPlaylist, addPostToPlaylist } from '@/lib/playlists';

export default function PostSaveModal({ isOpen, onClose, post, onSave }) {
  // State for storing playlists
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  
  // State for creating a new playlist
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');

  // Fetch playlists
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchPlaylists = async () => {
      try {
        setLoading(true);
        const playlistsData = await getPlaylists();
        setPlaylists(playlistsData);
      } catch (error) {
        console.error('Error loading playlists:', error);
        setError('Failed to load playlists. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlaylists();
  }, [isOpen]);

  // Track save engagement with the post
  const trackSaveEngagement = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/posts/${postId}/track-save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('Failed to track save engagement');
      } else {
        const data = await response.json();
        console.log('Save engagement tracked:', data);
      }
    } catch (error) {
      console.error('Error tracking save engagement:', error);
    }
  };

  // Handle playlist selection
  const handlePlaylistSelect = (playlistId) => {
    setSelectedPlaylistId(playlistId);
    setIsCreatingNew(false);
  };

  // Toggle new playlist creation form
  const handleNewPlaylistToggle = () => {
    setIsCreatingNew(!isCreatingNew);
    setSelectedPlaylistId(null);
  };

  // Handle saving post to playlist
  const handleSaveToPlaylist = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (isCreatingNew) {
        // Create a new playlist
        if (!newPlaylistTitle.trim()) {
          throw new Error('Please enter a playlist title');
        }
        
        // Format the post with ID guaranteed
        const formattedPost = {
          ...post,
          id: post.id || post._id || undefined,
          content: post.content || post.description || '',
          image: post.image || '/api/placeholder/600/300'
        };
        
        console.log('Creating new playlist with post:', { 
          title: newPlaylistTitle,
          postId: formattedPost.id,
          postTitle: formattedPost.title
        });
        
        // Create new playlist with the post
        const newPlaylist = await createPlaylist(newPlaylistTitle.trim(), [formattedPost]);
        
        // Track save engagement
        await trackSaveEngagement(formattedPost.id);
        
        if (onSave) {
          onSave({
            playlistId: newPlaylist.id,
            playlistTitle: newPlaylist.title,
            isNewPlaylist: true
          });
        }
        
      } else if (selectedPlaylistId) {
        // Add to existing playlist
        
        // Create a simplified post object with just the ID and basic info
        // This helps avoid any issues with circular references or extra fields
        const postForSaving = {
          id: post.id || post._id,
          title: post.title || 'Untitled Post'
        };
        
        console.log('Adding post to existing playlist:', {
          playlistId: selectedPlaylistId,
          postId: postForSaving.id,
          postTitle: postForSaving.title
        });
        
        // Add post to the existing playlist
        const result = await addPostToPlaylist(selectedPlaylistId, postForSaving);
        
        // Track save engagement
        await trackSaveEngagement(postForSaving.id);
        
        if (onSave) {
          onSave({
            playlistId: selectedPlaylistId,
            playlistTitle: result.title || 'Playlist',
            isNewPlaylist: false
          });
        }
        
      } else {
        throw new Error('Please select a playlist or create a new one');
      }
      
      // Close the modal on success
      onClose();
    } catch (error) {
      console.error('Error saving post to playlist:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2>Save Post</h2>
          <button className={styles.closeButton} onClick={onClose} disabled={loading}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        <div className={styles.modalBody}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p>Loading playlists...</p>
            </div>
          ) : (
            <>
              <p className={styles.promptText}>Choose a playlist to save this post to:</p>
              
              <div className={styles.playlistsList}>
                {playlists.length > 0 ? (
                  playlists.map(playlist => (
                    <div 
                      key={playlist.id} 
                      className={`${styles.playlistItem} ${selectedPlaylistId === playlist.id ? styles.selected : ''}`}
                      onClick={() => handlePlaylistSelect(playlist.id)}
                    >
                      <div className={styles.playlistImageContainer}>
                        <img 
                          src={playlist.imageSrc || '/api/placeholder/50/50'} 
                          alt={playlist.title}
                          className={styles.playlistImage}
                        />
                      </div>
                      <div className={styles.playlistInfo}>
                        <h3>{playlist.title}</h3>
                        <p>{playlist.videoCount}</p>
                      </div>
                      {selectedPlaylistId === playlist.id && (
                        <div className={styles.selectedIndicator}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className={styles.noPlaylistsMessage}>You don't have any playlists yet. Create one to save this post.</p>
                )}
              </div>
              
              <div className={styles.divider}>
                <span>OR</span>
              </div>
              
              {isCreatingNew ? (
                <div className={styles.newPlaylistForm}>
                  <label htmlFor="newPlaylistTitle">New Playlist Title</label>
                  <input
                    type="text"
                    id="newPlaylistTitle"
                    placeholder="Enter playlist title"
                    value={newPlaylistTitle}
                    onChange={(e) => setNewPlaylistTitle(e.target.value)}
                    className={styles.input}
                  />
                </div>
              ) : (
                <button 
                  className={styles.createNewButton}
                  onClick={handleNewPlaylistToggle}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Create New Playlist
                </button>
              )}
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button 
            className={styles.cancelButton}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className={styles.saveButton}
            onClick={handleSaveToPlaylist}
            disabled={loading || (!selectedPlaylistId && !(isCreatingNew && newPlaylistTitle.trim()))}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}