import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext'; // Add theme context import
import RecentlyViewedItem from './RecentlyViewedItem';
import styles from './RecentlyViewedContainer.module.css';

const RecentlyViewedContainer = ({ items: initialItems, viewMode = 'grid' }) => {
  const { theme } = useTheme(); // Add theme context
  const [items, setItems] = useState(initialItems || []);
  const [hiddenItemIds, setHiddenItemIds] = useState([]);
  
  // Update items when props change
  useEffect(() => {
    setItems(initialItems || []);
  }, [initialItems]);
  
  // Fetch hidden posts on mount
  useEffect(() => {
    const fetchHiddenPosts = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      try {
        const response = await fetch('/api/posts/hidden', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const hiddenIds = data.hiddenPosts.map(hp => hp.postId);
          setHiddenItemIds(hiddenIds);
          
          // Filter out already hidden items
          if (hiddenIds.length > 0) {
            setItems(current => 
              current.filter(item => {
                const itemId = item.id || item._id;
                return !hiddenIds.includes(itemId?.toString());
              })
            );
          }
        }
      } catch (error) {
        console.error('Error fetching hidden posts:', error);
      }
    };
    
    fetchHiddenPosts();
  }, []);
  
  // Handle hiding an item
  const handleHideItem = (itemId) => {
    // Add to local hidden items
    setHiddenItemIds(prev => [...prev, itemId]);
    
    // Remove the item from the UI
    setItems(prev => 
      prev.filter(item => {
        const id = item.id || item._id;
        return id !== itemId;
      })
    );
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.itemsContainer} ${viewMode === 'list' ? styles.listView : styles.gridView}`}>
        {items && items.length > 0 ? (
          items.map((item, index) => {
            // Ensure the item has all necessary properties including videoUrl
            const formattedItem = {
              ...item,
              videoUrl: item.videoUrl || null // Ensure videoUrl is passed
            };
            
            return (
              <RecentlyViewedItem 
                key={item.id || item._id || index} 
                item={formattedItem} 
                viewMode={viewMode}
                onHideItem={handleHideItem}
              />
            );
          })
        ) : (
          <p className={styles.noItems}>No recently viewed items</p>
        )}
      </div>
    </div>
  );
};

export default RecentlyViewedContainer;