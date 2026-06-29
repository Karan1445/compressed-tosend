import { useRef, useState, useEffect, useCallback } from 'react';
import { renderAsync } from 'docx-preview';
import { useDispatch, useSelector } from 'react-redux';
import { fetchQuestions, deleteQuestion } from '../../store/slices/questionSlice';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Sheet, SheetContent, SheetHeader,
  SheetTitle, SheetDescription,
} from '../../components/ui/sheet';
import { Upload, FileText, Loader2, Search, CheckCircle2, Link2, X, RotateCcw, Save, History, CloudUpload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadDocx, fetchUploadedDocx, saveDocxMappings } from '../../store/slices/docxSlice';

export default function DocxPage() {
  const dispatch = useDispatch();
  const viewerRef = useRef(null);

  // ─── Redux: questions ────────────────────────────────────────────────────────
  const { questions, loading: qLoading } = useSelector((state) => state.questions);

  useEffect(() => {
    dispatch(fetchQuestions()).unwrap().catch(() => { });
  }, [dispatch]);

  // ─── DOCX state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [hasDoc, setHasDoc] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);

  // ─── Redux: uploaded documents ────────────────────────────────────────────────
  const { documents, uploading, savingMappings, loading: docsLoading } = useSelector((state) => state.docx || { documents: [], uploading: false, savingMappings: false, loading: false });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const filteredDocs = documents.filter(doc =>
    doc.originalName.toLowerCase().includes(historySearch.toLowerCase())
  );

  useEffect(() => {
    dispatch(fetchUploadedDocx()).unwrap().catch(() => { });
  }, [dispatch]);

  // ─── Panel state ─────────────────────────────────────────────────────────────
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeField, setActiveField] = useState(null);
  // activeField: { id, btn, currentMapping: question | null }

  // ─── DOM btn registry — fieldId → btn element ────────────────────────────────
  const fieldBtnsRef = useRef({});

  const [fieldMappings, setFieldMappings] = useState({});
  // { fieldId: question }

  const [searchTerm, setSearchTerm] = useState('');

  // ─── Keep refs in sync so DOM callbacks always see latest state ───────────────
  const fieldMappingsRef = useRef({});
  useEffect(() => { fieldMappingsRef.current = fieldMappings; }, [fieldMappings]);

  // ─── Filtered questions ───────────────────────────────────────────────────────
  const filteredQuestions = questions.filter((q) =>
    q.question.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ─── handlePlusClick — opened by injected DOM buttons ───────────────────────
  const handlePlusClick = useCallback((fieldId, btn) => {
    const currentMapping = fieldMappingsRef.current[fieldId] || null;
    setActiveField({ id: fieldId, btn, currentMapping });
    setPanelOpen(true);
    setSearchTerm('');
  }, []);

  const handlePlusClickRef = useRef(handlePlusClick);
  useEffect(() => { handlePlusClickRef.current = handlePlusClick; }, [handlePlusClick]);

  // ─── Reset a DOM button back to "unassigned" + style ─────────────────────────
  const resetBtn = (btn) => {
    btn.innerText = '+';
    btn.title = 'Click to assign a question';
    btn.style.background = 'rgba(99, 102, 241, 0.12)';
    btn.style.border = '1.5px dashed #6366f1';
    btn.style.color = '#6366f1';
    btn.style.fontSize = '13px';
    btn.style.fontWeight = '600';
    btn.style.padding = '0';
    btn.style.justifyContent = 'center';
    delete btn.dataset.assigned;
  };

  // ─── Assign question to field ─────────────────────────────────────────────────
  const handleAssignQuestion = (question) => {
    if (!activeField) return;
    const { id, btn } = activeField;

    // ── One-question-one-field: auto-unmap from any previous field ────────────
    setFieldMappings((prev) => {
      const oldFieldId = Object.entries(prev).find(
        ([fid, q]) => q._id === question._id && fid !== id
      )?.[0];

      if (oldFieldId) {
        // Reset the old btn DOM element
        const oldBtn = fieldBtnsRef.current[oldFieldId];
        if (oldBtn) resetBtn(oldBtn);
      }

      const next = { ...prev };
      // Remove old mapping (if existed)
      if (oldFieldId) delete next[oldFieldId];
      // Set new mapping
      next[id] = question;
      return next;
    });

    const short = question.question.length > 22
      ? question.question.substring(0, 22) + '…'
      : question.question;

    btn.title = question.question;
    btn.dataset.assigned = question._id;
    btn.style.background = 'rgba(34, 197, 94, 0.15)';
    btn.style.border = '1.5px solid #22c55e';
    btn.style.color = '#15803d';
    btn.style.fontSize = '11px';
    btn.style.fontWeight = '500';
    btn.style.padding = '0 4px';
    btn.style.justifyContent = 'space-between';

    // Add text and remove icon
    btn.innerHTML = `
      <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${short}</span>
      <span class="remove-mapping-icon" style="margin-left: 4px; padding: 0 4px; cursor: pointer; color: #dc2626; border-radius: 50%; font-size: 10px; font-weight: bold;" title="Remove mapping">✕</span>
    `;

    const removeIcon = btn.querySelector('.remove-mapping-icon');
    if (removeIcon) {
      removeIcon.onclick = (e) => {
        e.stopPropagation();
        handleRemoveMapping(id, btn);
      };
    }

    setPanelOpen(false);
    setActiveField(null);
    toast.success(`Mapped: "${short}"`);
  };

  // ─── Remove mapping from field ────────────────────────────────────────────────
  const handleRemoveMapping = (id, btn) => {
    setFieldMappings((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    resetBtn(btn);
    setPanelOpen(false);
    setActiveField(null);
    toast.success('Field mapping removed');
  };

  const handleDeleteQuestion = async (e, id) => {
    e.stopPropagation();
    try {
      await dispatch(deleteQuestion(id)).unwrap();
      toast.success('Question deleted');
      // If it's mapped to any fields, remove it from fieldMappings
      setFieldMappings(prev => {
        const next = { ...prev };
        let removed = false;
        Object.entries(next).forEach(([fId, q]) => {
          if (q._id === id) {
            delete next[fId];
            removed = true;
            // Also reset the DOM button
            const btn = fieldBtnsRef.current[fId];
            if (btn) resetBtn(btn);
          }
        });
        if (removed && activeField && activeField.currentMapping?._id === id) {
          setActiveField(null);
          setPanelOpen(false);
        }
        return next;
      });
    } catch (err) {
      toast.error(err || 'Failed to delete question');
    }
  };

  // ─── DOM injection: replace _____ with + buttons & Auto-Map ───────────────
  const normalizeString = (str) => {
    if (!str) return '';
    // Strip leading numbering like "1.", "Q1.", "Question 1:", etc.
    const noNumbering = str.replace(/^(?:q(?:uestion)?\s*)?\d*[\.\-\):]+\s*/i, '');
    return noNumbering.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const injectFullWidthButtons = () => {
    if (!viewerRef.current) return {};

    const autoMatches = {};
    let autoMatchCount = 0;

    const textNodes = [];
    const walk = document.createTreeWalker(
      viewerRef.current, NodeFilter.SHOW_TEXT, null, false
    );
    let node;
    while ((node = walk.nextNode())) {
      if (/_{5,}/.test(node.nodeValue)) textNodes.push(node);
    }

    let fieldCount = 0;

    textNodes.forEach((textNode) => {
      const parent = textNode.parentNode;
      if (!parent) return;

      const block = parent.closest('p, div, section, article, li, tr') || parent;
      const range = document.createRange();
      range.setStart(block, 0);
      range.setEndBefore(parent);

      const wrapper = document.createElement('span');
      wrapper.style.display = 'inline';

      textNode.nodeValue.split(/(_{5,})/g).forEach((part) => {
        if (/_{5,}/.test(part)) {
          fieldCount++;
          const fieldId = `field-${fieldCount}`;

          const container = document.createElement('span');

          container.style.position = 'relative';
          container.style.display = 'inline-grid';
          container.style.verticalAlign = 'middle';

          const sizer = document.createElement('span');
          sizer.textContent = part;
          sizer.style.visibility = 'hidden';
          sizer.style.gridArea = '1 / 1';

          const btn = document.createElement('button');
          btn.innerText = '+';
          btn.type = 'button';
          btn.dataset.fieldId = fieldId;
          btn.title = `Field ${fieldCount} — click to assign a question`;

          btn.style.gridArea = '1 / 1';
          btn.style.width = '100%';
          btn.style.height = '100%';
          btn.style.zIndex = '10';
          btn.style.background = 'rgba(99, 102, 241, 0.12)';
          btn.style.border = '1.5px dashed #6366f1';
          btn.style.color = '#6366f1';
          btn.style.cursor = 'pointer';
          btn.style.borderRadius = '4px';
          btn.style.fontSize = '13px';
          btn.style.fontWeight = '600';
          btn.style.padding = '0';
          btn.style.display = 'flex';
          btn.style.alignItems = 'center';
          btn.style.justifyContent = 'center';
          btn.style.transition = 'background 0.15s, border-color 0.15s';

          btn.onmouseenter = () => {
            if (!btn.dataset.assigned) {
              btn.style.background = 'rgba(99, 102, 241, 0.25)';
              btn.style.borderColor = '#4f46e5';
            }
          };
          btn.onmouseleave = () => {
            if (!btn.dataset.assigned) {
              btn.style.background = 'rgba(99, 102, 241, 0.12)';
              btn.style.borderColor = '#6366f1';
            }
          };

          // Register this btn in the DOM ref map
          fieldBtnsRef.current[fieldId] = btn;

          // Auto-mapping logic
          const precedingText = range.toString() + (textNode.nodeValue.split(part)[0] || '');
          const precedingParts = precedingText.split(/_+|\+/);
          const rawQuestion = precedingParts[precedingParts.length - 1].trim();

          if (rawQuestion) {
            const normalizedRaw = normalizeString(rawQuestion);
            if (normalizedRaw.length > 0) {
              const matchedQ = questions.find(q => normalizeString(q.question) === normalizedRaw);
              if (matchedQ) {
                autoMatches[fieldId] = matchedQ;
                autoMatchCount++;

                const short = matchedQ.question.length > 22 ? matchedQ.question.substring(0, 22) + '…' : matchedQ.question;
                btn.title = matchedQ.question;
                btn.dataset.assigned = matchedQ._id;
                btn.style.background = 'rgba(34, 197, 94, 0.15)';
                btn.style.border = '1.5px solid #22c55e';
                btn.style.color = '#15803d';
                btn.style.fontSize = '11px';
                btn.style.fontWeight = '500';
                btn.style.padding = '0 4px';
                btn.style.justifyContent = 'space-between';
                btn.innerHTML = `
                  <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${short}</span>
                  <span class="remove-mapping-icon" style="margin-left: 4px; padding: 0 4px; cursor: pointer; color: #dc2626; border-radius: 50%; font-size: 10px; font-weight: bold;" title="Remove mapping">✕</span>
                `;
                const removeIcon = btn.querySelector('.remove-mapping-icon');
                if (removeIcon) {
                  removeIcon.onclick = (e) => {
                    e.stopPropagation();
                    handleRemoveMapping(fieldId, btn);
                  };
                }
              }
            }
          }

          btn.onclick = (e) => {
            e.stopPropagation();
            handlePlusClickRef.current(fieldId, btn);
          };

          container.appendChild(sizer);
          container.appendChild(btn);
          wrapper.appendChild(container);
        } else {
          wrapper.appendChild(document.createTextNode(part));
        }
      });

      parent.replaceChild(wrapper, textNode);
    });

    return autoMatches;
  };

  // ─── File upload ──────────────────────────────────────────────────────────────
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.docx') && !file.name.endsWith('.pdf')) { toast.error('Please upload a .docx or .pdf file'); return; }

    setSelectedFile(file);
    setActiveDoc(null);
    setFileName(file.name);
    setLoading(true);
    setHasDoc(false);
    setFieldMappings({});
    fieldBtnsRef.current = {}; // clear btn registry on new file

    try {
      const arrayBuffer = await file.arrayBuffer();
      if (viewerRef.current) {
        viewerRef.current.innerHTML = '';
        await renderAsync(arrayBuffer, viewerRef.current, null, {
          className: 'docx', inWrapper: true,
        });
        const autoMatches = injectFullWidthButtons();
        setFieldMappings(autoMatches);
        if (Object.keys(autoMatches).length > 0) {
          toast.success(`Auto-mapped ${Object.keys(autoMatches).length} questions!`);
        }
        setHasDoc(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to render the document. Make sure it is a valid .docx file.');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleUploadToServer = async () => {
    if (!selectedFile) return;
    try {
      const doc = await dispatch(uploadDocx(selectedFile)).unwrap();
      setActiveDoc(doc);
      toast.success('File uploaded to server successfully!');
    } catch (err) {
      toast.error(err || 'Failed to upload to server');
    }
  };

  const handleSaveMappings = async () => {
    if (!activeDoc) return;

    // Transform fieldMappings (which has full question objects) into { fieldId: questionId }
    const mappingsToSave = {};
    Object.entries(fieldMappings).forEach(([fieldId, q]) => {
      mappingsToSave[fieldId] = q._id;
    });

    try {
      await dispatch(saveDocxMappings({ docxId: activeDoc._id, mappings: mappingsToSave })).unwrap();
      toast.success('Mappings saved successfully!');
    } catch (err) {
      toast.error(err || 'Failed to save mappings');
    }
  };

  const handleLoadFromHistory = async (doc) => {
    setHistoryOpen(false);
    setLoading(true);
    setHasDoc(false);
    setFileName(doc.originalName);
    setActiveDoc(doc);
    setFieldMappings({});
    fieldBtnsRef.current = {};

    try {
      const response = await fetch(`http://localhost:8888/${doc.path.replace(/\\/g, '/')}`);
      if (!response.ok) throw new Error('Network error');
      const arrayBuffer = await response.arrayBuffer();
      if (viewerRef.current) {
        viewerRef.current.innerHTML = '';
        await renderAsync(arrayBuffer, viewerRef.current, null, {
          className: 'docx', inWrapper: true,
        });
        const autoMatches = injectFullWidthButtons();
        setHasDoc(true);
        // Mock a file object for re-upload if needed (not perfect but allows UI to continue)
        setSelectedFile(new File([arrayBuffer], doc.originalName, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));

        // Restore mappings if they exist
        if (doc.mappings && Object.keys(doc.mappings).length > 0) {
          const newMappings = { ...autoMatches }; // merge with auto matches
          let restoredCount = 0;
          Object.entries(doc.mappings).forEach(([fieldId, qId]) => {
            const question = questions.find(q => q._id === qId);
            if (question) {
              newMappings[fieldId] = question;
              restoredCount++;

              // Apply visual styling to the button
              const btn = fieldBtnsRef.current[fieldId];
              if (btn) {
                const short = question.question.length > 22 ? question.question.substring(0, 22) + '…' : question.question;
                btn.title = question.question;
                btn.dataset.assigned = question._id;
                btn.style.background = 'rgba(34, 197, 94, 0.15)';
                btn.style.border = '1.5px solid #22c55e';
                btn.style.color = '#15803d';
                btn.style.fontSize = '11px';
                btn.style.fontWeight = '500';
                btn.style.padding = '0 4px';
                btn.style.justifyContent = 'space-between';

                btn.innerHTML = `
                  <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${short}</span>
                  <span class="remove-mapping-icon" style="margin-left: 4px; padding: 0 4px; cursor: pointer; color: #dc2626; border-radius: 50%; font-size: 10px; font-weight: bold;" title="Remove mapping">✕</span>
                `;

                const removeIcon = btn.querySelector('.remove-mapping-icon');
                if (removeIcon) {
                  removeIcon.onclick = (e) => {
                    e.stopPropagation();
                    handleRemoveMapping(fieldId, btn);
                  };
                }
              }
            }
          });
          setFieldMappings(newMappings);
          if (restoredCount > 0) {
            toast.success(`Restored ${restoredCount} mapped questions!`);
          }
        } else if (Object.keys(autoMatches).length > 0) {
          setFieldMappings(autoMatches);
          toast.success(`Auto-mapped ${Object.keys(autoMatches).length} questions!`);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load document from history.');
    } finally {
      setLoading(false);
    }
  };

  const mappedCount = Object.keys(fieldMappings).length;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">DOCX Viewer</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a <code className="bg-muted px-1 rounded text-xs">.docx</code> file —
            blank fields <code className="bg-muted px-1 rounded text-xs">_____</code> become interactive{' '}
            <span className="text-indigo-600 font-semibold">+</span> buttons.
          </p>
        </div>
        {hasDoc && mappedCount > 0 && (
          <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1.5 px-3 py-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {mappedCount} field{mappedCount > 1 ? 's' : ''} mapped
          </Badge>
        )}
      </div>

      {/* Upload Card */}
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Document Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-3 cursor-pointer w-fit">
                <Button asChild className="bg-black text-white hover:bg-neutral-800 flex items-center gap-2">
                  <span>
                    <Upload className="h-4 w-4" />
                    {fileName ? 'Change File' : 'Select Local File'}
                  </span>
                </Button>
                <input type="file" accept=".docx,.pdf" onChange={handleFileChange} className="hidden" />
              </label>

              {fileName && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate max-w-[200px] border px-2 py-1 bg-slate-50 rounded">
                    {fileName}
                  </span>

                  {!activeDoc ? (
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      onClick={handleUploadToServer}
                      disabled={uploading}
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                      Upload to Server
                    </Button>
                  ) : (
                    <Button
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                      onClick={handleSaveMappings}
                      disabled={savingMappings}
                    >
                      {savingMappings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Mappings
                    </Button>
                  )}
                </div>
              )}
            </div>

            <Button variant="secondary" className="flex items-center gap-2" onClick={() => setHistoryOpen(true)}>
              <History className="h-4 w-4" />
              Document History
            </Button>
          </div>

          {loading && (
            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing document...
            </div>
          )}
        </CardContent>
      </Card>

      {/* DOCX Render Area */}
      <Card className="shadow-md">
        <CardContent className="p-0">
          <div
            ref={viewerRef}
            className="docx-viewer-container min-h-96 p-4 overflow-auto rounded-lg"
            style={{ backgroundColor: '#f8fafc', minHeight: hasDoc ? 'auto' : '400px' }}
          >
            {!hasDoc && !loading && (
              <div className="flex flex-col items-center justify-center h-96 text-muted-foreground gap-3">
                <FileText className="h-12 w-12 opacity-20" />
                <p className="text-sm">Upload a .docx file to preview it here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Question Mapping Panel (Sheet) ──────────────────────────────────── */}
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent
          side="right"
          className="w-[420px] sm:w-[460px] flex flex-col gap-0 p-0 bg-white shadow-2xl border-l border-slate-200"
        >
          {/* Simple White header */}
          <SheetHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="h-5 w-5 text-slate-800" />
              <SheetTitle className="text-slate-900 text-lg font-semibold tracking-tight">
                Assign Question
              </SheetTitle>
            </div>
            <SheetDescription className="text-slate-500 text-sm">
              Pick a question to link to this blank field.
            </SheetDescription>
          </SheetHeader>

          {/* Search bar */}
          <div className="px-5 pt-4 pb-3 shrink-0 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white text-sm h-10"
                autoFocus
              />
            </div>
          </div>

          {/* Questions list */}
          <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
            {qLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading questions...</span>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <Search className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium">
                  {searchTerm ? 'No questions match your search' : 'No questions yet'}
                </p>
              </div>
            ) : (
              filteredQuestions.map((q, idx) => {
                const isCurrentlyMapped = activeField?.currentMapping?._id === q._id;

                return (
                  <div
                    key={q._id}
                    className="w-full text-left rounded-md border border-slate-200 transition-colors flex flex-col hover:bg-slate-50"
                  >
                    <div className="flex items-stretch bg-transparent">
                      <button
                        type="button"
                        onClick={() => handleAssignQuestion(q)}
                        className="flex-1 px-4 py-3 flex items-start justify-between gap-2 transition-colors cursor-pointer active:bg-slate-100"
                      >
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm text-slate-800 font-medium leading-relaxed">
                            {q.question}
                          </p>
                        </div>
                        {isCurrentlyMapped && (
                          <div className="flex items-center justify-center shrink-0 ml-2">
                            <CheckCircle2 className="h-5 w-5 text-slate-800" />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-400">
              {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''}
              {searchTerm && <> · <span className="text-slate-500">"{searchTerm}"</span></>}
            </span>
            {mappedCount > 0 && (
              <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {mappedCount} mapped
              </span>
            )}
          </div>

        </SheetContent>
      </Sheet>

      {/* ── Document History Panel (Left Sheet) ──────────────────────────────── */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="w-[400px] sm:w-[460px] flex flex-col gap-0 p-0 bg-slate-50 shadow-2xl border-r border-slate-200">
          <SheetHeader className="px-6 pt-6 pb-4 border-b bg-white shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <History className="h-5 w-5 text-indigo-600" />
              <SheetTitle className="text-lg">Document History</SheetTitle>
            </div>
            <SheetDescription className="text-sm">
              Previously uploaded documents. Click to load one into the viewer.
            </SheetDescription>
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search documents..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white text-sm h-10"
              />
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {docsLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading history...</span>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <FileText className="h-10 w-10 opacity-20" />
                <p>{historySearch ? 'No matching documents found.' : 'No documents uploaded yet.'}</p>
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const isActive = activeDoc?._id === doc._id;
                return (
                  <div
                    key={doc._id}
                    onClick={() => handleLoadFromHistory(doc)}
                    className={[
                      'rounded-xl p-4 flex items-start gap-3 transition-all cursor-pointer border',
                      isActive
                        ? 'bg-indigo-50/50 border-indigo-400 shadow-sm ring-1 ring-indigo-400'
                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md active:scale-[0.99]'
                    ].join(' ')}
                  >
                    <div className={`h-10 w-10 rounded flex items-center justify-center shrink-0 ${isActive ? 'bg-indigo-100' : 'bg-indigo-50'}`}>
                      <FileText className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-indigo-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate mb-1 ${isActive ? 'text-indigo-900' : 'text-slate-800'}`} title={doc.originalName}>
                        {doc.originalName}
                      </p>
                      <div className={`flex items-center gap-2 text-xs ${isActive ? 'text-indigo-600/70' : 'text-slate-500'}`}>
                        <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                        <span>·</span>
                        <span className="truncate">{doc.fileName.substring(0, 15)}...</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}