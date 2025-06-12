'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import Header from '@/components/layout/Header/Header';
import SidebarNavigation from '@/components/layout/SidebarNavigation/SidebarNavigation';
import Image from 'next/image';
import styles from './page.module.css';

export default function HelpPage() {
    const { theme, isLoading: themeLoading } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [user, setUser] = useState(null);
    
    // State for accordion sections
    const [expandedSections, setExpandedSections] = useState({
        gettingStarted: false,
        discussionFeatures: false,
        profileManagement: false
    });

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

    // Toggle accordion sections
    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
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

                {/* Help content */}
                <div className={styles.helpContainer}>
                    <div className={styles.helpContent}>
                        {/* Hero Section */}
                        <section className={styles.heroSection}>
                            <h1 className={styles.heroTitle}>How to Use Flokkk</h1>
                            <p className={styles.heroSubtitle}>
                                Your complete guide to mastering community-curated content discovery
                            </p>
                        </section>

                        {/* Table of Contents */}
                        <section className={styles.tocSection}>
                            <div className={styles.tocContainer}>
                                <h2 className={styles.tocTitle}>Quick Navigation</h2>
                                <div className={styles.accordionContainer}>
                                    
                                    {/* Getting Started Section */}
                                    <div className={styles.accordionItem}>
                                        <button 
                                            className={styles.accordionHeader}
                                            onClick={() => toggleSection('gettingStarted')}
                                        >
                                            <span>Getting Started</span>
                                            <svg 
                                                className={`${styles.accordionArrow} ${expandedSections.gettingStarted ? styles.expanded : ''}`}
                                                xmlns="http://www.w3.org/2000/svg" 
                                                width="16" 
                                                height="16" 
                                                viewBox="0 0 24 24" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                strokeWidth="2" 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round"
                                            >
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                        </button>
                                        {expandedSections.gettingStarted && (
                                            <div className={styles.accordionContent}>
                                                <ul>
                                                    <li><a href="#create-post">Creating Your First Post</a></li>
                                                    <li><a href="#post-details">Adding Content Details</a></li>
                                                    <li><a href="#hashtags">Using Hashtags</a></li>
                                                    <li><a href="#creator-links">Adding Creator Links</a></li>
                                                    <li><a href="#community-links">Community Contributions</a></li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Discussion Features Section */}
                                    <div className={styles.accordionItem}>
                                        <button 
                                            className={styles.accordionHeader}
                                            onClick={() => toggleSection('discussionFeatures')}
                                        >
                                            <span>Discussion Features</span>
                                            <svg 
                                                className={`${styles.accordionArrow} ${expandedSections.discussionFeatures ? styles.expanded : ''}`}
                                                xmlns="http://www.w3.org/2000/svg" 
                                                width="16" 
                                                height="16" 
                                                viewBox="0 0 24 24" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                strokeWidth="2" 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round"
                                            >
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                        </button>
                                        {expandedSections.discussionFeatures && (
                                            <div className={styles.accordionContent}>
                                                <ul>
                                                    <li><a href="#discussion-page">Discussion Page Layout</a></li>
                                                    <li><a href="#managing-links">Managing Links</a></li>
                                                    <li><a href="#community-contributions">Community Contributions</a></li>
                                                    <li><a href="#commenting">Commenting & Interaction</a></li>
                                                    <li><a href="#ai-assistant">Using AI Assistant</a></li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Profile Management Section */}
                                    <div className={styles.accordionItem}>
                                        <button 
                                            className={styles.accordionHeader}
                                            onClick={() => toggleSection('profileManagement')}
                                        >
                                            <span>Profile & Content Management</span>
                                            <svg 
                                                className={`${styles.accordionArrow} ${expandedSections.profileManagement ? styles.expanded : ''}`}
                                                xmlns="http://www.w3.org/2000/svg" 
                                                width="16" 
                                                height="16" 
                                                viewBox="0 0 24 24" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                strokeWidth="2" 
                                                strokeLinecap="round" 
                                                strokeLinejoin="round"
                                            >
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                        </button>
                                        {expandedSections.profileManagement && (
                                            <div className={styles.accordionContent}>
                                                <ul>
                                                    <li><a href="#profile-tabs">Profile Organization</a></li>
                                                    <li><a href="#forums">Managing Forums</a></li>
                                                    <li><a href="#saved-content">Saved Content</a></li>
                                                    <li><a href="#community-posts">Community Posts</a></li>
                                                    <li><a href="#received-contributions">Managing Received Contributions</a></li>
                                                    <li><a href="#contributed-links">Tracking Your Contributions</a></li>
                                                    <li><a href="#studio">Studio & Analytics</a></li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>
                        </section>

                        {/* Getting Started Section */}
                        <section className={styles.guideSection} id="getting-started">
                            <h2 className={styles.sectionTitle}>Getting Started</h2>

                            <div className={styles.stepContainer} id="create-post">
                                <div className={styles.stepHeader}>
                                    <span className={styles.stepNumber}>1</span>
                                    <h3 className={styles.stepTitle}>Creating Your First Post</h3>
                                </div>
                                <div className={styles.stepContent}>
                                    <p className={styles.stepDescription}>
                                        Start your journey on Flokkk by creating engaging discussions. Click the "Create Discussion" button in the header or use the quick action from your home feed to begin sharing valuable content with the community.
                                    </p>
                                    <div className={styles.imageContainer}>
                                        <Image
                                            src="/help/step1-Create-Post.png"
                                            alt="How to create a new discussion post"
                                            width={800}
                                            height={500}
                                            className={styles.stepImage}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.stepContainer} id="post-details">
                                <div className={styles.stepHeader}>
                                    <span className={styles.stepNumber}>2</span>
                                    <h3 className={styles.stepTitle}>Adding Content Details</h3>
                                </div>
                                <div className={styles.stepContent}>
                                    <p className={styles.stepDescription}>
                                        Enhance your post by adding rich content. You can either paste a YouTube URL to automatically fetch video details, or manually enter a custom title and description. Don't forget to upload an engaging thumbnail to capture your audience's attention.
                                    </p>
                                    <div className={styles.imageContainer}>
                                        <Image
                                            src="/help/step2-Fetch,Custom details.png"
                                            alt="Adding YouTube links and custom content details"
                                            width={800}
                                            height={500}
                                            className={styles.stepImage}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.stepContainer} id="hashtags">
                                <div className={styles.stepHeader}>
                                    <span className={styles.stepNumber}>3</span>
                                    <h3 className={styles.stepTitle}>Using Hashtags Effectively</h3>
                                </div>
                                <div className={styles.stepContent}>
                                    <p className={styles.stepDescription}>
                                        Hashtags are essential for content discovery on Flokkk. Add relevant category hashtags like #Music, #Gaming, #Movies, #News, #Sports, #Learning, or #Fashion to help users find your content. Well-chosen hashtags significantly increase your post's visibility and engagement.
                                    </p>
                                    <div className={styles.imageContainer}>
                                        <Image
                                            src="/help/step3-Add-Hashtags.png"
                                            alt="Adding hashtags for better content categorization"
                                            width={800}
                                            height={500}
                                            className={styles.stepImage}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.stepContainer} id="creator-links">
                                <div className={styles.stepHeader}>
                                    <span className={styles.stepNumber}>4</span>
                                    <h3 className={styles.stepTitle}>Adding Creator Links</h3>
                                </div>
                                <div className={styles.stepContent}>
                                    <p className={styles.stepDescription}>
                                        Creator links are the backbone of valuable discussions. Add useful links related to your post topic - these could be articles, research papers, tools, or additional resources. Include descriptive titles and brief descriptions to help users understand the value of each link.
                                    </p>
                                    <div className={styles.imageContainer}>
                                        <Image
                                            src="/help/step4-Add-CreatorLinks.png"
                                            alt="Adding creator links to enhance post value"
                                            width={800}
                                            height={500}
                                            className={styles.stepImage}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.stepContainer} id="community-links">
                                <div className={styles.stepHeader}>
                                    <span className={styles.stepNumber}>5</span>
                                    <h3 className={styles.stepTitle}>Community Contribution Settings</h3>
                                </div>
                                <div className={styles.stepContent}>
                                    <p className={styles.stepDescription}>
                                        Decide whether to allow community contributions to your post. When enabled, other users can suggest relevant links that you can approve or decline. This setting cannot be changed after posting, so choose wisely. Enabling contributions often leads to richer, more comprehensive discussions.
                                    </p>
                                    <div className={styles.imageContainer}>
                                        <Image
                                            src="/help/step5-Add-CommunityLinks.png"
                                            alt="Configuring community contribution settings"
                                            width={800}
                                            height={500}
                                            className={styles.stepImage}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Discussion Features Section */}
                        <section className={styles.guideSection} id="discussion-features">
                            <h2 className={styles.sectionTitle}>Discussion Features</h2>

                            <div className={styles.stepContainer} id="discussion-page">
                                <div className={styles.stepHeader}>
                                    <span className={styles.stepNumber}>6</span>
                                    <h3 className={styles.stepTitle}>Understanding the Discussion Page</h3>
                                </div>
                                <div className={styles.stepContent}>
                                    <p className={styles.stepDescription}>
                                        The discussion page is thoughtfully designed with three sections: curated links on the left, main discussion in the center, and the Flokkk AI assistant on the right. This layout promotes focused learning while keeping valuable resources easily accessible.
                                    </p>
                                    <div className={styles.imageContainer}>
                                        <Image
                                            src="/help/step6-Discussionpage.png"
                                            alt="Overview of the discussion page layout"
                                            width={800}
                                            height={500}
                                            className={styles.stepImage}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.stepContainer} id="managing-links">
                                <div className={styles.stepHeader}>
                                    <span className={styles.stepNumber}>7</span>
                                    <h3 className={styles.stepTitle}>Managing Creator Links</h3>
                                </div>
                                <div className={styles.stepContent}>
                                    <p className={styles.stepDescription}>
                                        Forgot to add important links during post creation? No problem! You can add creator links directly from the discussion page or through your Studio dashboard. Keep your discussions valuable by continuously curating the best resources for your audience.
                                    </p>
                                    <div className={styles.imageContainer}>
                                        <Image
                                            src="/help/step7-DiscussionpageLeftbar-Creatorlinks.png"
                                            alt="Adding creator links from the discussion page"
                                            width={800}
                                            height={500}
                                            className={styles.stepImage}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.stepContainer} id="community-contributions">
                                <div className={styles.stepHeader}>
                                    <span className={styles.stepNumber}>8</span>
                                    <h3 className={styles.stepTitle}>Contributing to Community Discussions</h3>
                                </div>
                                <div className={styles.stepContent}>
                                    <p className={styles.stepDescription}>
                                        As a community member, you can contribute valuable links to other users' posts when they've enabled contributions. Use the "Contribute" button to suggest relevant resources. Your contributions help build comprehensive knowledge bases around important topics.
                                    </p>
                                    <div className={styles.imageContainer}>
                                        <Image
                                            src="/help/step8-DiscussionpageLeftbar-Communitylinks.png"
                                            alt="Contributing links to community discussions"
                                            width={800}
                                            height={500}
                                            className={styles.stepImage}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.stepContainer} id="following-requirement">
                                <div className={styles.stepHeader}>
                                    <span className={styles.stepNumber}>9</span>
                                    <h3 className={styles.stepTitle}>Following Users to Contribute</h3>
                                </div>
                                <div className={styles.stepContent}>
                                    <p className={styles.stepDescription}>
                                        To maintain quality and prevent spam, you must follow a user before contributing links to their posts. This creates a trusted community where meaningful connections drive valuable content curation.
                                    </p>
                                    <div className={styles.imageContainer}>
                                        <Image
                                            src="/help/step9-DiscussionpageLeftbar-Communitylinks.png"
                                            alt="Following users to enable link contributions"
                                            width={800}
                                            height={500}
                                            className={styles.stepImage}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.stepContainer} id="commenting">
                                <div className={styles.stepHeader}>
                                    <span className={styles.stepNumber}>10</span>
                                    <h3 className={styles.stepTitle}>Engaging Through Comments</h3>
                                </div>
                                <div className={styles.stepContent}>
                                    <p className={styles.stepDescription}>
                                        Use the comment section to share your thoughts, ask questions, and engage with the community. Rich text formatting tools help you create well-structured comments that contribute meaningfully to the discussion.
                                    </p>
                                    <div className={styles.imageContainer}>
                                        <Image
                                            src="/help/step10-DiscussionpageCenterbar.png"
                                            alt="Using the comment system for community interaction"
                                            width={800}
                                            height={500}
                                            className={styles.stepImage}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.stepContainer} id="ai-assistant">
                                <div className={styles.stepHeader}>
                                    <span className={styles.stepNumber}>11</span>
                                    <h3 className={styles.stepTitle}>Using the AI Assistant</h3>
                                </div>
                                <div className={styles.stepContent}>
                                    <p className={styles.stepDescription}>
                                        The Flokkk AI assistant, though in BETA, offers intelligent support by combining web data with our curated database. Ask topic-related questions to get contextual answers that complement the discussion. It's your personal research companion for deeper learning.
                                    </p>
                                    <div className={styles.imageContainer}>
                                        <Image
                                            src="/help/step11-DiscussionpageRightbar.png"
                                            alt="Interacting with the Flokkk AI assistant"
                                            width={800}
                                            height={500}
                                            className={styles.stepImage}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Profile Management Section */}
                        <section className={styles.guideSection} id="profile-management">
                            <h2 className={styles.sectionTitle}>Profile Management</h2>

                            <div className={styles.stepContainer} id="profile-tabs">
                                <div className={styles.stepHeader}>
                                    <span className={styles.stepNumber}>12</span>
                                    <h3 className={styles.stepTitle}>Organizing Your Profile</h3>
                                </div>
                                <div className={styles.stepContent}>
                                    <p className={styles.stepDescription}>
                                        Your profile's Home tab showcases all your published posts to visitors. This is your public portfolio where others can discover your contributions and expertise across different topics.
                                    </p>
                                    <div className={styles.imageContainer}>
                                        <Image
                                            src="/help/step12-CP-Hometab.png"
                                            alt="Managing posts in your profile home tab"
                                            width={800}
                                            height={500}
                                            className={styles.stepImage}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.stepContainer} id="forums">
                                <div className={styles.stepHeader}>
                                    <span className={styles.stepNumber}>13</span>
                                    <h3 className={styles.stepTitle}>Managing Forums</h3>
                                </div>
                                <div className={styles.stepContent}>
                                    <p className={styles.stepDescription}>
                                        Forums are public collections visible to your followers, perfect for grouping discussions by topic or category. Create themed forums to organize your content and make it easier for your audience to find discussions on specific subjects.
                                    </p>
                                    <div className={styles.imageContainer}>
                                        <Image
                                            src="/help/step13-CP-Forumtab.png"
                                            alt="Managing public forums for followers"
                                            width={800}
                                            height={500}
                                            className={styles.stepImage}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.stepContainer} id="saved-content">
                                <div className={styles.stepHeader}>
                                    <span className={styles.stepNumber}>14</span>
                                    <h3 className={styles.stepTitle}>Saved Content</h3>
                                </div>
                                <div className={styles.stepContent}>
                                    <p className={styles.stepDescription}>
                                        Your Saved tab is your private bookmark space - save any interesting posts for later viewing without others seeing your saved items. This is perfect for building your personal knowledge library and revisiting valuable discussions.
                                    </p>
                                    <div className={styles.imageContainer}>
                                        <Image
                                            src="/help/step14-CP-Savedtab.png"
                                            alt="Managing private saved content"
                                            width={800}
                                            height={500}
                                            className={styles.stepImage}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.stepContainer} id="community-posts">
                                <div className={styles.stepHeader}>
                                    <span className={styles.stepNumber}>15</span>
                                    <h3 className={styles.stepTitle}>Community Posts</h3>
                                </div>
                                <div className={styles.stepContent}>
                                    <p className={styles.stepDescription}>
                                        Keep your community engaged with regular updates through Community posts. These shorter-form posts are perfect for sharing quick thoughts, updates, or interesting finds that don't require full discussion threads.
                                    </p>
                                    <div className={styles.imageContainer}>
                                        <Image
                                            src="/help/step15-CP-Communitytab.png"
                                            alt="Creating and managing community posts"
                                            width={800}
                                            height={500}
                                            className={styles.stepImage}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Community Interaction Section */}
                        <section className={styles.guideSection} id="community-interaction">
                            <h2 className={styles.sectionTitle}>Community Interaction</h2>

                            <div className={styles.stepContainer} id="received-contributions">
                                <div className={styles.stepHeader}>
                                    <span className={styles.stepNumber}>16</span>
                                    <h3 className={styles.stepTitle}>Managing Received Contributions</h3>
                                </div>
                                <div className={styles.stepContent}>
                                    <p className={styles.stepDescription}>
                                        The "Received" section in your Contributions tab shows link suggestions from your followers that you can approve or decline. Review each contribution carefully to maintain the quality and relevance of your discussions before approving them to appear in your posts.
                                    </p>
                                    <div className={styles.imageContainer}>
                                        <Image
                                            src="/help/step16-CP-Contributionstab.png"
                                            alt="Managing received link contributions"
                                            width={800}
                                            height={500}
                                            className={styles.stepImage}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.stepContainer} id="contributed-links">
                                <div className={styles.stepHeader}>
                                    <span className={styles.stepNumber}>17</span>
                                    <h3 className={styles.stepTitle}>Tracking Your Contributions</h3>
                                </div>
                                <div className={styles.stepContent}>
                                    <p className={styles.stepDescription}>
                                        The "Contributed" section tracks the links you've suggested to other users and their approval status. Monitor whether your suggestions have been approved, are pending review, or have been declined. This helps you understand what types of contributions are valued by different creators.
                                    </p>
                                    <div className={styles.imageContainer}>
                                        <Image
                                            src="/help/step17-CP-Contributionstab.png"
                                            alt="Tracking your contributed links status"
                                            width={800}
                                            height={500}
                                            className={styles.stepImage}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Content Management Section */}
                        <section className={styles.guideSection} id="content-management">
                            <h2 className={styles.sectionTitle}>Content Management</h2>

                            <div className={styles.stepContainer} id="studio">
                                <div className={styles.stepHeader}>
                                    <span className={styles.stepNumber}>18</span>
                                    <h3 className={styles.stepTitle}>Studio & Analytics</h3>
                                </div>
                                <div className={styles.stepContent}>
                                    <p className={styles.stepDescription}>
                                        Your Studio is the control center for content management. Edit published posts, manage drafts, and access detailed analytics showing user behavior patterns over the past 7 days. Use these insights to understand what resonates with your audience and optimize your content strategy.
                                    </p>
                                    <div className={styles.imageContainer}>
                                        <Image
                                            src="/help/step18-Studiopage.png"
                                            alt="Using Studio for content management and analytics"
                                            width={800}
                                            height={500}
                                            className={styles.stepImage}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Getting Help Section */}
                        <section className={styles.ctaSection}>
                            <div className={styles.ctaContent}>
                                <h2 className={styles.ctaTitle}>Ready to Start Curating?</h2>
                                <p className={styles.ctaDescription}>
                                    You now have everything you need to create meaningful, community-driven discussions on Flokkk. 
                                    Start building valuable knowledge bases and connecting with like-minded learners.
                                </p>
                                <div className={styles.ctaButtons}>
                                    <a href="/home" className={styles.primaryButton}>
                                        Create Your First Post
                                    </a>
                                    <a href="/settings/feedback" className={styles.secondaryButton}>
                                        Need More Help
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