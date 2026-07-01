import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUploadedDocx, deleteDocx } from '../../store/slices/docxSlice';
import { FileText, Upload, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog';

export default function SenderPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { documents, loading } = useSelector((state) => state.docx);

  useEffect(() => {
    dispatch(fetchUploadedDocx());
  }, [dispatch]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown date';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const handleDeleteDoc = async (doc) => {
    try {
      await dispatch(deleteDocx(doc._id)).unwrap();
      toast.success(`Document "${doc.originalName}" deleted`);
    } catch (err) {
      toast.error(err || 'Failed to delete document');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Sender Dashboard</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage and track all documents you have sent for signing.
          </p>
        </div>
      </div>

      {/* Documents table */}
      <div className="bg-white border rounded-md shadow-sm overflow-hidden">
        <div className="border-b px-6 py-4">
          <h3 className="font-semibold text-sm text-gray-900">Sent Documents</h3>
        </div>
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">Loading documents...</div>
        ) : !documents || documents.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No documents uploaded yet.</p>
            <p className="text-xs text-gray-400 mt-1">Use the DOCX Viewer to upload and map documents.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 font-medium text-gray-700">File Name</th>
                <th className="px-6 py-3 font-medium text-gray-700">Uploaded On</th>
                <th className="px-6 py-3 font-medium text-gray-700">Mapped Fields</th>
                <th className="px-6 py-3 font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {documents.map((doc) => (
                <tr 
                  key={doc._id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate('/docx-viewer', { state: { docToLoad: doc } })}
                >
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                      {doc.originalName || doc.fileName}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(doc.uploadDate)}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {doc.mappings ? Object.keys(doc.mappings).length : 0} fields
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                        Uploaded
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete document"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete document?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{doc.originalName}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDoc(doc);
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
