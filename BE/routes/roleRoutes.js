const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const User = require('../models/User');
const { requirePermission } = require('../middleware/auth');
const { sendRoleAssignmentMail } = require('./mailService');

router.get('/', async (req, res) => {
  try {
    const roles = await Role.find().lean();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

router.post('/', requirePermission('create_role'), async (req, res) => {
  try {
    const { name, permissions } = req.body;
    if (!name) return res.status(400).json({ error: 'Role name is required' });

    const existingRole = await Role.findOne({ name });
    if (existingRole) return res.status(400).json({ error: 'Role with this name already exists' });

    const newRole = await Role.create({ name, permissions: permissions || [] });
    res.status(201).json(newRole);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create role' });
  }
});

router.put('/assign/:userId', requirePermission('assign_role'), async (req, res) => {
  try {
    const { roleId } = req.body;
    const { userId } = req.params;

    if (!roleId) return res.status(400).json({ error: 'roleId is required' });

    const role = await Role.findById(roleId);
    if (!role) return res.status(404).json({ error: 'Role not found' });

    const user = await User.findById(userId).populate('role');
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.role && user.role.name === 'Super Admin') {
      return res.status(403).json({ error: 'Cannot modify the role of a Super Admin' });
    }

    user.role = role._id;
    await user.save();

    sendRoleAssignmentMail(user.name, user.email, role.name);

    res.json({ message: 'Role assigned successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

router.put('/:roleId', requirePermission('create_role'), async (req, res) => {
  try {
    const { name, permissions } = req.body;
    const role = await Role.findById(req.params.roleId);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (role.name === 'Super Admin') {
      return res.status(403).json({ error: 'Cannot modify the Super Admin role' });
    }
    if (name) role.name = name;
    if (permissions) role.permissions = permissions;
    await role.save();
    res.json(role);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.delete('/:roleId', requirePermission('create_role'), async (req, res) => {
  try {
    const role = await Role.findById(req.params.roleId);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    if (role.name === 'Super Admin' || role.name === 'Signer') {
      return res.status(403).json({ error: `Cannot delete the '${role.name}' role` });
    }

    const usersWithRole = await User.findOne({ role: role._id });
    if (usersWithRole) {
      return res.status(400).json({ error: `Cannot delete role '${role.name}' because it is assigned to one or more users` });
    }

    await Role.findByIdAndDelete(req.params.roleId);
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

module.exports = router;
