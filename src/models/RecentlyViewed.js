import mongoose from 'mongoose';

// Schema definition for Recently Viewed
const RecentlyViewedSchema = new mongoose.Schema(
  {
    // Store the raw user ID string from the JWT token
    userId: {
      type: String,
      required: true
    },
    // Store the raw post ID string
    postId: {
      type: String,
      required: true
    },
    // When the post was viewed
    viewedAt: {
      type: Date,
      default: Date.now
    },
    // Additional metadata for debugging
    metadata: {
      type: Object,
      default: {}
    }
  },
  { timestamps: true }
);

// Create indexes for efficient querying
RecentlyViewedSchema.index({ userId: 1, postId: 1 }, { unique: true });
RecentlyViewedSchema.index({ userId: 1, viewedAt: -1 });

// Export the model (safely handle model already exists case)
export default mongoose.models.RecentlyViewed || 
  mongoose.model('RecentlyViewed', RecentlyViewedSchema);