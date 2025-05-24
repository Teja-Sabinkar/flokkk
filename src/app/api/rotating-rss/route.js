// src/app/api/rotating-rss/route.js
import { NextResponse } from 'next/server';
import { rotatingRssService } from '@/lib/rotatingRssService';

// GET - Get current news batch or specific item
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const itemIndex = searchParams.get('index');
        const includeStatus = searchParams.get('status') === 'true';

        // If requesting specific item by index
        if (itemIndex !== null) {
            const index = parseInt(itemIndex);
            if (isNaN(index) || index < 0) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid index parameter'
                }, { status: 400 });
            }

            const result = await rotatingRssService.getNewsItem(index);
            return NextResponse.json(result);
        }

        // Get current news batch
        const batchResult = await rotatingRssService.getCurrentNewsBatch();

        if (!batchResult.success) {
            return NextResponse.json({
                success: false,
                error: 'Failed to get news batch',
                message: batchResult.error
            }, { status: 500 });
        }

        // Include rotation status if requested
        let statusInfo = null;
        if (includeStatus) {
            const statusResult = await rotatingRssService.getRotationStatus();
            if (statusResult.success) {
                statusInfo = {
                    batchAge: statusResult.batchAge,
                    needsRefresh: statusResult.needsRefresh,
                    nextRefreshIn: statusResult.nextRefreshIn,
                    rotationDuration: statusResult.rotationDuration
                };
            }
        }

        return NextResponse.json({
            success: true,
            items: batchResult.items,
            totalCount: batchResult.totalCount,
            batchId: batchResult.batchId,
            status: statusInfo
        });

    } catch (error) {
        console.error('Rotating RSS API error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            message: error.message
        }, { status: 500 });
    }
}

// POST - Manually trigger refresh (for testing)
export async function POST(request) {
    try {
        console.log('🔄 Manual RSS refresh requested');

        const result = await rotatingRssService.fetchFreshNews();

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'News batch refreshed successfully',
                itemCount: result.itemCount,
                duration: result.duration,
                stats: result.stats
            });
        } else {
            return NextResponse.json({
                success: false,
                error: 'Failed to refresh news batch',
                message: result.error
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Manual RSS refresh error:', error);
        return NextResponse.json({
            success: false,
            error: 'Refresh failed',
            message: error.message
        }, { status: 500 });
    }
}