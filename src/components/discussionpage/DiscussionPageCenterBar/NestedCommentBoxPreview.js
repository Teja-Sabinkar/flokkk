import React, { useState, useRef, useEffect } from 'react';
import styles from './NestedCommentBoxPreview.module.css';

// Clean HTML entities and trailing spaces from content
const cleanContentForSubmission = (content) => {
  if (!content) return '';
  
  // Replace visible &nbsp; text with spaces
  let cleaned = content.replace(/&nbsp;/g, ' ');
  
  // Replace actual HTML entity non-breaking spaces with regular spaces
  cleaned = cleaned.replace(/\u00A0/g, ' ');
  
  // Trim trailing spaces
  cleaned = cleaned.trim();
  
  return cleaned;
};

const NestedCommentBoxPreview = ({ onChange, onSubmit, parentCommentId }) => {
  // Track whether editor has content
  const [hasContent, setHasContent] = useState(false);
  // Track editor content
  const [editorContent, setEditorContent] = useState('');
  // Reference to the editor div
  const editorRef = useRef(null);
  // Track active formatting
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false
  });

  // Check for active formats when selection changes
  const checkActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough')
    });
  };

  // Handle content change
  const handleContentChange = (event) => {
    const content = event.target.innerHTML;
    setEditorContent(content);

    // Update content state
    setHasContent(content.trim().length > 0);

    if (onChange) {
      onChange(content);
    }
  };

  // Handle submit button click
  const handleSubmit = () => {
    if (!editorContent.trim()) {
      console.warn('Cannot submit empty comment');
      return;
    }
  
    console.log('Submitting nested reply:', editorContent);
    console.log('Parent comment ID:', parentCommentId);
  
    if (onSubmit) {
      try {
        // Clean content before submitting
        const cleanedContent = cleanContentForSubmission(editorContent);
        
        // Pass the cleaned content and parent comment ID
        onSubmit(cleanedContent, parentCommentId);
  
        // Clear editor
        if (editorRef.current) {
          editorRef.current.innerHTML = '';
        }
        setEditorContent('');
        setHasContent(false);
      } catch (error) {
        console.error('Error submitting reply:', error);
        alert('Error submitting reply. Please try again.');
      }
    }
  };

  // Apply formatting
  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);

    // Update content state after format is applied
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML);
      setHasContent(editorRef.current.innerHTML.trim().length > 0);
    }

    // Check active formats after applying format
    checkActiveFormats();

    // Return focus to editor
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle selection change to update format states
  const handleSelectionChange = () => {
    checkActiveFormats();
  };

  // Add event listener for selection change
  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button
          className={`${styles.button} ${activeFormats.bold ? styles.activeButton : ''}`}
          onClick={() => applyFormat('bold')}
          type="button"
        >
          <strong>B</strong>
        </button>
        <button
          className={`${styles.button} ${activeFormats.italic ? styles.activeButton : ''}`}
          onClick={() => applyFormat('italic')}
          type="button"
        >
          <em>I</em>
        </button>
        <button
          className={`${styles.button} ${activeFormats.underline ? styles.activeButton : ''}`}
          onClick={() => applyFormat('underline')}
          type="button"
        >
          <span style={{ textDecoration: 'underline' }}>U</span>
        </button>
        <button
          className={`${styles.button} ${activeFormats.strikeThrough ? styles.activeButton : ''}`}
          onClick={() => applyFormat('strikeThrough')}
          type="button"
        >
          <span style={{ textDecoration: 'line-through' }}>S</span>
        </button>
        <button
          className={styles.button}
          onClick={() => {
            const url = prompt('Enter URL:', 'https://');
            if (url) applyFormat('createLink', url);
          }}
          type="button"
        >
          🔗
        </button>
      </div>

      <div
        ref={editorRef}
        className={styles.editor}
        contentEditable="true"
        onInput={handleContentChange}
        onBlur={handleContentChange}
        onKeyDown={handleKeyDown}
        data-placeholder="What are your thoughts?"
        onFocus={checkActiveFormats}
      />

      <div className={styles.buttonContainer}>
        <button
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={!hasContent}
          type="button"
        >
          Reply
        </button>
      </div>
    </div>
  );
};

export default NestedCommentBoxPreview;