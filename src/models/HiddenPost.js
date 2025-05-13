// src/models/HiddenPost.js
import mongoose from 'mongoose';

const HiddenPostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true
    },
    hiddenAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Create a compound index to ensure a user can only hide a post once
HiddenPostSchema.index({ userId: 1, postId: 1 }, { unique: true });

export default mongoose.models.HiddenPost || mongoose.model('HiddenPost', HiddenPostSchema);