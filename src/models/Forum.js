// src/models/Forum.js
import mongoose from 'mongoose';

const ForumSchema = new mongoose.Schema(
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
    // Add this new field
    user: {
      type: String
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    image: {
      type: String,
      default: '/api/placeholder/400/200'
    },
    posts: {
      type: [{
        postId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Post'
        },
        addedAt: {
          type: Date,
          default: Date.now
        }
      }],
      default: []
    }
  },
  { timestamps: true }
);

export default mongoose.models.Forum || mongoose.model('Forum', ForumSchema);