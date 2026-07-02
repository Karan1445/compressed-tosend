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
  mappings: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  layout: [{
    type: mongoose.Schema.Types.Mixed
  }],
  draggedFields: [{
    id: String,
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    question: String,
    type: { type: String },
    options: [String],
    required: Boolean,
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    dependsOnId: String,
    dependsOnValue: String
  }],
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
