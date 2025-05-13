// src/models/UserSettings.js (Enhanced)
import mongoose from 'mongoose';

const UserSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    privacySettings: {
      profileVisibility: {
        type: String,
        enum: ['public', 'followers', 'private'],
        default: 'public'
      },
      showLocation: {
        type: Boolean,
        default: true
      },
      showEmail: {
        type: Boolean,
        default: false
      },
      showSocialLinks: {
        type: Boolean,
        default: true
      },
      showSubscriberCount: {
        type: Boolean,
        default: true
      },
      showInSearch: {
        type: Boolean,
        default: true
      }
    },
    contentSettings: {
      postsVisibility: {
        type: String,
        enum: ['public', 'followers', 'private'],
        default: 'public'
      },
      playlistsVisibility: {
        type: String,
        enum: ['public', 'followers', 'private'],
        default: 'public'
      },
      communityVisibility: {
        type: String,
        enum: ['public', 'followers', 'private'],
        default: 'public'
      },
      defaultPostVisibility: {
        type: String,
        enum: ['public', 'followers', 'private'],
        default: 'public'
      }
    },
    notificationSettings: {
      newFollowers: {
        type: Boolean,
        default: true
      },
      newFollowersDisabledAt: {
        type: Date,
        default: null
      },
      newFollowersReenabledAt: {
        type: Date,
        default: null
      },
      postComments: {
        type: Boolean,
        default: true
      },
      postActivityDisabledAt: {
        type: Date,
        default: null
      },
      postActivityReenabledAt: {
        type: Date,
        default: null
      },
      commentReplies: {
        type: Boolean,
        default: true
      },
      mentions: {
        type: Boolean,
        default: true
      },
      postLikes: {
        type: Boolean,
        default: true
      },
      linkContributions: {
        type: Boolean,
        default: true
      },
      emailNotifications: {
        type: Boolean,
        default: true
      },
      // Add this field:
      communityNotifications: {
        type: Boolean,
        default: true
      },
      communityNotificationsDisabledAt: {
        type: Date,
        default: null
      },
      communityNotificationsReenabledAt: {
        type: Date,
        default: null
      }
    },
    displaySettings: {
      language: {
        type: String,
        default: 'en'
      },
      theme: {
        type: String,
        enum: ['system', 'light', 'dark'],
        default: 'system'
      }
    }
  },
  { timestamps: true }
);

// Create index for faster lookups
UserSettingsSchema.index({ userId: 1 }, { unique: true });

export default mongoose.models.UserSettings || mongoose.model('UserSettings', UserSettingsSchema);