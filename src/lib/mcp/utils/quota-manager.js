import { rateLimiter } from '@/lib/rateLimiting';

export class QuotaManager {
    static async checkWebSearchQuota(userId) {
        return await rateLimiter.checkWebSearchQuota(userId);
    }

    static async consumeWebSearchQuota(userId) {
        return await rateLimiter.consumeWebSearchQuota(userId);
    }

    static async getFullStatus(userId) {
        return await rateLimiter.getStatus(userId);
    }
}