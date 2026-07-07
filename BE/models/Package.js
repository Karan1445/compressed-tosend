const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Draft', 'Published'],
    default: 'Draft',
  },
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LawyerDocx',
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Package', PackageSchema);
