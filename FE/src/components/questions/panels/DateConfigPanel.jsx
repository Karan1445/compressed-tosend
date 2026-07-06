import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../../components/ui/select';
import { clsx } from 'clsx';

function cn(...args) { return clsx(args); }

const DATE_FORMAT_OPTIONS = [
  { label: 'Standard (MM/DD/YYYY)', value: 'MM/dd/yyyy' },
  { label: 'European (DD/MM/YYYY)', value: 'dd/MM/yyyy' },
  { label: 'Dashed (DD-MM-YYYY)', value: 'dd-MM-yyyy' },
  { label: 'ISO-8601 (YYYY-MM-DD)', value: 'yyyy-MM-dd' },
  { label: 'Abbreviated Month (15 Mar 2024)', value: 'd MMM yyyy' },
  { label: 'Full Month (15 March 2024)', value: 'd MMMM yyyy' },
  { label: 'US Full (March 15, 2024)', value: 'MMMM d, yyyy' },
  { label: 'Legal Style (15-Mar-2024)', value: 'dd-MMM-yyyy' },
  { label: 'Year only (2024)', value: 'yyyy' },
  { label: 'Month & Year (March 2024)', value: 'MMMM yyyy' },
];

export function DateConfigPanel({ config, onChange }) {
  const toggle = (key) => onChange({ ...config, [key]: !config[key] });

  return (
    <div className="border border-[#E5E5E5] rounded-lg p-6 space-y-6 bg-white">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-foreground">Date Configuration</h3>
      </div>

      <div className="space-y-4">
        <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Output Format in Document</p>
        <Select value={config?.dateFormat || 'MM/dd/yyyy'} onValueChange={(val) => onChange({ ...config, dateFormat: val })}>
          <SelectTrigger className="w-full h-11 bg-white border-[#E5E5E5]">
            <SelectValue placeholder="Select date format..." />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {DATE_FORMAT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground italic">This format will be used in the final document.</p>
      </div>

      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-3">
          <button onClick={() => toggle('allowPast')}
            className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
              config?.allowPast !== false ? 'bg-[#333333]' : 'bg-[#D1D5DB]')}>
            <span className={cn('inline-block h-3 w-3 rounded-full bg-white transition-transform',
              config?.allowPast !== false ? 'translate-x-5' : 'translate-x-1')} />
          </button>
          <span className="text-[13px] font-medium text-foreground">Allow past dates?</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => toggle('allowFuture')}
            className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
              config?.allowFuture !== false ? 'bg-[#333333]' : 'bg-[#D1D5DB]')}>
            <span className={cn('inline-block h-3 w-3 rounded-full bg-white transition-transform',
              config?.allowFuture !== false ? 'translate-x-5' : 'translate-x-1')} />
          </button>
          <span className="text-[13px] font-medium text-foreground">Allow future dates?</span>
        </div>
      </div>

      <div className="space-y-4 pt-2 border-t border-gray-50 mt-2">
        <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Specific Range (Optional)</p>
        <div className="grid grid-cols-2 gap-4 max-w-[500px]">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Min Date</Label>
            <Input type="date" value={config?.minDate || ''} onChange={e => onChange({ ...config, minDate: e.target.value })} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Max Date</Label>
            <Input type="date" value={config?.maxDate || ''} onChange={e => onChange({ ...config, maxDate: e.target.value })} className="h-11" />
          </div>
        </div>
      </div>
    </div>
  );
}
