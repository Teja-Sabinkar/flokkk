import { NextResponse } from 'next/server';
import { QuotaResetScheduler } from '@/lib/quota-reset-scheduler';
import { StartupInitializer } from '@/lib/startup-init';

// Track initialization status in memory
let isInitialized = false;
let initializationError = null;

export async function POST(request) {
    try {
        // Prevent duplicate initialization
        if (isInitialized) {
            return NextResponse.json({ 
                success: true, 
                message: 'MCP system already initialized',
                alreadyInitialized: true 
            });
        }

        console.log('🚀 Initializing MCP system via API...');
        
        // Initialize the MCP system
        await StartupInitializer.initialize();
        
        // Start the quota reset scheduler
        QuotaResetScheduler.startScheduler();
        
        // Mark as initialized
        isInitialized = true;
        initializationError = null;
        
        console.log('✅ MCP system initialization complete');
        
        return NextResponse.json({ 
            success: true, 
            message: 'MCP system initialized successfully',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ MCP system initialization failed:', error);
        initializationError = error.message;
        
        return NextResponse.json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}

export async function GET(request) {
    return NextResponse.json({
        initialized: isInitialized,
        error: initializationError,
        timestamp: new Date().toISOString()
    });
}