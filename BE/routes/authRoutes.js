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
    const defaultRole = await Role.findOne({ name: 'Signer' }).lean();
    
    const newUser = new User({ name, email, password, role: defaultRole ? defaultRole._id : null });
    await newUser.save();

    const token = generateToken(newUser._id);
    const { password: _, ...userWithoutPassword } = newUser.toObject();
    
    userWithoutPassword.role = defaultRole;
    userWithoutPassword.permissions = defaultRole ? defaultRole.permissions : [];

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
    const user = await User.findOne({ email }).populate('role').lean();
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = generateToken(user._id);
    const { password: _, ...userWithoutPassword } = user;

    userWithoutPassword.permissions = user.role ? user.role.permissions : [];

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
    const user = await User.findById(req.user._id).populate('role').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password: _, ...userWithoutPassword } = user;
    userWithoutPassword.permissions = user.role ? user.role.permissions : [];
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

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration
    await user.save();

    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;
    sendForgetPassToUser(user.name, user.email, resetLink);
    
    res.json({
      message: 'A password reset link has been sent to your email.'
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Password reset token is invalid or has expired' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Your password has been successfully reset! You can now log in.' });
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
