const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Access Denied: No Token Provided' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            _id: decoded.userId
        };
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or Expired Token' });
    }
};

router.use(verifyToken);

router.get('/', async (req, res) => {
    try {
        const questions = await Question.find({ userID: req?.user._id }).lean();
        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.get('/all', async (req, res) => {
    try {
        const questions = await Question.find().lean();
        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/', async (req, res) => {

    try {
        const newQuestion = new Question({
            userID: req.user._id,
            question: req.body.question,
            type: req.body.type,
            required: req.body.required,
            options: req.body.options || [],
            dependsOnId: req.body.dependsOnId || null,
            dependsOnValue: req.body.dependsOnValue || ''
        });
        const savedQuestion = await newQuestion.save();
        res.status(201).json(savedQuestion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/bulk/delete', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Please provide an array of IDs to delete.' });
        }

        const result = await Question.deleteMany({
            _id: { $in: ids },
        });

        res.json({
            message: 'Bulk deletion completed',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const question = await Question.findOne({ _id: req.params.id, userID: req.user._id });
        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }
        res.json(question);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const updatedQuestion = await Question.findOneAndUpdate(
            { _id: req.params.id, userID: req.user._id },
            {
                question: req.body.question,
                type: req.body.type,
                required: req.body.required,
                options: req.body.options || [],
                dependsOnId: req.body.dependsOnId || null,
                dependsOnValue: req.body.dependsOnValue || ''
            },
            { new: true, runValidators: true }
        );

        if (!updatedQuestion) {
            return res.status(404).json({ message: 'Question not found' });
        }
        res.json(updatedQuestion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deletedQuestion = await Question.findOneAndDelete({ _id: req.params.id, userID: req.user._id });
        if (!deletedQuestion) {
            return res.status(404).json({ message: 'Question not found' });
        }
        res.json({ message: 'Question deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
