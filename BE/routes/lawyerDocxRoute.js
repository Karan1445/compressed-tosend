const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const LawyerDocx = require('../models/LawyerDocx');
const LawyerDocxSubmission = require('../models/LawyerDocxSubmission');
const { requirePermission } = require('../middleware/auth');
const Package = require('../models/Package');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'lawyer-' + file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
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

router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ msg: 'Document name is required' });
    }
    const newDocx = new LawyerDocx({
      name,
      isDraft: true,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      path: 'uploads/' + req.file.filename,
      uploadedBy: req.user._id,
    });
    const savedDocx = await newDocx.save();
    res.json({ msg: 'File uploaded successfully', doc: savedDocx });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.get('/list', async (req, res) => {
  try {
    const docs = await LawyerDocx.find({ uploadedBy: req.user._id }).sort({ uploadDate: -1 });
    res.json(docs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.put('/:id/mappings', async (req, res) => {
  try {
    const { placeholderMappings, clauseConfigs, repeatingConfigs } = req.body;

    const doc = await LawyerDocx.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    if (doc.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    if (placeholderMappings) doc.placeholderMappings = placeholderMappings;
    if (clauseConfigs) {
      doc.clauseConfigs = clauseConfigs.map(c => ({
        ...c,
        questionId: c.questionId || c.fieldId
      }));
    }
    if (repeatingConfigs) {
      doc.repeatingConfigs = repeatingConfigs.map(c => ({
        ...c,
        questionId: c.questionId || c.fieldId
      }));
    }

    doc.isDraft = false;

    const updatedDoc = await doc.save();

    res.json(updatedDoc);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Document not found' });
    }
  }
});

router.post('/:id/assign', async (req, res) => {
  try {
    const { assigneeIds } = req.body;
    const doc = await LawyerDocx.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    if (doc.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    const currentAssignees = doc.assignees ? doc.assignees.map(id => id.toString()) : [];
    doc.assignees = [...new Set([...currentAssignees, ...assigneeIds])];
    await doc.save();

    for (const assigneeId of assigneeIds) {
      const submission = new LawyerDocxSubmission({
        docxId: doc._id,
        signerId: assigneeId,
        status: 'pending',
        placeholderMappings: doc.placeholderMappings,
        clauseConfigs: doc.clauseConfigs,
        repeatingConfigs: doc.repeatingConfigs
      });
      await submission.save();
    }

    res.json(doc);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Document not found' });
    }
    res.status(500).send('Server Error');
  }
});

router.get('/assigned', requirePermission('sign'), async (req, res) => {
  try {
    const submissions = await LawyerDocxSubmission.find({ signerId: req.user._id, status: 'pending' })
      .populate('docxId')
      .sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post('/:id/submit', requirePermission('sign'), async (req, res) => {
  try {
    const { answers } = req.body;
    const submission = await LawyerDocxSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ msg: 'Assignment not found' });
    }

    if (submission.signerId.toString() !== req.user._id.toString() && req.user.role !== 'Super Admin') {
      return res.status(403).json({ msg: 'You are not assigned to this document' });
    }

    submission.answers = answers;
    submission.status = 'completed';
    submission.submittedAt = Date.now();
    await submission.save();

    const doc = await LawyerDocx.findById(submission.docxId);
    if (doc) {
      const idx = doc.assignees.findIndex(id => id.toString() === req.user._id.toString());
      if (idx !== -1) {
        doc.assignees.splice(idx, 1);
        doc.markModified('assignees');
        await doc.save();
      }
    }

    res.json({ msg: 'Document submitted successfully', submission });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Document/Assignment not found' });
    }
    res.status(500).send('Server Error');
  }
});

router.get('/:id/submissions', async (req, res) => {
  try {
    const doc = await LawyerDocx.findById(req.params.id);
    if (!doc) return res.status(404).json({ msg: 'Document not found' });

    if (doc.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'Super Admin') {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    const submissions = await LawyerDocxSubmission.find({ docxId: req.params.id })
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

router.delete('/:id', async (req, res) => {
  try {
    const packages = await Package.find({ documents: req.params.id }).lean();

    if (packages.length > 0) {
      return res.status(404).json({ msg: `${packages.length} Contains this document! Please remove document from package first` })
    }

    const doc = await LawyerDocx.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    if (doc.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'Super Admin') {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    const filePath = path.join(__dirname, '../', doc.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await LawyerDocx.findByIdAndDelete(req.params.id);
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
