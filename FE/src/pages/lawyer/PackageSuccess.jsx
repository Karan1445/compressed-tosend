import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Loader2, CheckCircle2, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import { createFilledDocx } from '../../utils/docxModifier';
import { resolveAnswerValue, resolveClauseValue, evaluateCondition } from '../../utils/answerResolver';
import { generatePdfFromDocxBlob } from '../../utils/pdfGenerator';

const API = 'http://localhost:8888/api/lawyer/packages';

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

  const generateDocumentBlob = async (doc) => {
    const res = await fetch(`${API}/store/submissions/${submissionId}/download/raw/${doc._id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Failed to download raw document template');
    const arrayBuffer = await res.arrayBuffer();

    const sortedMappings = [...(doc.placeholderMappings || [])].sort((a, b) => {
      const aIdx = parseInt((a.occurrenceKey || '').replace(/[^0-9]/g, ''), 10) || 0;
      const bIdx = parseInt((b.occurrenceKey || '').replace(/[^0-9]/g, ''), 10) || 0;
      return aIdx - bIdx;
    });

    const replacements = [];
    for (const m of sortedMappings) {
      const value = resolveAnswerValue(submission.answers || {}, m.questionId, null);
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
      const qId = c.questionId || c.fieldId;
      const answer = resolveClauseValue(submission.answers || {}, qId);
      const shouldInclude = evaluateCondition(answer, c.operator, c.value);
      
      const action = (c.actionType || '').toLowerCase();
      if ((action === 'include' || action === 'keep clause') && !shouldInclude) {
        clauseRemovals.push({ text: c.clauseText, occurrenceIndex: c.occurrenceIndex });
      } else if ((action === 'exclude' || action === 'remove clause') && shouldInclude) {
        clauseRemovals.push({ text: c.clauseText, occurrenceIndex: c.occurrenceIndex });
      }
    }

    const repeating = (doc.repeatingConfigs || []).map(r => ({
      ...r,
      questionId: r.questionId || r.fieldId,
      clauseText: r.clauseText || r.text
    }));

    return await createFilledDocx(arrayBuffer, replacements, clauseRemovals, repeating, submission.answers || {}, null);
  };

  const handleDownloadDocx = async (doc) => {
    setDownloadingDocx(doc._id);
    try {
      toast.info('Generating DOCX...');
      const blob = await generateDocumentBlob(doc);
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
      toast.info('Generating PDF, please wait...');
      const docxBlob = await generateDocumentBlob(doc);
      const filename = (doc.name || 'document').replace(/\.docx$/i, '') + '_filled.pdf';
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
    <div className="w-full mx-auto px-6 md:px-10 py-16">
      <div className="mb-10">
        <h1 className="text-3xl font-normal text-gray-900 tracking-tight">Success</h1>
        <p className="text-gray-500 mt-2 text-[15px] leading-relaxed">
          Your documents have been generated and are ready for download.
        </p>
      </div>

      <div className="space-y-4 mb-10">
        <h2 className="text-[14px] font-medium text-gray-900 border-b pb-2">Documents</h2>
        {documents.length === 0 ? (
          <p className="text-gray-400 py-4">No documents available</p>
        ) : (
          documents.map(doc => (
            <div key={doc._id} className="py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 text-[14px]">{doc.name || doc.originalName || 'Document'}</p>
                  <p className="text-[13px] text-gray-500 mt-0.5">Ready for download</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDownloadDocx(doc)}
                  disabled={downloadingDocx === doc._id}
                  className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl border border-gray-300 text-gray-700 text-[13px] font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {downloadingDocx === doc._id
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> DOCX</>
                    : <><Download  className="h-4 w-4"/> DOCX</>}
                </button>
                <button
                  onClick={() => handleDownloadPdf(doc)}
                  disabled={downloadingPdf === doc._id}
                  className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {downloadingPdf === doc._id
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> PDF</>
                    : <><Download  className="h-4 w-4"/> PDF</>}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => navigate('/lawyer/packages/store')}
          className="px-6 py-2.5 border border-gray-400 text-[14px] text-gray-700 font-medium hover:bg-gray-50 transition-colors rounded-xl"
        >
          Back to Store
        </button>
        <button
          onClick={() => navigate('/lawyer/packages/past-submissions')}
          className="px-6 py-2.5 bg-gray-100 text-[14px] text-gray-900 font-medium hover:bg-gray-200 transition-colors rounded-xl border border-gray-400"
        >
          View Past Submissions
        </button>
      </div>
    </div>
  );
}
