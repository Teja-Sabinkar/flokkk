// src/app/api/cron/hourly-rss/route.js
import { NextResponse } from 'next/server';
import { rotatingRssService } from '@/lib/rotatingRssService';

export async function GET(request) {
    try {
        console.log('⏰ Hourly RSS Cron Job Started');
        const startTime = Date.now();

        // Optional: Verify cron secret for security
        const authHeader = request.headers.get('Authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            console.warn('⚠️ Unauthorized cron request');
            return NextResponse.json({
                error: 'Unauthorized',
                message: 'Invalid or missing cron secret'
            }, { status: 401 });
        }

        // Check if refresh is actually needed
        const statusResult = await rotatingRssService.getRotationStatus();
        if (statusResult.success && !statusResult.needsRefresh) {
            const minutesUntilRefresh = Math.ceil(statusResult.nextRefreshIn / (60 * 1000));
            console.log(`⏭️ Refresh not needed yet. Next refresh in ${minutesUntilRefresh} minutes`);

            return NextResponse.json({
                success: true,
                message: 'Refresh not needed yet',
                nextRefreshIn: statusResult.nextRefreshIn,
                currentBatchAge: statusResult.batchAge,
                itemCount: statusResult.totalItems
            });
        }

        // Fetch fresh news
        const result = await rotatingRssService.fetchFreshNews();
        const duration = Date.now() - startTime;

        if (result.success) {
            console.log('✅ Hourly RSS Cron Job Completed Successfully');
            console.log(`📊 Duration: ${duration}ms, Items: ${result.itemCount}`);

            return NextResponse.json({
                success: true,
                message: 'RSS batch updated successfully',
                duration: `${duration}ms`,
                itemCount: result.itemCount,
                stats: result.stats,
                timestamp: new Date().toISOString()
            });

        } else {
            console.error('❌ Hourly RSS Cron Job Failed');
            console.error('Error:', result.error);

            return NextResponse.json({
                success: false,
                error: 'Failed to update RSS batch',
                message: result.error,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            }, { status: 500 });
        }

    } catch (error) {
        console.error('💥 Hourly RSS Cron Job Error:', error);

        return NextResponse.json({
            success: false,
            error: 'Cron job failed',
            message: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}

// Optional: POST method for manual triggering with parameters
export async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { force = false } = body;

        console.log(`🔧 Manual cron trigger (force: ${force})`);

        // Force refresh regardless of timing if requested
        if (force) {
            const result = await rotatingRssService.fetchFreshNews();
            return NextResponse.json({
                success: result.success,
                message: result.success ? 'Forced refresh completed' : 'Forced refresh failed',
                itemCount: result.itemCount || 0,
                error: result.error || null
            });
        }

        // Otherwise use normal logic (check if refresh needed)
        return await GET(request);

    } catch (error) {
        console.error('Manual cron trigger error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}