import React, { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { renderAsync } from 'docx-preview';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Loader2, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { submitDocx } from '../../store/slices/docxSlice';
import { fetchQuestions, fetchQuestionsAll } from '../../store/slices/questionSlice';

export default function FillDocxPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const viewerRef = useRef(null);

  const [doc, setDoc] = useState(location.state?.doc || null);
  const [loading, setLoading] = useState(true);
  const [formValues, setFormValues] = useState({});
  const { submitting } = useSelector(state => state.docx);
  const { questions } = useSelector(state => state.questions);

  const formValuesRef = useRef(formValues);
  useEffect(() => { formValuesRef.current = formValues; }, [formValues]);

  const [questionsLoaded, setQuestionsLoaded] = useState(false);

  useEffect(() => {
    if (questions.length === 0) {
      dispatch(fetchQuestionsAll()).unwrap().finally(() => setQuestionsLoaded(true));
    } else {
      setQuestionsLoaded(true);
    }
  }, [dispatch, questions.length]);

  useEffect(() => {
    if (!doc) {
      toast.error('Document not found in state.');
      navigate('/signer');
      return;
    }

    const loadDoc = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:8888/${doc.path.replace(/\\/g, '/')}`);
        if (!response.ok) throw new Error('Network error loading document');
        const arrayBuffer = await response.arrayBuffer();

        if (viewerRef.current) {
          viewerRef.current.innerHTML = '';
          await renderAsync(arrayBuffer, viewerRef.current, null, {
            className: 'docx', inWrapper: true,
          });

          injectInputs();
        }
      } catch (err) {
        toast.error('Failed to render document');
      } finally {
        setLoading(false);
      }
    };

    if (questionsLoaded) {
      loadDoc();
    }
  }, [doc, questionsLoaded, questions]);

  const handleInputChange = (fieldId, value) => {

    let qId = null;
    const mapping = doc?.mappings?.[fieldId];
    if (mapping) {
      qId = typeof mapping === 'string' ? mapping : mapping.questionId;
    } else {
      const dragged = doc?.draggedFields?.find(df => df.id === fieldId);
      if (dragged) qId = dragged.questionId;
    }

    setFormValues(prev => {
      const next = { ...prev, [fieldId]: value };

      if (qId) {
        if (doc?.mappings) {
          Object.entries(doc.mappings).forEach(([mId, m]) => {
            const mappedQId = typeof m === 'string' ? m : m.questionId;
            if (mappedQId === qId) next[mId] = value;
          });
        }
        if (doc?.draggedFields) {
          doc.draggedFields.forEach(df => {
            if (df.questionId === qId) next[df.id] = value;
          });
        }
      }
      return next;
    });
  };

  const handleInputChangeRef = useRef(handleInputChange);
  useEffect(() => { handleInputChangeRef.current = handleInputChange; }, []);

  const injectInputs = () => {
    if (!viewerRef.current) return;

    const mappings = doc.mappings || {};
    let fieldCount = 0;

    const textNodes = [];
    const walk = document.createTreeWalker(
      viewerRef.current, NodeFilter.SHOW_TEXT, null, false
    );
    let node;
    while ((node = walk.nextNode())) {
      if (/_{5,}/.test(node.nodeValue)) textNodes.push(node);
    }

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

          const mapping = mappings[fieldId];
          const questionObj = mapping && questions ? questions.find(q => q._id === (typeof mapping === 'string' ? mapping : mapping.questionId)) : null;

          if (questionObj) {
            const container = document.createElement('span');
            container.style.position = 'relative';
            container.style.display = 'inline-grid';
            container.style.verticalAlign = 'middle';
            container.style.alignItems = 'center';
            container.style.margin = '0 2px';

            const sizer = document.createElement('span');
            sizer.textContent = part;
            sizer.style.visibility = 'hidden';
            sizer.style.gridArea = '1 / 1';
            sizer.style.minWidth = '100px';
            sizer.style.fontSize = '11px';
            sizer.style.padding = '4px 0';
            container.appendChild(sizer);

            const btn = document.createElement('div');
            btn.className = "docx-injected-input-wrapper";
            btn.style.gridArea = '1 / 1';
            btn.style.width = '100%';
            btn.style.height = '100%';
            btn.style.visibility = 'visible';
            btn.style.display = 'flex';
            btn.title = questionObj.question;

            const short = questionObj.question.length > 22 ? questionObj.question.substring(0, 22) + '…' : questionObj.question;
            const currentVal = formValues[fieldId] || '';

            if (questionObj.type === 'checkbox') {
              const isChecked = currentVal === 'true' || currentVal === true;
              btn.innerHTML = `
            <input type="checkbox" data-field-id="${fieldId}" ${isChecked ? 'checked' : ''} style="cursor: pointer; width: 14px; height: 14px; accent-color: #4f46e5; margin: 0; padding: 0;" />
        `;
              btn.style.padding = '0';
              btn.style.border = 'none';
              btn.style.background = 'transparent';
            } else if (questionObj.type === 'dropdown' || questionObj.type === 'radio') {
              const options = questionObj.options || [];
              let optionsHtml = `<option value="" disabled ${!currentVal ? 'selected' : ''}>${short}</option>`;
              options.forEach(opt => {
                optionsHtml += `<option value="${opt}" ${currentVal === opt ? 'selected' : ''}>${opt}</option>`;
              });
              btn.innerHTML = `
          <select data-field-id="${fieldId}" style="width: 100%; height: 100%; box-sizing: border-box; border: 1.5px solid #818cf8; background: #ffffff; outline: none; padding: 0 4px; font-size: 11px; color: #1e1b4b; cursor: pointer; display: block; line-height: normal; margin: 0;">
            ${optionsHtml}
          </select>
        `;
              btn.style.padding = '0';
              btn.style.border = 'none';
              btn.style.background = 'transparent';
            } else if (questionObj.type === 'date') {
              btn.innerHTML = `<input type="date" data-field-id="${fieldId}" value="${currentVal}" style="width: 100%; height: 100%; box-sizing: border-box; border: 1.5px solid #818cf8; background: #ffffff; outline: none; padding: 0 4px; font-size: 11px; color: #1e1b4b; cursor: pointer; display: block; line-height: normal; margin: 0;" />`;
              btn.style.padding = '0';
              btn.style.border = 'none';
              btn.style.background = 'transparent';
            } else if (questionObj.type === 'textarea') {
              btn.innerHTML = `<textarea data-field-id="${fieldId}" placeholder="${short}" style="width: 100%; height: 60px; box-sizing: border-box; border: 1.5px solid #818cf8; background: #ffffff; outline: none; padding: 4px; font-size: 11px; color: #1e1b4b; resize: none; display: block; font-family: sans-serif; margin: 0;">${currentVal}</textarea>`;
              btn.style.padding = '0';
              btn.style.border = 'none';
              btn.style.background = 'transparent';
            } else {
              const typeAttr = questionObj.type === 'number' ? 'number' : 'text';
              btn.innerHTML = `<input type="${typeAttr}" data-field-id="${fieldId}" placeholder="${short}" value="${currentVal}" style="width: 100%; height: 100%; box-sizing: border-box; border: 1.5px solid #0f172a; background: #ffffff; outline: none; padding: 0 4px; font-size: 11px; color: #0f172a; display: block; line-height: normal; margin: 0;" />`;
              btn.style.padding = '0';
              btn.style.border = 'none';
              btn.style.background = 'transparent';
            }

            const input = btn.querySelector('input, select, textarea');
            if (input) {
              if (questionObj.required) {
                input.style.borderLeft = '3px solid #ef4444';
              }

              input.onclick = (e) => e.stopPropagation();
              input.onmousedown = (e) => e.stopPropagation();

              input.onchange = (e) => {
                const val = input.type === 'checkbox' ? e.target.checked.toString() : e.target.value;
                handleInputChangeRef.current(fieldId, val);
              };

              if ((input.tagName === 'INPUT' && input.type !== 'checkbox' && input.type !== 'date') || input.tagName === 'TEXTAREA') {
                input.oninput = (e) => {
                  handleInputChangeRef.current(fieldId, e.target.value);
                  e.target.style.backgroundColor = '#ffffff';
                  e.target.style.borderColor = questionObj.type === 'text' || questionObj.type === 'number' ? '#0f172a' : '#818cf8';
                };
              }
            }

            container.appendChild(btn);
            wrapper.appendChild(container);
          } else {
            const span = document.createElement('span');
            span.textContent = part;
            wrapper.appendChild(span);
          }
        } else {
          wrapper.appendChild(document.createTextNode(part));
        }
      });
      parent.replaceChild(wrapper, textNode);
    });
  };

  const handleSubmit = async () => {

    const mappings = doc.mappings || {};
    const draggedFields = doc.draggedFields || [];

    let isValid = true;
    const missingQuestions = [];

    for (const [fieldId, mapping] of Object.entries(mappings)) {
      const qId = typeof mapping === 'string' ? mapping : mapping.questionId;
      const questionObj = questions.find(q => q._id === qId);

      if (questionObj && questionObj.required) {
        if (!formValues[fieldId] || formValues[fieldId].trim() === '') {
          isValid = false;
          missingQuestions.push(questionObj.question);

          const input = viewerRef.current?.querySelector(`input[data-field-id="${fieldId}"]`);
          if (input) {
            input.style.backgroundColor = '#fef2f2';
            input.style.borderColor = '#ef4444';
          }
        }
      }
    }

    draggedFields.forEach(df => {
      const questionObj = questions.find(q => q._id === df.questionId);
      if (questionObj && questionObj.required) {
        if (!formValues[df.id] || formValues[df.id].trim() === '') {
          isValid = false;
          missingQuestions.push(questionObj.question);

        }
      }
    });

    if (!isValid) {
      toast.error(`Please fill out all required fields: ${missingQuestions.slice(0, 3).join(', ')}${missingQuestions.length > 3 ? '...' : ''}`);
      return;
    }

    try {
      await dispatch(submitDocx({ docxId: doc._id, answers: formValues })).unwrap();
      toast.success('Document successfully submitted!');
      navigate('/signer');
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/signer')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Fill Document</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {doc?.originalName}
            </p>
          </div>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={loading || submitting}
          className="bg-green-600 hover:bg-green-700 text-white gap-2"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Submit Document
        </Button>
      </div>

      <Card className="shadow-md">
        <CardContent className="p-0 relative">
          <div className="relative w-full min-h-[800px] bg-[#f8fafc] rounded-lg docx-scroll-wrapper">
            <div ref={viewerRef} className="docx-viewer-container p-4 min-h-full"></div>
            {loading && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#f8fafc] text-muted-foreground gap-3 rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Loading document for filling...</p>
              </div>
            )}

            {!loading && doc?.draggedFields && doc.draggedFields.map((df) => {
              const questionObj = questions.find(q => q._id === df.questionId);
              if (!questionObj) return null;

              const isRequired = questionObj.required;
              const isEmpty = !formValues[df.id] || formValues[df.id].trim() === '';

              return (
                <div
                  key={df.id}
                  style={{
                    position: 'absolute',
                    left: df.x,
                    top: df.y,
                    width: df.width,
                    height: df.height,
                    zIndex: 20
                  }}
                >
                  <input
                    type={questionObj.type === 'number' ? 'number' : (questionObj.type === 'date' ? 'date' : 'text')}
                    placeholder={questionObj.question + (isRequired ? ' *' : '')}
                    value={formValues[df.id] || ''}
                    onChange={(e) => handleInputChange(df.id, e.target.value)}
                    className="w-full h-full border rounded px-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-colors docx-dragged-input"
                    style={{
                      backgroundColor: isRequired && isEmpty ? '#fef2f2' : 'white',
                      borderColor: isRequired && isEmpty ? '#ef4444' : '#cbd5e1',
                      borderLeft: isRequired ? '3px solid #ef4444' : undefined
                    }}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
