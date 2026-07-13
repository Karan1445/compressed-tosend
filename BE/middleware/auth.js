const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key', async (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    try {
      const user = await User.findById(decoded.userId).lean();
      if (!user) return res.status(403).json({ error: 'Invalid or expired token' });
      req.user = user;
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Authentication lookup failed' });
    }
  });
};

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback_secret_key', { expiresIn: '7d' });
};

const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(403).json({ error: 'Access denied: No role assigned' });
      }
      const role = await Role.findById(req.user.role).lean();
      if (!role || !role.permissions || !role.permissions.includes(permission)) {
        return res.status(403).json({ error: `Access denied: Requires '${permission}' permission` });
      }
      next();
    } catch (err) {
      return res.status(500).json({ error: 'Failed to verify permissions' });
    }
  };
};

module.exports = {
  authenticateToken,
  generateToken,
  requirePermission
};