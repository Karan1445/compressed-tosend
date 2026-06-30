const mongoose = require('mongoose');
const { required } = require('joi');

const userSchema = new mongoose.Schema({
    userID: { type: String, required: true },
    question: { type: String, required: true },
    type: { type: String, required: true },
    required: { type: Boolean, required: true },
    options: [{ type: String }],
    dependsOnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Questions' },
    dependsOnValue: { type: String }
});

module.exports = mongoose.model('Questions', userSchema);
