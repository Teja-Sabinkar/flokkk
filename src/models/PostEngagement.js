import mongoose from 'mongoose';

const PostEngagementSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    hasSaved: {
      type: Boolean,
      default: false
    },
    hasShared: {
      type: Boolean,
      default: false
    },
    hasViewed: {
      type: Boolean,
      default: false
    },
    hasPenetrated: {
      type: Boolean,
      default: false
    },
    lastSavedAt: {
      type: Date,
      default: null
    },
    lastSharedAt: {
      type: Date,
      default: null
    },
    lastViewedAt: {
      type: Date,
      default: null
    },
    lastPenetratedAt: {
      type: Date,
      default: null
    }
  },
  { 
    timestamps: true,
    // Create compound index to ensure one engagement record per user per post
    indexes: [
      { postId: 1, userId: 1 }
    ]
  }
);

// Ensure unique combination of postId and userId
PostEngagementSchema.index({ postId: 1, userId: 1 }, { unique: true });

// Virtual for checking if user has engaged with post
PostEngagementSchema.virtual('hasEngaged').get(function () {
  return this.hasSaved || this.hasShared || this.hasViewed || this.hasPenetrated;
});

// Ensure virtuals are included in JSON output
PostEngagementSchema.set('toJSON', { virtuals: true });
PostEngagementSchema.set('toObject', { virtuals: true });

export default mongoose.models.PostEngagement || mongoose.model('PostEngagement', PostEngagementSchema);