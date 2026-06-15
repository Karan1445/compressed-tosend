const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Questions', required: true },
    pageNumber: { type: Number, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    placeholder: { type: String, required: true },
    type: { type: String, required: true, enum: ['text', 'dropdown', 'textarea', 'number', 'checkbox'] },
    required: { type: Boolean, default: false },
  },
  { _id: false }
);

const templateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    documentName: { type: String, required: true },
    documentUrl: { type: String, required: true },
    pdfData: { type: String, default: '' },
    recipients: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, required: true, enum: ['sender', 'signer'] },
      },
    ],
    fields: { type: [fieldSchema], default: [] },
    status: { type: String, enum: ['draft', 'sent', 'completed'], default: 'draft' },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PdfTemplate', templateSchema);
