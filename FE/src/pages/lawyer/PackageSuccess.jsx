import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Loader2, CheckCircle2, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';

const API = 'http://localhost:8888/api/lawyer/packages';

// ── client-side PDF generation ────────────────────────────────────────────────
async function generatePdfFromDocxBlob(docxBlob, filename) {
  // Dynamically import heavy libs so they don't bloat initial bundle
  const { renderAsync } = await import('docx-preview');
  const html2pdf = (await import('html2pdf.js')).default;

  // Create an off-screen container
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:816px;background:white;font-family:serif;';
  document.body.appendChild(container);

  try {
    await renderAsync(docxBlob, container, null, {
      className: 'docx-pdf-render',
      inWrapper: false,
      ignoreWidth: false,
      ignoreHeight: true,
      ignoreFonts: false,
      breakPages: false,
    });

    // Force white backgrounds
    container.querySelectorAll('*').forEach(el => {
      const s = el.style;
      if (!s.color || s.color === 'transparent') s.color = '#000';
      s.background = 'white';
      s.boxShadow = 'none';
    });

    await new Promise(r => setTimeout(r, 300)); // let fonts settle

    await html2pdf()
      .set({
        margin: [15, 15, 15, 15],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .from(container)
      .save();

  } finally {
    document.body.removeChild(container);
  }
}

export default function PackageSuccess() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const { token } = useSelector(s => s.auth);
  const [submission, setSubmission] = useState(null);
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingDocx, setDownloadingDocx] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(null);

  useEffect(() => {
    fetch(`${API}/store/submissions/${submissionId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(async data => {
        if (data.error) { toast.error(data.error); navigate('/lawyer/packages/store'); return; }
        setSubmission(data);
        const pkgId = data.packageId?._id || data.packageId;
        const pkgRes = await fetch(`${API}/store/${pkgId}`, { headers: { Authorization: `Bearer ${token}` } });
        const pkgData = await pkgRes.json();
        if (!pkgData.error) setPkg(pkgData);
      })
      .catch(() => toast.error('Failed to load submission'))
      .finally(() => setLoading(false));
  }, [submissionId, token, navigate]);

  const handleDownloadDocx = async (doc) => {
    setDownloadingDocx(doc._id);
    try {
      const res = await fetch(
        `${API}/store/submissions/${submissionId}/download/docx/${doc._id}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(err.error || 'Download failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (doc.name || 'document').replace(/\.docx$/i, '') + '_filled.docx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('DOCX downloaded!');
    } catch (err) {
      toast.error(err.message || 'Download failed');
    } finally {
      setDownloadingDocx(null);
    }
  };

  const handleDownloadPdf = async (doc) => {
    setDownloadingPdf(doc._id);
    try {
      // Step 1: Get the filled DOCX blob from backend
      const res = await fetch(
        `${API}/store/submissions/${submissionId}/download/docx/${doc._id}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(err.error || 'Download failed');
      }
      const docxBlob = await res.blob();

      // Step 2: Convert to PDF client-side (no LibreOffice needed)
      const filename = (doc.name || 'document').replace(/\.docx$/i, '') + '_filled.pdf';
      toast.info('Generating PDF, please wait...');
      await generatePdfFromDocxBlob(docxBlob, filename);
      toast.success('PDF downloaded!');
    } catch (err) {
      toast.error(err.message || 'PDF generation failed');
    } finally {
      setDownloadingPdf(null);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );

  const documents = pkg?.documents || [];

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-10 py-16">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">All set!</h1>
        <p className="text-gray-500 mt-2 text-sm leading-relaxed max-w-sm mx-auto">
          Your answers have been saved. Download your filled documents below as DOCX or PDF.
        </p>
      </div>

      <div className="space-y-3 mb-8">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Ready for Download</p>
        {documents.length === 0 ? (
          <p className="text-center text-gray-400 py-8 border rounded-xl">No documents available</p>
        ) : (
          documents.map(doc => (
            <div key={doc._id} className="p-5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-11 h-11 bg-white rounded-xl shadow-sm flex items-center justify-center border border-gray-100">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-[14px]">{doc.name || doc.originalName || 'Legal Document'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Filled Document</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadDocx(doc)}
                  disabled={downloadingDocx === doc._id}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {downloadingDocx === doc._id
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating...</>
                    : <><Download className="h-3.5 w-3.5" /> Download DOCX</>}
                </button>
                <button
                  onClick={() => handleDownloadPdf(doc)}
                  disabled={downloadingPdf === doc._id}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {downloadingPdf === doc._id
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating PDF...</>
                    : <><Download className="h-3.5 w-3.5" /> Download PDF</>}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate('/lawyer/packages/store')}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors"
        >
          Back to Store
        </button>
        <button
          onClick={() => navigate('/lawyer/packages/past-submissions')}
          className="flex-1 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
        >
          View Past Submissions
        </button>
      </div>
    </div>
  );
}
