import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchAssignedDocx } from '../../store/slices/docxSlice';
import { FileText, Loader2, ArrowRight } from 'lucide-react';

export default function SignerPage() {
  const { user } = useSelector((state) => state.auth);
  const { assignedDocuments, loading } = useSelector((state) => state.docx);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchAssignedDocx());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Signer Dashboard</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, {user?.name || 'Signer'}. Here are the documents waiting for your signature.
          </p>
        </div>
      </div>

      {/* Documents table */}
      <div className="bg-white border rounded-md shadow-sm overflow-hidden">
        <div className="border-b px-6 py-4">
          <h3 className="font-semibold text-sm text-gray-900">Pending Documents</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 text-gray-500 font-medium border-b">
              <tr>
                <th className="px-6 py-3">Document Name</th>
                <th className="px-6 py-3">Assigned Date</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading pending documents...</span>
                    </div>
                  </td>
                </tr>
              ) : assignedDocuments?.length > 0 ? (
                assignedDocuments.map((doc) => (
                  <tr key={doc._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                        {doc.originalName}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(doc.uploadDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/signer/fill/${doc._id}`, { state: { doc } })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                      >
                        Open & Fill
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-gray-400" />
                      </div>
                      <p>No documents are pending your signature right now.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
