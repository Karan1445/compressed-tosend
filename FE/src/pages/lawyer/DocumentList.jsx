import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUploadedDocx, deleteDocx } from '../../store/slices/lawyerDocxSlice';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Search, Loader2, FileText, Plus, MoreHorizontal } from 'lucide-react';
import { DocumentHeader } from '../../components/shared/DocumentHeader';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog';

export default function DocumentList() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { documents, loading } = useSelector(state => state.lawyerDocx);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        dispatch(fetchUploadedDocx());
    }, [dispatch]);

    const handleDelete = async (id) => {
        try {
            await dispatch(deleteDocx(id)).unwrap();
            toast.success("Document deleted");
        } catch (err) {
            toast.error(err);
        }
    };

    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = (doc.name || doc.originalName).toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="flex flex-col h-full bg-white p-6 md:p-8">
            <DocumentHeader 
                title="Templates & Documents" 
                rightContent={
                    <Button 
                        onClick={() => navigate("/lawyer/documents/new")}
                        className="bg-black hover:bg-zinc-800 text-white font-semibold shadow-sm h-10 px-5 gap-2"
                    >
                        <Plus className="h-4 w-4" /> New Document
                    </Button>
                }
            />

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Search by document name..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-9 h-10 bg-white"
                    />
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[11px] text-black bg-white uppercase font-normal border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Document Name</th>
                                <th className="px-6 py-4">Mapped Fields</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                            <span className="text-[13px] text-gray-500">Loading documents...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredDocuments.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <FileText className="h-8 w-8 text-gray-300" />
                                            <p className="text-[13px] text-gray-500">No documents found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredDocuments.map((doc) => (
                                    <tr key={doc._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-4 w-4 text-slate-400" />
                                                {doc.name || doc.originalName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-normal text-[12px] text-black">
                                            {doc.placeholderMappings?.length || 0} Fields
                                        </td>
                                        <td className="px-6 py-4 text-gray-700 text-[12px] font-normal">
                                            {new Date(doc.uploadDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => navigate(`/lawyer/documents/${doc._id}/map`)}
                                                    className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold text-black bg-white hover:bg-gray-50 transition-colors shadow-sm"
                                                >
                                                    {doc.isDraft ? 'Map Fields' : 'Edit Mapping'}
                                                </button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <button 
                                                            className="px-4 py-2 border border-transparent rounded-lg text-[13px] font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-white max-w-sm rounded-xl">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="text-black font-normal">Delete Document</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-gray-500 text-[13px]">
                                                                Are you sure you want to delete this document? This action cannot be undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter className="mt-4">
                                                            <AlertDialogCancel className="h-9 px-4 rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50 text-[13px] font-semibold">Cancel</AlertDialogCancel>
                                                            <AlertDialogAction 
                                                                onClick={() => handleDelete(doc._id)} 
                                                                className="h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold border-none"
                                                            >
                                                                Delete Document
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
