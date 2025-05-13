import mongoose from 'mongoose';

const FollowSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// Compound index to ensure a user can only follow another user once
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

export default mongoose.models.Follow || mongoose.model('Follow', FollowSchema);