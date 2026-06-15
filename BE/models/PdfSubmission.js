const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'PdfTemplate', required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    values: [
      {
        fieldId: { type: String, required: true },
        questionId: { type: String },
        enteredValue: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('PdfSubmission', submissionSchema);
