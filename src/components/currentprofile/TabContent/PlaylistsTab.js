'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PlaylistsTabDiscussions from './PlaylistsTabDiscussions';
import PlaylistEditModal from './PlaylistEditModal';
import PlaylistDeleteModal from './PlaylistDeleteModal'; // Import the delete modal
import styles from './PlaylistsTab.module.css';
import { getPlaylists, subscribeToPlaylists } from '@/lib/playlists';


const PlaylistCard = ({ playlist, onClick, onEdit, onDelete }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Menu option handlers
  const handleEdit = (e) => {
    e.stopPropagation(); // Prevent card click when menu item is clicked
    setIsMenuOpen(false);
    onEdit(playlist); // Call the onEdit prop function with the playlist
  };

  const handleDelete = (e) => {
    e.stopPropagation(); // Prevent card click when menu item is clicked
    setIsMenuOpen(false);
    onDelete(playlist); // Call the onDelete prop function with the playlist
  };

  // Handle menu button click without triggering card click
  const handleMenuClick = (e) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className={styles.postCard} onClick={() => onClick(playlist)}>
      <div className={styles.postHeader}>
        <div className={styles.playlistTitle}>
          <h3>{playlist.title}</h3>
        </div>
        
        <div className={styles.menuContainer} ref={menuRef}>
          <button
            className={styles.postMenu}
            aria-label="Playlist menu"
            onClick={handleMenuClick}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>
          
          {isMenuOpen && (
            <div className={styles.dropdown}>
              <button 
                className={styles.dropdownItem}
                onClick={handleEdit}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Edit</span>
              </button>
              <button 
                className={styles.dropdownItem}
                onClick={handleDelete}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.postImageContainer}>
        <div className={styles.postImageWrapper}>
          <Image 
            src={playlist.imageSrc}
            alt={playlist.title}
            width={600}
            height={300}
            className={styles.postImage}
          />
          <div className={styles.forumCount}>{playlist.videoCount}</div>
        </div>
      </div>
      
      <div className={styles.postEngagement}>
        <div className={styles.playlistUpdate}>
          Updated {playlist.updatedAt}
        </div>
        
        
      </div>
    </div>
  );
};

const PlaylistsTab = () => {
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); // New state for delete modal
  const [playlistToEdit, setPlaylistToEdit] = useState(null);
  const [playlistToDelete, setPlaylistToDelete] = useState(null); // New state for playlist to delete
  
  // Fetch playlists from API
  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const playlistsData = await getPlaylists();
      setPlaylists(playlistsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching playlists:', err);
      setError('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data load
  useEffect(() => {
    fetchPlaylists();
    
    // Listen for playlist updates
    const handlePlaylistUpdate = () => {
      fetchPlaylists();
    };
    
    // Subscribe to playlist changes
    window.addEventListener('playlist-updated', handlePlaylistUpdate);
    
    return () => {
      window.removeEventListener('playlist-updated', handlePlaylistUpdate);
    };
  }, []);

  // Handle playlist card click
  const handlePlaylistClick = (playlist) => {
    setSelectedPlaylist(playlist);
  };

  // Return to playlists view
  const handleBackToPlaylists = () => {
    setSelectedPlaylist(null);
    // Refresh playlists when returning to the list view
    fetchPlaylists();
  };

  // Handle edit button click
  const handleEditClick = (playlist) => {
    setPlaylistToEdit(playlist);
    setIsEditModalOpen(true);
  };

  // Handle delete button click
  const handleDeleteClick = (playlist) => {
    setPlaylistToDelete(playlist);
    setIsDeleteModalOpen(true);
  };

  // Handle save in edit modal
  const handleSaveEdit = (updatedPlaylist) => {
    // Update playlists list with the updated playlist
    setPlaylists(prevPlaylists => 
      prevPlaylists.map(p => 
        p.id === updatedPlaylist.id ? updatedPlaylist : p
      )
    );
    
    // If the edited playlist is currently selected, update it as well
    if (selectedPlaylist && selectedPlaylist.id === updatedPlaylist.id) {
      setSelectedPlaylist(updatedPlaylist);
    }
    
    // Close the modal
    setIsEditModalOpen(false);
    setPlaylistToEdit(null);
  };

  // Handle delete in delete modal
  const handleDeleteConfirm = (playlistId) => {
    // Remove the deleted playlist from the playlists array
    setPlaylists(prevPlaylists => 
      prevPlaylists.filter(p => p.id !== playlistId)
    );
    
    // If the deleted playlist is currently selected, go back to playlists view
    if (selectedPlaylist && selectedPlaylist.id === playlistId) {
      setSelectedPlaylist(null);
    }
    
    // Dispatch an event for playlist update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('playlist-updated'));
    }
    
    // Close the modal
    setIsDeleteModalOpen(false);
    setPlaylistToDelete(null);
  };

  // Render playlists or discussions based on selection
  if (selectedPlaylist) {
    return <PlaylistsTabDiscussions playlist={selectedPlaylist} onBack={handleBackToPlaylists} />;
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading playlists...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorMessage}>
        <p>{error}</p>
        <button onClick={fetchPlaylists} className={styles.retryButton}>Retry</button>
      </div>
    );
  }

  return (
    <div className={styles.playlistsTabContainer}>
      {playlists.length > 0 ? (
        playlists.map(playlist => (
          <PlaylistCard 
            key={playlist.id} 
            playlist={playlist} 
            onClick={handlePlaylistClick}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
        ))
      ) : (
        <div className={styles.emptyState}>
          <p>You don't have any playlists yet.</p>
          <p>Create playlists to organize your favorite posts.</p>
        </div>
      )}

      {/* Playlist Edit Modal */}
      <PlaylistEditModal 
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setPlaylistToEdit(null);
        }}
        playlist={playlistToEdit}
        onSave={handleSaveEdit}
      />

      {/* Playlist Delete Modal */}
      <PlaylistDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setPlaylistToDelete(null);
        }}
        playlist={playlistToDelete}
        onDelete={handleDeleteConfirm}
      />
    </div>
  );
};

export default PlaylistsTab;