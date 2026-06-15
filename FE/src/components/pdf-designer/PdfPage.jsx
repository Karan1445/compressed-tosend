import { useEffect, useMemo, useRef, useState } from 'react';
import { Page } from 'react-pdf';
import { useDocumentStore } from '../../store/documentStore';
import DraggableField from './DraggableField';

export default function PdfPage({ mode, zoom, pageCount }) {
  const { fields } = useDocumentStore();
  const pageHeights = useRef(new Map());

  const pages = useMemo(() => Array.from({ length: pageCount }, (_, index) => index + 1), [pageCount]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4">
      {pages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
          Load a PDF to start placing fields.
        </div>
      ) : null}
      {pages.map((pageNumber) => (
        <PdfSinglePage
          key={pageNumber}
          pageNumber={pageNumber}
          zoom={zoom}
          mode={mode}
          fields={fields.filter((field) => field.pageNumber === pageNumber)}
          pageHeights={pageHeights}
        />
      ))}
    </div>
  );
}

function PdfSinglePage({ pageNumber, zoom, mode, fields, pageHeights }) {
  const pageWrapRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const setActivePageNumber = useDocumentStore((state) => state.setActivePageNumber);

  useEffect(() => {
    if (!pageWrapRef.current || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsVisible(true);
          setActivePageNumber(pageNumber);
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(pageWrapRef.current);
    return () => observer.disconnect();
  }, [pageNumber, setActivePageNumber]);

  return (
    <div className="mx-auto w-full max-w-[900px]">
      <div className="mb-2 flex items-center justify-between px-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
        <span>Page {pageNumber}</span>
        <span>{Math.round(zoom * 100)}%</span>
      </div>
      <div ref={pageWrapRef} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isVisible ? (
          <Page
            pageNumber={pageNumber}
            scale={zoom}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            onRenderSuccess={(page) => {
              const viewport = page.getViewport({ scale: zoom });
              setPageSize({ width: viewport.width, height: viewport.height });
              pageHeights.current.set(pageNumber, viewport.height);
            }}
          />
        ) : (
          <div className="flex h-[900px] items-center justify-center text-sm text-slate-400">
            Loading page {pageNumber}...
          </div>
        )}
        {pageSize.width > 0 ? (
          <div className="absolute inset-0">
            {fields.map((field) => (
              <DraggableField
                key={field.id}
                field={field}
                mode={mode}
                pageWidth={pageSize.width}
                pageHeight={pageSize.height}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
