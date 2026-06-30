import { useRef, useState, useEffect, useCallback } from 'react';
import { renderAsync } from 'docx-preview';
import { Rnd } from 'react-rnd';
import { useDispatch, useSelector } from 'react-redux';
import { fetchQuestions, deleteQuestion, updateQuestion } from '../../store/slices/questionSlice';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Sheet, SheetContent, SheetHeader,
  SheetTitle, SheetDescription,
} from '../../components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Upload, FileText, Loader2, Search, CheckCircle2, Link2, X, RotateCcw, Save, History, CloudUpload, Trash2, Lightbulb } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { uploadDocx, fetchUploadedDocx, saveDocxMappings, deleteDocx } from '../../store/slices/docxSlice';

function SidebarDependencyConfig({ q, questions, mappedQuestions, onSaveDependency, onClose }) {
  const [localVal, setLocalVal] = useState(q?.dependsOnValue || '');
  const [dependsOnId, setDependsOnId] = useState(q?.dependsOnId || '');

  useEffect(() => { 
    setLocalVal(q?.dependsOnValue || ''); 
    setDependsOnId(q?.dependsOnId || '');
  }, [q]);

  const handleSave = () => {
    if (!q) return;
    onSaveDependency(q._id, dependsOnId === 'none' ? null : dependsOnId, localVal);
    onClose();
  };

  if (!q) return null;

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b bg-slate-50 flex items-start gap-3 shrink-0">
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0 rounded-full hover:bg-slate-200">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Configure Dependency</h3>
          <p className="text-[10px] text-slate-500 mt-1">Set visibility condition for this mapped question.</p>
        </div>
      </div>
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded text-sm text-indigo-900 font-medium">
          {q.question}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-700">Depends on (Mapped Questions)</label>
          <Select 
            value={dependsOnId || "none"} 
            onValueChange={setDependsOnId}
          >
            <SelectTrigger className="w-full bg-white text-xs h-9">
              <SelectValue placeholder="No dependency" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="none">No dependency (Always show)</SelectItem>
              {mappedQuestions.filter(other => other._id !== q._id).map(other => (
                <SelectItem key={other._id} value={other._id}>{other.question}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {dependsOnId && dependsOnId !== 'none' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700">Required Value</label>
            {(() => {
                const parentQ = questions.find(x => x._id === dependsOnId);
                if (parentQ?.type === 'checkbox') {
                  return (
                    <Select 
                      value={localVal || ""} 
                      onValueChange={setLocalVal}
                    >
                      <SelectTrigger className="w-full bg-white text-xs h-9">
                        <SelectValue placeholder="Select Yes/No" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  );
                }
                return (
                  <Input 
                    className="text-xs h-9"
                    placeholder="e.g. Yes" 
                    value={localVal} 
                    onChange={(e) => setLocalVal(e.target.value)}
                  />
                );
            })()}
          </div>
        )}
      </div>
      <div className="p-4 border-t bg-slate-50 shrink-0">
        <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full">Save Settings</Button>
      </div>
    </div>
  );
}

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
  const [dependencyConfigQuestion, setDependencyConfigQuestion] = useState(null);

  // ─── Redux: uploaded documents ────────────────────────────────────────────────
  const { documents, uploading, savingMappings, loading: docsLoading } = useSelector((state) => state.docx || { documents: [], uploading: false, savingMappings: false, loading: false });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  
  const [draggedFields, setDraggedFields] = useState([]);
  const [fieldMappings, setFieldMappings] = useState({}); // { fieldId: question }

  
  const [interactionMode, setInteractionMode] = useState('edit'); // 'edit' or 'interact'
  const [formValues, setFormValues] = useState({});

  // ─── Keep refs in sync for global listeners ─────────────────────────────────
  const activeDocRef = useRef(activeDoc);
  useEffect(() => { activeDocRef.current = activeDoc; }, [activeDoc]);
  
  const fieldMappingsRefForSave = useRef(fieldMappings);
  useEffect(() => { fieldMappingsRefForSave.current = fieldMappings; }, [fieldMappings]);
  
  const draggedFieldsRef = useRef(draggedFields);
  useEffect(() => { draggedFieldsRef.current = draggedFields; }, [draggedFields]);

  // ─── Ctrl+S Listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Call the save logic
        if (activeDocRef.current) {
          const mappingsToSave = {};
          Object.entries(fieldMappingsRefForSave.current).forEach(([fieldId, q]) => {
            mappingsToSave[fieldId] = {
              questionId: q._id,
              dependsOnId: q.dependsOnId || null,
              dependsOnValue: q.dependsOnValue || ''
            };
          });
          const draggedFieldsToSave = draggedFieldsRef.current.map(df => ({
            id: df.id,
            questionId: df.questionId || (df.questionObj ? df.questionObj._id : null),
            x: df.x,
            y: df.y,
            width: df.width,
            height: df.height,
            dependsOnId: df.questionObj?.dependsOnId || null,
            dependsOnValue: df.questionObj?.dependsOnValue || ''
          }));
          dispatch(saveDocxMappings({ 
            docxId: activeDocRef.current._id, 
            mappings: mappingsToSave,
            draggedFields: draggedFieldsToSave
          })).unwrap().then(() => {
             toast.success('Mappings saved successfully!');
          }).catch(err => {
             toast.error(err || 'Failed to save mappings');
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

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

  const [searchTerm, setSearchTerm] = useState('');

  // ─── Keep refs in sync so DOM callbacks always see latest state ───────────────
  const fieldMappingsRef = useRef({});
  useEffect(() => { fieldMappingsRef.current = fieldMappings; }, [fieldMappings]);

  const handleRemoveMappingRef = useRef(null);
  
  const formValuesRef = useRef(formValues);
  useEffect(() => { formValuesRef.current = formValues; }, [formValues]);

  // ─── Conditional Logic Helper ──────────────────────────────────────────────
  const isDependencyMet = useCallback((q) => {
    if (!q.dependsOnId) return true; // No dependency

    // Find all fields on this document that are mapped to the parent question (both inline and dragged)
    const dependentFieldIds = [
      ...Object.keys(fieldMappings).filter(fid => fieldMappings[fid]?._id === q.dependsOnId),
      ...draggedFieldsRef.current.filter(df => df.questionObj?._id === q.dependsOnId).map(df => df.id)
    ];

    if (dependentFieldIds.length === 0) return false; // Parent question not on document

    // Check if any mapped field has the required value
    return dependentFieldIds.some(fid => {
      const val = formValuesRef.current[fid];
      return val === q.dependsOnValue;
    });
  }, [fieldMappings]);

  const handleSaveDependency = useCallback((qId, dependsOnId, dependsOnValue) => {
    setFieldMappings(prev => {
       const next = { ...prev };
       for (const fid in next) {
          if (next[fid]?._id === qId) {
             next[fid] = { ...next[fid], dependsOnId, dependsOnValue };
          }
       }
       return next;
    });

    setDraggedFields(prev => prev.map(df => {
       if (df.questionObj?._id === qId) {
          return { ...df, questionObj: { ...df.questionObj, dependsOnId, dependsOnValue } };
       }
       return df;
    }));
    
    toast.success('Dependency saved locally. Press Ctrl+S to save document!');
  }, []);

  // ─── Sync DOM buttons with interactionMode ─────────────────────────────────
  useEffect(() => {
    Object.entries(fieldBtnsRef.current).forEach(([fieldId, btn]) => {
      if (!btn) return;
      const q = fieldMappings[fieldId];

      if (interactionMode === 'interact') {
        if (q) {
          const short = q.question.length > 22 ? q.question.substring(0, 22) + '…' : q.question;
          const currentVal = formValuesRef.current[fieldId] || '';
          if (q.type === 'checkbox') {
            const isChecked = currentVal === 'true' || currentVal === true;
            btn.innerHTML = `
              <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #ffffff; border: 1.5px solid #818cf8; box-sizing: border-box;" title="${short}">
                <input type="checkbox" ${isChecked ? 'checked' : ''} style="cursor: pointer; width: 14px; height: 14px; accent-color: #4f46e5;" />
              </div>
            `;
            btn.style.padding = '0';
            btn.style.border = 'none';
            btn.style.background = 'transparent';
          } else if (q.type === 'dropdown' || q.type === 'radio') {
            const options = q.options || [];
            let optionsHtml = `<option value="" disabled ${!currentVal ? 'selected' : ''}>${short}</option>`;
            options.forEach(opt => {
              optionsHtml += `<option value="${opt}" ${currentVal === opt ? 'selected' : ''}>${opt}</option>`;
            });
            btn.innerHTML = `
              <select style="width: 100%; height: 100%; box-sizing: border-box; border: 1.5px solid #818cf8; background: #ffffff; outline: none; padding: 0 4px; font-size: 11px; color: #1e1b4b; cursor: pointer;">
                ${optionsHtml}
              </select>
            `;
            btn.style.padding = '0';
            btn.style.border = 'none';
            btn.style.background = 'transparent';
          } else if (q.type === 'date') {
            btn.innerHTML = `<input type="date" value="${currentVal}" style="width: 100%; height: 100%; box-sizing: border-box; border: 1.5px solid #818cf8; background: #ffffff; outline: none; padding: 0 4px; font-size: 11px; color: #1e1b4b; cursor: pointer;" />`;
            btn.style.padding = '0';
            btn.style.border = 'none';
            btn.style.background = 'transparent';
          } else if (q.type === 'textarea') {
            btn.innerHTML = `<textarea placeholder="${short}" style="width: 100%; height: 100%; box-sizing: border-box; border: 1.5px solid #818cf8; background: #ffffff; outline: none; padding: 4px; font-size: 11px; color: #1e1b4b; resize: none;">${currentVal}</textarea>`;
            btn.style.padding = '0';
            btn.style.border = 'none';
            btn.style.background = 'transparent';
          } else {
            const typeAttr = q.type === 'number' ? 'number' : 'text';
            btn.innerHTML = `<input type="${typeAttr}" placeholder="${short}" value="${currentVal}" style="width: 100%; height: 100%; box-sizing: border-box; border: 1.5px solid #818cf8; background: #ffffff; outline: none; padding: 0 4px; font-size: 11px; color: #1e1b4b;" />`;
            btn.style.padding = '0';
            btn.style.border = 'none';
            btn.style.background = 'transparent';
          }
          
          btn.title = q.question;
          btn.style.visibility = 'visible';
  
          const input = btn.querySelector('input, select, textarea');
          if (input) {
            input.onclick = (e) => e.stopPropagation();
            input.onmousedown = (e) => e.stopPropagation();
            input.onchange = (e) => {
              const val = input.type === 'checkbox' ? e.target.checked.toString() : e.target.value;
              setFormValues(prev => ({ ...prev, [fieldId]: val }));
            };
            if ((input.tagName === 'INPUT' && input.type !== 'checkbox' && input.type !== 'date') || input.tagName === 'TEXTAREA') {
              input.oninput = (e) => {
                setFormValues(prev => ({ ...prev, [fieldId]: e.target.value }));
              };
            }
          }
        } else {
          btn.style.visibility = 'hidden';
        }
      } else {
        btn.style.visibility = 'visible';
        if (q) {
          const short = q.question.length > 22 ? q.question.substring(0, 22) + '…' : q.question;
          btn.style.background = 'rgba(34, 197, 94, 0.15)';
          btn.style.border = '1.5px solid #22c55e';
          btn.style.color = '#15803d';
          btn.style.padding = '0 4px';
          btn.title = q.question;
          
          btn.innerHTML = `
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${q.dependsOnId ? '<span title="Has Dependency" style="margin-right:2px">🔗</span>' : ''}${short}
            </span>
            <span class="remove-mapping-icon" style="margin-left: 4px; padding: 0 4px; cursor: pointer; color: #dc2626; border-radius: 50%; font-size: 10px; font-weight: bold;" title="Remove mapping">✕</span>
          `;
          const removeIcon = btn.querySelector('.remove-mapping-icon');
          if (removeIcon) {
            removeIcon.onclick = (e) => {
              e.stopPropagation();
              if (handleRemoveMappingRef.current) {
                handleRemoveMappingRef.current(fieldId, btn);
              }
            };
          }
          btn.ondblclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDependencyConfigQuestion(q);
          };
        } else {
          // Restore unmapped styling
          btn.innerText = '+';
          btn.title = 'Click to assign a question';
          btn.style.background = 'rgba(99, 102, 241, 0.12)';
          btn.style.border = '1.5px dashed #6366f1';
          btn.style.color = '#6366f1';
          btn.style.fontSize = '13px';
          btn.style.fontWeight = '600';
          btn.style.padding = '0';
          btn.style.justifyContent = 'center';
          btn.ondblclick = null;
          delete btn.dataset.assigned;
        }
      }
    });
  }, [interactionMode, fieldMappings]);

  // ─── Dynamic Visibility Effect ──────────────────────────────────────────────
  useEffect(() => {
    if (interactionMode !== 'interact') return;
    Object.entries(fieldBtnsRef.current).forEach(([fieldId, btn]) => {
      if (!btn) return;
      const q = fieldMappings[fieldId];
      if (q) {
        const visible = isDependencyMet(q);
        btn.style.visibility = visible ? 'visible' : 'hidden';
      }
    });
  }, [interactionMode, fieldMappings, formValues, isDependencyMet]);

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

    setFieldMappings((prev) => {
      const next = { ...prev };
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

    // Also clear from formValues
    setFormValues((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    resetBtn(btn);
    setPanelOpen(false);
    setActiveField(null);
    toast.success('Field mapping removed');
  };
  
  // Set the ref so useEffect can access it without closing over old state
  useEffect(() => { handleRemoveMappingRef.current = handleRemoveMapping; });

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

    const draggedFieldsToSave = draggedFields.map(df => ({
      id: df.id,
      questionId: df.questionId,
      x: df.x,
      y: df.y,
      width: df.width,
      height: df.height
    }));

    try {
      await dispatch(saveDocxMappings({ 
        docxId: activeDoc._id, 
        mappings: mappingsToSave,
        draggedFields: draggedFieldsToSave
      })).unwrap();
      toast.success('Mappings saved successfully!');
    } catch (err) {
      toast.error(err || 'Failed to save mappings');
    }
  };

  const handleDeleteDoc = async (doc) => {
    try {
      await dispatch(deleteDocx(doc._id)).unwrap();
      toast.success(`Document "${doc.originalName}" deleted`);
      // If the deleted document is currently active, clear the viewer
      if (activeDoc?._id === doc._id) {
        setActiveDoc(null);
        setHasDoc(false);
        setFileName('');
        setSelectedFile(null);
        if (viewerRef.current) viewerRef.current.innerHTML = '';
      }
    } catch (err) {
      toast.error(err || 'Failed to delete document');
    }
  };

  const handleLoadFromHistory = async (doc) => {
    setHistoryOpen(false);
    setLoading(true);
    setHasDoc(false);
    setFileName(doc.originalName);
    setActiveDoc(doc);
    setFieldMappings({});
    setDraggedFields([]);
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

        // Restore dragged fields
        if (doc.draggedFields && Array.isArray(doc.draggedFields)) {
          const restoredDraggedFields = doc.draggedFields.map(df => {
            const q = questions.find(q => q._id === df.questionId);
            const questionObj = q ? {
               ...q,
               dependsOnId: df.dependsOnId || q.dependsOnId,
               dependsOnValue: df.dependsOnValue || q.dependsOnValue
            } : null;
            return { ...df, questionObj };
          });
          setDraggedFields(restoredDraggedFields);
        }

        // Restore mappings if they exist
        if (doc.mappings && Object.keys(doc.mappings).length > 0) {
          const newMappings = { ...autoMatches }; // merge with auto matches
          let restoredCount = 0;
          Object.entries(doc.mappings).forEach(([fieldId, mappingObj]) => {
            const qId = typeof mappingObj === 'string' ? mappingObj : mappingObj.questionId;
            const question = questions.find(q => q._id === qId);
            if (question) {
              const enhancedQ = typeof mappingObj === 'string' ? question : {
                 ...question,
                 dependsOnId: mappingObj.dependsOnId || question.dependsOnId,
                 dependsOnValue: mappingObj.dependsOnValue || question.dependsOnValue
              };
              newMappings[fieldId] = enhancedQ;
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
        {hasDoc && (
          <div className="flex flex-col items-end gap-2">
            {mappedCount > 0 && (
              <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1.5 px-3 py-1.5 shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {mappedCount} field{mappedCount > 1 ? 's' : ''} mapped
              </Badge>
            )}
            <div className="flex bg-slate-100 rounded-md p-1 border shadow-sm mt-1">
              <button 
                onClick={() => setInteractionMode('edit')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all ${interactionMode === 'edit' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Edit Mode
              </button>
              <button 
                onClick={() => setInteractionMode('interact')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all ${interactionMode === 'interact' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Interact Mode
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MAIN COLUMNS ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        
        {/* ── LEFT COLUMN ── */}
        <div className="flex-1 space-y-6 min-w-0 w-full">

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

            <div className="flex items-center gap-2">
              <Button variant="secondary" className="flex items-center gap-2" onClick={() => setHistoryOpen(true)}>
                <History className="h-4 w-4" />
                History
              </Button>
            </div>
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
            className="relative w-full h-[600px] overflow-auto bg-[#f8fafc] rounded-lg docx-scroll-wrapper"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const questionData = e.dataTransfer.getData('application/json');
              if (!questionData) return;
              try {
                const question = JSON.parse(questionData);
                const wrapper = e.currentTarget;
                const rect = wrapper.getBoundingClientRect();
                
                // Calculate drop coordinates relative to the scrolling content
                const x = e.clientX - rect.left + wrapper.scrollLeft;
                const y = e.clientY - rect.top + wrapper.scrollTop;
                
                setDraggedFields(prev => [
                  ...prev,
                  {
                    id: 'drag-' + Date.now(),
                    questionId: question._id,
                    questionObj: question,
                    x: Math.max(0, x - 100), // center the 200px box slightly
                    y: Math.max(0, y - 25),
                    width: 200,
                    height: 40
                  }
                ]);
              } catch (err) {
                console.error(err);
              }
            }}
          >
            <div
              ref={viewerRef}
              className="docx-viewer-container p-4 min-h-full"
            >
              {!hasDoc && !loading && (
                <div className="flex flex-col items-center justify-center h-96 text-muted-foreground gap-3">
                  <FileText className="h-12 w-12 opacity-20" />
                  <p className="text-sm">Upload a .docx file to preview it here</p>
                </div>
              )}
            </div>

            {/* Draggable dropped elements */}
            {hasDoc && draggedFields.map(field => {
              const q = field.questionObj;
              const isVisible = interactionMode === 'edit' || (q && isDependencyMet(q));
              
              if (!isVisible) return null;

              return (
              <Rnd
                key={field.id}
                default={{
                  x: field.x,
                  y: field.y,
                  width: field.width,
                  height: field.height
                }}
                bounds="parent"
                disableDragging={interactionMode === 'interact'}
                enableResizing={interactionMode === 'edit'}
                onDragStop={(e, d) => {
                  setDraggedFields(prev => prev.map(f => f.id === field.id ? { ...f, x: d.x, y: d.y } : f));
                }}
                onResizeStop={(e, direction, ref, delta, position) => {
                  setDraggedFields(prev => prev.map(f => f.id === field.id ? { 
                    ...f, 
                    width: parseInt(ref.style.width, 10), 
                    height: parseInt(ref.style.height, 10),
                    ...position 
                  } : f));
                }}
                onDoubleClick={() => {
                  if (interactionMode === 'edit' && q) {
                    setDependencyConfigQuestion(q);
                  }
                }}
                className={`absolute ${interactionMode === 'edit' ? 'bg-white/95 border-2 border-indigo-400 shadow-md flex items-center justify-center cursor-move group' : 'z-40'} rounded z-50`}
              >
                {interactionMode === 'edit' ? (
                  <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
                    <button 
                      onClick={() => setDraggedFields(prev => prev.filter(f => f.id !== field.id))}
                      className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 bg-red-100 text-red-600 rounded p-0.5 transition-opacity z-50 hover:bg-red-200"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {q?.dependsOnId && (
                      <div className="absolute top-0.5 left-0.5 bg-indigo-100 text-indigo-600 rounded p-0.5 z-40" title="Has Dependency">
                        <Link2 className="h-3 w-3" />
                      </div>
                    )}
                    <p className="text-xs font-semibold text-indigo-900 truncate px-2 select-none pointer-events-none text-center">
                      {field.questionObj?.question || 'Unknown Question'}
                    </p>
                  </div>
                ) : field.questionObj?.type === 'checkbox' ? (
                  <div className="w-full h-full bg-white/90 shadow-sm border border-indigo-300 rounded flex items-center justify-center" title={field.questionObj?.question}>
                    <input 
                      type="checkbox"
                      checked={formValues[field.id] === 'true' || formValues[field.id] === true}
                      onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.checked.toString() }))}
                      className="cursor-pointer h-4 w-4 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500"
                    />
                  </div>
                ) : field.questionObj?.type === 'dropdown' || field.questionObj?.type === 'radio' ? (
                  <select 
                    value={formValues[field.id] || ''}
                    onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="w-full h-full border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 px-2 text-sm bg-white/90 shadow-sm cursor-pointer"
                  >
                    <option value="" disabled>{field.questionObj?.question}</option>
                    {(field.questionObj?.options || []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.questionObj?.type === 'date' ? (
                  <input 
                    type="date"
                    value={formValues[field.id] || ''}
                    onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="w-full h-full border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 px-2 text-sm bg-white/90 shadow-sm"
                  />
                ) : field.questionObj?.type === 'textarea' ? (
                  <textarea 
                    value={formValues[field.id] || ''}
                    onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    placeholder={field.questionObj?.question}
                    className="w-full h-full border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 p-2 text-sm bg-white/90 shadow-sm resize-none"
                  />
                ) : (
                  <input 
                    type={field.questionObj?.type === 'number' ? 'number' : 'text'}
                    value={formValues[field.id] || ''}
                    onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    placeholder={field.questionObj?.question}
                    className="w-full h-full border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 px-2 text-sm bg-white/90 shadow-sm"
                  />
                )}
              </Rnd>
            )})}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* ── RIGHT COLUMN: Fixed Draggable Questions Sidebar ── */}
      <div className="hidden lg:block w-80 shrink-0 sticky top-6">
        <Card className="shadow-md flex flex-col h-[calc(100vh-8rem)] overflow-hidden">
          {dependencyConfigQuestion ? (
            <SidebarDependencyConfig 
              q={questions.find(x => x._id === dependencyConfigQuestion._id) || dependencyConfigQuestion}
              questions={questions}
              mappedQuestions={(() => {
                const mapped = [];
                const seen = new Set();
                Object.values(fieldMappings).forEach(q => {
                  if (q && !seen.has(q._id)) {
                    mapped.push(q);
                    seen.add(q._id);
                  }
                });
                draggedFields.forEach(df => {
                  if (df.questionObj && !seen.has(df.questionObj._id)) {
                    mapped.push(df.questionObj);
                    seen.add(df.questionObj._id);
                  }
                });
                return mapped;
              })()}
              onSaveDependency={handleSaveDependency}
              onClose={() => setDependencyConfigQuestion(null)}
            />
          ) : (
            <>
              <CardHeader className="pb-3 border-b bg-white shrink-0">
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600" /> Drag Questions
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Drag and drop these questions anywhere on your document to map them visually.
                </p>
                <div className="mt-2 bg-indigo-50 border border-indigo-100 rounded px-2 py-2 flex items-start gap-2">
                   <div className="mt-0.5"><Lightbulb className="h-3 w-3 text-indigo-600"/></div>
                   <p className="text-[10px] text-indigo-800 leading-tight">
                     <strong>Tip:</strong> Double-click any mapped question on your document to configure conditional dependencies!
                   </p>
                </div>
              </CardHeader>
              
              <div className="p-3 bg-slate-50 border-b shrink-0">
                 <Input
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white border-slate-200 focus:bg-white text-sm h-9 w-full"
                />
              </div>

              <CardContent className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
                {filteredQuestions.length === 0 ? (
                  <div className="text-center text-slate-400 py-10 text-sm">No questions found.</div>
                ) : (
                  filteredQuestions.map(q => (
                    <div 
                      key={q._id} 
                      draggable 
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify(q));
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className="bg-white border border-slate-200 rounded p-3 text-sm text-slate-700 shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-all select-none"
                    >
                      {q.question}
                    </div>
                  ))
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>
      </div>

      {/* ── Auto-Mapping Panel (Sheet) ──────────────────────────────────── */}
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
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete document?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{doc.originalName}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc); }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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