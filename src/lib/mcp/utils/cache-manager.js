// Web search result caching to reduce Tavily API costs
import { connectToDatabase } from '@/lib/mongodb';

export class WebSearchCache {
    constructor() {
        this.collectionName = 'websearchcache';
        this.cacheExpiryHours = 24; // 24-hour cache as mentioned in guide
    }

    async get(query) {
        try {
            const { db } = await connectToDatabase();
            const cacheKey = this.generateCacheKey(query);
            const cutoff = new Date(Date.now() - this.cacheExpiryHours * 60 * 60 * 1000);

            const cached = await db.collection(this.collectionName).findOne({
                key: cacheKey,
                timestamp: { $gte: cutoff }
            });

            if (cached) {
                console.log('Web search cache hit for:', query);
                return cached.results;
            }

            console.log('Web search cache miss for:', query);
            return null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    async set(query, results) {
        try {
            const { db } = await connectToDatabase();
            const cacheKey = this.generateCacheKey(query);
            
            await db.collection(this.collectionName).findOneAndUpdate(
                { key: cacheKey },
                {
                    $set: {
                        key: cacheKey,
                        query: query,
                        results: results,
                        timestamp: new Date()
                    }
                },
                { upsert: true }
            );

            console.log('Web search results cached for:', query);
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    generateCacheKey(query) {
        return `websearch_${query.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    }

    async cleanup() {
        try {
            const { db } = await connectToDatabase();
            const cutoff = new Date(Date.now() - this.cacheExpiryHours * 60 * 60 * 1000);
            
            const result = await db.collection(this.collectionName).deleteMany({
                timestamp: { $lt: cutoff }
            });

            console.log(`Cleaned up ${result.deletedCount} expired web search cache entries`);
        } catch (error) {
            console.error('Cache cleanup error:', error);
        }
    }
}

export const webSearchCache = new WebSearchCache();