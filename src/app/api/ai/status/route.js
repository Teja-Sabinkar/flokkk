// src/app/api/ai/status/route.js
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { rateLimiter } from '@/lib/rateLimiting';
import { responseCache } from '@/lib/responseCache';

export async function GET(request) {
    try {
        // Get user info if authenticated
        const headersList = headers();
        const authHeader = headersList.get('Authorization');
        let userId = null;
        let isAuthenticated = false;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
                userId = decoded.id;
                isAuthenticated = true;
            } catch (error) {
                // Invalid token, continue as anonymous
            }
        }

        const response = {
            timestamp: new Date().toISOString(),
            user: {
                authenticated: isAuthenticated,
                userId: userId ? userId.substring(0, 8) + '...' : null
            },
            services: {
                claude: {
                    available: !!process.env.CLAUDE_API_KEY,
                    model: 'claude-3-haiku-20240307'
                }
            }
        };

        // Get rate limiting status if user is authenticated
        if (isAuthenticated && userId) {
            try {
                const [manualStatus, suggestionStatus] = await Promise.all([
                    rateLimiter.getStatus(userId, 'manual'),
                    rateLimiter.getStatus(userId, 'suggestion')
                ]);

                response.rateLimits = {
                    manual: manualStatus,
                    suggestion: suggestionStatus
                };
            } catch (error) {
                console.error('Error getting rate limit status:', error);
                response.rateLimits = {
                    error: 'Unable to fetch rate limit status'
                };
            }
        } else {
            response.rateLimits = {
                message: 'Authentication required to view rate limit status'
            };
        }

        // Get cache statistics (admin info - don't expose sensitive data)
        try {
            const cacheStats = await responseCache.getStats();
            response.cache = {
                enabled: true,
                totalEntries: cacheStats?.totalEntries || 0,
                activeEntries: cacheStats?.activeEntries || 0,
                hitRate: cacheStats?.hitStats?.avgHits > 0 ?
                    `${(cacheStats.hitStats.avgHits).toFixed(1)} avg hits per entry` :
                    'No hit data available'
            };
        } catch (error) {
            console.error('Error getting cache stats:', error);
            response.cache = {
                enabled: true,
                error: 'Unable to fetch cache statistics'
            };
        }

        // Add health check for database
        try {
            const { claudeDbService } = await import('@/lib/claudeDbService');
            const dbHealthy = await claudeDbService.init();
            response.database = {
                status: dbHealthy ? 'connected' : 'error',
                lastChecked: new Date().toISOString()
            };
        } catch (error) {
            response.database = {
                status: 'error',
                error: error.message,
                lastChecked: new Date().toISOString()
            };
        }

        return NextResponse.json(response);

    } catch (error) {
        console.error('Status endpoint error:', error);
        return NextResponse.json({
            error: 'Unable to fetch status',
            message: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}

// Admin endpoint for clearing cache (requires authentication)
export async function DELETE(request) {
    try {
        // Get user info
        const headersList = headers();
        const authHeader = headersList.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];
        let userId = null;

        try {
            const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
            userId = decoded.id;
        } catch (error) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Only allow cache clearing for admin users (implement your admin check here)
        // For now, allow any authenticated user
        const deletedCount = await responseCache.clear();

        return NextResponse.json({
            success: true,
            message: `Cache cleared: ${deletedCount} entries removed`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Cache clear error:', error);
        return NextResponse.json({
            error: 'Failed to clear cache',
            message: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}