// /api/ai/claude/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { claudeDbService } from '@/lib/claudeDbService';
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

    // Parse request body - now with separate showMoreDb and showMoreAi flags
    const { message, context, username: providedUsername, dataCommands, showMoreDb, showMoreAi } = await request.json();

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

    // Make sure we have an API key
    if (!process.env.CLAUDE_API_KEY) {
      console.error('CLAUDE_API_KEY is not defined in environment variables');
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    // If we have dataCommands, perform the database queries
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
    // or if it's a regular request or showMoreDb request
    if (!showMoreAi && dataCommands && Array.isArray(dataCommands) && dataCommands.length > 0) {
      console.log('Processing database commands:', dataCommands);

      // Process each command and collect results
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

      // Sort posts by discussion/comment count (highest first)
      allResults.posts.sort((a, b) => (b.discussions || 0) - (a.discussions || 0));

      // Sort links by vote count (highest first)
      allResults.links.sort((a, b) => (b.votes || 0) - (a.votes || 0));

      // Fetch actual comment counts for all posts
      if (allResults.posts.length > 0) {
        // Get all post IDs
        const postIds = allResults.posts.map(post => {
          try {
            return new ObjectId(post.id);
          } catch (e) {
            console.warn(`Invalid post ID: ${post.id}`);
            return null;
          }
        }).filter(id => id !== null);

        // Create a mapping of post ID to comment count
        const commentCounts = {};

        // Query the comments collection for the count of each post's comments
        if (postIds.length > 0) {
          try {
            // Check if we have a comments collection
            const collections = await db.listCollections({ name: 'comments' }).toArray();

            if (collections.length > 0) {
              // Get comment counts for each post
              const commentStats = await db.collection('comments').aggregate([
                { $match: { postId: { $in: postIds } } },
                { $group: { _id: '$postId', count: { $sum: 1 } } }
              ]).toArray();

              // Create a mapping of post ID to comment count
              commentStats.forEach(stat => {
                commentCounts[stat._id.toString()] = stat.count;
              });

              console.log(`Fetched comment counts for ${commentStats.length} posts`);
            } else {
              // If no comments collection, try looking for comments embedded in posts
              const posts = await db.collection('posts').find(
                { _id: { $in: postIds } },
                { projection: { _id: 1, comments: 1 } }
              ).toArray();

              posts.forEach(post => {
                const count = Array.isArray(post.comments) ? post.comments.length : 0;
                commentCounts[post._id.toString()] = count;
              });

              console.log(`Fetched embedded comment counts for ${posts.length} posts`);
            }
          } catch (error) {
            console.error('Error fetching comment counts:', error);
          }
        }

        // Update each post with its actual comment count
        allResults.posts = allResults.posts.map(post => {
          const postId = post.id || (post._id ? post._id.toString() : null);
          if (postId && commentCounts[postId] !== undefined) {
            // Use the actual comment count from the database
            return {
              ...post,
              actualCommentCount: commentCounts[postId]
            };
          }
          return post;
        });
      }

      // Build database info text if we found anything
      const hasResults = Object.keys(allResults).some(key =>
        (Array.isArray(allResults[key]) && allResults[key].length > 0) ||
        (!Array.isArray(allResults[key]) && allResults[key])
      );

      if (hasResults) {
        // Format the database info with inline styles matching the screenshot exactly
        databaseInfo = `<div style="font-size: 15px; font-weight: bold; color: #FFFFFF; padding: 10px 0 5px 5px; display: flex; align-items: center;">
          <span style="color: #FFFFFF; margin-right: 5px;">•</span> ${showMoreDb ? 'EXPANDED DATABASE INFORMATION' : 'DATABASE INFORMATION'}
        </div>`;

        // Add discussions section - show more posts if expandDbResults is true
        if (allResults.posts.length > 0) {
          // Show one post by default, or more if expandDbResults is true
          const topPost = allResults.posts[0];
          const postsToShow = showMoreDb ? allResults.posts.slice(0, 10) : [topPost];

          databaseInfo += `<div style="font-size: 13px; color: #888888; margin: 10px 0 5px 0; padding-left: 5px;">Relevant discussions:</div>`;

          postsToShow.forEach(post => {
            // Use the actual comment count if available, otherwise fall back to post.discussions
            const commentCount = post.actualCommentCount !== undefined ? post.actualCommentCount : (post.discussions || 0);

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

        // Add links section - show more links if expandDbResults is true
        if (allResults.links.length > 0) {
          // Show two links by default, or more if expandDbResults is true
          const linksToShow = showMoreDb ? allResults.links.slice(0, 10) : allResults.links.slice(0, 2);

          databaseInfo += `<div style="font-size: 13px; color: #888888; margin: 10px 0 5px 0; padding-left: 5px;">Relevant links :</div>`;

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
        if (!showMoreDb && (allResults.posts.length > 1 || allResults.links.length > 2)) {
          databaseInfo += `<div style="color: #4ca0ff; font-size: 13px; padding: 5px 0 10px 5px; cursor: pointer;" class="show-more-results show-more-db" data-query="${encodeURIComponent(message)}" data-type="db">Show more</div>`;
        }
      } else {
        // No database results - create simple header
        databaseInfo = `<div style="font-size: 15px; font-weight: bold; color: #FFFFFF; padding: 10px 0 5px 5px; display: flex; align-items: center;">
          <span style="color: #FFFFFF; margin-right: 5px;">•</span> DATABASE INFORMATION
        </div>
        <div style="padding: 5px; font-size: 13px; color: #888888;">
          I couldn't find any relevant information about this topic in our platform database.
        </div>`;
      }

      // Track what data is available
      dataAvailable = Object.keys(allResults).filter(key =>
        (Array.isArray(allResults[key]) && allResults[key].length > 0) ||
        (!Array.isArray(allResults[key]) && allResults[key])
      );
    } else if (showMoreAi) {
      // For "show more AI" requests that skip database queries, provide a minimal database section
      databaseInfo = "";
    } else {
      // No data commands or regular request with no results - create simple database info message
      databaseInfo = `<div style="font-size: 15px; font-weight: bold; color: #FFFFFF; padding: 10px 0 5px 5px; display: flex; align-items: center;">
        <span style="color: #FFFFFF; margin-right: 5px;">•</span> DATABASE INFORMATION
      </div>
      <div style="padding: 5px; font-size: 13px; color: #888888;">
        I couldn't find any relevant information about this topic in our platform database.
      </div>`;
    }

    // Handle AI response generation based on request type
    let aiInfo = "";
    let data = {};

    // Only generate AI response if it's not a showMoreDb-only request
    // or if it's a regular request or showMoreAi request
    if (!showMoreDb || showMoreAi) {
      if (showMoreAi) {
        // For "show more AI" requests, make an API call with higher token limit
        console.log('Show more AI content request - making expanded AI call');

        // Create API request with higher token limit for more detailed response
        const claudeRequest = {
          model: "claude-3-haiku-20240307",
          system: `You are Claude, an AI assistant embedded in a discussion platform called Turtle. You are having a conversation with ${username}.
          
          ${context ? `Context about the current discussion: ${context}` : ''}
          
          The user has requested a more detailed response to their question. Please provide an expanded, more comprehensive answer.
          
          Keep your responses helpful, thorough, and conversational. If asked about the discussion, provide thoughtful analysis based on the context.`,
          messages: [
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 2000, // Increased token limit for expanded response
          temperature: 0.7,
        };

        try {
          // Make API request to Anthropic
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

          // Create standalone AI information section
          aiInfo = `<div style="font-size: 15px; font-weight: bold; color: #FFFFFF; padding: 10px 0 5px 5px; display: flex; align-items: center;">
            <span style="color: #FFFFFF; margin-right: 5px;">•</span> EXPANDED ADDITIONAL INFORMATION
          </div>
          <div style="padding: 5px 5px 15px 5px; font-size: 13px; line-height: 1.4; color: white; text-align: justify;">
            ${aiResponse}
          </div>`;

        } catch (apiError) {
          console.error('Error calling Claude API for expanded AI response:', apiError);
          aiInfo = `<div style="font-size: 15px; font-weight: bold; color: #FFFFFF; padding: 10px 0 5px 5px; display: flex; align-items: center;">
            <span style="color: #FFFFFF; margin-right: 5px;">•</span> ADDITIONAL INFORMATION
          </div>
          <div style="padding: 5px 5px 15px 5px; font-size: 13px; line-height: 1.4; color: white; text-align: justify;">
            I apologize, but I encountered an error while trying to generate a more detailed response. Please try again.
          </div>`;
        }
      } else if (showMoreDb) {
        // For "show more DB" requests, we don't need a new AI call
        // Just provide a short message
        aiInfo = "";
      } else {
        // For new regular queries, proceed with standard Claude API call
        const claudeRequest = {
          model: "claude-3-haiku-20240307",
          system: `You are Claude, an AI assistant embedded in a discussion platform called Turtle. You are having a conversation with ${username}.
          
          ${context ? `Context about the current discussion: ${context}` : ''}
          
          Keep your responses helpful, concise, and conversational. If asked about the discussion, provide thoughtful analysis based on the context.
          
          For programming questions, use markdown format for code blocks. You can also help explain concepts, summarize information, and provide related insights.
          
          Do not generate harmful, illegal, unethical or deceptive content. Respect privacy and confidentiality.`,
          messages: [
            {
              role: "user",
              content: message
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        };

        console.log('Sending regular request to Claude API');

        try {
          // Make API request to Anthropic
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.CLAUDE_API_KEY,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(claudeRequest)
          });

          // Handle API response errors
          if (!response.ok) {
            // Try to get error details from response
            let errorDetail = '';
            try {
              const errorData = await response.json();
              errorDetail = JSON.stringify(errorData);
              console.error(`Claude API error response (${response.status}):`, errorData);
            } catch (e) {
              errorDetail = await response.text();
              console.error(`Claude API error text (${response.status}):`, errorDetail);
            }

            throw new Error(`Failed to get response: ${errorDetail}`);
          }

          // Parse successful response
          data = await response.json();
          console.log('Claude API success response:', {
            model: data.model,
            contentLength: data.content?.[0]?.text?.length || 0,
            hasUsage: !!data.usage
          });

          const aiResponse = data.content[0]?.text || "I'm sorry, I couldn't generate a response.";

          // Create standard AI section with "Show more" button
          aiInfo = `<div style="font-size: 15px; font-weight: bold; color: #FFFFFF; padding: 10px 0 5px 5px; display: flex; align-items: center;">
            <span style="color: #FFFFFF; margin-right: 5px;">•</span> ADDITIONAL INFORMATION
          </div>
          <div style="padding: 5px 5px 15px 5px; font-size: 13px; line-height: 1.4; color: white; text-align: justify;">
            ${aiResponse}
          </div>
          <div style="color: #4ca0ff; font-size: 13px; padding: 5px 0 10px 5px; cursor: pointer;" class="show-more-results show-more-ai" data-query="${encodeURIComponent(message)}" data-type="ai">Show more</div>`;
        } catch (apiError) {
          console.error('Error calling Claude API:', apiError);
          aiInfo = `<div style="font-size: 15px; font-weight: bold; color: #FFFFFF; padding: 10px 0 5px 5px; display: flex; align-items: center;">
            <span style="color: #FFFFFF; margin-right: 5px;">•</span> ADDITIONAL INFORMATION
          </div>
          <div style="padding: 5px 5px 15px 5px; font-size: 13px; line-height: 1.4; color: white; text-align: justify;">
            I apologize, but I encountered an error while trying to generate a response. Please try again.
          </div>`;
        }
      }
    }

    // Create the final response based on the request type
    let finalResponse;

    if (showMoreDb) {
      // For "show more DB" requests, return only the expanded database section
      finalResponse = databaseInfo;
    } else if (showMoreAi) {
      // For "show more AI" requests, return only the expanded AI section
      finalResponse = aiInfo;
    } else {
      // For regular requests, include both sections
      finalResponse = `${databaseInfo}${aiInfo}`;
    }

    // Return formatted response with dataAvailable and separate flags for expansion state
    return NextResponse.json({
      response: finalResponse,
      model: data?.model || "claude-3-haiku-20240307",
      usage: data?.usage || null,
      dataAvailable: dataAvailable,
      hasMoreDb: !showMoreDb && (allResults.posts?.length > 1 || allResults.links?.length > 2),
      hasMoreAi: !showMoreAi,
      isExpandedDb: showMoreDb,
      isExpandedAi: showMoreAi
    }, { status: 200 });

  } catch (error) {
    console.error('Claude AI handler error:', error);

    return NextResponse.json(
      { error: 'Error processing request', message: error.message },
      { status: 500 }
    );
  }
}