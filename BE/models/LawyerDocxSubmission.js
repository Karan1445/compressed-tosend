const mongoose = require('mongoose');

const LawyerDocxSubmissionSchema = new mongoose.Schema({
  docxId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LawyerDocx',
    required: true,
  },
  signerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  placeholderMappings: [{
    occurrenceKey: String,
    questionId: String,
    placeholderText: String,
    label: String
  }],
  clauseConfigs: [{
    questionId: String,
    clauseName: String,
    clauseText: String,
    operator: String,
    value: String,
    actionType: String,
    occurrenceIndex: Number
  }],
  repeatingConfigs: [{
    questionId: String,
    clauseName: String,
    clauseText: String,
    occurrenceIndex: Number
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

module.exports = mongoose.model('LawyerDocxSubmission', LawyerDocxSubmissionSchema);
