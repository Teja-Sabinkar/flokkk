'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserProvider } from '@/context/UserContext';
import { ThemeProvider } from '@/context/ThemeContext';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState('guest'); // 'guest', 'unverified', or 'verified'
  const [mcpInitialized, setMcpInitialized] = useState(false);
  const [mcpError, setMcpError] = useState(null);

  // Initial theme setup from localStorage before providers are loaded
  useEffect(() => {
    // MODIFIED: Ensure theme is properly restored when entering dashboard
    // This handles cases where user came from login page (which forces light theme)
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Small delay to ensure theme is applied before showing content
    const timeoutId = setTimeout(() => {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // MCP System Initialization (Client-Side Safe)
  useEffect(() => {
    const initializeMCPSystem = async () => {
      // Only initialize once per session
      const hasInitialized = sessionStorage.getItem('mcp-initialized');
      if (hasInitialized && !mcpError) {
        console.log('🔄 MCP system already initialized this session');
        setMcpInitialized(true);
        return;
      }

      try {
        console.log('🚀 Initializing MCP system via API...');
        
        // Call the MCP initialization API
        const response = await fetch('/api/mcp/init', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'MCP initialization failed');
        }
        
        // Mark as initialized
        sessionStorage.setItem('mcp-initialized', 'true');
        setMcpInitialized(true);
        setMcpError(null);
        
        console.log('✅ MCP system initialization complete:', data.message);
        
      } catch (error) {
        console.error('❌ MCP system initialization failed:', error);
        setMcpError(error.message);
        
        // Don't mark as initialized if it failed
        sessionStorage.removeItem('mcp-initialized');
        
        // Show error to user but don't block the app
        setTimeout(() => {
          setMcpError(null);
        }, 10000); // Clear error after 10 seconds
      }
    };

    // Initialize MCP system
    initializeMCPSystem();
  }, [mcpError]); // Re-run if there was an error

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    
    // Handle public routes that don't require authentication
    const publicRoutes = ['/home', '/explore', '/discussion'];
    const currentPath = window.location.pathname;
    
    const isPublicRoute = publicRoutes.some(route => 
      currentPath === route || 
      (route !== '/home' && currentPath.startsWith(route))
    );
    
    if (!token) {
      if (isPublicRoute) {
        // Allow access to public routes without authentication
        setAuthStatus('guest');
        setIsLoading(false);
      } else {
        // Redirect to login for protected routes
        router.push('/login');
        return;
      }
    } else {
      // Token exists, check verification status
      fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        return response.json();
      })
      .then(userData => {
        // Set auth status based on verification
        setAuthStatus(userData.isVerified ? 'verified' : 'unverified');
        
        // Store verification status in localStorage for utility functions
        localStorage.setItem('isVerified', userData.isVerified);
        
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching user data:', error);
        // Handle invalid token by clearing it and redirecting
        localStorage.removeItem('token');
        router.push('/login');
      });
    }
  }, [router]);

  if (isLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary, #0f0f0f)',
        color: 'var(--text-tertiary, #aaaaaa)',
      }}>
        <p>Loading...</p>
        {!mcpInitialized && (
          <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
            Initializing systems...
          </p>
        )}
      </div>
    );
  }

  return (
    <UserProvider>
      <ThemeProvider>
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--bg-primary)',
          overflow: 'hidden',
          transition: 'background-color 0.3s ease'
        }}>
          {/* MCP Error Banner */}
          {mcpError && (
            <div style={{
              backgroundColor: '#dc2626',
              color: '#ffffff',
              padding: '8px 16px',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '13px',
              width: '100%',
              zIndex: 1001,
            }}>
              ⚠️ System initialization error: {mcpError}
              <button 
                style={{
                  marginLeft: '10px',
                  background: '#ffffff',
                  color: '#dc2626',
                  border: 'none',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                onClick={() => {
                  sessionStorage.removeItem('mcp-initialized');
                  window.location.reload();
                }}
              >
                Retry
              </button>
            </div>
          )}


          
          {children}
        </div>
      </ThemeProvider>
    </UserProvider>
  );
}