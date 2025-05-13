// src/app/api/ai/claude/classify/route.js
import { NextResponse } from 'next/server';

// Fixed, clearly defined categories with explicit examples
const CATEGORY_DEFINITIONS = {
  'Trending': {
    description: 'Popular or viral content with high engagement that doesn\'t fit other categories',
    examples: [
      'Title: What Everyone Is Talking About Today',
      'Title: The Latest Internet Sensation',
      'Title: 10 Things Going Viral This Week'
    ]
  },
  'Music': {
    description: 'Content about songs, albums, artists, concerts, musical instruments, or the music industry',
    examples: [
      'Title: New Album Review: Taylor Swift\'s Latest Release',
      'Title: Top 10 Guitar Solos of All Time',
      'Title: How to Start Your Music Production Career'
    ]
  },
  'Gaming': {
    description: 'Content about video games, gaming hardware, esports, streamers, or game development',
    examples: [
      'Title: Elden Ring DLC Announcement Details',
      'Title: Best Budget Gaming PCs in 2024',
      'Title: How Pro Gamers Train for Tournaments'
    ]
  },
  'Movies': {
    description: 'Content about films, cinema, actors, directors, or the film industry',
    examples: [
      'Title: Marvel Announces Next Phase of Superhero Films',
      'Title: Oscar Nominations Breakdown',
      'Title: Review: The Latest Christopher Nolan Film'
    ]
  },
  'News': {
    description: 'Current events, politics, world affairs, breaking stories, or journalism',
    examples: [
      'Title: Breaking: Election Results Announced',
      'Title: Economic Impact of New Trade Deal',
      'Title: Climate Summit Reaches Historic Agreement'
    ]
  },
  'Sports': {
    description: 'Athletic competitions, teams, players, sporting events, or physical activities',
    examples: [
      'Title: NBA Finals Game 7 Recap',
      'Title: Olympic Medal Count Update',
      'Title: How to Improve Your Tennis Serve'
    ]
  },
  'Learning': {
    description: 'Educational content, tutorials, courses, academic subjects, or skill development',
    examples: [
      'Title: Complete Guide to Machine Learning Algorithms',
      'Title: How to Learn a New Language in 3 Months',
      'Title: Understanding Quantum Physics Basics'
    ]
  },
  'Fashion': {
    description: 'Clothing, style trends, designers, models, or the fashion industry',
    examples: [
      'Title: Summer Fashion Trends for 2024',
      'Title: Sustainable Clothing Brands to Support',
      'Title: Paris Fashion Week Highlights'
    ]
  },
  'Podcasts': {
    description: 'Audio shows, podcast episodes, podcast hosts, or podcast platforms',
    examples: [
      'Title: Best True Crime Podcasts to Binge',
      'Title: Interview with Joe Rogan on Podcast Success',
      'Title: How to Start Your First Podcast'
    ]
  },
  'Lifestyle': {
    description: 'Daily living, wellness, health, home, food, travel, or personal development',
    examples: [
      'Title: 30-Day Meditation Challenge Results',
      'Title: Best Destinations for Digital Nomads',
      'Title: Simple Meal Prep Ideas for Busy Professionals'
    ]
  }
};

export async function POST(request) {
    try {
        // Parse request data
        const { content, categories = Object.keys(CATEGORY_DEFINITIONS) } = await request.json();

        if (!content) {
            return NextResponse.json(
                { error: 'Missing required content parameter' },
                { status: 400 }
            );
        }

        // Make sure we have Claude API key
        if (!process.env.CLAUDE_API_KEY) {
            console.error('CLAUDE_API_KEY is not defined in environment variables');
            return NextResponse.json(
                { error: 'API configuration error' },
                { status: 500 }
            );
        }

        // Extract title and description from content
        const titleMatch = content.match(/Title:\s*(.*?)(?:\n|$)/);
        const descriptionMatch = content.match(/Description:\s*(.*?)(?:\n|$)/);
        
        const title = titleMatch ? titleMatch[1].trim() : '';
        const description = descriptionMatch ? descriptionMatch[1].trim() : '';
        
        if (!title) {
            return NextResponse.json(
                { error: 'Missing title in content' },
                { status: 400 }
            );
        }

        // Build detailed category descriptions with examples
        const categoryGuide = categories.map(cat => {
            const def = CATEGORY_DEFINITIONS[cat];
            if (!def) return `- ${cat}: General category`;
            
            return `- ${cat}: ${def.description}\n  Examples:\n  * ${def.examples.join('\n  * ')}`;
        }).join('\n\n');

        // Create Claude API request with specific system prompt for categorization
        const claudeRequest = {
            model: "claude-3-haiku-20240307",
            system: `You are a precise content categorization AI that analyzes post titles and descriptions to assign exactly ONE category that best represents the content's subject matter. 

Your job is to determine the primary topic of the post by analyzing the semantic meaning of the FULL title and description.

DETAILED CATEGORY GUIDE:
${categoryGuide}

CATEGORIZATION RULES:
1. Read and analyze the COMPLETE title and description text word by word.
2. Focus on the PRIMARY subject matter and main topic of the content.
3. Look for specific subject indicators that clearly match a defined category.
4. If content fits multiple categories, select the one that best represents the PRIMARY focus.
5. Use "Trending" ONLY if the content truly doesn't fit well into any other category.
6. Consider these category assignments mutually exclusive - a post belongs in exactly ONE category.

Your response must ONLY contain the single category name, with no other text.`,
            messages: [
                {
                    role: "user",
                    content: `I need you to analyze this post and categorize it:

Title: ${title}
${description ? `Description: ${description}` : ''}

Based on a thorough analysis of the title${description ? ' and description' : ''}, what is the ONE most appropriate category for this content? Choose from: ${categories.join(', ')}`
                }
            ],
            max_tokens: 10,
            temperature: 0.0, // Use 0 temperature for maximum consistency
        };

        // Call Claude API
        console.log(`Classifying: "${title}"`);
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
            const errorText = await response.text();
            throw new Error(`Claude API error: ${response.status} - ${errorText}`);
        }

        // Parse response
        const data = await response.json();
        const rawResponse = data.content[0]?.text || "";
        
        // Clean the response - get only the category name
        const cleanedResponse = rawResponse.trim().split(/[\s\n]+/)[0];
        
        // Validate against available categories
        let category = null;
        
        // First try exact match
        if (categories.includes(cleanedResponse)) {
            category = cleanedResponse;
        } else {
            // Try case-insensitive match
            const lowerResponse = cleanedResponse.toLowerCase();
            for (const validCategory of categories) {
                if (validCategory.toLowerCase() === lowerResponse) {
                    category = validCategory;
                    break;
                }
            }
            
            // If still not found, try partial match
            if (!category) {
                for (const validCategory of categories) {
                    if (lowerResponse.includes(validCategory.toLowerCase()) || 
                        validCategory.toLowerCase().includes(lowerResponse)) {
                        category = validCategory;
                        break;
                    }
                }
            }
        }

        // If still no valid category, default to Trending
        if (!category) {
            console.warn(`Invalid category response: "${rawResponse}", defaulting to Trending`);
            category = 'Trending';
        }

        console.log(`Classified "${title}" as: ${category}`);
        return NextResponse.json({ category, originalResponse: rawResponse }, { status: 200 });

    } catch (error) {
        console.error('Content classification error:', error);
        return NextResponse.json(
            { error: 'Classification failed', message: error.message },
            { status: 500 }
        );
    }
}