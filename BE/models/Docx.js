const mongoose = require('mongoose');

const DocxSchema = new mongoose.Schema({
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
  mappings: {
    type: Map,
    of: String,
    default: {},
  }
});

module.exports = mongoose.model('Docx', DocxSchema);
