import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';

export function RepeatingConfigSidebarForm({ groupFields, initialValues, onSave, onDelete, onCancel }) {
  const [clauseName, setClauseName] = useState('');
  const [fieldId, setFieldId] = useState('');

  useEffect(() => {
    if (initialValues) {
      setClauseName(initialValues.clauseName || '');
      setFieldId(initialValues.fieldId || '');
    }
  }, [initialValues]);

  const handleSave = () => {
    if (!clauseName || !fieldId) return;
    onSave({ clauseName, fieldId });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-semibold text-slate-900">{initialValues ? 'Edit Loop' : 'New Loop'}</h3>
        <p className="text-xs text-slate-600 mt-1">Select a group field to repeat this section for each item.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-600">Loop Name</Label>
          <Input 
            value={clauseName} 
            onChange={(e) => setClauseName(e.target.value)} 
            placeholder="e.g. Signers Loop" 
            className="h-9"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-600">Group Field</Label>
          <Select value={fieldId} onValueChange={setFieldId}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select a group" /></SelectTrigger>
            <SelectContent className="bg-white">
              {groupFields.map(f => (
                <SelectItem key={f.questionId} value={f.questionId}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 flex-col">
        <Button 
          className="w-full bg-slate-600 hover:bg-slate-700 text-white" 
          onClick={handleSave}
          disabled={!clauseName || !fieldId}
        >
          {initialValues ? 'Update Loop' : 'Create Loop'}
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
