import { useState } from 'react';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../../components/ui/select';
import { Trash2, GripVertical } from 'lucide-react';
import { clsx } from 'clsx';
import { OptionsListPanel } from './OptionsListPanel';

function cn(...args) { return clsx(args); }

export function DropdownOptionsPanel({ config, isNested, onChange }) {
  const dropdownType = config?.dropdownType || 'Custom';
  const displayName = config?.displayName || '';
  const required = config?.required !== undefined ? config.required : true;
  const options = config?.options || [{ value: '', showTextInput: false }];

  const addOption = () => onChange({ ...config, dropdownType: 'Custom', options: [...options, { value: '', showTextInput: false }] });
  const removeOption = (i) => onChange({ ...config, dropdownType: 'Custom', options: options.filter((_, idx) => idx !== i) });
  const updateOption = (i, val) => onChange({ ...config, dropdownType: 'Custom', options: options.map((o, idx) => idx === i ? { ...o, value: val } : o) });

  const clearAll = () => onChange({ ...config, dropdownType: 'Custom', displayName: '', required: false, options: [{ value: '', showTextInput: false }] });

  return (
    <div className={cn('space-y-5', !isNested && 'border border-[#E5E5E5] rounded-lg p-6 mt-6')}>
      {!isNested && (
        <div className="flex items-center justify-between border-b pb-4 mb-2">
          <h3 className="text-[14px] font-bold text-foreground">Dropdown Configuration</h3>
          <button onClick={clearAll} className="text-[12px] font-semibold text-[#2066E8] hover:underline">CLEAR</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">
            Dropdown Type <span className="text-red-500">*</span>
          </Label>
          <Select value={dropdownType} onValueChange={(val) => onChange({ ...config, dropdownType: val })}>
            <SelectTrigger className="bg-white border-[#D7D7D7] h-11">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="Custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">
            Display Name <span className="text-red-500">*</span>
          </Label>
          <Input
            value={displayName}
            onChange={(e) => onChange({ ...config, displayName: e.target.value })}
            placeholder="e.g. Select Relationship"
            className="bg-white border-[#D7D7D7] h-11"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => onChange({ ...config, required: !required })}
          className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
            required ? 'bg-[#333333]' : 'bg-[#D1D5DB]')}
        >
          <span className={cn('inline-block h-4 w-4 rounded-full bg-white transition-transform',
            required ? 'translate-x-6' : 'translate-x-1')} />
        </button>
        <span className="text-[13px] font-medium text-foreground">Required</span>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[13px] font-bold text-foreground">Dropdown Options</h3>
        </div>
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-3">
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
            <Input
              value={opt.value}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder="Option value"
              className="flex-1 bg-white border-[#D7D7D7] h-11"
            />
            <button onClick={() => removeOption(i)} className="text-muted-foreground hover:text-red-500 transition-colors shrink-0 p-2">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          onClick={addOption}
          className="mt-2 text-[#333333] border border-[#D7D7D7] font-semibold hover:bg-gray-50 h-9 px-4 rounded-md text-sm"
        >
          + Add Option
        </button>
      </div>
    </div>
  );
}
