import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Loader2, ArrowLeft, ArrowRight, RotateCcw, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

const API = 'http://localhost:8888/api/lawyer/packages';

// ─── Helpers ───────────────────────────────────────────────────────────
function resolveDisplayValue(answers, questionId) {
  const parts = questionId.split('.');
  const base = answers[parts[0]];
  if (base === undefined || base === null) return '';
  if (parts.length === 1) {
    if (typeof base === 'object' && !Array.isArray(base)) {
      return Object.values(base).filter(Boolean).join(', ');
    }
    return String(base || '');
  }
  if (parts[1] === 'address' && parts[2]) return String((base || {})[parts[2]] || '');
  if (parts[1] === 'group' && parts[2]) {
    if (Array.isArray(base)) return base.map(e => e[parts[2]] || '').filter(Boolean).join(', ');
    return String((base || {})[parts[2]] || '');
  }
  return '';
}

export default function FillPackage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useSelector(s => s.auth);

  const [pkg, setPkg] = useState(null);
  const [lawyerQuestions, setLawyerQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // answers keyed by question._id
  const [answers, setAnswers] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isReviewing, setIsReviewing] = useState(false);
  const [errors, setErrors] = useState({});

  // ─── Load package + questions ───────────────────────────────────────
  useEffect(() => {
    const storageKey = `pkg_draft_${id}`;
    const QUESTIONS_API = 'http://localhost:8888/api/lawyer/questions';

    fetch(`${API}/store/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(async pkgData => {
        if (pkgData.error) { toast.error(pkgData.error); navigate('/lawyer/packages/store'); return; }
        setPkg(pkgData);

        // Extract unique BASE question IDs from all placeholderMappings
        const baseIds = new Set();
        (pkgData.documents || []).forEach(doc => {
          (doc.placeholderMappings || []).forEach(m => {
            if (m.questionId) baseIds.add(m.questionId.split('.')[0]);
          });
          (doc.clauseConfigs || []).forEach(c => {
            if (c.questionId) baseIds.add(c.questionId.split('.')[0]);
            if (c.dependsOn) baseIds.add(c.dependsOn.split('.')[0]);
          });
        });

        const idArray = Array.from(baseIds).filter(Boolean);

        // Fetch those specific questions by ID (no createdBy restriction)
        let questions = [];
        if (idArray.length > 0) {
          try {
            const qRes = await fetch(`${QUESTIONS_API}/by-ids`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ ids: idArray })
            });
            const qData = await qRes.json();
            questions = Array.isArray(qData) ? qData : [];
          } catch (e) {
            console.error('Failed to fetch questions by ids', e);
          }
        }

        setLawyerQuestions(questions);

        // Restore draft
        try {
          const saved = localStorage.getItem(storageKey);
          if (saved && saved !== 'undefined') {
            const { answers: savedAnswers, step } = JSON.parse(saved);
            setAnswers(savedAnswers || {});
            setCurrentStep(step || 0);
          }
        } catch (e) { /* ignore */ }
      })
      .catch(() => toast.error('Failed to load package'))
      .finally(() => setLoading(false));
  }, [id, token, navigate]);


  // ─── Build ordered list of unique questions from mapped placeholders ─
  const steps = useMemo(() => {
    if (!pkg || !lawyerQuestions.length) return [];
    const seen = new Set();
    const result = [];

    const processId = (fullId) => {
      const baseId = fullId.split('.')[0];
      if (seen.has(baseId)) return;
      seen.add(baseId);
      const q = lawyerQuestions.find(q => q._id === baseId);
      if (q) result.push(q);
    };

    pkg.documents.forEach(doc => {
      (doc.placeholderMappings || []).forEach(m => processId(m.questionId));
      (doc.clauseConfigs || []).forEach(c => {
        if (c.dependsOn) processId(c.dependsOn);
        if (c.questionId) processId(c.questionId);
        (c.conditions || []).forEach(cond => {
          if (cond.dependsOn) processId(cond.dependsOn);
          if (cond.questionId) processId(cond.questionId);
        });
      });
      (doc.repeatingConfigs || []).forEach(r => { if (r.questionId) processId(r.questionId); });
    });

    return result;
  }, [pkg, lawyerQuestions]);

  // ─── Save draft on answers change ───────────────────────────────────
  useEffect(() => {
    if (steps.length > 0) {
      localStorage.setItem(`pkg_draft_${id}`, JSON.stringify({ answers, step: currentStep }));
    }
  }, [answers, currentStep, id, steps.length]);

  const updateAnswer = useCallback((qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
    setErrors(prev => ({ ...prev, [qId]: null }));
  }, []);

  // ─── Validation ──────────────────────────────────────────────────────
  const validateStep = (q) => {
    if (!q) return true;
    const val = answers[q._id];
    const type = q.answerType;

    if (q.required) {
      if (val === undefined || val === null || val === '') {
        setErrors(prev => ({ ...prev, [q._id]: 'This field is required' }));
        return false;
      }
      if (type === 'Address') {
        const fields = (q.configuration?.fields?.length > 0) ? q.configuration.fields : [
          { id: 'street', name: 'Street Address', required: true },
          { id: 'city', name: 'City', required: true },
          { id: 'state', name: 'State', required: true },
          { id: 'country', name: 'Country', required: true },
          { id: 'zipcode', name: 'Zipcode', required: true },
        ];
        for (const f of fields) {
          if (f.required && !(val || {})[f.id]) {
            toast.error(`${q.title}: ${f.name} is required`);
            return false;
          }
        }
      }
      if (type === 'Group Fields') {
        if (!Array.isArray(val) || val.length === 0) {
          setErrors(prev => ({ ...prev, [q._id]: 'This field is required' }));
          return false;
        }
      }
      if (type === 'Checkbox') {
        if (!Array.isArray(val) || val.length === 0) {
          setErrors(prev => ({ ...prev, [q._id]: 'Please select at least one option' }));
          return false;
        }
      }
    }

    if (val && type === 'Email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setErrors(prev => ({ ...prev, [q._id]: 'Invalid email format' }));
      return false;
    }

    setErrors(prev => ({ ...prev, [q._id]: null }));
    return true;
  };

  const handleNext = () => {
    const q = steps[currentStep];
    if (!validateStep(q)) {
      toast.error('Please fix the errors before continuing');
      return;
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setIsReviewing(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (isReviewing) { setIsReviewing(false); return; }
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the form? All answers will be cleared.')) {
      setAnswers({});
      setCurrentStep(0);
      setIsReviewing(false);
      localStorage.removeItem(`pkg_draft_${id}`);
      toast.success('Form reset successfully');
    }
  };

  const handleSubmit = async () => {
    // Final validation
    for (const q of steps) {
      if (!validateStep(q)) {
        toast.error(`Please complete: ${q.title}`);
        const idx = steps.indexOf(q);
        setCurrentStep(idx);
        setIsReviewing(false);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/store/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      localStorage.removeItem(`pkg_draft_${id}`);
      toast.success('Submitted successfully!');
      navigate(`/lawyer/packages/store/success/${data.submissionId}`);
    } catch (err) {
      toast.error(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Field Renderer ──────────────────────────────────────────────────
  const renderField = (q) => {
    const type = q.answerType;
    const rawVal = answers[q._id];
    const config = q.configuration || {};
    const err = errors[q._id];

    // Safely extract a scalar string value — never show [object Object]
    const safeStr = (v) => {
      if (v === undefined || v === null) return '';
      if (typeof v === 'object') return ''; // clear unexpected object in scalar field
      return String(v);
    };

    const val = rawVal; // keep raw for Address/Group; use safeStr() for scalar fields
    const inputClass = `w-full border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 transition ${err ? 'border-red-400' : 'border-gray-200'}`;

    switch (type) {
      case 'Text':
      case 'Short Answer':
      case 'Email':
      case 'Number':
      case 'Amount':
      case 'Percentage':
      case 'Phone Number':
        return (
          <input
            type={type === 'Number' || type === 'Amount' || type === 'Percentage' ? 'number' : type === 'Email' ? 'email' : 'text'}
            value={safeStr(rawVal)}
            onChange={e => updateAnswer(q._id, e.target.value)}
            placeholder={`Enter ${q.title}...`}
            max={type === 'Percentage' ? 100 : undefined}
            className={inputClass}
          />
        );

      case 'Long Answer':
        return (
          <textarea
            value={safeStr(rawVal)}
            onChange={e => updateAnswer(q._id, e.target.value)}
            placeholder="Provide details..."
            rows={4}
            className={inputClass + ' h-auto'}
          />
        );

      case 'Date-picker':
      case 'Date':
        return (
          <input
            type="date"
            value={val || ''}
            onChange={e => updateAnswer(q._id, e.target.value)}
            className={inputClass}
          />
        );

      case 'Radio-selection':
      case 'Multiple Choice': {
        const opts = config.options || [];
        return (
          <div className="space-y-2">
            {opts.map((opt, i) => {
              const label = typeof opt === 'object' ? opt.value : opt;
              return (
                <label key={i} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${val === label ? 'border-gray-800 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input type="radio" name={q._id} value={label} checked={val === label} onChange={() => updateAnswer(q._id, label)} className="accent-gray-800" />
                  <span className="text-sm text-gray-800">{label}</span>
                </label>
              );
            })}
          </div>
        );
      }

      case 'Dropdown-selection':
      case 'Dropdown': {
        const opts = config.options || [];
        return (
          <select value={val || ''} onChange={e => updateAnswer(q._id, e.target.value)} className={inputClass}>
            <option value="">Select an option...</option>
            {opts.map((opt, i) => {
              const label = typeof opt === 'object' ? opt.value : opt;
              return <option key={i} value={label}>{label}</option>;
            })}
          </select>
        );
      }

      case 'Checkbox': {
        const opts = config.options || [];
        const currentVals = Array.isArray(val) ? val : [];
        return (
          <div className="space-y-2">
            {opts.map((opt, i) => {
              const label = typeof opt === 'object' ? opt.value : opt;
              return (
                <label key={i} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${currentVals.includes(label) ? 'border-gray-800 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input
                    type="checkbox"
                    checked={currentVals.includes(label)}
                    onChange={() => {
                      const next = currentVals.includes(label)
                        ? currentVals.filter(v => v !== label)
                        : [...currentVals, label];
                      updateAnswer(q._id, next);
                    }}
                    className="accent-gray-800"
                  />
                  <span className="text-sm text-gray-800">{label}</span>
                </label>
              );
            })}
          </div>
        );
      }

      case 'Address': {
        const addressFields = (config.fields?.length > 0) ? config.fields : [
          { id: 'street', name: 'Street Address', visible: true, required: true },
          { id: 'city', name: 'City', visible: true, required: true },
          { id: 'state', name: 'State', visible: true, required: true },
          { id: 'country', name: 'Country', visible: true, required: true },
          { id: 'zipcode', name: 'Zipcode', visible: true, required: true },
        ];
        return (
          <div className="grid grid-cols-1 gap-4 p-5 border border-gray-200 rounded-xl bg-gray-50/40">
            {addressFields.filter(f => f.visible !== false).map(f => (
              <div key={f.id} className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {f.name} {f.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={f.id === 'zipcode' ? 'text' : 'text'}
                  value={(val || {})[f.id] || ''}
                  onChange={e => {
                    const v = e.target.value;
                    if (f.id === 'zipcode' && v && !/^\d*$/.test(v)) return;
                    updateAnswer(q._id, { ...(val || {}), [f.id]: v });
                  }}
                  placeholder={f.id === 'zipcode' ? '000000' : `Enter ${f.name}...`}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
                />
              </div>
            ))}
          </div>
        );
      }

      case 'Group Fields': {
        const groupFields = config.groupFields || [];
        const repeating = config.repeatingEntries !== false;
        const entries = Array.isArray(val) ? val : (val ? [val] : [{}]);
        return (
          <div className="space-y-4">
            {entries.map((entry, entryIdx) => (
              <div key={entryIdx} className="p-5 border border-gray-200 rounded-xl bg-white shadow-sm space-y-4 relative">
                {repeating && entries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => updateAnswer(q._id, entries.filter((_, i) => i !== entryIdx))}
                    className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors text-xs font-medium"
                  >
                    Remove
                  </button>
                )}
                {repeating && <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Entry #{entryIdx + 1}</div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupFields.filter(f => f.show !== false && f.visible !== false).map((field, fi) => (
                    <div key={fi} className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600">
                        {field.name} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={(entry || {})[field.name] || ''}
                        onChange={e => {
                          const newEntries = [...entries];
                          newEntries[entryIdx] = { ...(entry || {}), [field.name]: e.target.value };
                          updateAnswer(q._id, newEntries);
                        }}
                        placeholder={`Enter ${field.name}...`}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {repeating && (
              <button
                type="button"
                onClick={() => updateAnswer(q._id, [...entries, {}])}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition"
              >
                + Add Another Entry
              </button>
            )}
          </div>
        );
      }

      default:
        return (
          <input
            type="text"
            value={safeStr(rawVal)}
            onChange={e => updateAnswer(q._id, e.target.value)}
            className={inputClass}
          />
        );
    }
  };

  // ─── Loading ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex justify-center items-center h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );

  if (!pkg) return null;

  if (steps.length === 0) return (
    <div className="max-w-2xl mx-auto p-8 text-center">
      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <h2 className="text-xl font-semibold text-gray-700">No questions required</h2>
      <p className="text-gray-400 mt-1 text-sm">This package has no mapped questions.</p>
      <button onClick={() => navigate('/lawyer/packages/store')} className="mt-6 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm">Back to Store</button>
    </div>
  );

  const progress = isReviewing ? 100 : Math.round(((currentStep) / steps.length) * 100);

  // ─── Review Screen ──────────────────────────────────────────────────
  if (isReviewing) {
    return (
      <div className="max-w-2xl mx-auto p-6 md:p-10 space-y-6 pb-24">
        <div>
          <button onClick={() => setIsReviewing(false)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Edit Answers
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Review Your Answers</h1>
          <p className="text-gray-500 text-sm mt-1">Please review all your answers before submitting.</p>
        </div>

        {/* Progress */}
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-gray-900 h-1.5 rounded-full w-full transition-all" />
        </div>

        {/* Answers */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="divide-y divide-gray-100">
            {steps.map((q, idx) => {
              const val = answers[q._id];
              let display;
              if (q.answerType === 'Address' && typeof val === 'object' && val) {
                display = Object.entries(val).map(([k, v]) => `${k}: ${v}`).join('\n');
              } else if (q.answerType === 'Group Fields' && Array.isArray(val)) {
                display = val.map((e, i) => `Entry #${i + 1}: ` + Object.entries(e).map(([k, v]) => `${k}: ${v}`).join(', ')).join('\n');
              } else if (Array.isArray(val)) {
                display = val.join(', ');
              } else {
                display = val ? String(val) : null;
              }
              return (
                <div key={q._id} className="flex flex-col sm:flex-row gap-4 p-5 hover:bg-gray-50 transition-colors">
                  <div className="sm:w-2/5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{idx + 1}. {q.answerType}</p>
                    <p className="text-sm font-medium text-gray-800">{q.title}</p>
                  </div>
                  <div className="sm:w-3/5">
                    {display ? (
                      <pre className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap font-sans">{display}</pre>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Not answered</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
          <button
            onClick={handleReset}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-4 w-4" /> Reset Form
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : 'Submit & Generate Documents'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Question Step Screen ───────────────────────────────────────────
  const q = steps[currentStep];
  const err = errors[q?._id];

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-10 space-y-6 pb-24">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/lawyer/packages/store')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Store
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{pkg.name}</h1>
        <p className="text-gray-400 text-sm mt-0.5">Answer all questions to generate your documents</p>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-gray-500">Question {currentStep + 1} of {steps.length}</span>
          <span className="text-xs font-medium text-gray-500">{progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-gray-900 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question Card */}
      {q && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
          <div className="mb-5">
            <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-2">{q.answerType}</span>
            <h2 className="text-lg font-semibold text-gray-900">
              {q.title} {q.required && <span className="text-red-500">*</span>}
            </h2>
            {q.description && <p className="text-gray-500 text-sm mt-1">{q.description}</p>}
          </div>

          {renderField(q)}

          {err && (
            <div className="mt-3 flex items-center gap-1.5 text-red-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{err}</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-2">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Previous
        </button>
        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
        >
          {currentStep === steps.length - 1 ? 'Review Answers' : 'Next'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
