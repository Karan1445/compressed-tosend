import { Input } from '../../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../../components/ui/select';
import { Settings, Trash2, Eye, EyeOff } from 'lucide-react';
import { clsx } from 'clsx';
import { GROUP_FIELD_TYPES } from '../constants';

function cn(...args) { return clsx(args); }

const CONFIGURABLE_FIELDS = [
  'Dropdown-selection', 'Radio-selection', 'Checkbox', 'Address',
  'Date', 'Date-picker', 'Number', 'Amount', 'Phone Number'
];

export function GroupFieldsPanel({ config, onChange, onOpenNestedConfig }) {
  const repeatingEntries = config?.repeatingEntries !== false;
  const groupFields = config?.groupFields || [];

  const addGroupField = () => onChange({ ...config, groupFields: [...groupFields, { name: '', type: 'Text', required: true, visible: true }] });
  const removeGroupField = (i) => onChange({ ...config, groupFields: groupFields.filter((_, idx) => idx !== i) });

  const updateGroupField = (i, key, val) => {
    let newField = { ...groupFields[i], [key]: val };
    if (key === 'type') {
      if (val === 'Address') {
        newField.configuration = {
          fields: [
            { id: 'street', name: 'Street Address', visible: true, required: true },
            { id: 'city', name: 'City', visible: true, required: true },
            { id: 'state', name: 'State', visible: true, required: true },
            { id: 'country', name: 'Country', visible: true, required: true },
            { id: 'zipcode', name: 'Zipcode', visible: true, required: true },
          ]
        };
      } else if (['Dropdown-selection', 'Radio-selection', 'Checkbox'].includes(val)) {
        newField.configuration = { options: [] };
      } else {
        delete newField.configuration;
      }
    }
    onChange({ ...config, groupFields: groupFields.map((f, idx) => idx === i ? newField : f) });
  };

  return (
    <div className="border border-[#E5E5E5] rounded-lg p-6 mt-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-foreground">Group Fields Configuration</h3>
        <button onClick={addGroupField} className="text-[13px] font-semibold text-gray-700 border border-gray-700 p-2 rounded-xl hover:bg-black hover:text-white hover:border-gray-300">
          + Add Field
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="inline-flex items-center gap-6 bg-[#F9F9F9] rounded-lg px-5 py-4">
          <div>
            <p className="text-[13px] font-semibold text-foreground">Repeating entries</p>
            <p className="text-[11px] text-muted-foreground">Users can add multiple entries of data fields.</p>
          </div>
          <button onClick={() => onChange({ ...config, repeatingEntries: !repeatingEntries })}
            className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
              repeatingEntries ? 'bg-[#333333]' : 'bg-[#D1D5DB]')}>
            <span className={cn('inline-block h-4 w-4 rounded-full bg-white transition-transform',
              repeatingEntries ? 'translate-x-6' : 'translate-x-1')} />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {groupFields.map((field, i) => (
          <div key={i} className="flex items-center gap-4">
            <span className="text-[13px] font-medium text-muted-foreground shrink-0 w-6">{i + 1}.</span>
            <div className="flex items-center gap-4 flex-1">
              <Input value={field.name} onChange={(e) => updateGroupField(i, 'name', e.target.value)}
                placeholder="Field name" className="flex-[2] bg-white border-[#D7D7D7] h-11" />
              <Select value={field.type} onValueChange={(val) => updateGroupField(i, 'type', val)}>
                <SelectTrigger className="flex-1 bg-white border-[#D7D7D7] h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {GROUP_FIELD_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 shrink-0 px-2">
                <button onClick={() => updateGroupField(i, 'visible', field.visible === false ? true : false)}
                  className={cn('p-1.5 rounded-md transition-colors',
                    field.visible === false ? 'text-muted-foreground hover:bg-gray-100' : 'text-[#2066E8] hover:bg-blue-50')}
                  title={field.visible === false ? 'Hidden' : 'Visible'}>
                  {field.visible === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <span className="text-[11px] font-medium text-muted-foreground">Vis.</span>
              </div>

              <div className="flex items-center gap-2 shrink-0 px-2">
                <button onClick={() => updateGroupField(i, 'required', !field.required)}
                  className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                    field.required !== false ? 'bg-[#333333]' : 'bg-[#D1D5DB]')}>
                  <span className={cn('inline-block h-3 w-3 rounded-full bg-white transition-transform',
                    field.required !== false ? 'translate-x-5' : 'translate-x-1')} />
                </button>
                <span className="text-[11px] font-medium text-muted-foreground">Req.</span>
              </div>

              <button onClick={() => CONFIGURABLE_FIELDS.includes(field.type) ? onOpenNestedConfig(i, field.type) : undefined}
                className={cn('shrink-0 transition-colors',
                  CONFIGURABLE_FIELDS.includes(field.type)
                    ? 'text-foreground hover:text-[#2066E8] cursor-pointer'
                    : 'text-muted-foreground/40 cursor-default')}>
                <Settings className="h-4 w-4" />
              </button>
              <button onClick={() => removeGroupField(i)}
                className="text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {groupFields.length === 0 && (
          <p className="text-[13px] text-muted-foreground text-center py-4">
            No fields yet. Click "+ Add Field" to add one.
          </p>
        )}
      </div>
    </div>
  );
}
