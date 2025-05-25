// src/app/api/cron/daily-rss/route.js - Daily RSS Cron Job with Cleanup
import { NextResponse } from 'next/server';

// NEW: Import cleanup services
import { rateLimiter } from '@/lib/rateLimiting';
import { responseCache } from '@/lib/responseCache';

export async function GET(request) {
    try {
        console.log('🌅 Daily RSS Cron Job Started');
        const startTime = Date.now();

        // Optional: Verify cron secret for security
        const authHeader = request.headers.get('Authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            console.warn('⚠️ Unauthorized daily cron request');
            return NextResponse.json({
                error: 'Unauthorized',
                message: 'Invalid or missing cron secret'
            }, { status: 401 });
        }

        // Call the daily news fetcher
        console.log('🚀 Triggering daily news fetch...');

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/populate-daily-news`, {
            method: 'GET',
            headers: {
                'User-Agent': 'Turtle-Daily-Cron/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Daily news fetch failed: ${response.status}`);
        }

        const data = await response.json();
        
        // NEW: Add cleanup tasks after RSS fetch
        console.log('🧹 Running daily cleanup tasks...');
        const cleanupResults = {
            rateLimit: 'completed',
            cache: 0,
            errors: []
        };

        try {
            // Clean up rate limiting records
            await rateLimiter.cleanup();
            console.log('✅ Rate limit cleanup completed');
        } catch (rateLimitError) {
            console.error('❌ Rate limit cleanup failed:', rateLimitError);
            cleanupResults.errors.push(`Rate limit cleanup: ${rateLimitError.message}`);
        }

        try {
            // Clean up expired cache entries
            const deletedCacheCount = await responseCache.cleanup();
            cleanupResults.cache = deletedCacheCount;
            console.log(`✅ Cache cleanup completed: ${deletedCacheCount} entries removed`);
        } catch (cacheError) {
            console.error('❌ Cache cleanup failed:', cacheError);
            cleanupResults.errors.push(`Cache cleanup: ${cacheError.message}`);
        }

        const duration = Date.now() - startTime;

        if (data.success) {
            console.log('✅ Daily RSS Cron Job Completed Successfully');
            console.log(`📊 Duration: ${duration}ms, Items: ${data.totalItems}`);
            console.log(`🔄 Rotation: ${data.rotationTime?.totalHours}h total, ${data.rotationTime?.secondsPerItem}s per item`);
            console.log(`🧹 Cleanup: ${cleanupResults.cache} cache entries removed, ${cleanupResults.errors.length} errors`);

            return NextResponse.json({
                success: true,
                message: 'Daily RSS batch updated successfully',
                duration: `${duration}ms`,
                totalItems: data.totalItems,
                successfulSources: data.successfulSources,
                failedSources: data.failedSources,
                rotationTime: data.rotationTime,
                sourceBreakdown: data.sourceBreakdown,
                categoryBreakdown: data.categoryBreakdown,
                nextFetch: data.nextFetch,
                // NEW: Add cleanup results to response
                cleanup: cleanupResults,
                timestamp: new Date().toISOString()
            });

        } else {
            console.error('❌ Daily RSS Cron Job Failed');
            console.error('Error:', data.message);

            return NextResponse.json({
                success: false,
                error: 'Failed to update daily RSS batch',
                message: data.message,
                duration: `${duration}ms`,
                // NEW: Include cleanup results even on failure
                cleanup: cleanupResults,
                timestamp: new Date().toISOString()
            }, { status: 500 });
        }

    } catch (error) {
        console.error('💥 Daily RSS Cron Job Error:', error);

        return NextResponse.json({
            success: false,
            error: 'Daily cron job failed',
            message: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}

// POST method for manual triggering
export async function POST(request) {
    try {
        console.log('🔧 Manual daily RSS cron trigger');

        // Call the daily news fetcher directly
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/populate-daily-news`, {
            method: 'GET'
        });

        if (!response.ok) {
            throw new Error(`Manual daily fetch failed: ${response.status}`);
        }

        const data = await response.json();

        // NEW: Also run cleanup on manual trigger
        console.log('🧹 Running manual cleanup...');
        let cleanupResults = { rateLimit: 'completed', cache: 0, errors: [] };
        
        try {
            await rateLimiter.cleanup();
            const deletedCacheCount = await responseCache.cleanup();
            cleanupResults.cache = deletedCacheCount;
            console.log(`🧹 Manual cleanup: ${deletedCacheCount} cache entries removed`);
        } catch (cleanupError) {
            console.error('Manual cleanup error:', cleanupError);
            cleanupResults.errors.push(cleanupError.message);
        }

        return NextResponse.json({
            success: data.success,
            message: data.success ? 'Manual daily refresh completed' : 'Manual daily refresh failed',
            totalItems: data.totalItems || 0,
            rotationTime: data.rotationTime || null,
            sourceBreakdown: data.sourceBreakdown || {},
            // NEW: Include cleanup results
            cleanup: cleanupResults,
            error: data.message || null
        });

    } catch (error) {
        console.error('Manual daily cron trigger error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}