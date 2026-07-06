import { Input } from '../../../components/ui/input';
import { Trash2 } from 'lucide-react';
import { clsx } from 'clsx';

function cn(...args) { return clsx(args); }

export function OptionsListPanel({ title, config, isNested, onChange }) {
  const options = config?.options || [{ value: '', showTextInput: false }];

  const updateOptions = (newOptions) => onChange({ ...config, options: newOptions });
  const addOption = () => updateOptions([...options, { value: '', showTextInput: false }]);
  const removeOption = (i) => updateOptions(options.filter((_, idx) => idx !== i));
  const updateOption = (i, val) => updateOptions(options.map((o, idx) => idx === i ? { ...o, value: val } : o));
  const toggleTextInput = (i) => updateOptions(options.map((o, idx) => idx === i ? { ...o, showTextInput: !o.showTextInput } : o));

  return (
    <div className={cn('space-y-4', !isNested && 'border border-[#E5E5E5] rounded-lg p-6 mt-6')}>
      <div className="flex items-center justify-between">
        {!isNested ? <h3 className="text-[14px] font-bold text-foreground">{title}</h3> : <div />}
        <button onClick={addOption} className="text-[13px] font-semibold text-[#2066E8] hover:underline">
          + Add Option
        </button>
      </div>
      <div className="space-y-4">
        {options.map((opt, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-4">
              <span className="text-[13px] font-medium text-muted-foreground shrink-0 w-6">{i + 1}.</span>
              <Input
                value={opt.value}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder=""
                className="flex-1 bg-white border-[#D7D7D7] h-11"
              />
              <button onClick={() => removeOption(i)} className="text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <label className="flex items-center gap-2 ml-10 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={opt.showTextInput}
                onChange={() => toggleTextInput(i)}
                className="h-4 w-4 rounded border-[#D7D7D7] accent-[#333333]"
              />
              <span className="text-[12px] text-muted-foreground">Show text input when selected</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
