// src/lib/rotatingRssService.js
import Parser from 'rss-parser';
import { connectToDatabase } from './mongodb';

const parser = new Parser({
    timeout: 15000, // 15 second timeout
    customFields: {
        feed: ['title', 'description', 'link'],
        item: [
            ['media:content', 'mediaContent'],
            ['media:thumbnail', 'mediaThumbnail'],
            ['description', 'description'],
            ['content:encoded', 'contentEncoded'],
            ['dc:creator', 'creator'],
        ]
    }
});

// Multiple RSS sources for variety (24 calls per day total)
const RSS_SOURCES = [
    // BBC Feeds
    {
        name: 'BBC News',
        url: 'http://feeds.bbci.co.uk/news/rss.xml',
        category: 'General News',
        priority: 1
    },
    {
        name: 'BBC Technology',
        url: 'http://feeds.bbci.co.uk/news/technology/rss.xml',
        category: 'Technology',
        priority: 1
    },
    {
        name: 'BBC Business',
        url: 'http://feeds.bbci.co.uk/news/business/rss.xml',
        category: 'Business',
        priority: 1
    },
    {
        name: 'BBC World',
        url: 'http://feeds.bbci.co.uk/news/world/rss.xml',
        category: 'World News',
        priority: 1
    },
    {
        name: 'BBC Sport',
        url: 'http://feeds.bbci.co.uk/sport/rss.xml',
        category: 'Sport',
        priority: 2
    },

    // CNN Feeds
    {
        name: 'CNN Top Stories',
        url: 'http://rss.cnn.com/rss/edition.rss',
        category: 'General News',
        priority: 2
    },
    {
        name: 'CNN Technology',
        url: 'http://rss.cnn.com/rss/edition_technology.rss',
        category: 'Technology',
        priority: 2
    },
    {
        name: 'CNN Business',
        url: 'http://rss.cnn.com/rss/money_latest.rss',
        category: 'Business',
        priority: 2
    },

    // Additional Tech Sources
    {
        name: 'TechCrunch',
        url: 'https://techcrunch.com/feed/',
        category: 'Technology',
        priority: 3
    },
    {
        name: 'Reuters',
        url: 'https://feeds.reuters.com/reuters/topNews',
        category: 'General News',
        priority: 2
    }
];

export class RotatingRSSService {
    constructor() {
        this.isInitialized = false;
        this.collectionName = 'rotating_news';
    }

    async init() {
        if (this.isInitialized) return;

        try {
            await connectToDatabase();
            this.isInitialized = true;
            console.log('Rotating RSS Service initialized');
        } catch (error) {
            console.error('Failed to initialize Rotating RSS Service:', error);
            throw error;
        }
    }

    // Fetch single RSS feed with error handling
    async fetchSingleFeed(source) {
        try {
            console.log(`Fetching: ${source.name}`);

            const response = await fetch(source.url, {
                headers: {
                    'User-Agent': 'TurtlePlatform/1.0 (+https://turtle.com)',
                    'Accept': 'application/rss+xml, application/xml, text/xml',
                },
                signal: AbortSignal.timeout(15000) // 15 second timeout
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const xmlData = await response.text();
            const feed = await parser.parseString(xmlData);

            // Process items
            const items = feed.items.map(item => ({
                title: this.cleanText(item.title) || 'No title',
                link: item.link || '#',
                description: this.cleanText(item.description || item.contentSnippet) || '',
                pubDate: this.parseDate(item.pubDate),
                source: source.name,
                category: source.category,
                priority: source.priority,
                guid: item.guid || item.link || `${source.name}-${Date.now()}-${Math.random()}`,
                fetchedAt: new Date()
            }));

            console.log(`✅ ${source.name}: ${items.length} items`);
            return { success: true, items, source: source.name };

        } catch (error) {
            console.error(`❌ ${source.name}: ${error.message}`);
            return { success: false, error: error.message, source: source.name };
        }
    }

    // Clean HTML and entities from text
    cleanText(text) {
        if (!text) return '';
        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .trim();
    }

    // Parse date with fallback
    parseDate(dateString) {
        try {
            return dateString ? new Date(dateString) : new Date();
        } catch (error) {
            return new Date();
        }
    }

    // Remove duplicates based on title similarity
    removeDuplicates(items) {
        const seen = new Set();
        return items.filter(item => {
            const normalizedTitle = item.title.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 50); // First 50 chars for comparison

            if (seen.has(normalizedTitle)) {
                return false;
            }

            seen.add(normalizedTitle);
            return true;
        });
    }

    // Fetch fresh news from all sources
    async fetchFreshNews() {
        try {
            await this.init();

            console.log('🔄 Starting hourly RSS fetch...');
            const startTime = Date.now();

            // Fetch all sources concurrently
            const results = await Promise.allSettled(
                RSS_SOURCES.map(source => this.fetchSingleFeed(source))
            );

            // Process results
            let allItems = [];
            let successCount = 0;
            let failCount = 0;

            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value.success) {
                    allItems.push(...result.value.items);
                    successCount++;
                } else {
                    failCount++;
                    console.warn(`Failed source: ${result.value?.source || 'Unknown'}`);
                }
            });

            console.log(`📊 Fetch results: ${successCount} success, ${failCount} failed`);

            if (allItems.length === 0) {
                throw new Error('No news items fetched from any source');
            }

            // Remove duplicates
            allItems = this.removeDuplicates(allItems);

            // Sort by priority and publication date
            allItems.sort((a, b) => {
                if (a.priority !== b.priority) {
                    return a.priority - b.priority; // Lower priority number = higher priority
                }
                return new Date(b.pubDate) - new Date(a.pubDate); // Newer first
            });

            // Take top items (aim for around 60, but use what we have)
            const targetCount = Math.min(allItems.length, 80); // Max 80 items
            allItems = allItems.slice(0, targetCount);

            console.log(`📰 Final count: ${allItems.length} news items`);

            // Store in database
            await this.storeNewsBatch(allItems);

            const duration = Date.now() - startTime;
            console.log(`✅ Fetch completed in ${duration}ms`);

            return {
                success: true,
                itemCount: allItems.length,
                duration,
                stats: { successCount, failCount },
                items: allItems
            };

        } catch (error) {
            console.error('❌ Fresh news fetch failed:', error);
            return {
                success: false,
                error: error.message,
                itemCount: 0
            };
        }
    }

    // Store news batch in database (replace old batch)
    async storeNewsBatch(items) {
        try {
            await this.init();
            const { db } = await connectToDatabase();

            // Delete all existing items
            await db.collection(this.collectionName).deleteMany({});
            console.log('🗑️ Cleared old news items');

            // Insert new items with rotation metadata
            const itemsWithMeta = items.map((item, index) => ({
                ...item,
                rotationIndex: index,
                batchId: new Date().toISOString(),
                createdAt: new Date()
            }));

            if (itemsWithMeta.length > 0) {
                await db.collection(this.collectionName).insertMany(itemsWithMeta);
                console.log(`💾 Stored ${itemsWithMeta.length} news items`);
            }

            return itemsWithMeta.length;

        } catch (error) {
            console.error('❌ Failed to store news batch:', error);
            throw error;
        }
    }

    // Get current news batch for rotation
    async getCurrentNewsBatch() {
        try {
            await this.init();
            const { db } = await connectToDatabase();

            const items = await db.collection(this.collectionName)
                .find({})
                .sort({ rotationIndex: 1 })
                .toArray();

            return {
                success: true,
                items: items.map(item => ({
                    id: item._id.toString(),
                    title: item.title,
                    link: item.link,
                    description: item.description,
                    source: item.source,
                    category: item.category,
                    pubDate: item.pubDate,
                    rotationIndex: item.rotationIndex,
                    batchId: item.batchId
                })),
                totalCount: items.length,
                batchId: items[0]?.batchId || null
            };

        } catch (error) {
            console.error('❌ Failed to get current news batch:', error);
            return {
                success: false,
                error: error.message,
                items: [],
                totalCount: 0
            };
        }
    }

    // Get specific news item by rotation index
    async getNewsItem(rotationIndex) {
        try {
            await this.init();
            const { db } = await connectToDatabase();

            const item = await db.collection(this.collectionName)
                .findOne({ rotationIndex });

            if (!item) {
                return { success: false, error: 'Item not found' };
            }

            return {
                success: true,
                item: {
                    id: item._id.toString(),
                    title: item.title,
                    link: item.link,
                    description: item.description,
                    source: item.source,
                    category: item.category,
                    pubDate: item.pubDate,
                    rotationIndex: item.rotationIndex
                }
            };

        } catch (error) {
            console.error('❌ Failed to get news item:', error);
            return { success: false, error: error.message };
        }
    }

    // Get rotation status and timing info
    async getRotationStatus() {
        try {
            await this.init();
            const { db } = await connectToDatabase();

            // Get the most recent batch info
            const latestItem = await db.collection(this.collectionName)
                .findOne({}, { sort: { createdAt: -1 } });

            if (!latestItem) {
                return {
                    success: false,
                    error: 'No news batch found',
                    needsRefresh: true
                };
            }

            const batchCreatedAt = new Date(latestItem.createdAt);
            const now = new Date();
            const batchAge = now - batchCreatedAt;
            const oneHour = 60 * 60 * 1000;

            const totalItems = await db.collection(this.collectionName).countDocuments();

            return {
                success: true,
                batchId: latestItem.batchId,
                batchCreatedAt,
                batchAge,
                totalItems,
                needsRefresh: batchAge >= oneHour,
                nextRefreshIn: Math.max(0, oneHour - batchAge),
                rotationDuration: totalItems * 30 * 1000 // 30 seconds per item in milliseconds
            };

        } catch (error) {
            console.error('❌ Failed to get rotation status:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create singleton instance
export const rotatingRssService = new RotatingRSSService();