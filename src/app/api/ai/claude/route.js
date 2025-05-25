// /api/ai/claude/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { claudeDbService } from '@/lib/claudeDbService';
import { rateLimiter } from '@/lib/rateLimiting';
import { responseCache, withCache } from '@/lib/responseCache';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request) {
  try {
    // Get authentication info if available
    const headersList = headers();
    const authHeader = headersList.get('Authorization');
    let userId = null;
    let username = 'Anonymous User';

    // Connect to database
    const { db } = await connectToDatabase();

    // Verify user if token provided
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
        userId = decoded.id;
      } catch (error) {
        console.warn('Invalid token provided to Claude API:', error.message);
        // Continue as anonymous user
      }
    }

    // Parse request body - now with suggestion tracking
    const { 
      message, 
      context, 
      username: providedUsername, 
      dataCommands, 
      showMoreDb, 
      showMoreAi,
      source = 'manual',
      suggestionType = null,
      extractedContent = null,
      keywords = []
    } = await request.json();

    // Use username from request if provided and no authenticated user
    if (providedUsername && !userId) {
      username = providedUsername;
    }

    // Validate required fields
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // NEW: Rate limiting check
    const rateLimitUserId = userId || request.ip || 'anonymous';
    const rateLimit = await rateLimiter.checkRateLimit(rateLimitUserId, source);
    
    if (!rateLimit.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        message: rateLimit.message,
        resetTime: rateLimit.resetTime,
        remainingRequests: rateLimit.remainingRequests
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': source === 'suggestion' ? '20' : '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetTime.toISOString()
        }
      });
    }

    // Make sure we have an API key
    if (!process.env.CLAUDE_API_KEY) {
      console.error('CLAUDE_API_KEY is not defined in environment variables');
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    // NEW: Generate cache key for this request
    const cacheKey = responseCache.generateCacheKey(message, source, suggestionType, keywords);
    
    // NEW: Check cache first (except for showMore requests which should always be fresh)
    if (!showMoreDb && !showMoreAi) {
      const cachedResponse = await responseCache.get(cacheKey);
      if (cachedResponse) {
        console.log('Returning cached response');
        return NextResponse.json({
          ...cachedResponse,
          cached: true
        }, {
          headers: {
            'X-RateLimit-Limit': source === 'suggestion' ? '20' : '10',
            'X-RateLimit-Remaining': rateLimit.remainingRequests.toString(),
            'X-RateLimit-Reset': rateLimit.resetTime.toISOString(),
            'X-Cache-Status': 'HIT'
          }
        });
      }
    }

    // Process the request
    let response;
    if (source === 'suggestion') {
      response = await handleSuggestionQuery(message, suggestionType, extractedContent, keywords, context, username);
    } else {
      response = await handleManualQuery(message, context, username, dataCommands, showMoreDb, showMoreAi, keywords);
    }

    // NEW: Cache the response (except for showMore requests)
    if (!showMoreDb && !showMoreAi && response.ok) {
      const responseData = await response.json();
      await responseCache.set(cacheKey, responseData, source);
      
      // Re-create the response with cache headers
      return NextResponse.json(responseData, {
        headers: {
          'X-RateLimit-Limit': source === 'suggestion' ? '20' : '10',
          'X-RateLimit-Remaining': rateLimit.remainingRequests.toString(),
          'X-RateLimit-Reset': rateLimit.resetTime.toISOString(),
          'X-Cache-Status': 'MISS'
        }
      });
    }

    // Add rate limit headers to the response
    const responseData = await response.json();
    return NextResponse.json(responseData, {
      headers: {
        'X-RateLimit-Limit': source === 'suggestion' ? '20' : '10',
        'X-RateLimit-Remaining': rateLimit.remainingRequests.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toISOString(),
        'X-Cache-Status': showMoreDb || showMoreAi ? 'BYPASS' : 'MISS'
      }
    });

  } catch (error) {
    console.error('Claude AI handler error:', error);
    return NextResponse.json(
      { error: 'Error processing request', message: error.message },
      { status: 500 }
    );
  }
}

// NEW: Handle suggestion-based queries
async function handleSuggestionQuery(message, suggestionType, extractedContent, keywords, context, username) {
  try {
    if (suggestionType === 'summarize') {
      return await handleSummarizeRequest(message, extractedContent, context, username);
    } else if (suggestionType === 'similar') {
      return await handleSimilarTopicsRequest(message, keywords, context, username);
    } else {
      throw new Error('Unknown suggestion type');
    }
  } catch (error) {
    console.error('Error handling suggestion query:', error);
    return NextResponse.json(
      { error: 'Error processing suggestion', message: error.message },
      { status: 500 }
    );
  }
}

// NEW: Handle "summarize" suggestion
async function handleSummarizeRequest(message, extractedContent, context, username) {
  try {
    // Prepare content for summarization
    let contentToSummarize = '';
    
    if (extractedContent) {
      if (extractedContent.postTitle) {
        contentToSummarize += `Title: ${extractedContent.postTitle}\n\n`;
      }
      
      if (extractedContent.postContent) {
        contentToSummarize += `Content: ${extractedContent.postContent}\n\n`;
      }
      
      if (extractedContent.linkTitles && extractedContent.linkTitles.length > 0) {
        contentToSummarize += `Links: ${extractedContent.linkTitles.join(', ')}\n\n`;
      }
      
      if (extractedContent.linkDescriptions && extractedContent.linkDescriptions.length > 0) {
        contentToSummarize += `Link Descriptions: ${extractedContent.linkDescriptions.join(' | ')}\n\n`;
      }
      
      if (extractedContent.comments && extractedContent.comments.length > 0) {
        contentToSummarize += `Key Comments:\n${extractedContent.comments.slice(0, 5).join('\n')}\n`;
      }
    }

    if (!contentToSummarize.trim()) {
      contentToSummarize = 'No content available to summarize.';
    }

    // Create Claude API request for summarization
    const claudeRequest = {
      model: "claude-3-haiku-20240307",
      system: `You are Claude, an AI assistant that provides concise and informative summaries. You are helping ${username} understand a discussion.
      
      Provide a clear, well-structured summary that captures:
      1. The main topic and key points
      2. Important insights from the content
      3. Notable perspectives from comments (if any)
      4. Any actionable information or resources mentioned
      
      Keep the summary engaging and easy to understand.`,
      messages: [
        {
          role: "user",
          content: `Please summarize this discussion content:\n\n${contentToSummarize}`
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(claudeRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.content[0]?.text || "I'm sorry, I couldn't generate a summary.";

    // Format response (no "show more" for suggestions)
    const finalResponse = `<div style="font-size: 15px; font-weight: bold; color: #FFFFFF; padding: 10px 0 5px 5px; display: flex; align-items: center;">
      <span style="color: #FFFFFF; margin-right: 5px;">•</span> DISCUSSION SUMMARY
    </div>
    <div style="padding: 5px 5px 15px 5px; font-size: 13px; line-height: 1.4; color: white;">
      ${aiResponse}
    </div>`;

    return NextResponse.json({
      response: finalResponse,
      model: data?.model || "claude-3-haiku-20240307",
      usage: data?.usage || null,
      dataAvailable: [],
      hasMoreDb: false,
      hasMoreAi: false,
      isExpandedDb: false,
      isExpandedAi: false
    }, { status: 200 });

  } catch (error) {
    console.error('Error in summarize request:', error);
    throw error;
  }
}

// NEW: Handle "similar topics" suggestion
async function handleSimilarTopicsRequest(message, keywords, context, username) {
  try {
    // Use keywords to find similar content
    let similarContent = '';
    let relevantDiscussions = [];
    let relevantLinks = [];

    if (keywords && keywords.length > 0) {
      // Search for similar posts using keywords
      const searchResults = await claudeDbService.findSimilarByKeywords(keywords, 10);
      
      if (searchResults.posts && searchResults.posts.length > 0) {
        similarContent = searchResults.posts.map(post => 
          `${post.title}: ${post.content ? post.content.substring(0, 100) + '...' : ''}`
        ).join('\n');
        
        // Get top 2 discussions (based on comments + links count)
        relevantDiscussions = searchResults.posts
          .sort((a, b) => ((b.discussions || 0) + (b.linkCount || 0)) - ((a.discussions || 0) + (a.linkCount || 0)))
          .slice(0, 2);
      }

      // Search for relevant links
      const linkResults = await claudeDbService.findTopLinks(keywords, 5);
      if (linkResults && linkResults.length > 0) {
        relevantLinks = linkResults
          .sort((a, b) => (b.votes || 0) - (a.votes || 0))
          .slice(0, 2);
      }
    }

    // Create Claude API request for similar topics analysis
    const claudeRequest = {
      model: "claude-3-haiku-20240307",
      system: `You are Claude, an AI assistant helping ${username} discover similar topics and content.
      
      Based on the provided similar content from the database, create a brief overview of related topics that might interest the user.
      Focus on:
      1. Common themes and patterns
      2. Related areas of interest
      3. Key insights from similar discussions
      
      Keep it engaging and informative.`,
      messages: [
        {
          role: "user",
          content: `Based on these keywords: ${keywords.join(', ')}\n\nAnd this similar content from our database:\n${similarContent || 'No similar content found'}\n\nWhat similar topics might interest someone discussing this subject?`
        }
      ],
      max_tokens: 600,
      temperature: 0.7,
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(claudeRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiResponse = data.content[0]?.text || "I couldn't find similar topics.";

    // Build response with discussions and links
    let finalResponse = `<div style="font-size: 15px; font-weight: bold; color: #FFFFFF; padding: 10px 0 5px 5px; display: flex; align-items: center;">
      <span style="color: #FFFFFF; margin-right: 5px;">•</span> SIMILAR TOPICS
    </div>
    <div style="padding: 5px 5px 15px 5px; font-size: 13px; line-height: 1.4; color: white;">
      ${aiResponse}
    </div>`;

    // Add relevant discussions if available
    if (relevantDiscussions.length > 0) {
      finalResponse += `<div style="font-size: 13px; color: #888888; margin: 10px 0 5px 0; padding-left: 5px;">Relevant discussions:</div>`;
      
      relevantDiscussions.forEach(post => {
        const commentCount = post.discussions || 0;
        finalResponse += `
        <div style="padding: 0 5px 10px 5px;">
          <div style="font-size: 13px; color: white; margin-bottom: 5px;">
            ${post.title} <span style="color: #4ca0ff;">@${post.username}</span>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 5px;">
            <div style="background-color: #111111; color: #aaaaaa; padding: 2px 10px; border-radius: 12px; font-size: 11px;">${commentCount} Comments</div>
            <a href="/discussion?id=${post.id}" style="background-color: #111111; color: #aaaaaa; border: none; padding: 2px 10px; border-radius: 12px; font-size: 11px; text-decoration: none;">Take me</a>
          </div>
        </div>`;
      });
    }

    // Add relevant links if available
    if (relevantLinks.length > 0) {
      finalResponse += `<div style="font-size: 13px; color: #888888; margin: 10px 0 5px 0; padding-left: 5px;">Relevant links:</div>`;
      
      relevantLinks.forEach(link => {
        finalResponse += `
        <div style="padding: 10px; margin: 0 5px 10px 5px; border: 1px solid #2e88ff; border-radius: 6px; background-color: rgba(0, 0, 0, 0.2);">
          <div style="font-size: 13px; color: white; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${link.title}</div>
          <div style="font-size: 12px; color: #4ca0ff; margin-bottom: 8px;">@${link.contributorUsername || 'unknown'}</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="color: #aaaaaa; font-size: 11px; display: flex; align-items: center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style="margin-right: 4px;">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
              ${(link.votes || 0) > 1000 ? ((link.votes || 0) / 1000).toFixed(1) + 'k' : (link.votes || 0)}
            </div>
            <a href="${link.url}" target="_blank" rel="noopener noreferrer" style="background-color: #111111; color: #aaaaaa; border: none; padding: 2px 10px; border-radius: 12px; font-size: 11px; text-decoration: none;">Take me</a>
          </div>
        </div>`;
      });
    }

    return NextResponse.json({
      response: finalResponse,
      model: data?.model || "claude-3-haiku-20240307",
      usage: data?.usage || null,
      dataAvailable: [],
      hasMoreDb: false,
      hasMoreAi: false,
      isExpandedDb: false,
      isExpandedAi: false
    }, { status: 200 });

  } catch (error) {
    console.error('Error in similar topics request:', error);
    throw error;
  }
}

// Handle manual queries (existing logic with modifications)
async function handleManualQuery(message, context, username, dataCommands, showMoreDb, showMoreAi, keywords) {
  try {
    let databaseInfo = "";
    let dataAvailable = [];
    let allResults = {
      posts: [],
      links: [],
      comments: [],
      forums: [],
      trending: [],
      related: [],
      userPosts: []
    };

    // Only run database queries if it's not a showMoreAi-only request
    if (!showMoreAi) {
      console.log('Processing manual query with keywords:', keywords);

      // NEW: Use keywords for better database searching
      if (keywords && keywords.length > 0) {
        // Use keyword-based search for manual queries
        const keywordResults = await claudeDbService.findSimilarByKeywords(keywords, 15);
        
        if (keywordResults.posts) allResults.posts.push(...keywordResults.posts);
        if (keywordResults.links) allResults.links.push(...keywordResults.links);
        if (keywordResults.comments) allResults.comments.push(...keywordResults.comments);
      } else if (dataCommands && Array.isArray(dataCommands) && dataCommands.length > 0) {
        // Fallback to original dataCommands approach
        const dbResults = await Promise.all(dataCommands.map(async (command) => {
          switch (command.type) {
            case 'comprehensive_search':
              return await claudeDbService.comprehensiveSearch(command.query, command.limit || 10);
            case 'search_posts':
              return { posts: await claudeDbService.searchPosts(command.query, command.limit || 10) };
            case 'get_post':
              const post = await claudeDbService.getPostById(command.postId);
              return post ? { post } : null;
            case 'get_user':
              const user = await claudeDbService.getUserByUsername(command.username);
              return user ? { user } : null;
            case 'get_user_posts':
              return { userPosts: await claudeDbService.getRecentPostsByUser(command.username, command.limit || 3) };
            case 'get_trending':
              return { trending: await claudeDbService.getTrendingPosts(command.limit || 5) };
            case 'get_related_posts':
              return { related: await claudeDbService.getRelatedPosts(command.postId, command.limit || 3) };
            case 'search_forums':
              return { forums: await claudeDbService.searchForums(command.topic, command.limit || 3) };
            default:
              return null;
          }
        }));

        // Combine all results
        dbResults.forEach(result => {
          if (!result) return;
          if (result.posts) allResults.posts.push(...result.posts);
          if (result.links) allResults.links.push(...result.links);
          if (result.comments) allResults.comments.push(...result.comments);
          if (result.forums) allResults.forums.push(...result.forums);
          if (result.trending) allResults.trending.push(...result.trending);
          if (result.related) allResults.related.push(...result.related);
          if (result.userPosts) allResults.userPosts.push(...result.userPosts);
          if (result.post) allResults.post = result.post;
          if (result.user) allResults.user = result.user;
        });
      }

      // Sort results
      allResults.posts.sort((a, b) => (b.discussions || 0) - (a.discussions || 0));
      allResults.links.sort((a, b) => (b.votes || 0) - (a.votes || 0));

      // Build database info if we found anything
      const hasResults = Object.keys(allResults).some(key =>
        (Array.isArray(allResults[key]) && allResults[key].length > 0) ||
        (!Array.isArray(allResults[key]) && allResults[key])
      );

      if (hasResults) {
        databaseInfo = `<div style="font-size: 15px; font-weight: bold; color: #FFFFFF; padding: 10px 0 5px 5px; display: flex; align-items: center;">
          <span style="color: #FFFFFF; margin-right: 5px;">•</span> ${showMoreDb ? 'EXPANDED DATABASE INFORMATION' : 'DATABASE INFORMATION'}
        </div>`;

        // Add discussions section - show more posts if expandDbResults is true
        if (allResults.posts.length > 0) {
          const postsToShow = showMoreDb ? allResults.posts.slice(0, 4) : allResults.posts.slice(0, 2);
          databaseInfo += `<div style="font-size: 13px; color: #888888; margin: 10px 0 5px 0; padding-left: 5px;">Relevant discussions:</div>`;

          postsToShow.forEach(post => {
            const commentCount = post.discussions || 0;
            databaseInfo += `
            <div style="padding: 0 5px 10px 5px;">
              <div style="font-size: 13px; color: white; margin-bottom: 5px;">
                ${post.title} <span style="color: #4ca0ff;">@${post.username}</span>
              </div>
              <div style="display: flex; gap: 8px; margin-top: 5px;">
                <div style="background-color: #111111; color: #aaaaaa; padding: 2px 10px; border-radius: 12px; font-size: 11px;">${commentCount} Comments</div>
                <a href="/discussion?id=${post.id}" style="background-color: #111111; color: #aaaaaa; border: none; padding: 2px 10px; border-radius: 12px; font-size: 11px; text-decoration: none;">Take me</a>
              </div>
            </div>`;
          });
        }

        // Add links section
        if (allResults.links.length > 0) {
          const linksToShow = showMoreDb ? allResults.links.slice(0, 4) : allResults.links.slice(0, 2);
          databaseInfo += `<div style="font-size: 13px; color: #888888; margin: 10px 0 5px 0; padding-left: 5px;">Relevant links:</div>`;

          linksToShow.forEach(link => {
            databaseInfo += `
            <div style="padding: 10px; margin: 0 5px 10px 5px; border: 1px solid #2e88ff; border-radius: 6px; background-color: rgba(0, 0, 0, 0.2);">
              <div style="font-size: 13px; color: white; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${link.title}</div>
              <div style="font-size: 12px; color: #4ca0ff; margin-bottom: 8px;">@${link.contributorUsername || 'unknown'}</div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="color: #aaaaaa; font-size: 11px; display: flex; align-items: center;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style="margin-right: 4px;">
                    <path d="M12 19V5M5 12l7-7 7 7"/>
                  </svg>
                  ${(link.votes || 0) > 1000 ? ((link.votes || 0) / 1000).toFixed(1) + 'k' : (link.votes || 0)}
                </div>
                <a href="${link.url}" target="_blank" rel="noopener noreferrer" style="background-color: #111111; color: #aaaaaa; border: none; padding: 2px 10px; border-radius: 12px; font-size: 11px; text-decoration: none;">Take me</a>
              </div>
            </div>`;
          });
        }

        // Add "Show more" link if there are additional results and not already expanded
        if (!showMoreDb && (allResults.posts.length > 2 || allResults.links.length > 2)) {
          databaseInfo += `<div style="color: #4ca0ff; font-size: 13px; padding: 5px 0 10px 5px; cursor: pointer;" class="show-more-results show-more-db" data-query="${encodeURIComponent(message)}" data-type="db">Show more</div>`;
        }
      } else {
        databaseInfo = `<div style="font-size: 15px; font-weight: bold; color: #FFFFFF; padding: 10px 0 5px 5px; display: flex; align-items: center;">
          <span style="color: #FFFFFF; margin-right: 5px;">•</span> DATABASE INFORMATION
        </div>
        <div style="padding: 5px; font-size: 13px; color: #888888;">
          I couldn't find any relevant information about this topic in our platform database.
        </div>`;
      }

      dataAvailable = Object.keys(allResults).filter(key =>
        (Array.isArray(allResults[key]) && allResults[key].length > 0) ||
        (!Array.isArray(allResults[key]) && allResults[key])
      );
    }

    // Handle AI response generation
    let aiInfo = "";
    let data = {};

    if (!showMoreDb || showMoreAi) {
      if (showMoreAi) {
        // Expanded AI call
        const claudeRequest = {
          model: "claude-3-haiku-20240307",
          system: `You are Claude, an AI assistant embedded in a discussion platform called Turtle. You are having a conversation with ${username}.
          
          ${context ? `Context about the current discussion: ${context}` : ''}
          
          The user has requested a more detailed response to their question. Please provide an expanded, more comprehensive answer.
          
          Keep your responses helpful, thorough, and conversational.`,
          messages: [
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 2000,
          temperature: 0.7,
        };

        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.CLAUDE_API_KEY,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(claudeRequest)
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} - ${errorText}`);
          }

          data = await response.json();
          const aiResponse = data.content[0]?.text || "I'm sorry, I couldn't generate a detailed response.";

          aiInfo = `<div style="font-size: 15px; font-weight: bold; color: #FFFFFF; padding: 10px 0 5px 5px; display: flex; align-items: center;">
            <span style="color: #FFFFFF; margin-right: 5px;">•</span> EXPANDED ADDITIONAL INFORMATION
          </div>
          <div style="padding: 5px 5px 15px 5px; font-size: 13px; line-height: 1.4; color: white;">
            ${aiResponse}
          </div>`;

        } catch (apiError) {
          console.error('Error calling Claude API for expanded AI response:', apiError);
          aiInfo = `<div style="font-size: 15px; font-weight: bold; color: #FFFFFF; padding: 10px 0 5px 5px; display: flex; align-items: center;">
            <span style="color: #FFFFFF; margin-right: 5px;">•</span> ADDITIONAL INFORMATION
          </div>
          <div style="padding: 5px 5px 15px 5px; font-size: 13px; line-height: 1.4; color: white;">
            I apologize, but I encountered an error while trying to generate a more detailed response. Please try again.
          </div>`;
        }
      } else if (showMoreDb) {
        aiInfo = "";
      } else {
        // Regular AI call with database context
        let dbContext = '';
        if (allResults.posts.length > 0 || allResults.links.length > 0) {
          dbContext = 'Based on the database search results, ';
          if (allResults.posts.length > 0) {
            dbContext += `I found ${allResults.posts.length} related discussions. `;
          }
          if (allResults.links.length > 0) {
            dbContext += `I also found ${allResults.links.length} relevant links. `;
          }
        }

        const claudeRequest = {
          model: "claude-3-haiku-20240307",
          system: `You are Claude, an AI assistant embedded in a discussion platform called Turtle. You are having a conversation with ${username}.
          
          ${context ? `Context about the current discussion: ${context}` : ''}
          
          ${dbContext}
          
          Keep your responses helpful, concise, and conversational. Provide insights based on the available information.`,
          messages: [
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        };

        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.CLAUDE_API_KEY,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(claudeRequest)
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get response: ${errorText}`);
          }

          data = await response.json();
          const aiResponse = data.content[0]?.text || "I'm sorry, I couldn't generate a response.";

          aiInfo = `<div style="font-size: 15px; font-weight: bold; color: #FFFFFF; padding: 10px 0 5px 5px; display: flex; align-items: center;">
            <span style="color: #FFFFFF; margin-right: 5px;">•</span> ADDITIONAL INFORMATION
          </div>
          <div style="padding: 5px 5px 15px 5px; font-size: 13px; line-height: 1.4; color: white;">
            ${aiResponse}
          </div>
          <div style="color: #4ca0ff; font-size: 13px; padding: 5px 0 10px 5px; cursor: pointer;" class="show-more-results show-more-ai" data-query="${encodeURIComponent(message)}" data-type="ai">Show more</div>`;
        } catch (apiError) {
          console.error('Error calling Claude API:', apiError);
          aiInfo = `<div style="font-size: 15px; font-weight: bold; color: #FFFFFF; padding: 10px 0 5px 5px; display: flex; align-items: center;">
            <span style="color: #FFFFFF; margin-right: 5px;">•</span> ADDITIONAL INFORMATION
          </div>
          <div style="padding: 5px 5px 15px 5px; font-size: 13px; line-height: 1.4; color: white;">
            I apologize, but I encountered an error while trying to generate a response. Please try again.
          </div>`;
        }
      }
    }

    // Create the final response
    let finalResponse;
    if (showMoreDb) {
      finalResponse = databaseInfo;
    } else if (showMoreAi) {
      finalResponse = aiInfo;
    } else {
      finalResponse = `${databaseInfo}${aiInfo}`;
    }

    return NextResponse.json({
      response: finalResponse,
      model: data?.model || "claude-3-haiku-20240307",
      usage: data?.usage || null,
      dataAvailable: dataAvailable,
      hasMoreDb: !showMoreDb && (allResults.posts?.length > 2 || allResults.links?.length > 2),
      hasMoreAi: !showMoreAi,
      isExpandedDb: showMoreDb,
      isExpandedAi: showMoreAi
    }, { status: 200 });

  } catch (error) {
    console.error('Error in manual query:', error);
    throw error;
  }
}