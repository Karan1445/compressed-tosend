import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '../../components/ui/dialog';
import { DropdownOptionsPanel } from './panels/DropdownOptionsPanel';
import { OptionsListPanel } from './panels/OptionsListPanel';
import { AddressOptionsPanel } from './panels/AddressOptionsPanel';
import { DateConfigPanel } from './panels/DateConfigPanel';
import { NumberConfigPanel } from './panels/NumberConfigPanel';
import { PhoneConfigPanel } from './panels/PhoneConfigPanel';

export function NestedConfigModal({ open, onClose, fieldType, config, onChange }) {
  let title = 'Configuration';
  if (fieldType === 'Dropdown-selection') title = 'Dropdown Configuration';
  if (fieldType === 'Radio-selection') title = 'Radio Options';
  if (fieldType === 'Checkbox') title = 'Checkbox Options';
  if (fieldType === 'Address') title = 'Address Configuration';
  if (fieldType === 'Date-picker' || fieldType === 'Date') title = 'Date Configuration';
  if (fieldType === 'Number' || fieldType === 'Amount') title = 'Numeric Configuration';
  if (fieldType === 'Phone Number') title = 'Phone Configuration';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden bg-white gap-0 border-0 rounded-xl shadow-xl max-h-[90vh]">
        <DialogHeader className="px-6 py-5 border-b">
          <DialogTitle className="text-[16px] font-bold">{title}</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5 overflow-auto max-h-[calc(90vh-140px)]">
          {fieldType === 'Dropdown-selection' && (
            <DropdownOptionsPanel config={config} isNested onChange={onChange} />
          )}
          {(fieldType === 'Radio-selection' || fieldType === 'Checkbox') && (
            <OptionsListPanel title={title} config={config} isNested onChange={onChange} />
          )}
          {fieldType === 'Address' && (
            <AddressOptionsPanel config={config} isNested onChange={onChange} />
          )}
          {(fieldType === 'Date-picker' || fieldType === 'Date') && (
            <DateConfigPanel config={config} onChange={onChange} />
          )}
          {(fieldType === 'Number' || fieldType === 'Amount') && (
            <NumberConfigPanel config={config} onChange={onChange} />
          )}
          {fieldType === 'Phone Number' && (
            <PhoneConfigPanel config={config} onChange={onChange} />
          )}
        </div>

        <div className="flex justify-end px-6 py-5 border-t">
          <button onClick={onClose}
            className="h-9 px-6 bg-[#333333] hover:bg-[#222222] text-white font-semibold shadow-none rounded-md">
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
