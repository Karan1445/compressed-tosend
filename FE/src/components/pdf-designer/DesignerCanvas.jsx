export default function DesignerCanvas({ children }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {children}
    </div>
  );
}
