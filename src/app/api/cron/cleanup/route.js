// src/app/api/cron/cleanup/route.js
import { NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/rateLimiting';
import { responseCache } from '@/lib/responseCache';

export async function GET(request) {
    try {
        // Verify cron job authorization (Vercel cron secret or internal call)
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('Starting cleanup cron job...');

        const startTime = Date.now();
        const results = {
            rateLimit: 0,
            cache: 0,
            errors: []
        };

        // Clean up rate limiting records
        try {
            await rateLimiter.cleanup();
            results.rateLimit = 'completed';
            console.log('Rate limit cleanup completed');
        } catch (error) {
            console.error('Rate limit cleanup failed:', error);
            results.errors.push(`Rate limit cleanup: ${error.message}`);
        }

        // Clean up expired cache entries
        try {
            const deletedCount = await responseCache.cleanup();
            results.cache = deletedCount;
            console.log(`Cache cleanup completed: ${deletedCount} entries removed`);
        } catch (error) {
            console.error('Cache cleanup failed:', error);
            results.errors.push(`Cache cleanup: ${error.message}`);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`Cleanup cron job completed in ${duration}ms`);

        return NextResponse.json({
            success: true,
            duration: `${duration}ms`,
            results,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Cleanup cron job error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}

// Also allow POST for manual triggering
export async function POST(request) {
    return GET(request);
}