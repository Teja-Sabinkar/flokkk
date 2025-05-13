import mongoose from 'mongoose';

const PlaylistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Description cannot be more than 500 characters']
    },
    image: {
      type: String,
      default: '/api/placeholder/240/135'
    },
    posts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    }],
    visibility: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public'
    },
    originalPlaylistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Playlist',
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.models.Playlist || mongoose.model('Playlist', PlaylistSchema);