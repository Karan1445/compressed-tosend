import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import PdfViewer from '../../components/pdf-designer/PdfViewer';
import FieldToolbar from '../../components/pdf-designer/FieldToolbar';
import DesignerCanvas from '../../components/pdf-designer/DesignerCanvas';
import { useDocumentStore } from '../../store/documentStore';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Checkbox } from '../../components/ui/checkbox';

const API_BASE = 'http://localhost:8888';

const blankDocument = {
  id: '',
  name: 'Untitled PDF',
  fileName: '',
  uploadedAt: Date.now(),
};

const normalizeRole = (role) => String(role || '').trim().toLowerCase();
const dataUrlToUint8Array = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  const base64 = dataUrl.split(',')[1] || '';
  if (!base64) return null;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export default function PdfDesignerPage() {
  const currentUser = JSON.parse(sessionStorage.getItem('user') || 'null');
  const role = normalizeRole(currentUser?.role || 'sender');
  const token = sessionStorage.getItem('token');

  const documents = useDocumentStore((state) => state.documents);
  const fields = useDocumentStore((state) => state.fields);
  const fieldValues = useDocumentStore((state) => state.fieldValues);
  const mode = useDocumentStore((state) => state.mode);
  const zoom = useDocumentStore((state) => state.zoom);
  const activePageNumber = useDocumentStore((state) => state.activePageNumber);
  const addField = useDocumentStore((state) => state.addField);
  const setDocument = useDocumentStore((state) => state.setDocument);
  const setMode = useDocumentStore((state) => state.setMode);
  const setZoom = useDocumentStore((state) => state.setZoom);
  const loadTemplate = useDocumentStore((state) => state.loadTemplate);
  const setFieldValues = useDocumentStore((state) => state.setFieldValues);
  const replaceFields = useDocumentStore((state) => state.replaceFields);

  const [templates, setTemplates] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [pdfBinary, setPdfBinary] = useState(null);
  const [templateMenuOpenId, setTemplateMenuOpenId] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
  const [isSendingTemplate, setIsSendingTemplate] = useState(false);
  const [activeSignerTemplate, setActiveSignerTemplate] = useState(null);
  const [isSubmittingSigner, setIsSubmittingSigner] = useState(false);
  const [signerSubmissionLocked, setSignerSubmissionLocked] = useState(false);

  const activeDocument = useMemo(() => documents[0] || blankDocument, [documents]);
  const activeTemplate = useMemo(
    () => templates.find((template) => template._id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const fetchTemplates = useCallback(async () => {
    const res = await fetch(`${API_BASE}/pdf-templates`, { headers });
    if (!res.ok) throw new Error('Failed to load templates');
    const data = await res.json();
    setTemplates(Array.isArray(data) ? data : []);
  }, [headers]);

  const fetchQuestions = useCallback(async () => {
    const res = await fetch(`${API_BASE}/question`, { headers });
    if (!res.ok) throw new Error('Failed to load questions');
    const data = await res.json();
    setQuestions(Array.isArray(data) ? data : []);
  }, [headers]);

  const fetchUsers = useCallback(async () => {
    const res = await fetch(`${API_BASE}/`, { headers });
    if (!res.ok) throw new Error('Failed to load users');
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  }, [headers]);

  useEffect(() => {
    let active = true;
    loadTemplate();
    if (role === 'sender') {
      fetchTemplates().catch(() => active && toast.error('Unable to load saved templates.'));
      fetchQuestions().catch(() => active && toast.error('Unable to load questions.'));
      fetchUsers().catch(() => active && toast.error('Unable to load users.'));
    } else {
      fetchTemplates().catch(() => active && toast.error('Unable to load assigned templates.'));
    }
    return () => {
      active = false;
    };
  }, [loadTemplate, role, headers, fetchTemplates, fetchQuestions, fetchUsers]);

  const onUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const nextUrl = String(reader.result || '');
      if (!nextUrl) {
        toast.error('Failed to read the uploaded PDF.');
        return;
      }
      setUploadUrl(nextUrl);
      setPdfUrl(nextUrl);
      setPdfBinary(dataUrlToUint8Array(nextUrl));
      setDocument({
        id: `${Date.now()}`,
        name: file.name,
        fileName: file.name,
        uploadedAt: Date.now(),
      });
      toast.success('PDF loaded successfully.');
    };
    reader.onerror = () => {
      toast.error('Failed to read the uploaded PDF.');
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!selectedQuestionId && questions.length > 0) {
      setSelectedQuestionId(questions[0]._id);
    }
  }, [questions, selectedQuestionId]);

  const loadTemplateIntoDesigner = (template) => {
    const storedPdf = template.pdfData || template.documentUrl || '';
    if (!template.pdfData) {
      toast.warning('This template was saved before PDF data persistence. Re-upload the PDF and save it again to reopen it safely.');
    }
    setDocument({
      id: template._id,
      name: template.title || template.documentName,
      fileName: template.documentName,
      uploadedAt: template.createdAt,
    });
    replaceFields(template.fields || []);
    setFieldValues([]);
    setPdfUrl(storedPdf);
    setUploadUrl(storedPdf);
    setPdfBinary(dataUrlToUint8Array(storedPdf));
    setSelectedTemplateId(template._id);
    setMode(role === 'signer' ? 'fill' : 'design');
    setTemplateMenuOpenId('');
    if (role === 'signer') {
      setActiveSignerTemplate(template);
      setSignerSubmissionLocked(false);
    }
  };

  const clearLoadedTemplate = () => {
    setSelectedTemplateId('');
    setDocument(blankDocument);
    setPdfUrl('');
    setUploadUrl('');
    setPdfBinary(null);
    replaceFields([]);
    setFieldValues([]);
    setTemplateMenuOpenId('');
  };

  const handleTemplateClick = async (templateId) => {
    if (selectedTemplateId === templateId) {
      clearLoadedTemplate();
      toast.info('Template closed.');
      return;
    }
    await openTemplate(templateId);
  };

  const openSignerTemplate = async (templateId) => {
    const res = await fetch(`${API_BASE}/pdf-templates/${templateId}`, { headers });
    if (!res.ok) throw new Error('Failed to open template');
    const template = await res.json();
    loadTemplateIntoDesigner(template);
    setMode('fill');
  };

  const signerInboxTemplates = useMemo(
    () => templates.map((template) => ({ ...template, alreadySubmitted: Boolean(template.alreadySubmitted) })),
    [templates]
  );

  const openSendDialog = () => {
    setUserSearch('');
    setSelectedRecipientIds([]);
    setIsSendDialogOpen(true);
  };

  const toggleRecipient = (userId) => {
    setSelectedRecipientIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

  const onAddField = () => {
    const selectedQuestion = questions.find((question) => question._id === selectedQuestionId) || questions[0];
    if (!selectedQuestion) {
      toast.error('Add at least one question first.');
      return;
    }
    addField({
      pageNumber: activePageNumber || 1,
      x: 0.1,
      y: 0.1,
      width: 0.28,
      height: 0.06,
      placeholder: selectedQuestion?.question || 'Enter text',
      type: selectedQuestion?.type || 'text',
      questionId: selectedQuestion?._id,
      questionNumber: questions.findIndex((q) => q._id === selectedQuestion?._id) + 1,
      required: Boolean(selectedQuestion?.required),
    });
    setMode('design');
  };

  const persistTemplate = async () => {
    if (isSavingTemplate) return;
    const resolvedPdfUrl = pdfUrl || uploadUrl;
    if (!resolvedPdfUrl) {
      toast.error('Upload or load a PDF before saving the template.');
      return;
    }
    if (questions.length === 0) {
      toast.error('Create at least one question first. The template fields must link to a question.');
      return;
    }
    const resolvedQuestionId = selectedQuestionId || questions[0]?._id;
    if (!resolvedQuestionId) {
      toast.error('No question is selected.');
      return;
    }
    const payload = {
      title: activeDocument.name,
      documentName: activeDocument.fileName || activeDocument.name,
      documentUrl: resolvedPdfUrl,
      pdfData: uploadUrl || pdfUrl || '',
      fields: fields.map((field) => ({
        ...field,
        questionId: field.questionId || resolvedQuestionId,
        questionNumber:
          field.questionNumber ||
          (questions.findIndex((q) => q._id === (field.questionId || resolvedQuestionId)) + 1),
        required: Boolean(field.required),
      })),
      recipients: [],
      status: 'draft',
    };
    const shouldUpdate = Boolean(selectedTemplateId);
    const url = shouldUpdate
      ? `${API_BASE}/pdf-templates/${selectedTemplateId}`
      : `${API_BASE}/pdf-templates`;
    try {
      setIsSavingTemplate(true);
      let res = await fetch(url, {
        method: shouldUpdate ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (res.status === 404 && shouldUpdate) {
        console.warn('Template update returned 404, retrying as create.', { selectedTemplateId, payload });
        setSelectedTemplateId('');
        res = await fetch(`${API_BASE}/pdf-templates`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const rawBody = await res.text().catch(() => '');
        let errorBody = {};
        try {
          errorBody = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          errorBody = {};
        }
        console.error('Template save failed:', { status: res.status, rawBody, body: errorBody, payload, url });
        const message =
          errorBody.message ||
          errorBody.error ||
          rawBody ||
          `Save failed (${res.status})`;
        toast.error(message);
        throw new Error(message);
      }
      const saved = await res.json();
      setSelectedTemplateId(saved._id);
      await fetchTemplates();
      toast.success('Template saved.');
    } catch (error) {
      console.error('Template save exception:', error);
      toast.error(error.message || 'Failed to save template');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const onSendTemplate = async () => {
    if (!selectedTemplateId) {
      toast.error('Save the template before sending.');
      return;
    }
    if (selectedRecipientIds.length === 0) {
      toast.error('Select at least one signer.');
      return;
    }
    const recipients = selectedRecipientIds.map((userId) => ({ userId, role: 'signer' }));
    try {
      setIsSendingTemplate(true);
      const res = await fetch(`${API_BASE}/pdf-templates/${selectedTemplateId}/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ recipients }),
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Failed to send template');
      }
      await fetchTemplates();
      setIsSendDialogOpen(false);
      toast.success('Template sent to selected signers.');
    } finally {
      setIsSendingTemplate(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();
    return users.filter((user) => {
      const roleMatch = normalizeRole(user.role) === 'signer';
      const textMatch =
        !search ||
        user.name?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search);
      return roleMatch && textMatch;
    });
  }, [users, userSearch]);

  const validateSignerValues = (fieldsToValidate, values) => {
    const missing = fieldsToValidate.filter((field) => {
      if (!field.required) return false;
      const current = String(values[field.id] || '').trim();
      return !current;
    });
    return missing;
  };

  const handleSignerSubmit = async () => {
    if (!activeSignerTemplate) return;
    if (signerSubmissionLocked) {
      toast.error('You have already submitted this template.');
      return;
    }
    const currentValues = Object.fromEntries(fieldValues.map((item) => [item.fieldId, item.value]));
    const missing = validateSignerValues(activeSignerTemplate.fields || [], currentValues);
    if (missing.length > 0) {
      toast.error('Please fill all required fields.');
      return;
    }
    const values = (activeSignerTemplate.fields || []).map((field) => ({
      fieldId: field.id,
      questionId: field.questionId || '',
      enteredValue: String(currentValues[field.id] || ''),
    }));
    try {
      setIsSubmittingSigner(true);
      const res = await fetch(`${API_BASE}/pdf-templates/${activeSignerTemplate._id}/submissions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ values }),
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Failed to submit form');
      }
      toast.success('Form submitted successfully.');
      setSignerSubmissionLocked(true);
      setActiveSignerTemplate(null);
      setMode('fill');
    } finally {
      setIsSubmittingSigner(false);
    }
  };

  const onSubmit = async () => {
    if (!selectedTemplateId) return;
    const values = fieldValues.map((item) => ({ fieldId: item.fieldId, enteredValue: item.value }));
    const res = await fetch(`${API_BASE}/pdf-templates/${selectedTemplateId}/submissions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ values }),
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.message || 'Failed to submit form');
    }
    toast.success('Form submitted.');
  };

  const openTemplate = async (templateId) => {
    const res = await fetch(`${API_BASE}/pdf-templates/${templateId}`, { headers });
    if (!res.ok) throw new Error('Failed to open template');
    const template = await res.json();
    loadTemplateIntoDesigner(template);
  };

  const handleDeleteTemplate = async (templateId) => {
    const confirmed = window.confirm('Delete this template? This cannot be undone.');
    if (!confirmed) return;
    const res = await fetch(`${API_BASE}/pdf-templates/${templateId}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.message || 'Failed to delete template');
    }
    if (selectedTemplateId === templateId) {
      clearLoadedTemplate();
    }
    await fetchTemplates();
    toast.success('Template deleted.');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {role === 'signer' ? (
        <div className="mx-auto max-w-7xl px-4 py-6">
          {activeSignerTemplate ? (
            <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Signer inbox</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">{activeSignerTemplate.title}</h2>
                <p className="mt-1 text-sm text-slate-500">Fill the required fields and submit when ready.</p>
                {signerSubmissionLocked ? (
                  <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    This template has already been submitted.
                  </p>
                ) : null}
                <div className="mt-4 space-y-2">
                  <Button variant="outline" className="w-full bg-white" onClick={() => setActiveSignerTemplate(null)}>
                    Back to list
                  </Button>
                  <Button className="w-full bg-black text-white" onClick={handleSignerSubmit} disabled={isSubmittingSigner || signerSubmissionLocked}>
                    {isSubmittingSigner ? 'Submitting...' : 'Submit Form'}
                  </Button>
                </div>
              </aside>
              <div className="space-y-4">
                <DesignerCanvas>
                  <PdfViewer pdfUrl={activeSignerTemplate.pdfData || activeSignerTemplate.documentUrl || ''} mode="fill" zoom={zoom} />
                </DesignerCanvas>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Signer inbox</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">Your assigned PDFs</h1>
                <div className="mt-4 space-y-3">
                {signerInboxTemplates.length === 0 ? (
                  <p className="text-sm text-slate-500">No PDFs assigned yet.</p>
                ) : (
                  signerInboxTemplates.map((template) => (
                    <div key={template._id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div>
                        <div className="font-medium text-slate-900">{template.title}</div>
                        <div className="text-xs text-slate-500">{template.status}</div>
                      </div>
                      <Button
                        className={template.alreadySubmitted ? 'bg-emerald-600 text-white' : 'bg-black text-white'}
                        onClick={() => {
                          if (template.alreadySubmitted) return;
                          openSignerTemplate(template._id);
                        }}
                        disabled={template.alreadySubmitted}
                      >
                        {template.alreadySubmitted ? 'Filled' : 'Fill'}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}
      {role === 'sender' ? (
        <>
          <FieldToolbar
            activeDocument={activeDocument}
            zoom={zoom}
            onUpload={onUpload}
            onAddField={onAddField}
            onQuestionChange={setSelectedQuestionId}
            onSave={persistTemplate}
            saveLoading={isSavingTemplate}
            onZoomChange={setZoom}
            activePageNumber={activePageNumber}
            questions={questions}
            selectedQuestionId={selectedQuestionId}
            fieldCount={fields.length}
            valueCount={fieldValues.length}
          />
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Saved templates</p>
                    <p className="text-sm text-slate-500">Click once to open, click again to close.</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {templates.length === 0 ? (
                    <p className="text-sm text-slate-500">No saved templates yet.</p>
                  ) : (
                    templates.map((template) => (
                      <div
                        key={template._id}
                        className={`rounded-2xl border px-3 py-3 text-sm transition ${
                          template._id === selectedTemplateId
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleTemplateClick(template._id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="font-medium">{template.title}</div>
                            <div className={`text-xs ${template._id === selectedTemplateId ? 'text-white/70' : 'text-slate-500'}`}>
                              {template.status}
                            </div>
                          </button>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setTemplateMenuOpenId((current) => (current === template._id ? '' : template._id))
                              }
                              className={`rounded-lg p-2 transition ${
                                template._id === selectedTemplateId
                                  ? 'text-white/80 hover:bg-white/10'
                                  : 'text-slate-500 hover:bg-slate-100'
                              }`}
                              aria-label="Template actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {templateMenuOpenId === template._id ? (
                              <div className="absolute right-0 top-10 z-20 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => openTemplate(template._id)}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTemplate(template._id).catch((error) => toast.error(error.message))}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <button
                  onClick={openSendDialog}
                  className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
                >
                  Send Template
                </button>
                <p className="text-xs text-slate-500">Sends to a signer by email from your existing users.</p>
              </div>
            </aside>
            <div className="space-y-4">
              <DesignerCanvas>
                <PdfViewer pdfUrl={pdfBinary || pdfUrl || uploadUrl} mode={mode} zoom={zoom} />
              </DesignerCanvas>
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                Sender can edit and send templates. Signer can only fill and submit.
              </div>
            </div>
          </div>
        </>
      ) : null}

      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent className="max-w-2xl border-slate-200 bg-white">
          <DialogHeader>
            <DialogTitle>Send template</DialogTitle>
            <DialogDescription>
              Search your users and select one or more signers to receive this template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search by name or email"
              className="bg-white"
            />

            <div className="max-h-80 space-y-2 overflow-auto rounded-2xl border border-slate-200 bg-white p-2">
              {filteredUsers.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-slate-500">No matching signers found.</div>
              ) : (
                filteredUsers.map((user) => {
                  const checked = selectedRecipientIds.includes(user._id);
                  return (
                    <div
                      key={user._id}
                      onClick={() => toggleRecipient(user._id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition cursor-pointer ${
                        checked ? 'border-slate-900 bg-slate-50' : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleRecipient(user._id)} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-900">{user.name}</div>
                        <div className="truncate text-xs text-slate-500">{user.email}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <p className="text-sm text-slate-500">
              Selected recipients: {selectedRecipientIds.length}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSendDialogOpen(false)}
              className="bg-white"
              disabled={isSendingTemplate}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onSendTemplate}
              className="bg-black text-white"
              disabled={isSendingTemplate || selectedRecipientIds.length === 0}
            >
              {isSendingTemplate ? 'Sending...' : 'Send Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
