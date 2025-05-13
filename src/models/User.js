import mongoose from 'mongoose';

// Social link schema for user profiles
const SocialLinkSchema = new mongoose.Schema({
  platform: {
    type: String,
    required: true,
    enum: ['Twitter', 'GitHub', 'LinkedIn', 'Instagram', 'Facebook', 'YouTube', 'TikTok', 'Other']
  },
  url: {
    type: String,
    required: true
  }
}, { _id: false });

// Check if models.User already exists to prevent overwriting
const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      maxlength: [60, 'Name cannot be more than 60 characters'],
    },
    username: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple null values (for users who haven't set a username yet)
      lowercase: true,
      trim: true,
      maxlength: [30, 'Username cannot be more than 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 8,
      select: false, // Don't return password in queries
    },
    // Profile information
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot be more than 500 characters'],
      default: '',
    },
    location: {
      type: String,
      maxlength: [100, 'Location cannot be more than 100 characters'],
      default: '',
    },
    website: {
      type: String,
      maxlength: [200, 'Website URL cannot be more than 200 characters'],
      default: '',
    },
    contactInfo: {
      type: String,
      maxlength: [20, 'Contact info cannot be more than 20 characters'],
      default: '',
    },
    profilePicture: {
      type: String,
      default: '/profile-placeholder.jpg',
    },
    profileBanner: {
      type: String,
      default: '',
    },
    socialLinks: {
      type: [SocialLinkSchema],
      default: [],
    },
    // Stats
    subscribers: {
      type: Number,
      default: 0,
    },
    discussions: {
      type: Number,
      default: 0,
    },
    // Authentication and security
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Virtual for usertag
UserSchema.virtual('usertag').get(function() {
  return this.username ? `@${this.username}` : `@${this._id.toString().slice(-8)}`;
});

// Virtual for joinDate (formatted date)
UserSchema.virtual('joinDate').get(function() {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 
                'August', 'September', 'October', 'November', 'December'];
  const date = this.createdAt || new Date();
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
});

// Ensure virtuals are included in JSON output
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);