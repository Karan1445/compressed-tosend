const express = require('express');
const router = express.Router();
const Package = require('../models/Package');
const LawyerDocx = require('../models/LawyerDocx');
const PackageSubmission = require('../models/PackageSubmission');
const { authenticateToken } = require('../middleware/auth');
const { isLawyer } = require('../middleware/rbacMiddleware');
const PizZip = require('pizzip');
const fs = require('fs');
const path = require('path');

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
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const newPackage = new Package({ name, status: status || 'Draft', documents: documents || [], createdBy: req.user._id });
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
    if (!packageDoc) return res.status(404).json({ error: 'Package not found' });
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
    if (!deleted) return res.status(404).json({ error: 'Package not found' });
    res.json({ message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/store/published', authenticateToken, async (req, res) => {
  try {
    const packages = await Package.find({ status: 'Published' })
      .populate({ path: 'documents', select: 'name originalName fileName path placeholderMappings clauseConfigs repeatingConfigs' });
    res.json(packages);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/store/:id', authenticateToken, async (req, res) => {
  try {
    const pkg = await Package.findOne({ _id: req.params.id, status: 'Published' })
      .populate({ path: 'documents', select: 'name originalName fileName path placeholderMappings clauseConfigs repeatingConfigs' });
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    res.json(pkg);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/store/:id/submit', authenticateToken, async (req, res) => {
  try {
    const { answers } = req.body;
    const pkg = await Package.findOne({ _id: req.params.id, status: 'Published' });
    if (!pkg) return res.status(404).json({ error: 'Package not found' });

    const submission = new PackageSubmission({
      userId: req.user._id,
      packageId: pkg._id,
      status: 'Completed',
      answers
    });
    await submission.save();
    res.json({ submissionId: submission._id, packageId: pkg._id, packageName: pkg.name });
  } catch (error) {
    console.error('Error submitting:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/store/submissions/my', authenticateToken, async (req, res) => {
  try {
    const submissions = await PackageSubmission.find({ userId: req.user._id })
      .populate('packageId', 'name')
      .sort({ createdAt: -1 });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/store/submissions/:id', authenticateToken, async (req, res) => {
  try {
    const submission = await PackageSubmission.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('packageId');
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

function generateFilledDocxBuffer(docPath, placeholderMappings, answers) {
  const content = fs.readFileSync(docPath, 'binary');
  const zip = new PizZip(content);

  const sortedMappings = [...(placeholderMappings || [])].sort((a, b) => {
    const aIdx = parseInt((a.occurrenceKey || '').replace(/[^0-9]/g, ''), 10) || 0;
    const bIdx = parseInt((b.occurrenceKey || '').replace(/[^0-9]/g, ''), 10) || 0;
    return aIdx - bIdx;
  });

  const valueByIndex = {};
  sortedMappings.forEach(m => {
    const idx = parseInt((m.occurrenceKey || '').replace(/[^0-9]/g, ''), 10);
    if (!isNaN(idx)) {
      valueByIndex[idx] = resolveAnswerValue(answers, m.questionId);
    }
  });

  const xmlFiles = Object.keys(zip.files).filter(
    name => name.startsWith('word/') && name.endsWith('.xml') && !name.endsWith('.xml.rels')
  );

  const sortedFiles = xmlFiles.sort((a, b) => {
    const order = (name) => {
      if (name.includes('header')) return 1;
      if (name.includes('document')) return 2;
      if (name.includes('footer')) return 3;
      return 4;
    };
    return order(a) - order(b) || a.localeCompare(b);
  });

  let globalIndex = 0;
  const PLACEHOLDER_REGEX = /_{3,}|\[[^\]]+\]/g;

  for (const fileName of sortedFiles) {
    const file = zip.files[fileName];
    if (!file) continue;
    let xml = file.asText();

    const placeholdersInFile = (xml.match(PLACEHOLDER_REGEX) || []).length;
    const fileStartIndex = globalIndex;

    let localIndex = 0;
    xml = xml.replace(PLACEHOLDER_REGEX, (match) => {
      const absIndex = fileStartIndex + localIndex;
      localIndex++;

      if (valueByIndex.hasOwnProperty(absIndex)) {
        return escapeXml(String(valueByIndex[absIndex]));
      }
      return match; // leave unchanged if not mapped
    });

    globalIndex = fileStartIndex + placeholdersInFile;
    zip.file(fileName, xml);
  }

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;');
}

router.get('/store/submissions/:id/download/raw/:docId', authenticateToken, async (req, res) => {
  try {
    const submission = await PackageSubmission.findOne({ _id: req.params.id, userId: req.user._id });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const doc = await LawyerDocx.findById(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const docxPath = path.join(__dirname, '..', doc.path);
    if (!fs.existsSync(docxPath)) return res.status(404).json({ error: 'Document file not found on disk' });

    const buffer = fs.readFileSync(docxPath);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="raw_template.docx"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error fetching raw DOCX:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/store/submissions/:id/download/pdf/:docId', authenticateToken, async (req, res) => {
  const os = require('os');
  const libre = require('libreoffice-convert');
  const { promisify } = require('util');
  const libreConvert = promisify(libre.convert);
  const tmpDocx = path.join(os.tmpdir(), `pkg_${req.params.id}_${req.params.docId}_${Date.now()}.docx`);

  try {
    const submission = await PackageSubmission.findOne({ _id: req.params.id, userId: req.user._id });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    const doc = await LawyerDocx.findById(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const docxPath = path.join(__dirname, '..', doc.path);
    if (!fs.existsSync(docxPath)) return res.status(404).json({ error: 'Document file not found on disk' });

    const docxBuffer = generateFilledDocxBuffer(docxPath, doc.placeholderMappings, submission.answers || {});

    fs.writeFileSync(tmpDocx, docxBuffer);
    const docxForConvert = fs.readFileSync(tmpDocx);

    const pdfBuffer = await libreConvert(docxForConvert, '.pdf', undefined);

    const filename = (doc.name || 'document').replace(/\.docx$/i, '') + '_filled.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: error.message || 'PDF generation failed. Is LibreOffice installed?' });
  } finally {
    try { if (fs.existsSync(tmpDocx)) fs.unlinkSync(tmpDocx); } catch (e) { }
  }
});

function resolveAnswerValue(answers, questionId) {
  if (!questionId || !answers) return '';
  const parts = questionId.split('.');
  const baseId = parts[0];
  const baseVal = answers[baseId];

  if (baseVal === undefined || baseVal === null) return '';

  if (parts.length === 1) {
    if (typeof baseVal === 'object' && !Array.isArray(baseVal)) {

      return Object.values(baseVal).filter(Boolean).join(', ');
    }
    if (Array.isArray(baseVal)) {
      return baseVal.map(item => {
        if (typeof item === 'object' && item !== null) {
          return Object.values(item).filter(Boolean).join(', ');
        }
        return item;
      }).filter(Boolean).join('; ');
    }
    return String(baseVal || '');
  }

  if (parts[1] === 'address' && parts[2]) {
    if (typeof baseVal === 'object' && !Array.isArray(baseVal)) {
      return String(baseVal[parts[2]] || '');
    }
    return '';
  }

  if (parts[1] === 'group' && parts[2]) {
    if (Array.isArray(baseVal)) {
      return baseVal.map(entry => String((entry || {})[parts[2]] || '')).filter(Boolean).join(', ');
    }
    if (typeof baseVal === 'object') return String(baseVal[parts[2]] || '');
    return '';
  }

  return String(baseVal || '');
}

module.exports = router;
