// src/models/Notification.js
import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['new_post', 'reply', 'mention', 'like', 'follow', 'message', 'contribution'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    read: {
      type: Boolean,
      default: false,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    senderUsername: {
      type: String
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'onModel'
    },
    onModel: {
      type: String,
      enum: ['Post', 'Comment', 'User', 'CommunityPost'],
      required: function() {
        return !!this.relatedId;
      }
    },
    thumbnail: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

// Create indexes for common queries
NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ userId: 1, type: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Notification || 
  mongoose.model('Notification', NotificationSchema);