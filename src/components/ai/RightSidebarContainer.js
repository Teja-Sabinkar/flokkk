// src/components/ai/RightSidebarContainer.js - Unified smooth transitions
import { useRef, useState, useEffect } from 'react';
import ClaudeSidebar from './ClaudeSidebar';
import styles from './RightSidebarContainer.module.css';

export default function RightSidebarContainer({ 
  user, 
  isRightSidebarVisible = true, 
  isMobileView = false 
}) {
  const [isResizing, setIsResizing] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(330);
  const [initialX, setInitialX] = useState(0);
  const [initialWidth, setInitialWidth] = useState(0);
  
  const containerRef = useRef(null);

  // Update CSS variable when sidebar width changes
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${rightSidebarWidth}px`);
  }, [rightSidebarWidth]);

  // Resize functionality for right sidebar
  const startResizing = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Store initial positions
    setInitialX(e.clientX);
    setInitialWidth(rightSidebarWidth);

    // Update state
    setIsResizing(true);

    // Apply global styles
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    // Add a debug class to the body
    document.body.classList.add('resizing-active');
  };

  // Listen for mouse events during resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      // Calculate the width from the window width, not relative to the parent
      const windowWidth = window.innerWidth;
      const newWidth = windowWidth - e.clientX;

      // Apply constraints
      const minWidth = 250;
      const maxWidth = Math.min(600, windowWidth * 0.4);
      const constrainedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);

      // Update state
      setRightSidebarWidth(constrainedWidth);

      // Store the width in localStorage
      localStorage.setItem('rightSidebarWidth', constrainedWidth.toString());
    };

    const handleMouseUp = () => {
      if (!isResizing) return;

      // Clean up
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.classList.remove('resizing-active');
    };

    // Only add listeners when resizing is active
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    // Clean up
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, rightSidebarWidth]);

  // Load saved width on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem('rightSidebarWidth');
    if (savedWidth) {
      setRightSidebarWidth(Number(savedWidth));
    }
  }, []);

  // Dynamic inline styles for width (only when resizing in desktop)
  const containerStyle = (!isMobileView && isRightSidebarVisible && isResizing) ? {
    width: `${rightSidebarWidth}px`,
  } : {};

  return (
    <div
      className={`${styles.rightSidebarContainer} ${isRightSidebarVisible ? styles.visible : styles.hidden}`}
      ref={containerRef}
      style={containerStyle}
      data-width={rightSidebarWidth}
    >
      {/* Resize handle - only show when sidebar is visible and not mobile */}
      {isRightSidebarVisible && !isMobileView && (
        <div
          className={`${styles.resizeHandle} ${isResizing ? styles.isResizing : ''}`}
          onMouseDown={startResizing}
          title="Drag to resize"
        >
          <div className={styles.resizeBar}></div>
        </div>
      )}

      <ClaudeSidebar 
        user={user}
        containerRef={containerRef}
        rightSidebarWidth={rightSidebarWidth}
        isResizing={isResizing}
        startResizing={startResizing}
      />
    </div>
  );
}