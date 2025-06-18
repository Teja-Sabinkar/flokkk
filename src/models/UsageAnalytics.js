import mongoose from 'mongoose';

const usageAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  queryType: {
    type: String,
    enum: ['database', 'web_search', 'hybrid', 'classification'],
    required: true
  },
  query: {
    type: String,
    required: true
  },
  resultsFound: {
    type: Number,
    default: 0
  },
  responseTime: {
    type: Number, // milliseconds
    default: 0
  },
  cost: {
    type: Number, // in dollars
    default: 0
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String
  },
  userAgent: {
    type: String
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for analytics queries
usageAnalyticsSchema.index({ userId: 1, createdAt: -1 });
usageAnalyticsSchema.index({ queryType: 1, createdAt: -1 });
usageAnalyticsSchema.index({ createdAt: -1 });

export default mongoose.models.UsageAnalytics || mongoose.model('UsageAnalytics', usageAnalyticsSchema);