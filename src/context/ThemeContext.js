'use client';

import { createContext, useContext, useState, useEffect } from 'react';

// Create the context
const ThemeContext = createContext(null);

// Provider component
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize theme on component mount
  useEffect(() => {
    // Try to get theme from localStorage first for instant rendering
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Then fetch from API if user is logged in
    const fetchThemeFromAPI = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/settings/display', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.displaySettings?.theme) {
            setTheme(data.displaySettings.theme);
            document.documentElement.setAttribute('data-theme', data.displaySettings.theme);
            localStorage.setItem('theme', data.displaySettings.theme);
          }
        }
      } catch (error) {
        console.error('Error fetching theme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThemeFromAPI();
  }, []);

  // Toggle theme function
  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    
    // Update state and DOM immediately
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update in database if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await fetch('/api/settings/display', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            displaySettings: {
              theme: newTheme
            }
          })
        });
      } catch (error) {
        console.error('Error updating theme setting:', error);
      }
    }
  };

  const value = {
    theme,
    toggleTheme,
    isLoading
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Custom hook to use the context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined || context === null) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}