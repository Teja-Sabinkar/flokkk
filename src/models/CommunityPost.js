import mongoose from 'mongoose';

const CommunityPostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters']
    },
    content: {
      type: String,
      default: '',
      maxlength: [5000, 'Content cannot be more than 5000 characters']
    },
    image: {
      type: String,
      default: null
    },
    voteCount: {
      type: Number,
      default: 0
    },
    // Track upvotes and downvotes by user
    votes: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      vote: {
        type: Number, 
        enum: [-1, 1], // -1 for downvote, 1 for upvote
      }
    }],
    // Track number of comments
    commentCount: {
      type: Number,
      default: 0
    },
    // Track shares
    shareCount: {
      type: Number,
      default: 0
    },
    // Optional tags/hashtags
    tags: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

// Create indexes
CommunityPostSchema.index({ userId: 1, createdAt: -1 });
CommunityPostSchema.index({ username: 1 });
CommunityPostSchema.index({ tags: 1 });

export default mongoose.models.CommunityPost || mongoose.model('CommunityPost', CommunityPostSchema);