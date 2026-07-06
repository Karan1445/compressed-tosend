const mongoose = require('mongoose');

// Schema for individual options (radio, checkbox, dropdown)
const optionItemSchema = new mongoose.Schema({
  value: { type: String, default: '' },
  showTextInput: { type: Boolean, default: false }
}, { _id: false });

// Schema for group sub-fields
const groupFieldSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  type: { type: String, default: 'Text' },
  required: { type: Boolean, default: true },
  visible: { type: Boolean, default: true },
  configuration: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

// Schema for appearance condition
const conditionSchema = new mongoose.Schema({
  questionId: { type: String },
  operator: { type: String },
  value: { type: String }
}, { _id: false });

const lawyerQuestionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  answerType: {
    type: String,
    enum: ['Text', 'Radio-selection', 'Dropdown-selection', 'Group Fields',
      'Date-picker', 'Email', 'Phone Number', 'Number', 'Amount',
      'Percentage', 'Address', 'Checkbox'],
    required: true
  },
  configuration: { type: mongoose.Schema.Types.Mixed, default: {} },
  required: { type: Boolean, default: true },
  appearanceCondition: { type: conditionSchema, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('LawyerQuestion', lawyerQuestionSchema);
