// Daily quota reset scheduler
import cron from 'node-cron';
import { connectToDatabase } from '@/lib/mongodb';
import WebSearchQuota from '@/models/WebSearchQuota';

export class QuotaResetScheduler {
    static startScheduler() {
        // Reset all user quotas daily at midnight UTC
        cron.schedule('0 0 * * *', async () => {
            console.log('🔄 Starting daily quota reset...');
            
            try {
                await connectToDatabase();
                
                const result = await WebSearchQuota.updateMany(
                    {}, // All users
                    {
                        $set: {
                            dailySearches: 0,
                            lastResetDate: new Date()
                        }
                    }
                );
                
                console.log(`✅ Reset quotas for ${result.modifiedCount} users`);
            } catch (error) {
                console.error('❌ Daily quota reset failed:', error);
            }
        });
        
        console.log('📅 Daily quota reset scheduler started (midnight UTC)');
    }
}