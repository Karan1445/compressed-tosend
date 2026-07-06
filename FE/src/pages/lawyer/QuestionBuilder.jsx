import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { ArrowLeft, Save } from 'lucide-react';

import { ANSWER_TYPES } from '../../components/questions/constants';
import { ConditionPanel } from '../../components/questions/ConditionPanel';
import { NestedConfigModal } from '../../components/questions/NestedConfigModal';
import { GroupFieldsPanel } from '../../components/questions/panels/GroupFieldsPanel';
import { OptionsListPanel } from '../../components/questions/panels/OptionsListPanel';
import { DropdownOptionsPanel } from '../../components/questions/panels/DropdownOptionsPanel';
import { AddressOptionsPanel } from '../../components/questions/panels/AddressOptionsPanel';
import { DateConfigPanel } from '../../components/questions/panels/DateConfigPanel';
import { NumberConfigPanel } from '../../components/questions/panels/NumberConfigPanel';
import { PhoneConfigPanel } from '../../components/questions/panels/PhoneConfigPanel';

function cn(...args) { return clsx(args); }

const API = 'http://localhost:8888/api/lawyer/questions';

export default function QuestionBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [questionTitle, setQuestionTitle] = useState('');
  const [description, setDescription] = useState('');
  const [answerType, setAnswerType] = useState('Text');
  const [configuration, setConfiguration] = useState({});
  const [required, setRequired] = useState(true);
  const [appearanceCondition, setAppearanceCondition] = useState(null);

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [nestedModalState, setNestedModalState] = useState(null);

  useEffect(() => {
    if (isEditMode && id) {
      const token = localStorage.getItem('auth_token');
      fetch(`${API}/${id}`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (data._id) {
            setQuestionTitle(data.title || '');
            setDescription(data.description || '');
            setAnswerType(data.answerType || 'Text');
            setConfiguration(data.configuration || {});
            setRequired(data.required !== undefined ? data.required : true);
            setAppearanceCondition(data.appearanceCondition || null);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [id, isEditMode]);

  const handleAnswerTypeChange = (type) => {
    setAnswerType(type);
    if (type === 'Address') {
      setConfiguration({
        fields: [
          { id: 'street', name: 'Street Address', visible: true, required: true },
          { id: 'city', name: 'City', visible: true, required: true },
          { id: 'state', name: 'State', visible: true, required: true },
          { id: 'country', name: 'Country', visible: true, required: true },
          { id: 'zipcode', name: 'Zipcode', visible: true, required: true },
        ]
      });
    } else if (['Dropdown-selection', 'Radio-selection', 'Checkbox'].includes(type)) {
      setConfiguration({ options: [] });
    } else if (type === 'Group Fields') {
      setConfiguration({ groupFields: [], repeatingEntries: true });
    } else {
      setConfiguration({});
    }
  };

  const handleSave = async () => {
    if (!questionTitle.trim()) { toast.error('Question title is required'); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const payload = { title: questionTitle.trim(), description, answerType, configuration, required, appearanceCondition };
      const method = isEditMode ? 'PUT' : 'POST';
      const url = isEditMode ? `${API}/${id}` : API;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast.success(isEditMode ? 'Question updated!' : 'Question created!');
      navigate('/lawyer/questions');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
          <p className="text-[13px] text-slate-400">Loading question...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-8 max-w-full mx-auto">

      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/lawyer/questions')}
          className="flex items-center gap-2 text-[13px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Questions
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/lawyer/questions')}
            className="h-9 px-5 text-[13px] font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-5 text-[13px] font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving...' : isEditMode ? 'Update Question' : 'Save Question'}
          </button>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-[22px] font-bold text-slate-800">
          {isEditMode ? 'Edit Question' : 'Add / Edit Question'}
        </h1>
        <p className="text-[13px] text-slate-400 mt-1">
          Configure the question title, answer type, and appearance conditions.
        </p>
      </div>

      <div className="space-y-10">

        <section className="space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
              Section A — Question Details
            </h2>
          </div>

          <div className="space-y-2">
            <Label className="text-[13px] font-semibold text-slate-700">
              Question Title <span className="text-red-400">*</span>
            </Label>
            <Input
              value={questionTitle}
              onChange={(e) => setQuestionTitle(e.target.value)}
              placeholder="Type your question here..."
              className="h-12 border-slate-200 bg-white focus-visible:ring-1 focus-visible:ring-slate-400 text-slate-800 text-[14px] placeholder:text-slate-300"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[13px] font-semibold text-slate-700">
              Description <span className="text-slate-300 font-normal">(Optional)</span>
            </Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add guidance or explanation for the person filling this question..."
              rows={3}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-[13px] text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none placeholder:text-slate-300"
            />
          </div>
        </section>

        <ConditionPanel
          currentId={id || ''}
          condition={appearanceCondition}
          onChange={setAppearanceCondition}
        />

        <section className="space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">
              Section C — Answer Type
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {ANSWER_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => handleAnswerTypeChange(type)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all border',
                  answerType === type
                    ? 'bg-slate-800 border-slate-800 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'
                )}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setRequired(!required)}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                required ? 'bg-slate-700' : 'bg-slate-200'
              )}
            >
              <span className={cn(
                'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm',
                required ? 'translate-x-[18px]' : 'translate-x-[2px]'
              )} />
            </button>
            <span className="text-[13px] font-medium text-slate-600">Required to fill answer</span>
          </div>

          <div className="space-y-4">
            {answerType === 'Group Fields' && (
              <GroupFieldsPanel config={configuration} onChange={setConfiguration} onOpenNestedConfig={(i, t) => setNestedModalState({ index: i, type: t })} />
            )}
            {answerType === 'Dropdown-selection' && (
              <DropdownOptionsPanel config={configuration} onChange={setConfiguration} />
            )}
            {answerType === 'Radio-selection' && (
              <OptionsListPanel title="Radio Options" config={configuration} onChange={setConfiguration} />
            )}
            {answerType === 'Checkbox' && (
              <OptionsListPanel title="Checkbox Options" config={configuration} onChange={setConfiguration} />
            )}
            {answerType === 'Address' && (
              <AddressOptionsPanel config={configuration} onChange={setConfiguration} />
            )}
            {answerType === 'Phone Number' && (
              <PhoneConfigPanel config={configuration} onChange={setConfiguration} />
            )}
            {(answerType === 'Amount' || answerType === 'Number') && (
              <NumberConfigPanel config={configuration} onChange={setConfiguration} title={`${answerType} Range Configuration`} />
            )}
            {answerType === 'Date-picker' && (
              <DateConfigPanel config={configuration} onChange={setConfiguration} />
            )}
          </div>
        </section>

      </div>

      <NestedConfigModal
        open={nestedModalState !== null}
        onClose={() => setNestedModalState(null)}
        fieldType={nestedModalState?.type || ''}
        config={
          nestedModalState !== null && configuration.groupFields
            ? (configuration.groupFields[nestedModalState.index]?.configuration || {})
            : {}
        }
        onChange={(newConfig) => {
          if (nestedModalState !== null && configuration.groupFields) {
            const newGroupFields = [...configuration.groupFields];
            newGroupFields[nestedModalState.index] = { ...newGroupFields[nestedModalState.index], configuration: newConfig };
            setConfiguration({ ...configuration, groupFields: newGroupFields });
          }
        }}
      />
    </div>
  );
}
