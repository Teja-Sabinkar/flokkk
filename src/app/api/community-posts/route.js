import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import CommunityPost from '@/models/CommunityPost';
import Follow from '@/models/Follow'; // Add this import
import { createNotification } from '@/lib/notifications'; // Add this import
import { saveFile } from '@/lib/fileUpload';

// GET community posts with pagination
export async function GET(request) {
    try {
        // Get query parameters
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const username = searchParams.get('username');
        const skip = (page - 1) * limit;

        console.log('GET /api/community-posts - Fetching posts');
        console.log('Request params:', { page, limit, username });

        // Connect to database
        await dbConnect();

        // Build query filters
        let filters = {};
        let user = null;
        
        // If username is provided, we need to find this user first and filter by their userId
        if (username) {
            console.log(`Filtering community posts for username: ${username}`);
            
            // Find user by username to get the userId (case insensitive)
            user = await User.findOne({ 
                username: { $regex: new RegExp(`^${username}$`, 'i') } 
            });
            
            if (user) {
                console.log(`Found user with ID: ${user._id}`);
                
                // Create a more flexible filter that checks for either userId or username
                filters = {
                    $or: [
                        { userId: user._id },
                        { username: { $regex: new RegExp(`^${username}$`, 'i') } }
                    ]
                };
                
                console.log('Using flexible filter:', JSON.stringify(filters));
            } else {
                console.log(`User not found for username: ${username}`);
                
                // Even if user is not found, try to filter by the provided username
                filters = { username: { $regex: new RegExp(`^${username}$`, 'i') } };
                console.log('Falling back to username-only filter:', JSON.stringify(filters));
            }
        } else {
            console.log('No username provided, showing all community posts');
        }

        // Find posts with the query filters
        const posts = await CommunityPost.find(filters)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        console.log(`Found ${posts.length} community posts`);
        
        // Debug log the first few posts
        if (posts.length > 0) {
            console.log('First post details:', {
                id: posts[0]._id,
                title: posts[0].title,
                username: posts[0].username,
                userId: posts[0].userId
            });
        }

        // Get total count for pagination
        const totalPosts = await CommunityPost.countDocuments(filters);

        // Format posts for response with time ago
        const formattedPosts = posts.map(post => ({
            id: post._id,
            title: post.title,
            content: post.content,
            image: post.image,
            voteCount: post.voteCount || 0,
            commentCount: post.commentCount || 0,
            shareCount: post.shareCount || 0,
            tags: post.tags || [],
            username: post.username,
            userId: post.userId ? post.userId.toString() : null,
            createdAt: post.createdAt,
            timeAgo: getTimeAgo(post.createdAt),
            avatarSrc: '/api/placeholder/64/64' // Default avatar for display
        }));

        return NextResponse.json({
            posts: formattedPosts,
            pagination: {
                page,
                limit,
                totalPosts,
                totalPages: Math.ceil(totalPosts / limit)
            }
        }, { status: 200 });
    } catch (error) {
        console.error('Community posts fetch error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Create a new community post
export async function POST(request) {
    try {
        console.log('POST /api/community-posts - Creating new community post');
        
        // Get auth token from header
        const headersList = headers();
        const authHeader = headersList.get('Authorization');
        const contentType = headersList.get('content-type') || '';
        
        console.log('Content-Type:', contentType);
        console.log('Auth header present:', !!authHeader);

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('Unauthorized: No valid Authorization header');
            return NextResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const token = authHeader.split(' ')[1];

        // Verify JWT token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
            console.log('JWT verified successfully. User ID:', decoded.id);
        } catch (error) {
            console.error('Token verification error:', error);
            return NextResponse.json(
                { message: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        // Connect to database
        console.log('Connecting to database...');
        await dbConnect();
        console.log('Database connection established');

        // Find user by id from token
        const user = await User.findById(decoded.id);

        if (!user) {
            console.error('User not found with ID:', decoded.id);
            return NextResponse.json(
                { message: 'User not found' },
                { status: 404 }
            );
        }
        
        console.log('Found user:', user.username);

        let postData = {};
        let image = null;
        let authorUsername = null;

        // Handle different content types
        if (contentType.includes('multipart/form-data')) {
            console.log('Processing multipart/form-data request');
            // Handle multipart form data (with files)
            const formData = await request.formData();
            
            console.log('FormData fields:', [...formData.keys()]);

            // Get text fields
            const title = formData.get('title');
            const content = formData.get('description') || formData.get('content') || '';
            const tagsJson = formData.get('tags');
            const tags = tagsJson ? JSON.parse(tagsJson) : [];
            
            // Get author username if explicitly provided
            authorUsername = formData.get('authorUsername');
            console.log('Author username from form:', authorUsername);
            
            console.log('Parsed form data:', { title, contentLength: content?.length, tags });

            // Validate required fields
            if (!title) {
                console.error('Validation error: Title is required');
                return NextResponse.json(
                    { message: 'Title is required' },
                    { status: 400 }
                );
            }

            // Get file fields
            image = formData.get('image');
            console.log('Image present:', !!image);

            // Process image if provided
            let imagePath = null;
            if (image) {
                try {
                    console.log('Saving image file...');
                    imagePath = await saveFile(image, 'posts');
                    console.log('Image saved successfully at:', imagePath);
                } catch (fileError) {
                    console.error('Error saving file:', fileError);
                    return NextResponse.json(
                        { message: 'Failed to save image: ' + fileError.message },
                        { status: 500 }
                    );
                }
            }

            // Use provided username or fall back to user's username
            const username = authorUsername || user.username || user.name.toLowerCase().replace(/\s+/g, '_');
            console.log('Using username for post:', username);

            // Prepare post data
            postData = {
                title,
                content,
                tags,
                image: imagePath,
                userId: user._id,
                username: username
            };
        } else {
            console.log('Processing JSON request');
            // Handle regular JSON data
            const data = await request.json();
            console.log('JSON data:', data);

            // Get author username if explicitly provided
            authorUsername = data.authorUsername;
            console.log('Author username from JSON:', authorUsername);

            // Validate required fields
            if (!data.title) {
                console.error('Validation error: Title is required');
                return NextResponse.json(
                    { message: 'Title is required' },
                    { status: 400 }
                );
            }

            // Use provided username or fall back to user's username
            const username = authorUsername || user.username || user.name.toLowerCase().replace(/\s+/g, '_');
            console.log('Using username for post:', username);
            
            // Prepare post data
            postData = {
                title: data.title,
                content: data.content || data.description || '',
                tags: data.tags || [],
                image: data.image || null,
                userId: user._id,
                username: username
            };
        }
        
        console.log('Prepared post data:', {
            title: postData.title,
            contentLength: postData.content?.length,
            hasImage: !!postData.image,
            userId: postData.userId.toString(),
            username: postData.username
        });

        // Create the community post
        console.log('Creating community post in database...');
        const newPost = await CommunityPost.create(postData);
        console.log('Community post created successfully with ID:', newPost._id);

        // Format the timeAgo for the response
        const timeAgo = getTimeAgo(newPost.createdAt);

        // NOTIFICATION LOGIC - ADDED HERE (after newPost is created)
        try {
            console.log('Notifying followers of new community post...');
            // Find all followers of the post creator
            const follows = await Follow.find({ following: user._id });
            
            console.log(`Found ${follows.length} followers for user ${user._id}`);
            
            // Create notifications for each follower
            if (follows && follows.length > 0) {
                for (const follow of follows) {
                    console.log(`Creating notification for follower: ${follow.follower}`);
                    
                    try {
                        await createNotification({
                            userId: follow.follower,
                            type: 'new_post', // This will appear in the Posts tab
                            content: `${user.username || user.name} has added a new post for the community`,
                            sender: user._id,
                            senderUsername: user.username || user.name,
                            relatedId: newPost._id,
                            onModel: 'CommunityPost', // Since it's a community post
                            thumbnail: newPost.image || null
                        });
                    } catch (notifyError) {
                        console.error(`Error creating notification for follower ${follow.follower}:`, notifyError);
                    }
                }
                
                console.log('All follower notifications created');
            } else {
                console.log('No followers to notify');
            }
        } catch (notifyError) {
            // Log the error but don't fail the request
            console.error('Error notifying followers:', notifyError);
        }

        // Return the created post
        return NextResponse.json({
            message: 'Community post created successfully',
            post: {
                id: newPost._id,
                title: newPost.title,
                content: newPost.content,
                image: newPost.image,
                voteCount: newPost.voteCount || 0,
                commentCount: newPost.commentCount || 0,
                shareCount: newPost.shareCount || 0,
                tags: newPost.tags || [],
                username: newPost.username,
                userId: newPost.userId.toString(),
                createdAt: newPost.createdAt,
                timeAgo: timeAgo,
                avatarSrc: '/api/placeholder/64/64' // Default avatar for display
            }
        }, { status: 201 });

    } catch (error) {
        console.error('Community post creation error:', error);
        return NextResponse.json(
            { message: 'Failed to create community post: ' + error.message },
            { status: 500 }
        );
    }
}

// Helper function to calculate time ago
function getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) {
        return `${diffInSeconds} seconds ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
        return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
}