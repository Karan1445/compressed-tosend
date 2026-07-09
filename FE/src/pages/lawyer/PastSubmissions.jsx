import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Loader2, Clock, Download, FileText, RotateCcw, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { createFilledDocx } from '../../utils/docxModifier';
import { resolveAnswerValue, resolveClauseValue, evaluateCondition } from '../../utils/answerResolver';

const API = 'http://localhost:8888/api/lawyer/packages';

async function generatePdfFromDocxBlob(docxBlob, filename) {
  const { renderAsync } = await import('docx-preview');
  const html2pdf = (await import('html2pdf.js')).default;

  const wrapper = document.createElement('div');
  wrapper.style.height = '0px';
  wrapper.style.overflow = 'hidden';

  const container = document.createElement('div');
  container.style.width = '794px';
  container.style.background = '#ffffff';
  container.style.color = '#000000';
  container.style.margin = '0';
  container.style.padding = '0';
  
  wrapper.appendChild(container);
  document.body.appendChild(wrapper);

  try {
    await renderAsync(docxBlob, container, null, {
      className: 'docx-pdf-render',
      inWrapper: false,
      ignoreWidth: false,
      ignoreHeight: true,
      ignoreFonts: false,
      breakPages: false,
    });

    container.querySelectorAll('*').forEach(el => {
      const s = el.style;
      const bg = s.backgroundColor;
      if (bg && (bg.includes('229') || bg.includes('e5e5e5') || bg === 'gray')) {
        s.backgroundColor = '#ffffff';
      }
      if (!s.color || s.color === 'transparent') s.color = '#000000';
    });

    await new Promise(r => setTimeout(r, 1200));

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
    document.body.removeChild(wrapper);
  }
}

export default function PastSubmissions() {
  const navigate = useNavigate();
  const { token } = useSelector(s => s.auth);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null); 
  const [expandedId, setExpandedId] = useState(null);
  const [pkgDetails, setPkgDetails] = useState({});

  useEffect(() => {
    fetch(`${API}/store/submissions/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSubmissions(data); else toast.error('Failed to load submissions'); })
      .catch(() => toast.error('Failed to load submissions'))
      .finally(() => setLoading(false));
  }, [token]);

  const loadPkgDetails = async (sub) => {
    const pkgId = sub.packageId?._id || sub.packageId;
    const newExpanded = expandedId === sub._id ? null : sub._id;
    setExpandedId(newExpanded);

    if (!pkgId || pkgDetails[pkgId] || !newExpanded) return;
    try {
      const res = await fetch(`${API}/store/${pkgId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.error) setPkgDetails(prev => ({ ...prev, [pkgId]: data }));
    } catch (e) {  }
  };

  const generateDocumentBlob = async (sub, doc) => {
    const res = await fetch(`${API}/store/submissions/${sub._id}/download/raw/${doc._id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Failed to download raw document template');
    const arrayBuffer = await res.arrayBuffer();

    const sortedMappings = [...(doc.placeholderMappings || [])].sort((a, b) => {
      const aIdx = parseInt((a.occurrenceKey || '').replace(/[^0-9]/g, ''), 10) || 0;
      const bIdx = parseInt((b.occurrenceKey || '').replace(/[^0-9]/g, ''), 10) || 0;
      return aIdx - bIdx;
    });

    const replacements = [];
    for (const m of sortedMappings) {
      const value = resolveAnswerValue(sub.answers || {}, m.questionId, null);
      const occurrenceIndex = parseInt((m.occurrenceKey || '').replace(/[^0-9]/g, ''), 10);
      if (!isNaN(occurrenceIndex)) {
        replacements.push({
          original: m.placeholderText,
          value,
          occurrenceIndex,
          questionId: m.questionId
        });
      }
    }

    const clauseRemovals = [];
    for (const c of (doc.clauseConfigs || [])) {
      const answer = resolveClauseValue(sub.answers || {}, c.questionId);
      const shouldInclude = evaluateCondition(answer, c.operator, c.value);
      
      const action = (c.actionType || '').toLowerCase();
      if ((action === 'include' || action === 'keep clause') && !shouldInclude) {
        clauseRemovals.push({ text: c.clauseText });
      } else if ((action === 'exclude' || action === 'remove clause') && shouldInclude) {
        clauseRemovals.push({ text: c.clauseText });
      }
    }

    const repeating = (doc.repeatingConfigs || []).map(r => ({
      ...r,
      clauseText: r.clauseText || r.text
    }));

    return await createFilledDocx(arrayBuffer, replacements, clauseRemovals, repeating, sub.answers || {}, null);
  };

  const handleDownloadDocx = async (sub, doc) => {
    setDownloading(`${doc._id}-docx`);
    try {
      toast.info('Generating DOCX...');
      const blob = await generateDocumentBlob(sub, doc);
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
      setDownloading(null);
    }
  };

  const handleDownloadPdf = async (sub, doc) => {
    setDownloading(`${doc._id}-pdf`);
    try {
      toast.info('Generating PDF, please wait...');
      const docxBlob = await generateDocumentBlob(sub, doc);
      const filename = (doc.name || 'document').replace(/\.docx$/i, '') + '_filled.pdf';
      await generatePdfFromDocxBlob(docxBlob, filename);
      toast.success('PDF downloaded!');
    } catch (err) {
      toast.error('PDF generation failed');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );

  return (
    <div className="w-full mx-auto p-6 md:p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Past Submissions</h1>
        <p className="text-gray-500 mt-1 text-sm">Download DOCX/PDF or re-fill your previously submitted packages.</p>
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-20 border-2 border-solid rounded-2xl border-gray-200">
          <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No submissions yet</p>
          <p className="text-gray-400 text-sm mt-1">Go fill a package to see it here.</p>
          <button onClick={() => navigate('/lawyer/packages/store')} className="mt-5 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors">
            Browse Packages
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {submissions.map(sub => {
            const pkgId = sub.packageId?._id || sub.packageId;
            const pkgName = sub.packageId?.name || 'Package';
            const isExpanded = expandedId === sub._id;
            const details = pkgDetails[pkgId];
            const docs = details?.documents || [];

            return (
              <div key={sub._id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => loadPkgDetails(sub)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                      <FileText className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{pkgName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(sub.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        {' · '}
                        <span className="text-green-600 font-medium capitalize">{sub.status}</span>
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 space-y-3">
                    {isExpanded && !details && (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    )}
                    {docs.length === 0 && details && (
                      <p className="text-sm text-gray-400 text-center py-3">No documents in this package</p>
                    )}
                    {docs.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Documents</p>
                        {docs.map(doc => (
                          <div key={doc._id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <p className="text-sm font-medium text-gray-700 mb-2">{doc.name || doc.originalName}</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDownloadDocx(sub, doc)}
                                disabled={downloading === `${doc._id}-docx`}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                              >
                                {downloading === `${doc._id}-docx` ? <><Loader2 className="h-3 w-3 animate-spin" /> DOCX</> : <>DOCX</>}
                              </button>
                              <button
                                onClick={() => handleDownloadPdf(sub, doc)}
                                disabled={downloading === `${doc._id}-pdf`}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                              >
                                {downloading === `${doc._id}-pdf` ? <><Loader2 className="h-3 w-3 animate-spin" /> PDF</> : <>PDF</>}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => navigate(`/lawyer/packages/store/${pkgId}/fill`)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Re-fill Package
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
