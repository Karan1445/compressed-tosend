const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  permissions: [{ type: String }] // e.g. 'send', 'sign', 'create_role', 'assign_role'
});

module.exports = mongoose.model('Role', roleSchema);
