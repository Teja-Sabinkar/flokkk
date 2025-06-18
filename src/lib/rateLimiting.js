import { connectToDatabase } from './mongodb';
import WebSearchQuota from '@/models/WebSearchQuota';

/**
 * Enhanced rate limiting service for Claude AI requests + Web Search quotas
 */
export class RateLimiter {
    constructor() {
        this.windowMs = 60 * 60 * 1000; // 1 hour window for AI requests
        this.maxRequests = 30; // 30 AI requests per hour per user
        this.collectionName = 'ratelimits';
        
        // Web search limits by tier
        this.webSearchLimits = {
            free: 30,
            basic: 100,
            pro: 300
        };
    }

    /**
     * Check if user can make an AI request (existing functionality)
     */
    async checkRateLimit(userId, type = 'manual') {
        try {
            const { db } = await connectToDatabase();
            const now = new Date();
            const windowStart = new Date(now.getTime() - this.windowMs);

            const limits = {
                suggestion: 60,
                manual: 30
            };

            const maxRequests = limits[type] || this.maxRequests;
            const key = `${userId}_${type}`;

            const currentUsage = await db.collection(this.collectionName).findOne({
                key: key,
                timestamp: { $gte: windowStart }
            });

            if (currentUsage && currentUsage.count >= maxRequests) {
                const resetTime = new Date(currentUsage.timestamp.getTime() + this.windowMs);
                return {
                    allowed: false,
                    remainingRequests: 0,
                    resetTime: resetTime,
                    message: `Rate limit exceeded. You can make ${maxRequests} ${type} requests per hour.`
                };
            }

            await db.collection(this.collectionName).findOneAndUpdate(
                { key: key, timestamp: { $gte: windowStart } },
                {
                    $inc: { count: 1 },
                    $setOnInsert: { timestamp: now }
                },
                { upsert: true }
            );

            const remainingRequests = maxRequests - ((currentUsage?.count || 0) + 1);

            return {
                allowed: true,
                remainingRequests: remainingRequests,
                resetTime: new Date(now.getTime() + this.windowMs),
                message: `Request allowed. ${remainingRequests} requests remaining this hour.`
            };

        } catch (error) {
            console.error('Rate limiting error:', error);
            return {
                allowed: true,
                remainingRequests: this.maxRequests,
                resetTime: new Date(Date.now() + this.windowMs),
                message: 'Rate limiting unavailable - request allowed'
            };
        }
    }

    /**
     * NEW: Check web search quota for user
     */
    async checkWebSearchQuota(userId) {
        try {
            await connectToDatabase();
            
            let quota = await WebSearchQuota.findOne({ userId });
            
            if (!quota) {
                // Create new quota record for user
                quota = new WebSearchQuota({
                    userId,
                    dailySearches: 0,
                    lastResetDate: new Date(),
                    subscriptionTier: 'free',
                    dailyLimit: this.webSearchLimits.free
                });
                await quota.save();
            }

            // Check if we need to reset daily count (new day)
            const now = new Date();
            const lastReset = new Date(quota.lastResetDate);
            const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);

            if (hoursSinceReset >= 24) {
                quota.dailySearches = 0;
                quota.lastResetDate = now;
                await quota.save();
            }

            const remaining = Math.max(0, quota.dailyLimit - quota.dailySearches);
            const allowed = remaining > 0;

            return {
                allowed,
                remaining,
                used: quota.dailySearches,
                limit: quota.dailyLimit,
                resetTime: new Date(lastReset.getTime() + 24 * 60 * 60 * 1000),
                tier: quota.subscriptionTier
            };

        } catch (error) {
            console.error('Web search quota check error:', error);
            return {
                allowed: false,
                remaining: 0,
                used: 0,
                limit: 30,
                resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                tier: 'free',
                error: error.message
            };
        }
    }

    /**
     * NEW: Consume one web search quota
     */
    async consumeWebSearchQuota(userId) {
        try {
            await connectToDatabase();
            
            const quota = await WebSearchQuota.findOne({ userId });
            
            if (!quota) {
                throw new Error('Quota record not found');
            }

            if (quota.dailySearches >= quota.dailyLimit) {
                throw new Error('Daily web search limit exceeded');
            }

            quota.dailySearches += 1;
            quota.totalSearches += 1;
            await quota.save();

            return {
                success: true,
                remaining: quota.dailyLimit - quota.dailySearches,
                used: quota.dailySearches
            };

        } catch (error) {
            console.error('Error consuming web search quota:', error);
            throw error;
        }
    }

    /**
     * Get user's current rate limit status (enhanced)
     */
    async getStatus(userId, type = 'manual') {
        try {
            const { db } = await connectToDatabase();
            const now = new Date();
            const windowStart = new Date(now.getTime() - this.windowMs);
            const key = `${userId}_${type}`;

            const limits = {
                suggestion: 60,
                manual: 30
            };

            const maxRequests = limits[type] || this.maxRequests;

            const currentUsage = await db.collection(this.collectionName).findOne({
                key: key,
                timestamp: { $gte: windowStart }
            });

            const usedRequests = currentUsage?.count || 0;
            const remainingRequests = Math.max(0, maxRequests - usedRequests);
            const resetTime = currentUsage ?
                new Date(currentUsage.timestamp.getTime() + this.windowMs) :
                new Date(now.getTime() + this.windowMs);

            // Also get web search quota
            const webSearchQuota = await this.checkWebSearchQuota(userId);

            return {
                ai: {
                    maxRequests,
                    usedRequests,
                    remainingRequests,
                    resetTime,
                    type
                },
                webSearch: webSearchQuota
            };
        } catch (error) {
            console.error('Error getting rate limit status:', error);
            return null;
        }
    }

    /**
     * Cleanup old rate limit records (existing functionality)
     */
    async cleanup() {
        try {
            const { db } = await connectToDatabase();
            const cutoff = new Date(Date.now() - this.windowMs * 2);

            await db.collection(this.collectionName).deleteMany({
                timestamp: { $lt: cutoff }
            });

            console.log('Rate limit cleanup completed');
        } catch (error) {
            console.error('Rate limit cleanup error:', error);
        }
    }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Existing middleware (keep unchanged)
export function withRateLimit(handler) {
    return async (req, res) => {
        try {
            let userId = req.ip || 'anonymous';

            if (req.headers.authorization) {
                try {
                    const token = req.headers.authorization.split(' ')[1];
                    const jwt = require('jsonwebtoken');
                    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
                    userId = decoded.id;
                } catch (error) {
                    // Continue with IP-based limiting
                }
            }

            const requestType = req.body?.source === 'suggestion' ? 'suggestion' : 'manual';
            const rateLimit = await rateLimiter.checkRateLimit(userId, requestType);

            if (!rateLimit.allowed) {
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: rateLimit.message,
                    resetTime: rateLimit.resetTime,
                    remainingRequests: rateLimit.remainingRequests
                });
            }

            res.setHeader('X-RateLimit-Limit', requestType === 'suggestion' ? '60' : '30');
            res.setHeader('X-RateLimit-Remaining', rateLimit.remainingRequests.toString());
            res.setHeader('X-RateLimit-Reset', rateLimit.resetTime.toISOString());

            return handler(req, res);
        } catch (error) {
            console.error('Rate limiting middleware error:', error);
            return handler(req, res);
        }
    };
}