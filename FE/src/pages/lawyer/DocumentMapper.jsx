import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { renderAsync } from 'docx-preview';
import { useDispatch, useSelector } from 'react-redux';
import { fetchQuestions } from '../../store/slices/questionSlice';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Sheet, SheetContent, SheetHeader,
  SheetTitle, SheetDescription,
} from '../../components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Upload, FileText, Loader2, Search, CheckCircle2, Link2, X, RotateCcw, Save, History, CloudUpload, Trash2, Pencil, Scissors, Send } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { fetchUploadedDocx, saveDocxMappings } from '../../store/slices/lawyerDocxSlice';
import { aggressiveNormalize } from '../../utils/docxModifier';
import { PlaceholderMapDialog } from '../../components/PlaceholderMapDialog';
import { ClauseConfigSidebarForm } from '../../components/ClauseConfigSidebarForm';
import { RepeatingConfigSidebarForm } from '../../components/RepeatingConfigSidebarForm';

export default function DocumentMapper() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const { documents, loading, uploading, submitting, submissions, loadingSubmissions } = useSelector(state => state.lawyerDocx);
  const { questions, loading: qLoading } = useSelector(state => state.questions);
  const { user } = useSelector(state => state.auth);

  const containerRef = useRef(null);
  const [activeDoc, setActiveDoc] = useState(null);
  const [docxLoaded, setDocxLoaded] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);

  // Mapping state
  const [mapping, setMapping] = useState({});
  const [builderData, setBuilderData] = useState({ fields: [], sections: [] });
  const [matchedSections, setMatchedSections] = useState({});
  const [saving, setSaving] = useState(false);
  const [lawyerQuestions, setLawyerQuestions] = useState(null);

  const [placeholderTarget, setPlaceholderTarget] = useState(null);
  const [placeholderDialogOpen, setPlaceholderDialogOpen] = useState(false);
  const [floatingActionBtn, setFloatingActionBtn] = useState(null);
  const [clauseText, setClauseText] = useState("");
  const [clauseRange, setClauseRange] = useState(null);

  const [clauseDialogOpen, setClauseDialogOpen] = useState(false);
  const [editingClauseId, setEditingClauseId] = useState(null);
  const [repeatingDialogOpen, setRepeatingDialogOpen] = useState(false);
  const [editingRepeatingId, setEditingRepeatingId] = useState(null);

  useEffect(() => {
    const loadLawyerQuestions = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('http://localhost:8888/api/lawyer/questions', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setLawyerQuestions(data);
        }
      } catch (err) {
        console.error('Failed to load lawyer questions', err);
      }
    };
    loadLawyerQuestions();

    if (documents.length === 0) {
      dispatch(fetchUploadedDocx());
    }
  }, [dispatch, documents.length]);

  useEffect(() => {
    if (documents.length > 0 && id) {
      const doc = documents.find(d => d._id === id);
      if (doc && (!activeDoc || activeDoc._id !== doc._id)) {
        setActiveDoc(doc);
        loadDocx(`http://localhost:8888/${doc.path}`);
      }
    }
  }, [documents, id, activeDoc]);

  useEffect(() => {
    if (lawyerQuestions) {
      const flattened = [];
      lawyerQuestions.forEach(q => {
        const type = q.answerType || q.type;
        const reqStar = q.required ? ' *' : '';
        const title = (q.title || q.question || 'Untitled') + reqStar;
        const desc = q.description || q.title || q.question;

        if (type === 'Group Fields' && q.configuration?.groupFields) {
          q.configuration.groupFields.forEach(sub => {
            const subStar = sub.required ? ' *' : '';
            flattened.push({
              questionId: `${q._id}.group.${sub.id || sub.name}`,
              label: `${title} - ${sub.name}${subStar}`,
              question: desc,
              fieldType: sub.type || 'Text',
              options: sub.configuration?.options || []
            });
          });
        } else if (type === 'Address' && q.configuration?.fields) {
          q.configuration.fields.forEach(sub => {
            const subStar = sub.required ? ' *' : '';
            flattened.push({
              questionId: `${q._id}.address.${sub.id}`,
              label: `${title} - ${sub.name}${subStar}`,
              question: desc,
              fieldType: 'Text',
              options: []
            });
          });
        } else {
          flattened.push({
            questionId: q._id,
            label: title,
            question: desc,
            fieldType: type,
            options: q.configuration?.options || q.options || []
          });
        }
      });
      setBuilderData(prev => ({ ...prev, fields: flattened }));
    }
  }, [lawyerQuestions]);

  useEffect(() => {
    if (activeDoc) {
      const restoredMapping = {};
      if (activeDoc.placeholderMappings) {
        activeDoc.placeholderMappings.forEach(m => {
          restoredMapping[m.occurrenceKey] = {
            label: m.label,
            text: m.placeholderText,
            questionId: m.questionId
          };
        });
      }
      setMapping(restoredMapping);

      const sections = [];
      if (activeDoc.clauseConfigs) {
        activeDoc.clauseConfigs.forEach(c => {
          sections.push({
            id: c._id || Math.random().toString(),
            name: c.clauseName,
            clauseText: c.clauseText,
            actionType: c.actionType,
            condition: { fieldQuestionId: c.fieldId, value: c.operator === 'not_equals' ? `!${c.value}` : c.value }
          });
        });
      }
      if (activeDoc.repeatingConfigs) {
        activeDoc.repeatingConfigs.forEach(r => {
          sections.push({
            id: r._id || Math.random().toString(),
            name: r.clauseName,
            clauseText: r.clauseText,
            isRepeating: true,
            condition: { fieldQuestionId: r.fieldId, value: "LOOP" }
          });
        });
      }
      setBuilderData(prev => ({ ...prev, sections }));
    }
  }, [activeDoc]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !docxLoaded) return;

    // Apply mappings to DOM
    Object.entries(mapping).forEach(([key, m]) => {
      const el = container.querySelector(`[data-occurrence-key="${key}"]`);
      if (el) updatePlaceholderDOM(el, m.label, key);
    });

    const applyHighlights = () => {
      const nextMatched = {};
      builderData.sections.forEach(s => {
        const found = findAndHighlightClauseText(s.clauseText, s.id, s.name, s.isRepeating ? 'repeating' : 'clause');
        nextMatched[s.id] = found;
      });
      setMatchedSections(nextMatched);
    };
    setTimeout(applyHighlights, 500);

  }, [docxLoaded, mapping, builderData.sections]);


  const loadDocx = async (fileOrUrl, isFileObj = false) => {
    if (!containerRef.current) return;
    setLoadingFile(true);
    setDocxLoaded(false);

    try {
      let buffer;
      if (isFileObj) {
        buffer = await fileOrUrl.arrayBuffer();
      } else {
        const res = await fetch(fileOrUrl);
        buffer = await res.arrayBuffer();
      }

      await renderAsync(buffer, containerRef.current, null, {
        className: 'docx-preview-container',
        inWrapper: false,
        ignoreWidth: false,
        ignoreHeight: false,
      });

      // Post-process placeholders
      let occurrenceCount = 0;
      const walkAndReplace = (node) => {
        if (node.nodeType === 3) {
          const text = node.nodeValue;
          const regex = /_{3,}|\[[^\]]+\]/g;
          let match;
          let lastIndex = 0;
          const fragments = [];

          while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
              fragments.push(document.createTextNode(text.substring(lastIndex, match.index)));
            }
            const container = document.createElement('span');
            container.className = 'docx-placeholder-container';
            container.dataset.placeholder = match[0];
            const occKey = `occ_${occurrenceCount++}`;
            container.dataset.occurrenceKey = occKey;

            const sizer = document.createElement('span');
            sizer.textContent = match[0];
            sizer.className = 'docx-placeholder-sizer';

            const btn = document.createElement('button');
            btn.className = 'docx-placeholder-clickable';
            btn.innerHTML = `+`;
            btn.title = match[0];

            container.appendChild(sizer);
            container.appendChild(btn);

            fragments.push(container);
            lastIndex = match.index + match[0].length;
          }

          if (fragments.length > 0) {
            if (lastIndex < text.length) {
              fragments.push(document.createTextNode(text.substring(lastIndex)));
            }
            const parent = node.parentNode;
            fragments.forEach(f => parent.insertBefore(f, node));
            parent.removeChild(node);
          }
        } else if (node.nodeType === 1 && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE') {
          Array.from(node.childNodes).forEach(walkAndReplace);
        }
      };

      walkAndReplace(containerRef.current);
      setDocxLoaded(true);

    } catch (err) {
      console.error(err);
      toast.error('Failed to load document preview');
    }
    setLoadingFile(false);
  };

  const updatePlaceholderDOM = (el, label, occurrenceKey) => {
    if (!el) return;
    el.classList.add("mapped");
    el.dataset.mappedLabel = label;

    // Explicitly hide the + button and sizer to guarantee it disappears
    const btn = el.querySelector(".docx-placeholder-clickable");
    if (btn) btn.style.display = "none";
    const sizer = el.querySelector(".docx-placeholder-sizer");
    if (sizer) sizer.style.display = "none";

    let badgeContainer = el.querySelector(".placeholder-badge-container");
    if (!badgeContainer) {
      badgeContainer = document.createElement("span");
      badgeContainer.className = "placeholder-badge-container";
      el.appendChild(badgeContainer);
    }
    badgeContainer.innerHTML = "";
    const badge = document.createElement("span");
    badge.className = "placeholder-inline-badge";
    badge.textContent = label;
    const removeBtn = document.createElement("button");
    removeBtn.className = "placeholder-badge-action placeholder-badge-remove";
    removeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"></path></svg>`;
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      setMapping((prev) => {
        const next = { ...prev };
        delete next[occurrenceKey];
        return next;
      });
      el.classList.remove("mapped");
      delete el.dataset.mappedLabel;
      badgeContainer.remove();

      // Explicitly show the + button and sizer again
      const btnToRestore = el.querySelector(".docx-placeholder-clickable");
      if (btnToRestore) btnToRestore.style.display = "flex";
      const sizerToRestore = el.querySelector(".docx-placeholder-sizer");
      if (sizerToRestore) sizerToRestore.style.display = "inline";
    };
    badgeContainer.appendChild(badge);
    badgeContainer.appendChild(removeBtn);
  };

  // Clicks and Selections
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !docxLoaded) return;

    const handleClick = (e) => {
      const btn = e.target.closest(".docx-placeholder-clickable");
      if (!btn) return;
      const target = btn.closest(".docx-placeholder-container");
      if (!target) return;
      const placeholder = target.dataset.placeholder;
      const occurrenceKey = target.dataset.occurrenceKey;
      setPlaceholderTarget({ placeholder, occurrenceKey, wrapperEl: target });
      setPlaceholderDialogOpen(true);
      setFloatingActionBtn(null);
    };

    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) return;
      const range = selection.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) return;

      const startEl = range.startContainer.parentElement;
      const endEl = range.endContainer.parentElement;
      if (startEl?.closest(".docx-placeholder-clickable") && endEl?.closest(".docx-placeholder-clickable") && startEl.closest(".docx-placeholder-clickable") === endEl.closest(".docx-placeholder-clickable")) {
        return;
      }

      const clone = document.createElement('div');
      clone.appendChild(range.cloneContents());
      clone.querySelectorAll(".docx-placeholder-clickable").forEach(p => {
        p.replaceWith(document.createTextNode(p.dataset.placeholder || ""));
      });
      const originalText = clone.textContent.trim();
      if (originalText.length < 5) return;

      const rect = range.getBoundingClientRect();
      setClauseText(originalText);
      setClauseRange(range.cloneRange());
      setFloatingActionBtn({ top: rect.bottom + 4, left: rect.left });
    };

    container.addEventListener("click", handleClick);
    container.addEventListener("mouseup", handleMouseUp);
    return () => {
      container.removeEventListener("click", handleClick);
      container.removeEventListener("mouseup", handleMouseUp);
    };
  }, [docxLoaded]);


  const findAndHighlightClauseText = (text, id, name, type) => {
    const container = containerRef.current;
    if (!container || !text) return false;
    try {
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      let concatenated = "";
      const charMap = [];
      let lastBlock = null;

      while (walker.nextNode()) {
        const node = walker.currentNode;
        const parent = node.parentNode;
        if (parent?.closest(".docx-clause-highlight") || parent?.closest(".docx-placeholder-clickable")) continue;

        const content = node.textContent || "";
        const block = parent.closest("p, div, section");

        if (concatenated.length > 0 && block && block !== lastBlock && !concatenated.endsWith("\n")) {
          concatenated += "\n";
          charMap.push({ node, offset: 0 });
        }
        lastBlock = block;

        for (let i = 0; i < content.length; i++) {
          charMap.push({ node, offset: i });
          concatenated += content[i];
        }
      }

      const { normalized: normalizedConcat, posMap: concatIdxMap } = aggressiveNormalize(concatenated);
      const { normalized: normalizedClause } = aggressiveNormalize(text);

      let lastIdx = 0;
      let foundCount = 0;
      while (true) {
        const matchIdx = normalizedConcat.indexOf(normalizedClause, lastIdx);
        if (matchIdx === -1) break;
        foundCount++;
        lastIdx = matchIdx + 1;

        const startCharIdx = concatIdxMap[matchIdx];
        const endCharIdx = concatIdxMap[matchIdx + normalizedClause.length - 1];

        if (startCharIdx === undefined || endCharIdx === undefined) continue;

        const range = document.createRange();
        range.setStart(charMap[startCharIdx].node, charMap[startCharIdx].offset);
        const endInfo = charMap[endCharIdx];
        range.setEnd(endInfo.node, Math.min(endInfo.offset + 1, endInfo.node.textContent.length));
        highlightClauseInRange(range, id, name, type);
      }
      return foundCount > 0;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const highlightClauseInRange = (range, id, name, type) => {
    try {
      const className = type === "repeating" ? "docx-clause-highlight docx-repeating-highlight" : "docx-clause-highlight";
      const container = containerRef.current;
      if (!container) return;

      const textNodes = [];
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (range.intersectsNode(node) && node.textContent.trim().length > 0) textNodes.push(node);
      }

      for (const textNode of textNodes) {
        const parent = textNode.parentNode;
        if (!parent || parent.closest(".docx-clause-highlight")) continue;

        let startOffset = 0;
        let endOffset = textNode.textContent.length;
        if (textNode === range.startContainer) startOffset = range.startOffset;
        if (textNode === range.endContainer) endOffset = range.endOffset;

        if (startOffset > 0 || endOffset < textNode.textContent.length) {
          const selectedText = textNode.textContent.slice(startOffset, endOffset);
          if (!selectedText.trim()) continue;
          const before = textNode.textContent.slice(0, startOffset);
          const after = textNode.textContent.slice(endOffset);
          const fragment = document.createDocumentFragment();
          if (before) fragment.appendChild(document.createTextNode(before));
          const wrapper = document.createElement("span");
          wrapper.className = className;
          wrapper.dataset.clauseId = id;
          wrapper.dataset.clauseName = name;
          wrapper.dataset.type = type;
          wrapper.textContent = selectedText;
          fragment.appendChild(wrapper);
          if (after) fragment.appendChild(document.createTextNode(after));
          parent.replaceChild(fragment, textNode);
        } else {
          const wrapper = document.createElement("span");
          wrapper.className = className;
          wrapper.dataset.clauseId = id;
          wrapper.dataset.clauseName = name;
          wrapper.dataset.type = type;
          wrapper.textContent = textNode.textContent;
          parent.replaceChild(wrapper, textNode);
        }
      }
    } catch (err) { }
  };


  const handleMapSelect = (field) => {
    if (!placeholderTarget) return;
    setMapping(prev => ({
      ...prev,
      [placeholderTarget.occurrenceKey]: {
        label: field.label,
        text: placeholderTarget.placeholder,
        questionId: field.questionId,
      }
    }));
    updatePlaceholderDOM(placeholderTarget.wrapperEl, field.label, placeholderTarget.occurrenceKey);
    setPlaceholderDialogOpen(false);
    setPlaceholderTarget(null);
  };

  const handleMapClear = () => {
    if (!placeholderTarget) return;
    const el = placeholderTarget.wrapperEl;
    setMapping(prev => {
      const next = { ...prev };
      delete next[placeholderTarget.occurrenceKey];
      return next;
    });
    el.classList.remove("mapped");
    delete el.dataset.mappedLabel;
    const bc = el.querySelector(".placeholder-badge-container");
    if (bc) bc.remove();

    const btnToRestore = el.querySelector(".docx-placeholder-clickable");
    if (btnToRestore) btnToRestore.style.display = "flex";
    const sizerToRestore = el.querySelector(".docx-placeholder-sizer");
    if (sizerToRestore) sizerToRestore.style.display = "inline";

    setPlaceholderDialogOpen(false);
    setPlaceholderTarget(null);
  };

  const handleSave = async () => {
    if (!activeDoc) return;
    setSaving(true);
    try {
      const placeholderMappings = Object.entries(mapping).map(([occKey, val]) => ({
        occurrenceKey: occKey,
        questionId: val.questionId,
        placeholderText: val.text,
        label: val.label
      }));

      const clauseConfigs = builderData.sections.filter(s => !s.isRepeating).map(s => ({
        _id: s.id.includes('.') ? undefined : s.id,
        clauseName: s.name,
        clauseText: s.clauseText,
        fieldId: s.condition.fieldQuestionId,
        operator: s.condition.value.startsWith('!') ? 'not_equals' : 'equals',
        value: s.condition.value.startsWith('!') ? s.condition.value.slice(1) : s.condition.value,
        actionType: s.actionType
      }));

      const repeatingConfigs = builderData.sections.filter(s => s.isRepeating).map(s => ({
        _id: s.id.includes('.') ? undefined : s.id,
        clauseName: s.name,
        clauseText: s.clauseText,
        fieldId: s.condition.fieldQuestionId
      }));

      await dispatch(saveDocxMappings({
        docxId: activeDoc._id,
        placeholderMappings,
        clauseConfigs,
        repeatingConfigs
      })).unwrap();

      // Update isDraft to false conceptually (you could trigger a dedicated backend update if needed)
      toast.success('Mappings saved successfully');
      navigate('/lawyer/documents');
    } catch (err) {
      toast.error('Failed to save mappings');
    }
    setSaving(false);
  };

  const radioFields = builderData.fields.filter(f => f.fieldType === 'radio' || f.fieldType === 'dropdown' || f.fieldType === 'checkbox');
  const groupFields = builderData.fields
    .filter(f => f.questionId.includes(".group."))
    .map(f => {
      const baseId = f.questionId.split(".")[0];
      const q = builderData.fields.find(raw => raw.questionId === baseId);
      return { questionId: baseId, label: q?.question || q?.label || baseId };
    });

  const uniqueGroupFields = Array.from(new Map(groupFields.map(q => [q.questionId, q])).values());

  const handleClauseSave = (config) => {
    const id = editingClauseId || Math.random().toString();
    const newSection = {
      id,
      name: config.clauseName,
      clauseText: clauseText,
      actionType: config.actionType,
      condition: {
        fieldQuestionId: config.fieldId,
        value: config.operator === "not_equals" ? `!${config.value}` : config.value,
      }
    };
    if (editingClauseId) {
      setBuilderData(prev => ({ ...prev, sections: prev.sections.map(s => s.id === editingClauseId ? newSection : s) }));
    } else {
      setBuilderData(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
      highlightClauseInRange(clauseRange, id, config.clauseName, "clause");
    }
    setClauseDialogOpen(false);
    setClauseRange(null);
    setClauseText("");
    setEditingClauseId(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleRepeatingSave = (config) => {
    const id = editingRepeatingId || Math.random().toString();
    const newSection = {
      id,
      name: config.clauseName,
      clauseText: clauseText,
      condition: { fieldQuestionId: config.fieldId, value: "LOOP" },
      isRepeating: true
    };
    if (editingRepeatingId) {
      setBuilderData(prev => ({ ...prev, sections: prev.sections.map(s => s.id === editingRepeatingId ? newSection : s) }));
    } else {
      setBuilderData(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
      highlightClauseInRange(clauseRange, id, config.clauseName, "repeating");
    }
    setRepeatingDialogOpen(false);
    setClauseRange(null);
    setClauseText("");
    setEditingRepeatingId(null);
    window.getSelection()?.removeAllRanges();
  };

  const removeSection = (id) => {
    setBuilderData(prev => ({ ...prev, sections: prev.sections.filter(s => s.id !== id) }));
    const highlights = containerRef.current?.querySelectorAll(`[data-clause-id="${id}"]`);
    highlights?.forEach((highlight) => {
      const parent = highlight.parentNode;
      if (parent) {
        while (highlight.firstChild) parent.insertBefore(highlight.firstChild, highlight);
        parent.removeChild(highlight);
      }
    });
  };


  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/lawyer/documents')} className="gap-2">
            Back
          </Button>
          {activeDoc && (
            <div className="flex items-center gap-2 ml-2">
              <FileText className="h-5 w-5 text-indigo-500" />
              <span className="text-base font-semibold text-slate-800">{activeDoc.name || activeDoc.originalName}</span>
            </div>
          )}
        </div>
        {activeDoc && (
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} size="sm" disabled={saving} className="bg-black hover:bg-zinc-800 text-white shadow-sm px-6">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Configuration
            </Button>
          </div>
        )}
      </div>

      {floatingActionBtn && (
        <div
          className="fixed z-[100] flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-2xl animate-in fade-in zoom-in duration-200"
          style={{ top: floatingActionBtn.top, left: floatingActionBtn.left }}
        >
          <button
            onClick={() => { setFloatingActionBtn(null); setClauseDialogOpen(true); }}
            className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-slate-800 hover:bg-slate-100 rounded-md transition-colors w-full text-left"
          >
            <Scissors className="h-3.5 w-3.5" /> Convert to Clause
          </button>
          <button
            onClick={() => { setFloatingActionBtn(null); setRepeatingDialogOpen(true); }}
            className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-slate-800 hover:bg-slate-100 rounded-md transition-colors w-full text-left border-t border-slate-100 pt-2 mt-1"
          >
            <FileText className="h-3.5 w-3.5" /> Mark as Repeating
          </button>
        </div>
      )}

      {floatingActionBtn && (
        <div className="fixed z-[9999]" style={{ top: floatingActionBtn.top - 30, left: floatingActionBtn.left + 140 }}>
          <Button
            size="sm" variant="ghost" className="h-7 w-7 p-0 shadow-lg bg-white rounded-full border border-slate-200"
            onClick={() => { setFloatingActionBtn(null); window.getSelection()?.removeAllRanges(); }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto bg-white p-8 relative">
          {loadingFile && (
            <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <p className="text-[13px] text-gray-500 animate-pulse">Rendering document...</p>
            </div>
          )}
          {!activeDoc && !loadingFile && (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <CloudUpload className="h-16 w-16 text-gray-300" />
              <p className="text-[14px] text-gray-500">Upload or select a document to start mapping</p>
            </div>
          )}
          <div
            ref={containerRef}
            className={`w-full bg-white shadow min-h-full mx-auto border border-gray-200 ${!activeDoc ? 'hidden' : 'block'}`}
            style={{ maxWidth: "850px" }}
          />
        </div>

        {activeDoc && (
          <div className="w-[340px] shrink-0 border-l border-gray-200 bg-white overflow-y-auto px-6 py-8">
            {clauseDialogOpen ? (
              <ClauseConfigSidebarForm
                radioFields={radioFields}
                initialValues={editingClauseId ? (() => {
                  const s = builderData.sections.find(s => s.id === editingClauseId);
                  const isNot = s.condition.value.startsWith("!");
                  return { clauseName: s.name, fieldId: s.condition.fieldQuestionId, operator: isNot ? "not_equals" : "equals", value: isNot ? s.condition.value.slice(1) : s.condition.value, actionType: s.actionType };
                })() : null}
                onSave={handleClauseSave}
                onDelete={editingClauseId ? () => removeSection(editingClauseId) : undefined}
                onCancel={() => { setClauseDialogOpen(false); setEditingClauseId(null); setClauseText(""); setClauseRange(null); }}
              />
            ) : repeatingDialogOpen ? (
              <RepeatingConfigSidebarForm
                groupFields={uniqueGroupFields}
                initialValues={editingRepeatingId ? (() => {
                  const s = builderData.sections.find(s => s.id === editingRepeatingId);
                  return { clauseName: s.name, fieldId: s.condition.fieldQuestionId };
                })() : null}
                onSave={handleRepeatingSave}
                onDelete={editingRepeatingId ? () => removeSection(editingRepeatingId) : undefined}
                onCancel={() => { setRepeatingDialogOpen(false); setEditingRepeatingId(null); setClauseText(""); setClauseRange(null); }}
              />
            ) : (
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-bold text-black uppercase tracking-wider">Configurations</h3>
                    <span className="text-[11px] font-medium text-black border border-gray-200 rounded-lg px-2 py-0.5 rounded-full">{builderData.sections.length} Active</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                      <p className="text-[10px] font-bold text-black uppercase mb-1">Clauses</p>
                      <p className="text-[20px] font-bold text-black">{builderData.sections.filter(s => !s.isRepeating).length}</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                      <p className="text-[10px] font-bold text-black uppercase mb-1">Loops</p>
                      <p className="text-[20px] font-bold text-black">{builderData.sections.filter(s => s.isRepeating).length}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[12px] font-bold text-black uppercase tracking-widest">Active Sections</h3>
                  {builderData.sections.length === 0 ? (
                    <div className="bg-white border border-solid border-gray-200 rounded-lg p-8 flex flex-col items-center text-center gap-3">
                      <Scissors className="h-6 w-6 text-black" />
                      <p className="text-[12px] text-black">Select text and click <strong>Convert to Clause</strong></p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {builderData.sections.map(section => (
                        <div key={section.id} className="group bg-white border border-gray-200 rounded-lg p-4 shadow-sm relative overflow-hidden">
                          {section.isRepeating && <div className="absolute top-0 right-0 h-full w-1 bg-black" />}
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-[14px] font-bold text-black">{section.name}</h4>
                                <span className="px-1.5 py-0.5 border border-gray-200 rounded text-[8px] font-bold uppercase text-black">
                                  {section.isRepeating ? 'Loop' : 'Clause'}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-700 line-clamp-2 italic">"{section.clauseText}"</p>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                className="p-1.5 text-black hover:bg-gray-200 rounded-md"
                                onClick={() => {
                                  setClauseText(section.clauseText);
                                  if (section.isRepeating) { setEditingRepeatingId(section.id); setRepeatingDialogOpen(true); }
                                  else { setEditingClauseId(section.id); setClauseDialogOpen(true); }
                                }}
                              ><Pencil className="h-3.5 w-3.5" /></button>
                              <button
                                className="p-1.5 text-black hover:bg-gray-200 rounded-md"
                                onClick={() => removeSection(section.id)}
                              ><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-2">
                            <span className="text-[11px] font-bold text-black flex items-center gap-1">
                              {section.isRepeating ? 'per ' : 'if '}
                              <span className="text-black">{section.condition.fieldQuestionId}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <PlaceholderMapDialog
        open={placeholderDialogOpen}
        onClose={() => { setPlaceholderDialogOpen(false); setPlaceholderTarget(null); }}
        fields={builderData.fields}
        currentMapping={placeholderTarget ? mapping[placeholderTarget.occurrenceKey]?.label : undefined}
        onSelect={handleMapSelect}
        onClear={placeholderTarget && mapping[placeholderTarget.occurrenceKey] ? handleMapClear : undefined}
      />


      <style>{`
        .docx-repeating-highlight { background: #f3f4f6; border-bottom: 2px solid #000; padding: 1px 0; cursor: pointer; position: relative; display: inline; transition: background 0.2s ease; }
        .docx-repeating-highlight:hover { background: #e5e7eb; }
        .docx-clause-highlight { background: #f3f4f6; border-bottom: 2px solid #000; padding: 1px 0; cursor: pointer; position: relative; display: inline; transition: background 0.2s ease; }
        .docx-clause-highlight:hover { background: #e5e7eb; }
        .docx-placeholder-container {
          display: inline-grid;
          vertical-align: middle;
          margin: 0 4px;
        }
        .docx-placeholder-sizer {
          visibility: hidden;
          grid-area: 1 / 1;
        }
        .docx-placeholder-clickable { 
          grid-area: 1 / 1;
          width: 100%;
          height: 100%;
          cursor: pointer; 
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px; 
          background: rgba(0, 0, 0, 0.02); 
          border: 1px dashed #94a3b8; 
          transition: background 0.15s, border-color 0.15s;
          color: #64748b; 
          font-weight: 600;
          font-size: 13px;
          padding: 0;
        }
        .docx-placeholder-clickable:hover { background: rgba(0, 0, 0, 0.08); }
        .docx-placeholder-container.mapped .docx-placeholder-clickable { display: none !important; }
        .docx-placeholder-container.mapped .docx-placeholder-sizer { display: none !important; }
        
        .placeholder-badge-container {
          grid-area: 1 / 1;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          overflow: hidden;
          font-size: 11px;
          font-weight: 600;
          color: #0f172a;
          padding: 0 4px;
        }
        .placeholder-inline-badge { text-overflow: ellipsis; white-space: nowrap; overflow: hidden; flex: 1; text-align: left; }
        .placeholder-badge-action { display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; cursor: pointer; color: #dc2626; border-radius: 50%; margin-left: 4px; flex-shrink: 0; transition: background 0.15s; }
        .placeholder-badge-action:hover { background: rgba(0, 0, 0, 0.05); }
      `}</style>
    </div>
  );
}