// Database performance optimization
import { connectToDatabase } from '@/lib/mongodb';

export class DatabaseOptimizer {
    static async createOptimalIndexes() {
        try {
            const { db } = await connectToDatabase();
            
            console.log('Creating optimal indexes for MCP system...');

            // Posts collection indexes
            await db.collection('posts').createIndex({ title: 'text', content: 'text' });
            await db.collection('posts').createIndex({ createdAt: -1 });
            await db.collection('posts').createIndex({ username: 1, createdAt: -1 });
            await db.collection('posts').createIndex({ hashtags: 1 });
            await db.collection('posts').createIndex({ discussions: -1 });

            // Web search quota indexes
            await db.collection('websearchquotas').createIndex({ userId: 1 }, { unique: true });
            await db.collection('websearchquotas').createIndex({ lastResetDate: 1 });
            await db.collection('websearchquotas').createIndex({ subscriptionTier: 1 });

            // Rate limits indexes
            await db.collection('ratelimits').createIndex({ key: 1, timestamp: -1 });
            await db.collection('ratelimits').createIndex({ timestamp: 1 }, { expireAfterSeconds: 7200 }); // 2 hours

            // Web search cache indexes
            await db.collection('websearchcache').createIndex({ key: 1 }, { unique: true });
            await db.collection('websearchcache').createIndex({ timestamp: 1 }, { expireAfterSeconds: 86400 }); // 24 hours

            // Usage analytics indexes
            await db.collection('usageanalytics').createIndex({ userId: 1, createdAt: -1 });
            await db.collection('usageanalytics').createIndex({ queryType: 1, createdAt: -1 });
            await db.collection('usageanalytics').createIndex({ createdAt: -1 });

            console.log('✅ Database indexes created successfully');
            
        } catch (error) {
            console.error('❌ Error creating database indexes:', error);
        }
    }

    static async analyzePerformance() {
        try {
            const { db } = await connectToDatabase();
            
            // Get collection stats
            const collections = ['posts', 'websearchquotas', 'ratelimits', 'websearchcache', 'usageanalytics'];
            const stats = {};

            for (const collection of collections) {
                try {
                    const collStats = await db.collection(collection).stats();
                    stats[collection] = {
                        count: collStats.count,
                        avgObjSize: collStats.avgObjSize,
                        indexSizes: collStats.indexSizes
                    };
                } catch (error) {
                    stats[collection] = { error: 'Collection not found' };
                }
            }

            return stats;
        } catch (error) {
            console.error('Error analyzing database performance:', error);
            return null;
        }
    }
}