// src/models/Comment.js - Updated with soft delete support
import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const CommentSchema = new Schema(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    },
    level: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    votes: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      vote: {
        type: Number, 
        enum: [-1, 1]
      }
    }],
    replyToId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    },
    replyToUsername: {
      type: String,
      default: null
    },
    // NEW: Soft delete support
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    },
    originalContent: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

// Ensure indexes for efficient queries
CommentSchema.index({ postId: 1, createdAt: -1 });
CommentSchema.index({ parentId: 1 });
CommentSchema.index({ userId: 1 });
CommentSchema.index({ isDeleted: 1 });

// Virtual to check if comment is available (not deleted)
CommentSchema.virtual('isAvailable').get(function () {
  return !this.isDeleted;
});

// Ensure virtuals are included in JSON output
CommentSchema.set('toJSON', { virtuals: true });
CommentSchema.set('toObject', { virtuals: true });

// Handle model compilation more safely
export default models.Comment || model('Comment', CommentSchema);