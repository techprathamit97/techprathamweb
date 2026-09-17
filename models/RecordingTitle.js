const mongoose = require('mongoose');

/**
 * Custom title override for a recording, keyed by its recordId.
 *
 * BBB recordings are NOT stored in our database (they come from the BBB
 * getRecordings API each time), so there is nowhere on them to persist an
 * edited title. This collection holds an optional custom title per recordId for
 * BBB recordings. When present, it overrides the auto-generated
 * "<batchName>-Class-N" label. Manual recordings keep their editable title on
 * the ManualRecording document itself.
 */
const recordingTitleSchema = new mongoose.Schema(
  {
    recordId: { type: String, required: true, unique: true, index: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    title: { type: String, required: true },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.RecordingTitle ||
  mongoose.model('RecordingTitle', recordingTitleSchema);
