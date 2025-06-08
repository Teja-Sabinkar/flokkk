'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import Header from '@/components/layout/Header/Header';
import SidebarNavigation from '@/components/layout/SidebarNavigation/SidebarNavigation';
import styles from './page.module.css';

export default function AboutPage() {
    const { theme, isLoading: themeLoading } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [user, setUser] = useState(null);

    // Fetch user data
    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('token');

            if (token) {
                try {
                    const response = await fetch('/api/auth/me', {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        const userData = await response.json();
                        userData.avatar = userData.avatar || userData.profilePicture || null;

                        if (!userData.username && userData.name) {
                            userData.username = userData.name;
                        }

                        setUser(userData);
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                }
            }
        };

        fetchUserData();
    }, []);

    // User fallback
    const userWithFallback = user || {
        name: 'Guest',
        username: 'Guest',
        avatar: null,
        notifications: 0
    };

    // Handle sidebar toggle
    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // Handle overlay click to close sidebar
    const handleOverlayClick = () => {
        setIsSidebarOpen(false);
    };

    // Show loading screen while theme is loading
    if (themeLoading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            {/* Header */}
            <div className={styles.headerContainer}>
                <Header
                    user={userWithFallback}
                    onMenuToggle={toggleSidebar}
                    isMobileMenuOpen={isSidebarOpen}
                />
            </div>

            {/* Main content area */}
            <div className={styles.mainContent}>
                {/* Left sidebar */}
                <div className={`${styles.sidebarContainer} ${isSidebarOpen ? styles.open : ''}`}>
                    <div className={styles.sidebarScrollable}>
                        <SidebarNavigation isOpen={isSidebarOpen} />
                    </div>
                </div>

                {/* Mobile overlay */}
                {isSidebarOpen && (
                    <div
                        className={styles.mobileOverlay}
                        onClick={handleOverlayClick}
                    />
                )}

                {/* About content */}
                <div className={styles.aboutContainer}>
                    <div className={styles.aboutContent}>
                        {/* Hero Section */}
                        <section className={styles.heroSection}>
                            <div className={styles.welcomeLogoContainer}>
                                <svg width="120" height="120" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={styles.welcomeLogo}>
                                    <defs>
                                        <linearGradient id="aboutLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" style={{ stopColor: "#4f46e5", stopOpacity: 1 }} />
                                            <stop offset="100%" style={{ stopColor: "#06b6d4", stopOpacity: 1 }} />
                                        </linearGradient>
                                    </defs>

                                    {/* Rounded rectangle background */}
                                    <rect x="15" y="15" width="170" height="170" rx="35" ry="35" fill="url(#aboutLogoGradient)" />

                                    {/* Main vertical line (left) */}
                                    <rect x="40" y="40" width="20" height="120" fill="white" rx="10" className={`${styles.pulsingLine} ${styles.line1}`} />

                                    {/* Top horizontal line */}
                                    <rect x="40" y="40" width="120" height="20" fill="white" rx="10" className={`${styles.pulsingLine} ${styles.line2}`} />

                                    {/* Middle horizontal line (shorter) */}
                                    <rect x="90" y="85" width="70" height="20" fill="white" rx="10" className={`${styles.pulsingLine} ${styles.line3}`} />

                                    {/* Small square/dot bottom right */}
                                    <rect x="125" y="125" width="25" height="25" fill="white" rx="6" className={`${styles.pulsingLine} ${styles.line4}`} />
                                </svg>
                            </div>
                            <h1 className={styles.logoHeading}>flokkk</h1>
                            <h1 className={styles.heroTitle}>
                                Curating Information You Can Trust
                            </h1>
                            <p className={styles.heroSubtitle}>
                                A human-first, community-curated discovery platform for meaningful learning
                            </p>
                        </section>

                        {/* Mission Statement */}
                        <section className={styles.missionSection}>
                            <div className={styles.contentBlock}>
                                <h2 className={styles.sectionTitle}>Our Mission</h2>
                                <p className={styles.missionText}>
                                    Flokkk is rebuilding trust in digital learning. We're creating a human-first,
                                    community-curated discovery platform where people find the most valuable resources
                                    on any topic—through collective intelligence, not algorithmic guesswork.
                                </p>
                            </div>
                        </section>

                        {/* How It Works */}
                        <section className={styles.featuresSection}>
                            <h2 className={styles.sectionTitle}>How Flokkk Works</h2>

                            <div className={styles.featuresGrid}>
                                <div className={styles.featureCard}>
                                    <div className={styles.featureIcon}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="9" cy="7" r="4"></circle>
                                            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                        </svg>
                                    </div>
                                    <h3 className={styles.featureTitle}>Community Curation</h3>
                                    <p className={styles.featureDescription}>
                                        Users contribute, vote, and discuss the best content—starting with YouTube
                                        and expanding to major platforms—turning scattered content into structured,
                                        peer-endorsed knowledge hubs.
                                    </p>
                                </div>

                                <div className={styles.featureCard}>
                                    <div className={styles.featureIcon}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                            <path d="M9 12l2 2 4-4"></path>
                                        </svg>
                                    </div>
                                    <h3 className={styles.featureTitle}>Transparent Vetting</h3>
                                    <p className={styles.featureDescription}>
                                        Every link is vetted, every recommendation transparent. No hidden algorithms—
                                        just honest peer review from real learners and subject-matter experts.
                                    </p>
                                </div>

                                <div className={styles.featureCard}>
                                    <div className={styles.featureIcon}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                            <path d="M10 7.5h4"></path>
                                            <path d="M10 12h4"></path>
                                            <path d="M10 16.5h4"></path>
                                        </svg>
                                    </div>
                                    <h3 className={styles.featureTitle}>AI-Powered Insights</h3>
                                    <p className={styles.featureDescription}>
                                        Our AI assistant doesn't just scrape the web—it ranks and serves resources
                                        based on what real learners have found useful. Better learning decisions, faster.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Vision Section */}
                        <section className={styles.visionSection}>
                            <div className={styles.contentBlock}>
                                <h2 className={styles.sectionTitle}>Our Vision</h2>
                                <p className={styles.visionText}>
                                    We're transforming shallow content consumption into informed, intentional learning.
                                    By combining human wisdom with intelligent technology, we're building a future where
                                    quality education is accessible, transparent, and truly valuable.
                                </p>
                            </div>
                        </section>

                        {/* Call to Action */}
                        <section className={styles.ctaSection}>
                            <div className={styles.ctaContent}>
                                <h2 className={styles.ctaTitle}>Join the Learning Revolution</h2>
                                <p className={styles.ctaDescription}>
                                    Be part of a community that values quality over quantity,
                                    depth over algorithms, and human insight over automated recommendations.
                                </p>
                                <div className={styles.ctaButtons}>
                                    <a href="/home" className={styles.primaryButton}>
                                        Start Learning
                                    </a>
                                    <a href="/explore" className={styles.secondaryButton}>
                                        Explore Content
                                    </a>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}