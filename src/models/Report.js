import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema(
  {
    // Information about the reported content
    contentType: {
      type: String,
      enum: ['post', 'user', 'comment'],
      required: true
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'contentType'
    },
    contentDetails: {
      title: String,
      content: String,
      hashtags: [String],
      image: String,
      username: String,
      userId: mongoose.Schema.Types.ObjectId
    },
    
    // Information about the reporter
    reportedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      username: String,
      email: String
    },
    
    // Report details
    reason: {
      type: String,
      required: true
    },
    additionalDetails: {
      type: String,
      default: ''
    },
    
    // Status tracking
    status: {
      type: String,
      enum: ['pending', 'under_review', 'resolved', 'dismissed'],
      default: 'pending'
    },
    moderatorNotes: {
      type: String,
      default: ''
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    
    // Email notification tracking
    emailSent: {
      type: Boolean,
      default: false
    },
    emailSentAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Indexes for efficient queries
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ contentType: 1, contentId: 1 });
ReportSchema.index({ 'reportedBy.userId': 1 });

export default mongoose.models.Report || mongoose.model('Report', ReportSchema);