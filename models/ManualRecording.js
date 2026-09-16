const mongoose = require('mongoose');

/**
 * A recording for a class that was conducted outside BBB (e.g. Zoom, Meet) and
 * uploaded manually. The video file lives in S3 (bucket lms-video-techpratham);
 * this document only stores metadata + the S3 key.
 *
 * `classDate` is what places the recording in the correct spot in the batch's
 * day-wise recording series.
 */
const manualRecordingSchema = new mongoose.Schema(
  {
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },

    title: { type: String, required: true },
    description: { type: String, default: '' },
    platform: { type: String, default: 'other' }, // zoom | meet | other

    // S3 location within the lms-video-techpratham bucket.
    s3Key: { type: String, required: true },
    fileSize: { type: Number, default: 0 },       // bytes
    durationSec: { type: Number, default: 0 },

    // Drives day-wise ordering alongside BBB recordings.
    classDate: { type: Date, required: true },

    uploadedBy: { type: String, default: '' },     // admin/trainer id or name
    isPublished: { type: Boolean, default: true }, // visible to students when true
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.ManualRecording ||
  mongoose.model('ManualRecording', manualRecordingSchema);
