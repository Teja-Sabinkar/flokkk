// src/lib/responseCache.js
import { connectToDatabase } from './mongodb';
import crypto from 'crypto';

/**
 * Response caching service for Claude AI responses
 * Implements 5-10 minute caching to reduce API costs
 */
export class ResponseCache {
    constructor() {
        this.defaultTtl = 5 * 60 * 1000; // 5 minutes in milliseconds
        this.suggestionTtl = 10 * 60 * 1000; // 10 minutes for suggestions (more stable)
        this.collectionName = 'responsecache';
    }

    /**
     * Generate cache key from request parameters
     * @param {string} message - User message
     * @param {string} source - Request source ('suggestion' or 'manual')
     * @param {string} suggestionType - Type of suggestion
     * @param {Array} keywords - Keywords array
     */
    generateCacheKey(message, source, suggestionType = null, keywords = []) {
        const keyData = {
            message: message.toLowerCase().trim(),
            source,
            suggestionType,
            keywords: keywords.sort() // Sort for consistent hashing
        };

        const keyString = JSON.stringify(keyData);
        return crypto.createHash('sha256').update(keyString).digest('hex');
    }

    /**
     * Get cached response if available and not expired
     * @param {string} cacheKey - Cache key
     */
    async get(cacheKey) {
        try {
            const { db } = await connectToDatabase();
            const now = new Date();

            const cached = await db.collection(this.collectionName).findOne({
                key: cacheKey,
                expiresAt: { $gt: now }
            });

            if (cached) {
                console.log(`Cache hit for key: ${cacheKey.substring(0, 8)}...`);

                // Update last accessed time and hit count
                await db.collection(this.collectionName).updateOne(
                    { key: cacheKey },
                    {
                        $set: { lastAccessed: now },
                        $inc: { hitCount: 1 }
                    }
                );

                return {
                    response: cached.response,
                    model: cached.model,
                    usage: cached.usage,
                    dataAvailable: cached.dataAvailable || [],
                    hasMoreDb: cached.hasMoreDb || false,
                    hasMoreAi: cached.hasMoreAi || false,
                    cached: true,
                    cacheAge: now - cached.createdAt
                };
            }

            console.log(`Cache miss for key: ${cacheKey.substring(0, 8)}...`);
            return null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    /**
     * Store response in cache
     * @param {string} cacheKey - Cache key
     * @param {Object} response - Response to cache
     * @param {string} source - Request source for TTL determination
     */
    async set(cacheKey, response, source = 'manual') {
        try {
            const { db } = await connectToDatabase();
            const now = new Date();
            const ttl = source === 'suggestion' ? this.suggestionTtl : this.defaultTtl;
            const expiresAt = new Date(now.getTime() + ttl);

            await db.collection(this.collectionName).findOneAndUpdate(
                { key: cacheKey },
                {
                    $set: {
                        key: cacheKey,
                        response: response.response,
                        model: response.model,
                        usage: response.usage,
                        dataAvailable: response.dataAvailable || [],
                        hasMoreDb: response.hasMoreDb || false,
                        hasMoreAi: response.hasMoreAi || false,
                        source: source,
                        createdAt: now,
                        lastAccessed: now,
                        expiresAt: expiresAt,
                        ttl: ttl
                    },
                    $setOnInsert: {
                        hitCount: 0
                    }
                },
                { upsert: true }
            );

            console.log(`Cached response for key: ${cacheKey.substring(0, 8)}... (TTL: ${ttl / 1000}s)`);
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    /**
     * Check if a similar query exists in cache (fuzzy matching)
     * @param {string} message - User message
     * @param {number} similarityThreshold - Similarity threshold (0-1)
     */
    async findSimilar(message, similarityThreshold = 0.8) {
        try {
            const { db } = await connectToDatabase();
            const now = new Date();

            // Get recent non-expired cache entries
            const recentEntries = await db.collection(this.collectionName).find({
                expiresAt: { $gt: now },
                createdAt: { $gt: new Date(now.getTime() - 60 * 60 * 1000) } // Last hour
            }).toArray();

            const messageLower = message.toLowerCase().trim();
            const messageWords = new Set(messageLower.split(/\s+/));

            for (const entry of recentEntries) {
                // Simple word-based similarity check
                const cachedMessage = entry.key; // This would need to be stored separately for fuzzy matching
                // For now, skip fuzzy matching and return null
                // In a full implementation, you'd store the original message alongside the hash
            }

            return null;
        } catch (error) {
            console.error('Cache similarity search error:', error);
            return null;
        }
    }

    /**
     * Clean up expired cache entries
     */
    async cleanup() {
        try {
            const { db } = await connectToDatabase();
            const now = new Date();

            const result = await db.collection(this.collectionName).deleteMany({
                expiresAt: { $lt: now }
            });

            console.log(`Cache cleanup: removed ${result.deletedCount} expired entries`);
            return result.deletedCount;
        } catch (error) {
            console.error('Cache cleanup error:', error);
            return 0;
        }
    }

    /**
     * Get cache statistics
     */
    async getStats() {
        try {
            const { db } = await connectToDatabase();
            const now = new Date();

            const stats = await db.collection(this.collectionName).aggregate([
                {
                    $facet: {
                        total: [{ $count: "count" }],
                        active: [
                            { $match: { expiresAt: { $gt: now } } },
                            { $count: "count" }
                        ],
                        bySource: [
                            { $match: { expiresAt: { $gt: now } } },
                            { $group: { _id: "$source", count: { $sum: 1 } } }
                        ],
                        hitStats: [
                            { $match: { expiresAt: { $gt: now } } },
                            {
                                $group: {
                                    _id: null,
                                    totalHits: { $sum: "$hitCount" },
                                    avgHits: { $avg: "$hitCount" },
                                    maxHits: { $max: "$hitCount" }
                                }
                            }
                        ]
                    }
                }
            ]).toArray();

            return {
                totalEntries: stats[0].total[0]?.count || 0,
                activeEntries: stats[0].active[0]?.count || 0,
                bySource: stats[0].bySource || [],
                hitStats: stats[0].hitStats[0] || { totalHits: 0, avgHits: 0, maxHits: 0 }
            };
        } catch (error) {
            console.error('Cache stats error:', error);
            return null;
        }
    }

    /**
     * Clear all cache entries (for maintenance)
     */
    async clear() {
        try {
            const { db } = await connectToDatabase();
            const result = await db.collection(this.collectionName).deleteMany({});
            console.log(`Cache cleared: removed ${result.deletedCount} entries`);
            return result.deletedCount;
        } catch (error) {
            console.error('Cache clear error:', error);
            return 0;
        }
    }

    /**
     * Invalidate cache entries by pattern
     * @param {string} pattern - Pattern to match against cache keys
     */
    async invalidatePattern(pattern) {
        try {
            const { db } = await connectToDatabase();
            const regex = new RegExp(pattern, 'i');

            const result = await db.collection(this.collectionName).deleteMany({
                key: { $regex: regex }
            });

            console.log(`Cache invalidation: removed ${result.deletedCount} entries matching pattern: ${pattern}`);
            return result.deletedCount;
        } catch (error) {
            console.error('Cache invalidation error:', error);
            return 0;
        }
    }
}

// Export singleton instance
export const responseCache = new ResponseCache();

// Helper function to wrap cache logic around API calls
export async function withCache(cacheKey, apiCall, source = 'manual') {
    // Try to get from cache first
    const cached = await responseCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // If not in cache, make the API call
    const response = await apiCall();

    // Cache the response
    await responseCache.set(cacheKey, response, source);

    return response;
}