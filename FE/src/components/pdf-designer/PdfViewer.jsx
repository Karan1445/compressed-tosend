import { useMemo, useState } from 'react';
import { Document, pdfjs } from 'react-pdf';
import PdfPage from './PdfPage';

pdfjs.GlobalWorkerOptions.workerPort = new Worker(
  new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url),
  { type: 'module' }
);

export default function PdfViewer({ pdfUrl, mode, zoom }) {
  const [pageCount, setPageCount] = useState(0);
  const file = useMemo(() => {
    if (!pdfUrl) return null;
    if (pdfUrl instanceof Uint8Array) {
      return { data: pdfUrl };
    }
    if (typeof pdfUrl === 'string' && pdfUrl.startsWith('data:application/pdf;base64,')) {
      const base64 = pdfUrl.split(',')[1] || '';
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return { data: bytes };
    }
    if (typeof pdfUrl === 'string' && pdfUrl.startsWith('data:')) {
      return { url: pdfUrl };
    }
    return pdfUrl;
  }, [pdfUrl]);

  return (
    <div className="max-h-[calc(100vh-140px)] overflow-auto bg-slate-100">
      <Document
        file={file}
        loading={<div className="p-8 text-sm text-slate-500">Loading PDF...</div>}
        error={<div className="p-8 text-sm text-red-600">Unable to load the selected PDF.</div>}
        onLoadSuccess={({ numPages }) => setPageCount(numPages)}
      >
        <PdfPage mode={mode} zoom={zoom} pageCount={pageCount} />
      </Document>
    </div>
  );
}
