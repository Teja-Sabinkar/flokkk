import mongoose from 'mongoose';

// Define schema for creator links
const CreatorLinkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  voteCount: {
    type: Number,
    default: 0
  },
  // Store votes by user ID
  votes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

// Define schema for community links
const CommunityLinkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  contributorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  contributorUsername: {
    type: String
  },
  votes: {
    type: Number,
    default: 0
  },
  // Store votes by user ID
  userVotes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

const PostSchema = new mongoose.Schema(
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
      required: true
    },
    content: {
      type: String,
      default: ''
    },
    image: {
      type: String,
      default: null
    },
    videoUrl: {
      type: String,
      default: null
    },
    hashtags: {
      type: [String],
      default: []
    },
    discussions: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    // Add creator links field with the proper schema
    creatorLinks: {
      type: [CreatorLinkSchema],
      default: []
    },
    // Add community links field with the community link schema
    communityLinks: {
      type: [CommunityLinkSchema],
      default: []
    }
  },
  { 
    timestamps: true,
    // This ensures that fields not in the schema are still saved
    strict: false 
  }
);

// Clear the model if it exists to prevent overwrite errors
mongoose.models = {};

// Export the model
export default mongoose.models.Post || mongoose.model('Post', PostSchema);