const express = require('express');
const router = express.Router();
const Package = require('../models/Package');
const { authenticateToken } = require('../middleware/auth');
const { isLawyer } = require('../middleware/rbacMiddleware');

router.get('/', authenticateToken, isLawyer, async (req, res) => {
  try {
    const packages = await Package.find({ createdBy: req.user._id }).populate('documents', 'name originalName fileName');
    res.json(packages);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticateToken, isLawyer, async (req, res) => {
  try {
    const { name, status, documents } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const newPackage = new Package({
      name,
      status: status || 'Draft',
      documents: documents || [],
      createdBy: req.user._id
    });

    await newPackage.save();
    
    const populated = await Package.findById(newPackage._id).populate('documents', 'name originalName fileName');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticateToken, isLawyer, async (req, res) => {
  try {
    const { name, status, documents } = req.body;
    
    const packageDoc = await Package.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!packageDoc) {
      return res.status(404).json({ error: 'Package not found' });
    }

    if (name) packageDoc.name = name;
    if (status) packageDoc.status = status;
    if (documents) packageDoc.documents = documents;

    await packageDoc.save();
    
    const populated = await Package.findById(packageDoc._id).populate('documents', 'name originalName fileName');
    res.json(populated);
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticateToken, isLawyer, async (req, res) => {
  try {
    const deleted = await Package.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!deleted) {
      return res.status(404).json({ error: 'Package not found' });
    }
    res.json({ message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
