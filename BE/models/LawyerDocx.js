const mongoose = require('mongoose');

const LawyerDocxSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  isDraft: {
    type: Boolean,
    default: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
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
  assignees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

module.exports = mongoose.model('LawyerDocx', LawyerDocxSchema);
