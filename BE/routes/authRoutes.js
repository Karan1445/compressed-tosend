const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { authValidationSchema, authValidationSchemaEdit } = require('../validations/authValidation');
const { sendRegistrationMail, sendForgetPassToUser, sendResetPasswordToUser } = require('./mailService');
const Role = require('../models/Role');
const crypto = require('crypto');

router.post('/register', async (req, res) => {
  try {
    const { error, value } = authValidationSchemaEdit.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({ errors: errorMessages });
    }

    const { name, email, password } = value;
    const newUser = new User({ name, email, password, role: 'Signer' });
    await newUser.save();

    const token = generateToken(newUser._id);
    const { password: _, ...userWithoutPassword } = newUser.toObject();
    
    const roleDoc = await Role.findOne({ name: newUser.role }).lean();
    userWithoutPassword.permissions = roleDoc ? roleDoc.permissions : [];

    sendRegistrationMail(newUser.name, newUser.email);

    res.status(201).json({
      message: 'User registered',
      token,
      user: userWithoutPassword
    });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { error, value } = authValidationSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return res.status(400).json({ errors: errorMessages });
    }

    const { email, password } = value;
    const user = await User.findOne({ email }).lean();
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = generateToken(user._id);
    const { password: _, ...userWithoutPassword } = user;

    const roleDoc = await Role.findOne({ name: user.role }).lean();
    userWithoutPassword.permissions = roleDoc ? roleDoc.permissions : [];

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET current user (with fresh permissions) ─────────────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password: _, ...userWithoutPassword } = user;
    const roleDoc = await Role.findOne({ name: user.role }).lean();
    userWithoutPassword.permissions = roleDoc ? roleDoc.permissions : [];
    res.json({ user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'No account found with this email' });

    const temporaryPassword = crypto.randomBytes(5).toString('hex');

    user.password = temporaryPassword;
    await user.save();
    sendForgetPassToUser(user?.name, user?.email, temporaryPassword)
    res.json({
      message: 'A temporary password has been successfully configured for your account.'
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Email, old password, and new password are all required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });


    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect old password' });

    user.password = newPassword;
    await user.save();
    await sendResetPasswordToUser(user?.name,user?.email)
    res.json({ message: 'Password has been updated successfully. You can now log in using your new credentials.' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
