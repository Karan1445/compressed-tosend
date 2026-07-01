const mongoose = require('mongoose');

const DocxSubmissionSchema = new mongoose.Schema({
  docxId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Docx',
    required: true,
  },
  signerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  answers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true,
    default: {},
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['completed', 'pending'],
    default: 'completed'
  }
});

module.exports = mongoose.model('DocxSubmission', DocxSubmissionSchema);
