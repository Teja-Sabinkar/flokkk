// src/components/explore/CategorySection.js
import { useRef, useEffect } from 'react';
import styles from './CategorySection.module.css';

const CategorySection = ({ categories, activeCategory, onCategoryChange }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    // Log to confirm component is rendering
    console.log('CategorySection rendering with active category:', activeCategory);
  }, [activeCategory]);

  // Make sure the component renders even if categories array is empty
  const displayCategories = categories && categories.length > 0 ? categories : [];

  return (
    <div className={styles.container}>
      {/* Debug message that will show if categories are missing */}
      {displayCategories.length === 0 && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          Warning: No categories provided to CategorySection
        </div>
      )}
      
      {/* Add padding-bottom to make room for the scrollbar */}
      <div 
        className={styles.categoriesScroll} 
        ref={scrollRef}
        style={{ paddingBottom: '12px' }} // Add padding to ensure scrollbar is visible
      >
        <div className={styles.categoriesWrapper}>
          {displayCategories.map((category) => (
            <button
              key={category.id}
              className={`${styles.categoryCard} ${activeCategory === category.title ? styles.active : ''}`}
              onClick={() => onCategoryChange(category.title)}
            >
              <div className={styles.iconContainer}>
                {category.icon}
              </div>
              <span className={styles.categoryTitle}>{category.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategorySection;