import { clsx } from 'clsx';

function cn(...args) { return clsx(args); }

export function AddressOptionsPanel({ config, isNested, onChange }) {
  const fields = config?.fields || [
    { id: 'street', name: 'Street Address', visible: true, required: true },
    { id: 'city', name: 'City', visible: true, required: true },
    { id: 'state', name: 'State', visible: true, required: true },
    { id: 'country', name: 'Country', visible: true, required: true },
    { id: 'zipcode', name: 'Zipcode', visible: true, required: true },
  ];

  const toggleProperty = (index, prop) => {
    const newFields = fields.map((f, i) => i === index ? { ...f, [prop]: !f[prop] } : f);
    onChange({ ...config, fields: newFields });
  };

  return (
    <div className={cn('space-y-5', !isNested && 'border border-[#E5E5E5] rounded-lg p-6 mt-6')}>
      {!isNested && <h3 className="text-[14px] font-bold text-foreground">Address Configuration</h3>}
      <div className="border rounded-md overflow-hidden bg-white shadow-sm">
        <table className="w-full text-left text-[14px]">
          <thead className="bg-[#F4F4F4] border-b text-foreground font-bold">
            <tr>
              <th className="py-3 px-6 w-24 text-center">Visible</th>
              <th className="py-3 px-6">Field Name</th>
              <th className="py-3 px-6 w-32">Type</th>
              <th className="py-3 px-6 w-32 text-center">Required</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {fields.map((f, i) => (
              <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-4 px-6">
                  <div className="flex justify-center">
                    <input type="checkbox" checked={f.visible} onChange={() => toggleProperty(i, 'visible')}
                      className="h-[18px] w-[18px] rounded border-[#D7D7D7] accent-[#333333] cursor-pointer" />
                  </div>
                </td>
                <td className="py-4 px-6 font-medium text-foreground">{f.name}</td>
                <td className="py-4 px-6 text-muted-foreground">Text</td>
                <td className="py-4 px-6">
                  <div className="flex justify-center">
                    <button onClick={() => toggleProperty(i, 'required')} disabled={!f.visible}
                      className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                        f.required && f.visible ? 'bg-[#333333]' : 'bg-[#D1D5DB]',
                        !f.visible && 'opacity-50 cursor-not-allowed')}>
                      <span className={cn('inline-block h-4 w-4 rounded-full bg-white transition-transform',
                        f.required && f.visible ? 'translate-x-6' : 'translate-x-1')} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
