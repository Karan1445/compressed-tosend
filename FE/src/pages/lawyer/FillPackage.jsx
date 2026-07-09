import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Loader2, ArrowLeft, ArrowRight, RotateCcw, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { resolveRawValue, evaluateCondition } from '../../utils/answerResolver';

const API = 'http://localhost:8888/api/lawyer/packages';

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

  const [answers, setAnswers] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isReviewing, setIsReviewing] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const storageKey = `pkg_draft_${id}`;
    const QUESTIONS_API = 'http://localhost:8888/api/lawyer/questions';

    fetch(`${API}/store/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(async pkgData => {
        if (pkgData.error) { toast.error(pkgData.error); navigate('/lawyer/packages/store'); return; }
        setPkg(pkgData);

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

        try {
          const saved = localStorage.getItem(storageKey);
          if (saved && saved !== 'undefined') {
            const { answers: savedAnswers, step } = JSON.parse(saved);
            setAnswers(savedAnswers || {});
            setCurrentStep(step || 0);
          }
        } catch (e) {  }
      })
      .catch(() => toast.error('Failed to load package'))
      .finally(() => setLoading(false));
  }, [id, token, navigate]);

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

  const isQuestionVisible = useCallback((q) => {
    if (!q) return false;
    if (!q.appearanceCondition || !q.appearanceCondition.questionId) return true;
    
    const condition = q.appearanceCondition;
    const targetQ = lawyerQuestions.find(s => s._id === condition.questionId.split('.')[0]);
    const targetConfig = targetQ?.configuration;
    const rawValue = resolveRawValue(answers, condition.questionId, targetConfig);
    
    return evaluateCondition(rawValue, condition.operator, condition.value);
  }, [answers, lawyerQuestions]);

  const visibleSteps = useMemo(() => steps.filter(isQuestionVisible), [steps, isQuestionVisible]);

  useEffect(() => {
    if (visibleSteps.length > 0 && currentStep >= visibleSteps.length) {
      setCurrentStep(visibleSteps.length - 1);
    }
  }, [visibleSteps.length, currentStep]);

  useEffect(() => {
    if (visibleSteps.length > 0) {
      localStorage.setItem(`pkg_draft_${id}`, JSON.stringify({ answers, step: currentStep }));
    }
  }, [answers, currentStep, id, visibleSteps.length]);

  const updateAnswer = useCallback((qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
    setErrors(prev => ({ ...prev, [qId]: null }));
  }, []);

  const getValidationErrors = (q, value) => {
    if (!q) return null;
    let val = value;
    if (typeof val === "object" && val !== null && "_value" in val) val = val._value;

    if (val === undefined || val === null || val === "") return null;
    const type = q.answerType || q.type;

    if (type === "Percentage" && Number(val) > 100) return "Max 100%";

    const config = q.configuration || q || {}; // Support both full question object or inline subfield config

    if (type === "Number" || type === "Amount") {
      const numVal = Number(val);
      if (config.minRange !== undefined && numVal < config.minRange) return `Minimum value is ${config.minRange}`;
      if (config.maxRange !== undefined && numVal > config.maxRange) return `Maximum value is ${config.maxRange}`;
    }

    if (type === "Phone Number") {
      const str = val.toString();
      if (!str.startsWith("+")) return "Must start with + (e.g. +91)";
      const digitsOnly = str.slice(1).replace(/\s/g, ""); // Remove spaces for length check
      if (digitsOnly.length < 8) return "Phone number too short";
      if (digitsOnly.length > 15) return "Phone number too long";
    }
    if (type === "Email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Invalid email format";

    if (type === "Date" || type === "Date-picker") {
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (config.allowPast === false && date < today) return "Past dates are not allowed";
      if (config.allowFuture === false && date > today) return "Future dates are not allowed";
      if (config.minDate && date < new Date(config.minDate)) return `Date must be after ${config.minDate}`;
      if (config.maxDate && date > new Date(config.maxDate)) return `Date must be before ${config.maxDate}`;
    }

    if (type === "Address" && typeof value === "object") {
      if (value.zipcode && !/^\d+$/.test(value.zipcode)) return "Zipcode must be numeric";
    }

    return null;
  };

  const validateStep = (q, silent = false) => {
    if (!q) return true;
    const val = answers[q._id];
    const type = q.answerType;
    let isValid = true;
    let localErrors = {};

    if (q.required) {
      if (val === undefined || val === null || val === '') {
        localErrors[q._id] = 'This field is required';
        if (!silent) toast.error(`${q.title}: This field is required`);
        isValid = false;
      } else if (type === 'Address') {
        const fields = (q.configuration?.fields?.length > 0) ? q.configuration.fields : [
          { id: 'street', name: 'Street Address', required: true },
          { id: 'city', name: 'City', required: true },
          { id: 'state', name: 'State', required: true },
          { id: 'country', name: 'Country', required: true },
          { id: 'zipcode', name: 'Zipcode', required: true },
        ];
        for (const f of fields) {
          if (f.required && !(val || {})[f.id]) {
            if (!silent && isValid) toast.error(`${q.title}: ${f.name} is required`);
            localErrors[`${q._id}_${f.id}`] = 'This field is required';
            isValid = false;
          }
        }
      } else if (type === 'Group Fields') {
        if (!Array.isArray(val) || val.length === 0) {
          localErrors[q._id] = 'This field is required';
          if (!silent) toast.error(`${q.title}: This field is required`);
          isValid = false;
        } else {
          const groupFields = q.configuration?.groupFields || [];
          for (let i = 0; i < val.length; i++) {
            const entry = val[i] || {};
            for (const f of groupFields.filter(gf => gf.show !== false && gf.visible !== false)) {
              const subVal = entry[f.name];
              const errKey = `${q._id}_${i}_${f.name}`;
              
              if (f.required && (subVal === undefined || subVal === null || subVal === '' || (Array.isArray(subVal) && subVal.length === 0))) {
                if (!silent && isValid) toast.error(`${q.title} (Entry #${i + 1}): ${f.name} is required`);
                localErrors[errKey] = 'This field is required';
                isValid = false;
              } else {
                const advErr = getValidationErrors(f, subVal);
                if (advErr) {
                  if (!silent && isValid) toast.error(`${q.title} (Entry #${i + 1}) - ${f.name}: ${advErr}`);
                  localErrors[errKey] = advErr;
                  isValid = false;
                }
              }
            }
          }
        }
      } else if (type === 'Checkbox') {
        if (!Array.isArray(val) || val.length === 0) {
          localErrors[q._id] = 'Please select at least one option';
          if (!silent) toast.error(`${q.title}: Please select at least one option`);
          isValid = false;
        }
      } else {
        if (typeof val === 'object' || String(val).trim() === '') {
          localErrors[q._id] = 'This field is required';
          if (!silent) toast.error(`${q.title}: This field is required`);
          isValid = false;
        }
      }
    }

    if (isValid) {
      const advError = getValidationErrors(q, val);
      if (advError) {
        localErrors[q._id] = advError;
        if (!silent) toast.error(`${q.title}: ${advError}`);
        isValid = false;
      }
    }

    setErrors(prev => ({ ...prev, [q._id]: null, ...localErrors }));
    if (isValid) setErrors(prev => ({ ...prev, [q._id]: null })); // clear root error
    return isValid;
  };

  const handleNext = () => {
    const q = visibleSteps[currentStep];
    if (!validateStep(q)) {
      return;
    }
    if (currentStep < visibleSteps.length - 1) {
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

    for (const q of visibleSteps) {
      if (!validateStep(q, true)) { // Silent validation
        toast.error(`Please complete: ${q.title}`);
        const idx = visibleSteps.indexOf(q);
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

  const renderField = (q) => {
    const type = q.answerType;
    const rawVal = answers[q._id];
    const config = q.configuration || {};
    const err = errors[q._id];

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
      case 'Phone Number':
        return (
          <input
            type={type === 'Email' ? 'email' : 'text'}
            value={safeStr(rawVal)}
            onChange={e => updateAnswer(q._id, e.target.value)}
            placeholder={`Enter ${q.title}...`}
            className={inputClass}
          />
        );

      case 'Number':
      case 'Amount':
      case 'Percentage': {
        let maxVal = undefined;
        let minVal = undefined;

        if (type === 'Percentage') { maxVal = 100; minVal = 0; }
        if ((type === 'Number' || type === 'Amount') && config) {
          if (config.maxRange !== undefined) maxVal = config.maxRange;
          if (config.minRange !== undefined) minVal = config.minRange;
        }

        const handleChange = (e) => {
          let newValue = e.target.value;
          if (newValue === "") {
             updateAnswer(q._id, "");
             return;
          }
          const num = Number(newValue);
          if (maxVal !== undefined && num > maxVal) {
             newValue = String(maxVal); // lock it to maxVal
          }
          updateAnswer(q._id, newValue);
        };

        return (
          <input
            type="number"
            value={safeStr(rawVal)}
            onChange={handleChange}
            placeholder={`Enter ${q.title}...`}
            max={maxVal}
            min={minVal}
            className={inputClass}
          />
        );
      }

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
      case 'Date': {
        const dOpts = {};
        const todayStr = new Date().toISOString().split('T')[0];
        let minDateStr = '';
        let maxDateStr = '';

        if (config.minDate) {
          try { minDateStr = new Date(config.minDate).toISOString().split('T')[0]; } catch(e){}
        }
        if (config.allowPast === false) {
           if (!minDateStr || minDateStr < todayStr) minDateStr = todayStr;
        }

        if (config.maxDate) {
          try { maxDateStr = new Date(config.maxDate).toISOString().split('T')[0]; } catch(e){}
        }
        if (config.allowFuture === false) {
           if (!maxDateStr || maxDateStr > todayStr) maxDateStr = todayStr;
        }

        if (minDateStr) dOpts.min = minDateStr;
        if (maxDateStr) dOpts.max = maxDateStr;

        const handleDateChange = (e) => {
           let dateVal = e.target.value;
           if (dateVal) {
              if (minDateStr && dateVal < minDateStr) dateVal = minDateStr;
              if (maxDateStr && dateVal > maxDateStr) dateVal = maxDateStr;
           }
           updateAnswer(q._id, dateVal);
        }

        return (
          <input
            type="date"
            value={val || ''}
            onChange={handleDateChange}
            className={inputClass}
            {...dOpts}
          />
        );
      }

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
            {addressFields.filter(f => f.visible !== false).map(f => {
              const errKey = `${q._id}_${f.id}`;
              const subErr = errors[errKey];
              const inputCls = `w-full border rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 transition ${subErr ? 'border-red-400' : 'border-gray-200'}`;
              return (
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
                      setErrors(prev => ({ ...prev, [errKey]: null }));
                    }}
                    placeholder={f.id === 'zipcode' ? '000000' : `Enter ${f.name}...`}
                    className={inputCls}
                  />
                  {subErr && <p className="text-xs text-red-500 mt-1">{subErr}</p>}
                </div>
              );
            })}
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
                  {groupFields.filter(f => f.show !== false && f.visible !== false).map((field, fi) => {
                    const subVal = (entry || {})[field.name];
                    const errKey = `${q._id}_${entryIdx}_${field.name}`;
                    const subErr = errors[errKey];
                    const onChange = (newVal) => {
                      const newEntries = [...entries];
                      newEntries[entryIdx] = { ...(entry || {}), [field.name]: newVal };
                      updateAnswer(q._id, newEntries);
                      setErrors(prev => ({ ...prev, [errKey]: null }));
                    };
                    const fType = field.type || field.answerType;
                    const fConfig = field.configuration || field || {};
                    const inputCls = `w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300 transition ${subErr ? 'border-red-400' : 'border-gray-200'}`;

                    let fieldEl;
                    if (fType === 'Dropdown' || fType === 'Dropdown-selection') {
                      fieldEl = (
                        <select value={subVal || ''} onChange={e => onChange(e.target.value)} className={inputCls}>
                          <option value="">Select an option...</option>
                          {(fConfig.options || []).map((opt, i) => {
                            const lbl = typeof opt === 'object' ? opt.value : opt;
                            return <option key={i} value={lbl}>{lbl}</option>;
                          })}
                        </select>
                      );
                    } else if (fType === 'Radio-selection' || fType === 'Multiple Choice') {
                      fieldEl = (
                        <div className="space-y-2">
                          {(fConfig.options || []).map((opt, i) => {
                            const lbl = typeof opt === 'object' ? opt.value : opt;
                            return (
                              <label key={i} className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition ${subVal === lbl ? (subErr ? 'border-red-400 bg-red-50' : 'border-gray-800 bg-gray-50') : (subErr ? 'border-red-300 hover:bg-red-50' : 'border-gray-200 hover:bg-gray-50')}`}>
                                <input type="radio" value={lbl} checked={subVal === lbl} onChange={() => onChange(lbl)} className="accent-gray-800" />
                                <span className="text-sm text-gray-800">{lbl}</span>
                              </label>
                            );
                          })}
                        </div>
                      );
                    } else if (fType === 'Checkbox') {
                      const cVals = Array.isArray(subVal) ? subVal : [];
                      fieldEl = (
                        <div className="space-y-2">
                          {(fConfig.options || []).map((opt, i) => {
                            const lbl = typeof opt === 'object' ? opt.value : opt;
                            return (
                              <label key={i} className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition ${cVals.includes(lbl) ? (subErr ? 'border-red-400 bg-red-50' : 'border-gray-800 bg-gray-50') : (subErr ? 'border-red-300 hover:bg-red-50' : 'border-gray-200 hover:bg-gray-50')}`}>
                                <input type="checkbox" checked={cVals.includes(lbl)} onChange={() => {
                                  onChange(cVals.includes(lbl) ? cVals.filter(v => v !== lbl) : [...cVals, lbl]);
                                }} className="accent-gray-800" />
                                <span className="text-sm text-gray-800">{lbl}</span>
                              </label>
                            );
                          })}
                        </div>
                      );
                    } else if (fType === 'Long Answer') {
                      fieldEl = <textarea value={subVal || ''} onChange={e => onChange(e.target.value)} placeholder={`Enter ${field.name}...`} rows={3} className={inputCls} />;
                    } else if (fType === 'Date' || fType === 'Date-picker') {
                      fieldEl = <input type="date" value={subVal || ''} onChange={e => onChange(e.target.value)} className={inputCls} />;
                    } else if (fType === 'Number' || fType === 'Amount' || fType === 'Percentage') {
                      fieldEl = <input type="number" value={subVal || ''} onChange={e => onChange(e.target.value)} placeholder={`Enter ${field.name}...`} className={inputCls} />;
                    } else {
                      fieldEl = <input type="text" value={subVal || ''} onChange={e => onChange(e.target.value)} placeholder={`Enter ${field.name}...`} className={inputCls} />;
                    }

                    return (
                      <div key={fi} className={`space-y-1.5 ${fType === 'Long Answer' ? 'md:col-span-2' : ''}`}>
                        <label className="text-xs font-semibold text-gray-600">
                          {field.name} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {fieldEl}
                        {subErr && <p className="text-xs text-red-500 mt-1">{subErr}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {repeating && (
              <button
                type="button"
                onClick={() => updateAnswer(q._id, [...entries, {}])}
                className="w-full py-3 border-2 border-solid border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition"
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

  if (loading) return (
    <div className="flex justify-center items-center h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );

  if (!pkg) return null;

  if (visibleSteps.length === 0) return (
    <div className="max-w-2xl mx-auto p-8 text-center">
      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <h2 className="text-xl font-semibold text-gray-700">No questions required</h2>
      <p className="text-gray-400 mt-1 text-sm">This package has no mapped questions.</p>
      <button onClick={() => navigate('/lawyer/packages/store')} className="mt-6 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm">Back to Store</button>
    </div>
  );

  const progress = isReviewing ? 100 : Math.round(((currentStep) / visibleSteps.length) * 100);

  if (isReviewing) {
    return (
      <div className="w-full max-w-full mx-auto p-6 md:p-10 space-y-6 pb-24">
        <div>
          <button onClick={() => setIsReviewing(false)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Edit Answers
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Review Your Answers</h1>
          <p className="text-gray-500 text-sm mt-1">Please review all your answers before submitting.</p>
        </div>

        {}
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-gray-900 h-1.5 rounded-full w-full transition-all" />
        </div>

        {}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="divide-y divide-gray-100">
            {visibleSteps.map((q, idx) => {
              const val = answers[q._id];
              let display;
              if (q.answerType === 'Address') {
                if (typeof val === 'object' && val && !Array.isArray(val)) {
                  display = Object.entries(val).map(([k, v]) => `${k}: ${v}`).join('\n');
                }
              } else if (q.answerType === 'Group Fields') {
                if (Array.isArray(val)) {
                  display = val.map((e, i) => `Entry #${i + 1}: ` + (typeof e === 'object' ? Object.entries(e).map(([k, v]) => `${k}: ${v}`).join(', ') : e)).join('\n');
                }
              } else if (q.answerType === 'Checkbox') {
                if (Array.isArray(val)) display = val.join(', ');
              } else {

                if (val !== undefined && val !== null) {
                  display = typeof val === 'object' ? null : String(val); // Ignore stale objects/arrays
                }
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

        {}
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

  const q = visibleSteps[currentStep];
  const err = errors[q?._id];

  return (
    <div className="w-full max-w-full mx-auto p-6 md:p-10 space-y-6 pb-24">
      {}
      <div>
        <button onClick={() => navigate('/lawyer/packages/store')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Store
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{pkg.name}</h1>
        <p className="text-gray-400 text-sm mt-0.5">Answer all questions to generate your documents</p>
      </div>

      {}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-gray-500">Question {currentStep + 1} of {visibleSteps.length}</span>
          <span className="text-xs font-medium text-gray-500">{progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-gray-900 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {}
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

      {}
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
          {currentStep === visibleSteps.length - 1 ? 'Review Answers' : 'Next'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
