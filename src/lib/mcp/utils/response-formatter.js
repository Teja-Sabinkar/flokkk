export class ResponseFormatter {
    static formatCommunityResponse(results, query, theme = 'dark', communityBrief = null) {
        const { posts, links } = results;
        
        let htmlResponse = `<div style="${this.generateThemeCSS(theme)}">`;
        
        // Add community brief at the top if available
        if (communityBrief) {
            htmlResponse += `
                <div style="background-color: var(--bg-tertiary); 
                            border: 1px solid var(--border-color);
                            border-radius: 12px; 
                            padding: 16px; 
                            margin: 12px 0 16px 0; 
                            color: var(--text-primary); 
                            font-size: 14px; 
                            line-height: 1.4;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    ${communityBrief}
                </div>
            `;
        }
        
        if (posts.length === 0 && links.length === 0) {
            return htmlResponse + this.formatNoCommunityContent(query, theme, communityBrief) + `</div>`;
        }
        
        // Add community header
        htmlResponse += `
            <div style="padding: 12px 0; color: var(--text-secondary); font-size: 14px; font-weight: 500; border-bottom: 1px solid var(--border-color); margin-bottom: 12px;">
                🏠 From flokkk Community:
            </div>
        `;
        
        // Add discussions
        if (posts.length > 0) {
            posts.slice(0, 3).forEach(post => {
                htmlResponse += this.formatDiscussionCard(post, theme);
            });
        }
        
        // Add links
        if (links.length > 0) {
            links.slice(0, 4).forEach(link => {
                htmlResponse += this.formatLinkCard(link, theme);
            });
        }
        
        htmlResponse += `</div>`;
        return htmlResponse;
    }
    
    static formatNoCommunityContent(query, theme = 'dark', communityBrief = null) {
        let response = `<div style="${this.generateThemeCSS(theme)}">`;
        
        // Add community brief at the top if available (for no content scenario)
        if (communityBrief) {
            response += `
                <div style="background-color: var(--bg-tertiary); 
                            border: 1px solid var(--border-color);
                            border-radius: 12px; 
                            padding: 16px; 
                            margin: 12px 0 16px 0; 
                            color: var(--text-primary); 
                            font-size: 14px; 
                            line-height: 1.4;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    ${communityBrief}
                </div>
            `;
        }
        
        response += `
            <div style="padding: 16px; text-align: center; color: var(--text-secondary); font-size: 14px; border: 1px dashed var(--border-color); border-radius: 8px; margin: 8px 0;">
                🤷 flokkk community hasn't discussed <strong style="color: var(--text-primary);">${query}</strong> yet.
                <br><br>
                <span style="color: var(--text-tertiary); font-size: 13px;">Be the first to start a discussion!</span>
            </div>
        </div>`;
        
        return response;
    }
    
    static formatWebSearchResponse(webResults, query, quotaRemaining, theme = 'dark') {
        let htmlResponse = `<div style="${this.generateThemeCSS(theme)}">`;
        
        // Add web search header
        htmlResponse += `
            <div style="padding: 12px 0; color: var(--accent-color); font-size: 14px; font-weight: 500; border-bottom: 1px solid var(--accent-color); margin: 12px 0;">
                🌐 From the web:
            </div>
        `;
        
        if (webResults.answer) {
            htmlResponse += `
                <div style="padding: 12px; background-color: var(--bg-tertiary); border-radius: 8px; margin: 8px 0; border-left: 3px solid var(--accent-color);">
                    <div style="color: var(--text-primary); font-size: 14px; line-height: 1.5;">
                        ${webResults.answer}
                    </div>
                </div>
            `;
        }
        
        if (webResults.results && webResults.results.length > 0) {
            webResults.results.slice(0, 4).forEach(result => {
                htmlResponse += this.formatWebResultCard(result, theme);
            });
        }
        
        htmlResponse += `</div>`;
        return htmlResponse;
    }
    
    static formatCombinedResponse(communityResults, webResults, query, quotaRemaining, theme = 'dark', communityBrief = null) {
        let htmlResponse = '';
        
        // Community results first (with brief if available)
        if (communityResults.posts.length > 0 || communityResults.links.length > 0) {
            htmlResponse += this.formatCommunityResponse(communityResults, query, theme, communityBrief);
            htmlResponse += `<div style="margin: 16px 0; border-top: 1px solid var(--border-color);"></div>`;
        }
        
        // Web results second
        htmlResponse += this.formatWebSearchResponse(webResults, query, quotaRemaining, theme);
        
        return htmlResponse;
    }
    
    static formatDiscussionCard(discussion, theme) {
        const commentCount = discussion.discussions || 0;
        const linkCount = discussion.linkCount || 0;
        
        // Generate intelligent summary
        const summary = this.generateIntelligentSummary(
            discussion.title || '',
            discussion.content || '',
            discussion.comments || [],
            150
        );
        
        return `
            <div style="padding: 12px; margin: 8px 0; border: 1px solid var(--border-color); border-radius: 8px; background-color: var(--bg-secondary);">
                <a href="/discussion?id=${discussion.id}" style="font-size: 14px; color: var(--accent-color); margin-bottom: 4px; line-height: 1.3; text-decoration: none; display: block; cursor: pointer;">
                    ${discussion.title}
                </a>
                <div style="font-size: 12px; color: var(--accent-color); margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                    <span>@${discussion.username}</span>
                    <span style="color: var(--text-tertiary);">•</span>
                    <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-tertiary);">
                        <div style="display: flex; align-items: center; gap: 2px;">
                            <span>💬</span>
                            <span>${commentCount}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 2px;">
                            <span>🔗</span>
                            <span>${linkCount}</span>
                        </div>
                    </div>
                </div>
                <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.4; margin-top: 6px;">
                    ${summary}
                </div>
            </div>
        `;
    }
    
    static formatLinkCard(link, theme) {
        const votes = link.votes || 0;
        const username = link.contributorUsername || 'Unknown';
        
        // Generate summary specifically from link description content
        const summary = this.generateLinkSummary(link, 150);
        
        return `
            <div style="padding: 12px; margin: 8px 0; border: 1px solid var(--accent-color); border-radius: 8px; background-color: var(--bg-secondary);">
                <a href="${link.url}" target="_blank" rel="noopener noreferrer" style="font-size: 14px; color: var(--accent-color); margin-bottom: 4px; line-height: 1.3; text-decoration: none; display: block; cursor: pointer; word-break: break-word;">
                    ${link.title}
                </a>
                <div style="font-size: 12px; color: var(--accent-color); margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                    <span>@${username}</span>
                    <span style="color: var(--text-tertiary);">•</span>
                    <div style="display: flex; align-items: center; gap: 2px; font-size: 11px; color: var(--text-tertiary);">
                        <span>👍</span>
                        <span>${votes}</span>
                    </div>
                </div>
                <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.4; margin-top: 6px;">
                    ${summary}
                </div>
            </div>
        `;
    }
    
    static formatWebResultCard(result, theme) {
        return `
            <div style="padding: 12px; margin: 8px 0; border: 1px solid var(--border-color); border-radius: 8px; background-color: var(--bg-secondary);">
                <div style="font-size: 14px; color: var(--text-primary); margin-bottom: 6px; line-height: 1.3;">
                    <a href="${result.url}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-color); text-decoration: none;">
                        ${result.title}
                    </a>
                </div>
                <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; line-height: 1.4;">
                    ${result.content ? result.content.substring(0, 150) + '...' : 'No description available'}
                </div>
                <div style="font-size: 11px; color: var(--text-tertiary);">
                    ${new URL(result.url).hostname}
                </div>
            </div>
        `;
    }
    
    static formatWebSearchButton(query, remaining, theme) {
        if (remaining <= 0) {
            return `
                <div style="${this.generateThemeCSS(theme)}; text-align: center; margin: 12px 0;">
                    <div style="padding: 8px 16px; background-color: var(--bg-tertiary); color: var(--text-tertiary); border-radius: 8px; font-size: 13px; border: 1px solid var(--border-color);">
                        🚫 Web search quota exceeded
                    </div>
                </div>
            `;
        }
        
        return `
            <div style="${this.generateThemeCSS(theme)}; text-align: center; margin: 12px 0;">
                <button class="web-search-button" 
                        data-query="${encodeURIComponent(query)}" 
                        style="padding: 8px 16px; background-color: var(--accent-color); color: white; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; transition: all 0.2s ease;">
                    🌐 Search web for more
                </button>
            </div>
        `;
    }
    
    /**
     * NEW: Format community brief box with theme support
     * @param {string} brief - The brief text content
     * @param {string} theme - Theme (dark/light)
     * @param {boolean} hasContent - Whether community content exists
     */
    static formatCommunityBrief(brief, theme, hasContent = true) {
        let briefText = brief;
        if (!hasContent) {
            briefText += " The flokkk community hasn't discussed this topic yet.";
        }
        
        return `
            <div style="${this.generateThemeCSS(theme)}; 
                        background-color: var(--bg-tertiary); 
                        border: 1px solid var(--border-color);
                        border-radius: 12px; 
                        padding: 16px; 
                        margin: 12px 0 16px 0; 
                        color: var(--text-primary); 
                        font-size: 14px; 
                        line-height: 1.4;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                ${briefText}
            </div>
        `;
    }
    
    /**
     * Generate summary specifically for links using LinkItemModal_linkDescription content
     */
    static generateLinkSummary(link, maxLength = 150) {
        try {
            let summary = '';
            
            // Priority 1: Use LinkItemModal_linkDescription if available
            if (link.linkDescription || link.LinkItemModal_linkDescription) {
                const linkDesc = link.linkDescription || link.LinkItemModal_linkDescription;
                summary = this.cleanText(linkDesc);
            }
            // Priority 2: Use regular description
            else if (link.description) {
                summary = this.cleanText(link.description);
            }
            // Priority 3: Generate from title if no description available
            else if (link.title) {
                summary = this.generateTitleBasedSummary(link.title);
            }
            
            // Clean up and truncate intelligently
            if (summary) {
                summary = this.intelligentTruncate(summary, maxLength);
                
                // Add ellipsis if truncated
                if (summary.length >= maxLength - 3) {
                    summary = summary.substring(0, maxLength - 3) + '...';
                }
            }
            
            return summary || 'External resource related to the topic.';
            
        } catch (error) {
            console.warn('Error generating link summary:', error);
            return 'External resource related to the topic.';
        }
    }

    /**
     * Hybrid approach for generating intelligent summaries
     * Combines post content with top comments to create meaningful 150-char summaries
     */
    static generateIntelligentSummary(title, content, comments = [], maxLength = 150) {
        try {
            // Clean and prepare content
            const cleanTitle = this.cleanText(title);
            const cleanContent = this.cleanText(content);
            const cleanComments = comments.map(comment => this.cleanText(comment.content || comment.text || '')).filter(Boolean);
            
            // Extract key information
            let summary = '';
            
            // Start with post content if available
            if (cleanContent) {
                const keyPoints = this.extractKeyPoints(cleanContent);
                summary += keyPoints;
            }
            
            // Add insights from top comments
            if (cleanComments.length > 0 && summary.length < maxLength - 30) {
                const commentInsights = this.extractCommentInsights(cleanComments, maxLength - summary.length - 10);
                if (commentInsights) {
                    summary += summary ? '. ' + commentInsights : commentInsights;
                }
            }
            
            // If still not enough content, use title-based summary
            if (summary.length < 50 && cleanTitle) {
                const titleSummary = this.generateTitleBasedSummary(cleanTitle);
                summary = titleSummary + (summary ? '. ' + summary : '');
            }
            
            // Clean up and truncate intelligently
            summary = this.intelligentTruncate(summary, maxLength);
            
            // Add ellipsis if truncated
            if (summary.length >= maxLength - 3) {
                summary = summary.substring(0, maxLength - 3) + '...';
            }
            
            return summary || 'Discussion covers various aspects of this topic.';
            
        } catch (error) {
            console.warn('Error generating intelligent summary:', error);
            return 'Discussion covers various aspects of this topic.';
        }
    }
    
    /**
     * Clean text by removing HTML, URLs, and excessive whitespace
     */
    static cleanText(text) {
        if (!text || typeof text !== 'string') return '';
        
        return text
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[^\w\s.,!?;:()-]/g, '') // Remove special chars except basic punctuation
            .trim();
    }
    
    /**
     * Extract key points from content using intelligent sentence selection
     */
    static extractKeyPoints(content) {
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
        
        if (sentences.length === 0) return '';
        
        // Prioritize sentences with key terms
        const keyTerms = ['covers', 'discusses', 'explains', 'focuses', 'includes', 'features', 'provides', 'shows', 'demonstrates'];
        
        // Find sentences with key terms first
        let keysentence = sentences.find(s => 
            keyTerms.some(term => s.toLowerCase().includes(term))
        );
        
        // If no key terms found, use first substantial sentence
        if (!keysentence) {
            keysentence = sentences.find(s => s.length > 20) || sentences[0];
        }
        
        return keysentence.trim();
    }
    
    /**
     * Extract insights from comments
     */
    static extractCommentInsights(comments, maxLength) {
        if (comments.length === 0) return '';
        
        // Get meaningful phrases from top comments
        const insights = [];
        
        for (const comment of comments.slice(0, 3)) {
            if (comment.length > 15) {
                // Extract first meaningful sentence
                const sentences = comment.split(/[.!?]+/);
                const meaningfulSentence = sentences.find(s => s.trim().length > 10);
                
                if (meaningfulSentence && insights.join(' ').length + meaningfulSentence.length < maxLength) {
                    insights.push(meaningfulSentence.trim());
                }
            }
        }
        
        if (insights.length > 0) {
            const result = insights.join('. ');
            return result.length > maxLength ? result.substring(0, maxLength - 3) + '...' : result;
        }
        
        return '';
    }
    
    /**
     * Generate summary based on title when content is limited
     */
    static generateTitleBasedSummary(title) {
        const topics = {
            'guide': 'Comprehensive guide covering',
            'tutorial': 'Tutorial covering',
            'tips': 'Tips and strategies for',
            'best practices': 'Best practices for',
            'how to': 'Step-by-step instructions for',
            'review': 'Review and analysis of',
            'comparison': 'Comparison of different',
            'introduction': 'Introduction to',
            'beginner': 'Beginner-friendly overview of'
        };
        
        const lowerTitle = title.toLowerCase();
        
        for (const [keyword, prefix] of Object.entries(topics)) {
            if (lowerTitle.includes(keyword)) {
                return `${prefix} ${title.toLowerCase().replace(keyword, '').trim()}`;
            }
        }
        
        return `Discussion about ${title.toLowerCase()}`;
    }
    
    /**
     * Intelligently truncate text without breaking words
     */
    static intelligentTruncate(text, maxLength) {
        if (text.length <= maxLength) return text;
        
        // Find the last space before the limit
        const truncated = text.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        
        // If we can find a space, truncate there
        if (lastSpace > maxLength * 0.8) {
            return text.substring(0, lastSpace);
        }
        
        // Otherwise, truncate at the limit
        return truncated;
    }
    
    static generateThemeCSS(theme) {
        const themes = {
            dark: {
                '--bg-primary': '#141414',
                '--bg-secondary': '#141414', 
                '--bg-tertiary': '#202020',
                '--text-primary': '#f8f9fa',
                '--text-secondary': '#e5e7eb',
                '--text-tertiary': '#9ca3af',
                '--border-color': '#2d2d2d',
                '--accent-color': '#3b82f6'
            },
            light: {
                '--bg-primary': '#f8f9fa',
                '--bg-secondary': '#f8f9fa',
                '--bg-tertiary': '#ededed',
                '--text-primary': '#1c1c1c',
                '--text-secondary': '#4b5563', 
                '--text-tertiary': '#6b7280',
                '--border-color': '#d1d5db',
                '--accent-color': '#2563eb'
            }
        };
        
        const variables = themes[theme] || themes.dark;
        return Object.entries(variables)
            .map(([property, value]) => `${property}: ${value}`)
            .join('; ');
    }
    
    static formatErrorResponse(error, theme = 'dark') {
        return `
            <div style="${this.generateThemeCSS(theme)}">
                <div style="padding: 12px; background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; color: var(--text-primary);">
                    <div style="font-size: 14px; margin-bottom: 4px;">⚠️ Something went wrong</div>
                    <div style="font-size: 13px; color: var(--text-secondary);">${error}</div>
                </div>
            </div>
        `;
    }
}