import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Loader2, Clock, Download, FileText, RotateCcw, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const API = 'http://localhost:8888/api/lawyer/packages';

export default function PastSubmissions() {
  const navigate = useNavigate();
  const { token } = useSelector(s => s.auth);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null); // "docId-format"
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
    } catch (e) { /* ignore */ }
  };

  const handleDownload = async (sub, doc, format) => {
    const key = `${doc._id}-${format}`;
    setDownloading(key);
    try {
      const res = await fetch(
        `${API}/store/submissions/${sub._id}/download/${format}/${doc._id}`,
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
      a.download = (doc.name || 'document').replace(/\.docx$/i, '') + `_filled.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} downloaded!`);
    } catch (err) {
      toast.error(err.message || 'Download failed');
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
    <div className="max-w-3xl mx-auto p-6 md:p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Past Submissions</h1>
        <p className="text-gray-500 mt-1 text-sm">Download DOCX/PDF or re-fill your previously submitted packages.</p>
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-2xl border-gray-200">
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
                                onClick={() => handleDownload(sub, doc, 'docx')}
                                disabled={downloading === `${doc._id}-docx`}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors"
                              >
                                {downloading === `${doc._id}-docx` ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</> : <><Download className="h-3 w-3" /> DOCX</>}
                              </button>
                              <button
                                onClick={() => handleDownload(sub, doc, 'pdf')}
                                disabled={downloading === `${doc._id}-pdf`}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                              >
                                {downloading === `${doc._id}-pdf` ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</> : <><Download className="h-3 w-3" /> PDF</>}
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
