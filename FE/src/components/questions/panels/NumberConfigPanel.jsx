import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';

export function NumberConfigPanel({ config, onChange, title = 'Range Configuration' }) {
  return (
    <div className="border border-[#E5E5E5] rounded-lg p-6 space-y-4 bg-white">
      <h3 className="text-[14px] font-bold text-foreground">{title}</h3>
      <div className="grid grid-cols-2 gap-4 max-w-[500px]">
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Min Range</Label>
          <Input type="number" value={config?.minRange ?? ''}
            onChange={e => onChange({ ...config, minRange: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Minimum value" className="h-11" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Max Range</Label>
          <Input type="number" value={config?.maxRange ?? ''}
            onChange={e => onChange({ ...config, maxRange: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Maximum value" className="h-11" />
        </div>
      </div>
    </div>
  );
}
