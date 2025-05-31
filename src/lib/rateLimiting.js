// src/lib/rateLimiting.js
import { connectToDatabase } from './mongodb';

/**
 * Rate limiting service for Claude AI requests
 * Implements per-user quotas to control API costs
 */
export class RateLimiter {
    constructor() {
        this.windowMs = 60 * 60 * 1000; // 1 hour window
        this.maxRequests = 30; // 30 requests per hour per user (updated from 10)
        this.collectionName = 'ratelimits';
    }

    /**
     * Check if user can make a request
     * @param {string} userId - User ID or IP address
     * @param {string} type - Request type ('suggestion' or 'manual')
     */
    async checkRateLimit(userId, type = 'manual') {
        try {
            const { db } = await connectToDatabase();
            const now = new Date();
            const windowStart = new Date(now.getTime() - this.windowMs);

            // Different limits for different request types - UPDATED LIMITS
            const limits = {
                suggestion: 60, // Higher limit for suggestions (updated from 20)
                manual: 30      // Lower limit for manual queries (updated from 10)
            };

            const maxRequests = limits[type] || this.maxRequests;
            const key = `${userId}_${type}`;

            // Get current usage
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
                    message: `Rate limit exceeded. You can make ${maxRequests} ${type} requests per hour. Try again at ${resetTime.toLocaleTimeString()}`
                };
            }

            // Update usage count
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
            // Fail open - allow request if rate limiting fails
            return {
                allowed: true,
                remainingRequests: this.maxRequests,
                resetTime: new Date(Date.now() + this.windowMs),
                message: 'Rate limiting unavailable - request allowed'
            };
        }
    }

    /**
     * Clean up old rate limit records
     */
    async cleanup() {
        try {
            const { db } = await connectToDatabase();
            const cutoff = new Date(Date.now() - this.windowMs * 2); // Keep records for 2 windows

            await db.collection(this.collectionName).deleteMany({
                timestamp: { $lt: cutoff }
            });

            console.log('Rate limit cleanup completed');
        } catch (error) {
            console.error('Rate limit cleanup error:', error);
        }
    }

    /**
     * Get user's current rate limit status
     * @param {string} userId - User ID
     * @param {string} type - Request type
     */
    async getStatus(userId, type = 'manual') {
        try {
            const { db } = await connectToDatabase();
            const now = new Date();
            const windowStart = new Date(now.getTime() - this.windowMs);
            const key = `${userId}_${type}`;

            // UPDATED LIMITS
            const limits = {
                suggestion: 60, // Updated from 20
                manual: 30      // Updated from 10
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

            return {
                maxRequests,
                usedRequests,
                remainingRequests,
                resetTime,
                type
            };
        } catch (error) {
            console.error('Error getting rate limit status:', error);
            return null;
        }
    }
}

// Export a singleton instance
export const rateLimiter = new RateLimiter();

// Middleware function for Next.js API routes
export function withRateLimit(handler) {
    return async (req, res) => {
        try {
            // Extract user ID from JWT token or use IP as fallback
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

            // Determine request type from body
            const requestType = req.body?.source === 'suggestion' ? 'suggestion' : 'manual';

            // Check rate limit
            const rateLimit = await rateLimiter.checkRateLimit(userId, requestType);

            if (!rateLimit.allowed) {
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message: rateLimit.message,
                    resetTime: rateLimit.resetTime,
                    remainingRequests: rateLimit.remainingRequests
                });
            }

            // Add rate limit headers - UPDATED VALUES
            res.setHeader('X-RateLimit-Limit', requestType === 'suggestion' ? '60' : '30');
            res.setHeader('X-RateLimit-Remaining', rateLimit.remainingRequests.toString());
            res.setHeader('X-RateLimit-Reset', rateLimit.resetTime.toISOString());

            // Continue to the actual handler
            return handler(req, res);
        } catch (error) {
            console.error('Rate limiting middleware error:', error);
            // Fail open - continue to handler
            return handler(req, res);
        }
    };
}