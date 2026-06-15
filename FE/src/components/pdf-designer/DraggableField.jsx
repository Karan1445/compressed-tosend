import { Rnd } from 'react-rnd';
import { Trash2 } from 'lucide-react';
import { useDocumentStore } from '../../store/documentStore';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const FIELD_MIN_WIDTH = 0.18;
const FIELD_MIN_HEIGHT = 0.06;

function FieldBox({ field, locked, value, onChange }) {
  const placeholder = field.placeholder || 'Question';
  const options = Array.isArray(field.options) ? field.options : [];

  return (
    <div
      className={`h-full w-full rounded-lg border bg-white text-sm shadow-sm ${
        locked ? 'border-slate-300' : 'border-sky-400 ring-1 ring-sky-100'
      }`}
    >
      {locked ? (
        field.type === 'dropdown' ? (
          <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-full w-full rounded-lg border-none bg-transparent px-3 py-2 text-sm text-slate-700 outline-none"
          >
            <option value="">{placeholder}</option>
            {(options.length > 0 ? options : ['Option 1', 'Option 2']).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="h-full w-full rounded-lg border-none bg-transparent px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-300"
          />
        )
      ) : (
        <div className="flex h-full w-full items-center px-3 py-2 text-slate-500">
          <span className="truncate">{placeholder}</span>
        </div>
      )}
    </div>
  );
}

export default function DraggableField({ field, mode, pageWidth, pageHeight }) {
  const { updateFieldPosition, updateFieldSize, removeField, setSelectedField, fieldValues, updateFieldValue } =
    useDocumentStore();
  const value = fieldValues.find((item) => item.fieldId === field.id)?.value || '';
  const x = field.x * pageWidth;
  const y = field.y * pageHeight;
  const width = Math.max(field.width * pageWidth, FIELD_MIN_WIDTH * pageWidth);
  const height = Math.max(field.height * pageHeight, FIELD_MIN_HEIGHT * pageHeight);
  const locked = mode === 'fill';

  const fieldNode = (
    <FieldBox
      field={field}
      locked={locked}
      value={value}
      onChange={(nextValue) => updateFieldValue(field.id, nextValue)}
    />
  );

  if (locked) {
    return (
      <div style={{ left: x, top: y, width, height }} className="absolute">
        {fieldNode}
      </div>
    );
  }

  return (
    <Rnd
      bounds="parent"
      size={{ width, height }}
      position={{ x, y }}
      onDragStart={() => setSelectedField(field.id)}
      onResizeStart={() => setSelectedField(field.id)}
      enableResizing
      dragGrid={[1, 1]}
      resizeGrid={[1, 1]}
      minWidth={FIELD_MIN_WIDTH * pageWidth}
      minHeight={FIELD_MIN_HEIGHT * pageHeight}
      onDragStop={(e, d) => {
        updateFieldPosition(field.id, {
          x: clamp(d.x / pageWidth, 0, 1 - field.width),
          y: clamp(d.y / pageHeight, 0, 1 - field.height),
        });
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        const nextWidth = clamp(ref.offsetWidth / pageWidth, FIELD_MIN_WIDTH, 1);
        const nextHeight = clamp(ref.offsetHeight / pageHeight, FIELD_MIN_HEIGHT, 1);
        updateFieldSize(field.id, {
          width: nextWidth,
          height: nextHeight,
          x: clamp(position.x / pageWidth, 0, 1 - nextWidth),
          y: clamp(position.y / pageHeight, 0, 1 - nextHeight),
        });
      }}
      className="absolute z-20"
    >
      <div className="group relative h-full w-full">
        {fieldNode}
        <button
          type="button"
          onClick={() => removeField(field.id)}
          className="absolute -right-2 -top-2 hidden rounded-full border border-rose-200 bg-white p-1 text-rose-600 shadow-sm group-hover:block"
          aria-label="Delete field"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </Rnd>
  );
}
