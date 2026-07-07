import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';

export function ClauseConfigSidebarForm({ radioFields, initialValues, onSave, onDelete, onCancel }) {
  const [clauseName, setClauseName] = useState('');
  const [fieldId, setFieldId] = useState('');
  const [operator, setOperator] = useState('equals');
  const [value, setValue] = useState('');
  const [actionType, setActionType] = useState('include');

  useEffect(() => {
    if (initialValues) {
      setClauseName(initialValues.clauseName || '');
      setFieldId(initialValues.fieldId || '');
      setOperator(initialValues.operator || 'equals');
      setValue(initialValues.value || '');
      setActionType(initialValues.actionType || 'include');
    }
  }, [initialValues]);

  const selectedField = radioFields.find(f => f.questionId === fieldId);
  const options = selectedField?.options || [];

  const handleSave = () => {
    if (!clauseName || !fieldId || !value) return;
    onSave({ clauseName, fieldId, operator, value, actionType });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-semibold text-slate-800">{initialValues ? 'Edit Clause' : 'New Clause'}</h3>
        <p className="text-xs text-slate-500 mt-1">Configure visibility rules for the selected text.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-600">Clause Name</Label>
          <Input 
            value={clauseName} 
            onChange={(e) => setClauseName(e.target.value)} 
            placeholder="e.g. Non-Compete Clause" 
            className="h-9"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-600">Depends On Field</Label>
          <Select value={fieldId} onValueChange={setFieldId}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select a field" /></SelectTrigger>
            <SelectContent className="bg-white">
              {radioFields.map(f => (
                <SelectItem key={f.questionId} value={f.questionId}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {fieldId && (
          <>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600">Condition</Label>
              <Select value={operator} onValueChange={setOperator}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="equals">Equals (==)</SelectItem>
                  <SelectItem value="not_equals">Does Not Equal (!=)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600">Value</Label>
              {options.length > 0 ? (
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select value" /></SelectTrigger>
                  <SelectContent className="bg-white">
                    {options.map(o => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={value} onChange={e => setValue(e.target.value)} placeholder="Type value..." className="h-9" />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600">Action if True</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="include">Include Clause</SelectItem>
                  <SelectItem value="exclude">Exclude Clause</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 flex-col">
        <Button 
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" 
          onClick={handleSave}
          disabled={!clauseName || !fieldId || !value}
        >
          {initialValues ? 'Update Clause' : 'Create Clause'}
        </Button>
        <div className="flex gap-2">
          {onDelete && (
            <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" onClick={onDelete}>
              Delete
            </Button>
          )}
          <Button variant="ghost" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
