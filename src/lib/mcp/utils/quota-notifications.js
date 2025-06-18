// Quota notification integration with existing notification system
import { connectToDatabase } from '@/lib/mongodb';
import Notification from '@/models/Notification';

export class QuotaNotifications {
    static async sendQuotaWarning(userId, remaining, limit) {
        if (remaining <= 5 && remaining > 0) {
            try {
                await connectToDatabase();
                
                // Check if we already sent a warning today
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const existingWarning = await Notification.findOne({
                    recipientId: userId,
                    type: 'quota_warning',
                    createdAt: { $gte: today }
                });
                
                if (!existingWarning) {
                    await Notification.create({
                        recipientId: userId,
                        type: 'quota_warning',
                        title: 'Web Search Quota Low',
                        message: `You have ${remaining} web searches remaining today. Consider upgrading for more searches.`,
                        data: {
                            remaining: remaining,
                            limit: limit,
                            resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
                        }
                    });
                }
            } catch (error) {
                console.error('Error sending quota warning:', error);
            }
        }
    }
    
    static async sendQuotaExhausted(userId) {
        try {
            await connectToDatabase();
            
            await Notification.create({
                recipientId: userId,
                type: 'quota_exhausted',
                title: 'Web Search Quota Exhausted',
                message: 'You have used all your daily web searches. Your quota will reset tomorrow.',
                data: {
                    resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    upgradeAvailable: true
                }
            });
        } catch (error) {
            console.error('Error sending quota exhausted notification:', error);
        }
    }
}