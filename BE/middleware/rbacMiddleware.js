const Role = require('../models/Role');

 
const isLawyer = async (req, res, next) => {
  try {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'Access denied: No role assigned' });
    }
    const role = await Role.findById(req.user.role).lean();
    if (!role || !role.permissions || !role.permissions.includes('send')) {
      return res.status(403).json({ error: 'Access denied: Requires send permission' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify permissions' });
  }
};

 
const isUser = async (req, res, next) => {
  try {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'Access denied: No role assigned' });
    }
    const role = await Role.findById(req.user.role).lean();
    if (!role || !role.permissions || !role.permissions.includes('sign')) {
      return res.status(403).json({ error: 'Access denied: Requires sign permission' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify permissions' });
  }
};

module.exports = { isLawyer, isUser };
