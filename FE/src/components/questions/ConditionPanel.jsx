import { useState, useEffect, useMemo } from 'react';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import { ArrowRight, Trash2, Link as LinkIcon, Info } from 'lucide-react';
import { clsx } from 'clsx';

function cn(...args) { return clsx(args); }

const ALL_OPERATORS = [
  { label: 'Is equal to', value: 'equals', types: ['text', 'selection', 'date', 'number', 'email'] },
  { label: 'Is not equal to', value: 'not_equals', types: ['text', 'selection', 'date', 'number', 'email'] },
  { label: 'Contains text', value: 'contains', types: ['text', 'email', 'checkbox'] },
  { label: 'Has any value', value: 'is_not_empty', types: ['text', 'selection', 'date', 'number', 'email', 'checkbox', 'complex'] },
  { label: 'Is empty', value: 'is_empty', types: ['text', 'selection', 'date', 'number', 'email', 'checkbox', 'complex'] },
];

function resolveTypeCategory(answerType) {
  if (!answerType) return 'text';
  const t = answerType.toLowerCase();
  if (t.includes('date') || t.includes('picker')) return 'date';
  if (t.includes('radio') || t.includes('dropdown') || t.includes('checkbox')) return 'selection';
  if (t === 'email') return 'email';
  if (['number', 'amount', 'percentage'].includes(t)) return 'number';
  if (['address', 'group fields'].includes(t)) return 'complex';
  return 'text';
}

const NO_VALUE_OPERATORS = ['is_empty', 'is_not_empty'];
const API = 'http://localhost:8888/api/lawyer/questions';

export function ConditionPanel({ currentId, condition, onChange }) {
  const [allQuestions, setAllQuestions] = useState([]);
  const [availableSubFields, setAvailableSubFields] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    fetch(API, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAllQuestions(data.filter(q => q._id !== currentId));
        }
      })
      .catch(() => {});
  }, [currentId]);

  useEffect(() => {
    if (!condition?.questionId) { setAvailableSubFields([]); return; }
    const baseId = condition.questionId.split('.')[0];
    const q = allQuestions.find(it => it._id === baseId);
    if (q) {
      if (q.answerType === 'Group Fields' && q.configuration?.groupFields) {
        setAvailableSubFields(q.configuration.groupFields.map(f => ({
          id: f.id || f.name, name: f.name, type: f.type, options: f.configuration?.options
        })));
      } else if (q.answerType === 'Address' && q.configuration?.fields) {
        setAvailableSubFields(q.configuration.fields.map(f => ({ id: f.id, name: f.name, type: 'Text' })));
      } else {
        setAvailableSubFields([]);
      }
    }
  }, [condition?.questionId, allQuestions]);

  const baseQuestionId = condition?.questionId?.split('.')[0] || '';
  const selectedQuestion = allQuestions.find(q => q._id === baseQuestionId);
  const subPart = condition?.questionId?.split('.')[1];
  const selectedSubField = availableSubFields.find(f => f.id === subPart);

  const effectiveAnswerType = useMemo(() => {
    if (selectedSubField?.type) return selectedSubField.type;
    return selectedQuestion?.answerType || 'Text';
  }, [selectedSubField, selectedQuestion]);

  const typeCategory = resolveTypeCategory(effectiveAnswerType);
  
  const filteredOperators = useMemo(() => {
    let ops = ALL_OPERATORS.filter(op => op.types.includes(typeCategory));
    if (typeCategory === 'selection') {
      ops = ops.filter(op => ['equals', 'not_equals', 'is_empty', 'is_not_empty'].includes(op.value));
    }
    return ops;
  }, [typeCategory]);

  const options = useMemo(() => {
    if (selectedSubField?.options?.length > 0) return selectedSubField.options;
    if (selectedQuestion) {
      const at = selectedQuestion.answerType || '';
      if (at.includes('selection') || at === 'Checkbox') return selectedQuestion.configuration?.options || [];
    }
    return [];
  }, [selectedSubField, selectedQuestion]);

  const updateCondition = (key, val) => {
    const next = {
      questionId: condition?.questionId || '',
      operator: condition?.operator || 'equals',
      value: condition?.value || '',
      ...condition,
      [key]: val
    };
    onChange(next);
  };

  const handleQuestionSelect = (qId) => {
    const q = allQuestions.find(it => it._id === qId);
    if (!q) return;
    const category = resolveTypeCategory(q.answerType);
    const defaultOp = category === 'complex' ? 'is_not_empty' : 'equals';
    onChange({ questionId: qId, operator: defaultOp, value: '' });
  };

  const handleSubFieldSelect = (subId) => {
    if (!condition?.questionId) return;
    const baseId = condition.questionId.split('.')[0];
    const sf = availableSubFields.find(f => f.id === subId);
    const category = resolveTypeCategory(sf?.type);
    const defaultOp = category === 'complex' ? 'is_not_empty' : 'equals';
    onChange({ questionId: `${baseId}.${subId}`, operator: defaultOp, value: '' });
  };

  const handleOperatorChange = (newOp) => {
    const shouldResetValue = NO_VALUE_OPERATORS.includes(newOp);
    if (shouldResetValue) {
      onChange({ questionId: condition?.questionId || '', operator: newOp, value: '' });
    } else {
      onChange({
        ...(condition || {}),
        questionId: condition?.questionId || '',
        operator: newOp,
        value: typeCategory === 'selection' ? '' : (condition?.value || '')
      });
    }
  };

  const needsValueInput = condition && !NO_VALUE_OPERATORS.includes(condition.operator);

  const renderValueField = () => {
    if (!condition || !needsValueInput) return null;

    if (options.length > 0) {
      return (
        <div className="flex-1 space-y-2 min-w-[180px]">
          <Label className="text-[11px] font-bold text-slate-500 uppercase">Value Match</Label>
          <Select value={String(condition?.value || '')} onValueChange={(val) => updateCondition('value', val)}>
            <SelectTrigger className="bg-white border-slate-200 h-11">
              <SelectValue placeholder="Select match..." />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {options.map((opt) => {
                const label = typeof opt === 'object' ? (opt.value || opt.label || opt.name) : opt;
                const val = typeof opt === 'object' ? (opt.value || opt.id) : opt;
                return <SelectItem key={val} value={val} className="text-[13px]">{label}</SelectItem>;
              })}
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div className="flex-1 space-y-2 min-w-[180px]">
        <Label className="text-[11px] font-bold text-slate-500 uppercase">Value Match</Label>
        <Input
          value={condition?.value || ''}
          onChange={(e) => updateCondition('value', e.target.value)}
          placeholder="Type expected answer..."
          className="bg-white border-slate-200 h-11 text-[13px]"
        />
      </div>
    );
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">
            Section B: Conditional Visibility
          </h2>
          <div className="group relative">
            <Info className="h-3.5 w-3.5 text-slate-300 cursor-help" />
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-slate-800 text-white text-[11px] p-2.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed font-normal">
              Define logic that determines when this question should appear. Operators adapt based on the referenced question's type.
            </div>
          </div>
        </div>
        {condition && (
          <button onClick={() => onChange(null)}
            className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase flex items-center gap-1.5">
            <Trash2 className="h-3 w-3" />
            Reset Logic
          </button>
        )}
      </div>

      <div className={cn(
        'rounded-xl border transition-all duration-300',
        condition
          ? 'bg-slate-50/50 border-slate-200 p-6 shadow-sm'
          : 'bg-white border-dashed border-slate-200 p-8 hover:border-slate-300'
      )}>
        {!condition ? (
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-2">
            <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
              <LinkIcon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-[14px] font-semibold text-slate-600">No condition applied</p>
              <p className="text-[12px] text-slate-400">This question will always be visible.</p>
            </div>
            {allQuestions.length > 0 ? (
              <button
                onClick={() => handleQuestionSelect(allQuestions[0]._id)}
                className="h-9 px-5 border border-slate-200 text-slate-600 text-[13px] font-semibold rounded-md hover:bg-slate-50 transition-colors">
                + Setup Appearance Logic
              </button>
            ) : (
              <p className="text-[12px] text-slate-400 italic">Save at least one other question first to set conditions.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 space-y-2 min-w-[200px]">
              <Label className="text-[11px] font-bold text-slate-500 uppercase">If Question…</Label>
              <Select value={baseQuestionId} onValueChange={handleQuestionSelect}>
                <SelectTrigger className="bg-white border-slate-200 h-11">
                  <SelectValue placeholder="Select question..." />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-[300px]">
                  {allQuestions.map(q => (
                    <SelectItem key={q._id} value={q._id} className="text-[13px] py-2.5">{q.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {availableSubFields.length > 0 && (
              <div className="flex-1 space-y-2 min-w-[160px]">
                <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <ArrowRight className="h-3 w-3 text-slate-400" /> Specific Field
                </Label>
                <Select value={subPart || ''} onValueChange={handleSubFieldSelect}>
                  <SelectTrigger className="bg-white border-slate-200 h-11">
                    <SelectValue placeholder="Which field?" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {availableSubFields.map(f => (
                      <SelectItem key={f.id} value={f.id} className="text-[13px] py-2.5">{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex-1 space-y-2 min-w-[160px]">
              <Label className="text-[11px] font-bold text-slate-500 uppercase">Action</Label>
              <Select value={condition?.operator || 'equals'} onValueChange={handleOperatorChange}>
                <SelectTrigger className="bg-white border-slate-200 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {filteredOperators.map(op => (
                    <SelectItem key={op.value} value={op.value} className="text-[13px]">{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {renderValueField()}
          </div>
        )}
      </div>
    </section>
  );
}
