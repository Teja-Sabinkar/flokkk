import mongoose from 'mongoose';

const webSearchQuotaSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  dailySearches: {
    type: Number,
    default: 0
  },
  lastResetDate: {
    type: Date,
    default: Date.now
  },
  totalSearches: {
    type: Number,
    default: 0
  },
  subscriptionTier: {
    type: String,
    enum: ['free', 'basic', 'pro'],
    default: 'free'
  },
  dailyLimit: {
    type: Number,
    default: 30 // Free tier limit
  }
}, {
  timestamps: true
});

// Index for efficient queries
webSearchQuotaSchema.index({ userId: 1 });
webSearchQuotaSchema.index({ lastResetDate: 1 });

export default mongoose.models.WebSearchQuota || mongoose.model('WebSearchQuota', webSearchQuotaSchema);