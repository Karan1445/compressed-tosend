import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUploadedDocx, fetchSubmissions } from '../../store/slices/docxSlice';
import { fetchQuestions } from '../../store/slices/questionSlice';
import { FileText, Loader2 } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';

export default function SubmissionsPage() {
  const dispatch = useDispatch();
  const { documents, loading, submissions, loadingSubmissions } = useSelector((state) => state.docx);
  const { questions } = useSelector((state) => state.questions);
  
  const [activeDoc, setActiveDoc] = useState(null);

  useEffect(() => {
    dispatch(fetchUploadedDocx());
    dispatch(fetchQuestions());
  }, [dispatch]);

  const handleSelectDocument = (docId) => {
    const doc = documents.find(d => d._id === docId);
    if (doc) {
      setActiveDoc(doc);
      dispatch(fetchSubmissions(doc._id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Submissions</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Select a document to view the answers submitted by your assigned users.
          </p>
        </div>
      </div>

      <div className="w-full max-w-md">
        <Select value={activeDoc?._id || ''} onValueChange={handleSelectDocument}>
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Select a document..." />
          </SelectTrigger>
          <SelectContent>
            {documents.map((doc) => (
              <SelectItem key={doc._id} value={doc._id}>
                {doc.originalName || doc.fileName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activeDoc && (
        <div className="bg-white border rounded-md shadow-sm overflow-hidden w-full">
          <div className="overflow-x-auto">
            {loadingSubmissions ? (
              <div className="flex justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : submissions?.length > 0 ? (
              (() => {
                const qIds = new Set();
                if (activeDoc?.mappings) {
                  Object.values(activeDoc.mappings).forEach(m => qIds.add(typeof m === 'string' ? m : m.questionId));
                }
                if (activeDoc?.draggedFields) {
                  activeDoc.draggedFields.forEach(df => qIds.add(df.questionId));
                }
                const uniqueQuestions = Array.from(qIds)
                  .map(id => questions.find(q => q._id === id))
                  .filter(Boolean);

                const getAnswerForQuestion = (sub, qId) => {
                  if (activeDoc?.mappings) {
                    for (const [fId, m] of Object.entries(activeDoc.mappings)) {
                      const mappedQId = typeof m === 'string' ? m : m.questionId;
                      if (mappedQId === qId && sub.answers[fId] !== undefined) {
                        return sub.answers[fId];
                      }
                    }
                  }
                  if (activeDoc?.draggedFields) {
                    for (const df of activeDoc.draggedFields) {
                      if (df.questionId === qId && sub.answers[df.id] !== undefined) {
                        return sub.answers[df.id];
                      }
                    }
                  }
                  return '-';
                };

                return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
                          <tr>
                            <th className="px-4 py-3 sticky left-0 bg-slate-100 border-r z-10 w-48 shadow-[1px_0_0_0_#e2e8f0]">User Name</th>
                            {uniqueQuestions.map((q, i) => (
                              <th key={i} className="px-4 py-3 border-r max-w-xs truncate" title={q.question}>
                                {q.question}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {submissions.map((sub) => (
                            <tr key={sub._id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 sticky left-0 bg-white border-r z-10 font-medium shadow-[1px_0_0_0_#e2e8f0]">
                                {sub.signerId?.name || 'Unknown'}
                                <span className={`ml-2 px-2 py-0.5 text-[10px] rounded-full ${sub.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {sub.status === 'completed' ? 'Submitted' : 'Pending'}
                                </span>
                              </td>
                              {uniqueQuestions.map((q, i) => (
                                <td key={i} className="px-4 py-3 border-r max-w-xs truncate" title={String(getAnswerForQuestion(sub, q._id))}>
                                  {getAnswerForQuestion(sub, q._id)}
                                </td>
                              ))}
                            </tr>
                          )) }
                        </tbody>
                      </table>
                    </div>
                );
              })()
            ) : (
              <div className="text-center py-12 text-slate-500">
                No submissions found for this document.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}