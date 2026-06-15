const express = require('express');
const router = express.Router();
const PdfTemplate = require('../models/PdfTemplate');
const PdfSubmission = require('../models/PdfSubmission');
const Question = require('../models/Question');

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

const requireRole = (roles) => (req, res, next) => {
  const userRole = normalizeRole(req.user?.role);
  const allowedRoles = roles.map(normalizeRole);
  if (!req.user || !allowedRoles.includes(userRole)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

router.get('/', async (req, res) => {
  try {
    const query =
      normalizeRole(req.user.role) === 'sender'
        ? { createdBy: req.user._id }
        : { 'recipients.userId': req.user._id };
    const templates = await PdfTemplate.find(query).sort({ createdAt: -1 }).lean();
    if (normalizeRole(req.user.role) !== 'signer') {
      return res.json(templates);
    }

    const templateIds = templates.map((template) => template._id);
    const submissions = await PdfSubmission.find({
      templateId: { $in: templateIds },
      submittedBy: req.user._id,
    }).select('templateId').lean();
    const submittedTemplateIds = new Set(submissions.map((submission) => String(submission.templateId)));
    const annotatedTemplates = templates.map((template) => ({
      ...template,
      alreadySubmitted: submittedTemplateIds.has(String(template._id)),
    }));
    res.json(annotatedTemplates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/questions', async (req, res) => {
  try {
    const questions = await Question.find({ userID: req.user._id }).sort({ _id: 1 }).lean();
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', requireRole(['sender']), async (req, res) => {
  try {
    if (!req.body.documentUrl) {
      return res.status(400).json({ message: 'documentUrl is required' });
    }
    if (!req.body.fields || !Array.isArray(req.body.fields)) {
      return res.status(400).json({ message: 'fields must be an array' });
    }
    const availableQuestions = await Question.find({ userID: req.user._id }).lean();
    const fallbackQuestionId =
      req.body.fields.find((field) => field.questionId)?.questionId ||
      availableQuestions[0]?._id?.toString();
    if (!fallbackQuestionId) {
      return res.status(400).json({ message: 'Create at least one question before saving templates' });
    }
    const normalizedFields = req.body.fields.map((field) => ({
      ...field,
      questionId: field.questionId || fallbackQuestionId,
      required: Boolean(field.required),
    }));
    const template = await PdfTemplate.create({
      title: req.body.title,
      createdBy: req.user._id,
      documentName: req.body.documentName,
      documentUrl: req.body.documentUrl,
      pdfData: req.body.pdfData || '',
      recipients: req.body.recipients || [],
      fields: normalizedFields,
      status: 'draft',
    });
    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', requireRole(['sender']), async (req, res) => {
  try {
    if (!req.body.documentUrl) {
      return res.status(400).json({ message: 'documentUrl is required' });
    }
    if (!req.body.fields || !Array.isArray(req.body.fields)) {
      return res.status(400).json({ message: 'fields must be an array' });
    }
    const availableQuestions = await Question.find({ userID: req.user._id }).lean();
    const fallbackQuestionId =
      req.body.fields.find((field) => field.questionId)?.questionId ||
      availableQuestions[0]?._id?.toString();
    if (!fallbackQuestionId) {
      return res.status(400).json({ message: 'Create at least one question before saving templates' });
    }
    const normalizedFields = req.body.fields.map((field) => ({
      ...field,
      questionId: field.questionId || fallbackQuestionId,
      required: Boolean(field.required),
    }));
    const template = await PdfTemplate.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      {
        title: req.body.title,
        documentName: req.body.documentName,
        documentUrl: req.body.documentUrl,
        pdfData: req.body.pdfData || '',
        recipients: req.body.recipients || [],
        fields: normalizedFields,
        status: req.body.status || 'draft',
      },
      { new: true }
    );
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const template = await PdfTemplate.findOne({
      _id: req.params.id,
      $or: [{ createdBy: req.user._id }, { 'recipients.userId': req.user._id }],
    }).lean();
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/send', requireRole(['sender']), async (req, res) => {
  try {
    const template = await PdfTemplate.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { recipients: req.body.recipients || [], status: 'sent', sentAt: new Date() },
      { new: true }
    );
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', requireRole(['sender']), async (req, res) => {
  try {
    const template = await PdfTemplate.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!template) return res.status(404).json({ message: 'Template not found' });
    await PdfSubmission.deleteMany({ templateId: req.params.id });
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/:id/submissions', requireRole(['signer']), async (req, res) => {
  try {
    const template = await PdfTemplate.findOne({
      _id: req.params.id,
      'recipients.userId': req.user._id,
    }).lean();
    if (!template) return res.status(404).json({ message: 'Template not found' });

    const existingSubmission = await PdfSubmission.findOne({
      templateId: req.params.id,
      submittedBy: req.user._id,
    }).lean();
    if (existingSubmission) {
      return res.status(409).json({ message: 'You have already submitted this template.' });
    }

    const submittedValues = Array.isArray(req.body.values) ? req.body.values : [];
    const byFieldId = new Map(submittedValues.map((item) => [String(item.fieldId), String(item.enteredValue || '').trim()]));
    const missingRequired = (template.fields || []).filter((field) => field.required && !byFieldId.get(String(field.id)));
    if (missingRequired.length > 0) {
      return res.status(400).json({
        message: 'Please fill all required fields before submitting.',
        missingFields: missingRequired.map((field) => field.id),
      });
    }
    const submission = await PdfSubmission.create({
      templateId: req.params.id,
      submittedBy: req.user._id,
      values: submittedValues.map((item) => ({
        fieldId: String(item.fieldId || ''),
        questionId: String(item.questionId || ''),
        enteredValue: String(item.enteredValue || ''),
      })),
    });
    res.status(201).json(submission);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/:id/submissions', async (req, res) => {
  try {
    const template = await PdfTemplate.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!template) return res.status(404).json({ message: 'Template not found' });
    const submissions = await PdfSubmission.find({ templateId: req.params.id })
      .populate('submittedBy', 'name email role')
      .sort({ createdAt: -1 })
      .lean();
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
