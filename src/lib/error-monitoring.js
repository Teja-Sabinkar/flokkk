// Error monitoring for MCP system
export class ErrorMonitor {
    static logError(error, context = {}) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            context: context,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
            url: typeof window !== 'undefined' ? window.location.href : 'server'
        };
        
        console.error('🚨 MCP Error:', errorLog);
        
        // In production, send to monitoring service
        if (process.env.NODE_ENV === 'production') {
            // Send to your error monitoring service (Sentry, LogRocket, etc.)
            // this.sendToMonitoringService(errorLog);
        }
    }
    
    static logQuotaEvent(userId, event, data = {}) {
        const quotaLog = {
            timestamp: new Date().toISOString(),
            userId: userId,
            event: event, // 'quota_warning', 'quota_exhausted', 'quota_reset'
            data: data
        };
        
        console.log('📊 Quota Event:', quotaLog);
        
        // Store quota events for analytics
        // this.storeQuotaEvent(quotaLog);
    }
}