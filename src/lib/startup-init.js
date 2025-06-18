// Startup initialization for MCP system
import { StartupValidator } from './startup-validator.js';
import { DatabaseOptimizer } from './database-optimizer.js';
import { webSearchCache } from './mcp/utils/cache-manager.js';

export class StartupInitializer {
    static async initialize() {
        console.log('🚀 Initializing flokkk MCP system...');

        // 1. Validate environment
        console.log('1️⃣ Validating environment...');
        const envValidation = await StartupValidator.validateEnvironment();
        
        if (!envValidation.valid) {
            console.error('❌ Environment validation failed:');
            envValidation.errors.forEach(error => console.error(`  - ${error}`));
            throw new Error('Required environment variables missing');
        }

        if (envValidation.warnings.length > 0) {
            console.warn('⚠️ Environment warnings:');
            envValidation.warnings.forEach(warning => console.warn(`  - ${warning}`));
        }

        // 2. Validate services
        console.log('2️⃣ Validating services...');
        const serviceValidation = await StartupValidator.validateServices();
        
        Object.entries(serviceValidation).forEach(([service, status]) => {
            const icon = status ? '✅' : '❌';
            console.log(`  ${icon} ${service}: ${status ? 'OK' : 'FAILED'}`);
        });

        // 3. Optimize database
        console.log('3️⃣ Optimizing database...');
        await DatabaseOptimizer.createOptimalIndexes();

        // 4. Clean up caches
        console.log('4️⃣ Cleaning up caches...');
        await webSearchCache.cleanup();

        // 5. Log system status
        const performance = await DatabaseOptimizer.analyzePerformance();
        if (performance) {
            console.log('📊 Database performance:', performance);
        }

        console.log('🎉 MCP system initialization complete!');
        
        return {
            environment: envValidation,
            services: serviceValidation,
            timestamp: new Date().toISOString()
        };
    }

    static async scheduleCleanupTasks() {
        // Schedule cleanup tasks to run periodically
        setInterval(async () => {
            try {
                await webSearchCache.cleanup();
                console.log('🧹 Scheduled cache cleanup completed');
            } catch (error) {
                console.error('❌ Scheduled cleanup failed:', error);
            }
        }, 60 * 60 * 1000); // Every hour
    }
}