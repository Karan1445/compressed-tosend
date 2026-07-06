const express = require('express');
const router = express.Router();
const LawyerQuestion = require('../models/LawyerQuestion');
const { authenticateToken } = require('../middleware/auth');
const { isLawyer } = require('../middleware/rbacMiddleware');

// GET all questions for the logged-in lawyer
router.get('/', authenticateToken, isLawyer, async (req, res) => {
  try {
    const questions = await LawyerQuestion.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single question by ID
router.get('/:id', authenticateToken, isLawyer, async (req, res) => {
  try {
    const q = await LawyerQuestion.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!q) return res.status(404).json({ error: 'Question not found' });
    res.json(q);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new question
router.post('/', authenticateToken, isLawyer, async (req, res) => {
  try {
    const { title, description, persona, answerType, configuration, required, appearanceCondition } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
    const question = new LawyerQuestion({
      title: title.trim(),
      description: description || '',
      persona: persona || 'all',
      answerType,
      configuration: configuration || {},
      required: required !== undefined ? required : true,
      appearanceCondition: appearanceCondition || null,
      createdBy: req.user._id
    });
    const saved = await question.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update question
router.put('/:id', authenticateToken, isLawyer, async (req, res) => {
  try {
    const { title, description, persona, answerType, configuration, required, appearanceCondition } = req.body;
    const updated = await LawyerQuestion.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { title, description, persona, answerType, configuration, required, appearanceCondition },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Question not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE question
router.delete('/:id', authenticateToken, isLawyer, async (req, res) => {
  try {
    const deleted = await LawyerQuestion.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!deleted) return res.status(404).json({ error: 'Question not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
