import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';

export function PhoneConfigPanel({ config, onChange }) {
  return (
    <div className="border border-[#E5E5E5] rounded-lg p-6 space-y-4 bg-white">
      <h3 className="text-[14px] font-bold text-foreground">Phone Configuration</h3>
      <div className="space-y-2 max-w-[300px]">
        <Label className="text-sm font-semibold">Specific Country Code Prefix</Label>
        <Input value={config?.countryCode || ''}
          onChange={e => onChange({ ...config, countryCode: e.target.value })}
          placeholder="e.g. +1" className="h-11" />
        <p className="text-[11px] text-muted-foreground italic">Users must provide a number starting with this prefix.</p>
      </div>
    </div>
  );
}
