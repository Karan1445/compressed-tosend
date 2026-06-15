export default function FieldToolbar({
  activeDocument,
  mode,
  zoom,
  onUpload,
  onAddField,
  onQuestionChange,
  onSave,
  onZoomChange,
  activePageNumber,
  questions,
  selectedQuestionId,
  fieldCount,
  valueCount,
  saveLoading,
}) {
  const displayTitle = 'Edit Your PDF';
  const subtitle =
    activeDocument?.name && activeDocument.name !== 'Untitled PDF'
      ? `Editing document - ${fieldCount} fields${valueCount ? ` - ${valueCount} responses saved` : ''}`
      : 'Open a saved template or upload a PDF to start editing';

  return (
    <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">PDF Form Designer</p>
          <h1 className="text-xl font-semibold text-slate-900">{displayTitle}</h1>
          <p className="text-sm text-slate-500">
            {subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
            <input type="file" accept="application/pdf" className="hidden" onChange={onUpload} />
            Upload PDF
          </label>
          <select
            value={selectedQuestionId}
            onChange={(e) => onQuestionChange(e.target.value)}
            className="min-w-56 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
          >
            <option value="">Select question</option>
            {questions.map((question, index) => (
              <option key={question._id} value={question._id}>
                {index + 1}. {question.question}
              </option>
            ))}
          </select>
          <button
            onClick={onAddField}
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            Add Text Field
          </button>
          <button
            onClick={onSave}
            disabled={saveLoading}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveLoading ? 'Saving...' : 'Save Template'}
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <button className="text-sm text-slate-600" onClick={() => onZoomChange(zoom - 0.1)}>
              -
            </button>
            <span className="min-w-14 text-center text-sm font-medium text-slate-700">{Math.round(zoom * 100)}%</span>
            <button className="text-sm text-slate-600" onClick={() => onZoomChange(zoom + 0.1)}>
              +
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            Page {activePageNumber}
          </div>
        </div>
      </div>
    </div>
  );
}
