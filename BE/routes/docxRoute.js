const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Docx = require('../models/Docx');
const DocxSubmission = require('../models/DocxSubmission');
const { requirePermission } = require('../middleware/auth');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only accept docx files (or pdfs if user accidentally uploads them, but let's restrict to docx for now as per app logic)
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      file.mimetype === 'application/pdf' || 
      file.originalname.endsWith('.docx') || 
      file.originalname.endsWith('.pdf')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only .docx and .pdf files are allowed!'), false);
    }
  }
});

// @route   POST /docx/upload
// @desc    Upload a document
// @access  Private (auth middleware applied in Server.js)
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const newDocx = new Docx({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      path: 'uploads/' + req.file.filename,
      uploadedBy: req.user._id, // Fixed: lean document uses _id
    });

    const savedDocx = await newDocx.save();
    res.json({ msg: 'File uploaded successfully', doc: savedDocx });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /docx/list
// @desc    Get all uploaded documents for the user
// @access  Private
router.get('/list', async (req, res) => {
  try {
    // Fetch docs uploaded by the logged-in user, sorted by newest first
    const docs = await Docx.find({ uploadedBy: req.user._id }).sort({ uploadDate: -1 });
    res.json(docs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /docx/:id/mappings
// @desc    Update mappings for a document
// @access  Private
router.put('/:id/mappings', async (req, res) => {
  try {
    const { mappings, draggedFields } = req.body;
    
    // Find doc and check ownership
    const doc = await Docx.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ msg: 'Document not found' });
    }
    
    if (doc.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    if (mappings) doc.mappings = mappings;
    if (draggedFields) doc.draggedFields = draggedFields;
    
    const updatedDoc = await doc.save();
    
    res.json(updatedDoc);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Document not found' });
    }
  }
});

// @route   POST /docx/:id/assign
// @desc    Assign a document to users
// @access  Private
router.post('/:id/assign', async (req, res) => {
  try {
    const { assigneeIds } = req.body;
    const doc = await Docx.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ msg: 'Document not found' });
    }
    
    if (doc.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    const currentAssignees = doc.assignees ? doc.assignees.map(id => id.toString()) : [];
    doc.assignees = [...new Set([...currentAssignees, ...assigneeIds])];
    const updatedDoc = await doc.save();
    
    res.json(updatedDoc);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Document not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET /docx/assigned
// @desc    Get all documents assigned to the logged in signer
// @access  Private (Requires 'sign' permission)
router.get('/assigned', requirePermission('sign'), async (req, res) => {
  try {
    const docs = await Docx.find({ assignees: { $in: [req.user._id] } }).sort({ uploadDate: -1 });
    res.json(docs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /docx/:id/submit
// @desc    Submit filled document answers
// @access  Private (Requires 'sign' permission)
router.post('/:id/submit', requirePermission('sign'), async (req, res) => {
  try {
    const { answers } = req.body;
    const doc = await Docx.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    // Verify the user is actually assigned to this document
    const isAssigned = doc.assignees && doc.assignees.some(id => id.toString() === req.user._id.toString());
    if (!isAssigned && req.user.role !== 'Super Admin') {
      return res.status(403).json({ msg: 'You are not assigned to this document' });
    }

    const submission = new DocxSubmission({
      docxId: doc._id,
      signerId: req.user._id,
      answers: answers
    });
    
    await submission.save();

    // Remove ONE instance of the user from assignees list so it disappears from their pending dashboard one by one
    const idx = doc.assignees.findIndex(id => id.toString() === req.user._id.toString());
    if (idx !== -1) {
      doc.assignees.splice(idx, 1);
      doc.markModified('assignees');
      await doc.save();
    }

    res.json({ msg: 'Document submitted successfully', submission });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Document not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET /docx/:id/submissions
// @desc    Get all submissions for a document
// @access  Private (Owner or Super Admin)
router.get('/:id/submissions', async (req, res) => {
  try {
    const doc = await Docx.findById(req.params.id);
    if (!doc) return res.status(404).json({ msg: 'Document not found' });
    
    if (doc.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'Super Admin') {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    const submissions = await DocxSubmission.find({ docxId: req.params.id })
      .populate('signerId', 'name email')
      .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Document not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /docx/:id
// @desc    Delete a document
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const doc = await Docx.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    if (doc.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'Super Admin') {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../', doc.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Docx.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Document removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Document not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
