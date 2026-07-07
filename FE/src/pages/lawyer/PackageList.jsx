import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPackages, createPackage, updatePackage, deletePackage } from '../../store/slices/packageSlice';
import { fetchUploadedDocx } from '../../store/slices/lawyerDocxSlice';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Search, Loader2, Package as PackageIcon, Plus, MoreHorizontal } from 'lucide-react';
import { DocumentHeader } from '../../components/shared/DocumentHeader';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../../components/ui/dialog';

export default function PackageList() {
    const dispatch = useDispatch();
    const { packages, loading } = useSelector(state => state.package);
    const { documents } = useSelector(state => state.lawyerDocx);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState(null);
    const [formData, setFormData] = useState({ name: '', status: 'Draft', documents: [] });

    useEffect(() => {
        dispatch(fetchPackages());
        dispatch(fetchUploadedDocx());
    }, [dispatch]);

    const handleDelete = async (id) => {
        try {
            await dispatch(deletePackage(id)).unwrap();
            toast.success("Package deleted");
        } catch (err) {
            toast.error("Failed to delete package");
        }
    };

    const handleOpenDialog = (pkg = null) => {
        if (pkg) {
            setEditingPackage(pkg);
            setFormData({
                name: pkg.name,
                status: pkg.status,
                documents: pkg.documents.map(d => d._id)
            });
        } else {
            setEditingPackage(null);
            setFormData({ name: '', status: 'Draft', documents: [] });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error("Package name is required");
            return;
        }

        try {
            if (editingPackage) {
                await dispatch(updatePackage({ id: editingPackage._id, data: formData })).unwrap();
                toast.success("Package updated");
            } else {
                await dispatch(createPackage(formData)).unwrap();
                toast.success("Package created");
            }
            setIsDialogOpen(false);
        } catch (err) {
            toast.error(err || "Operation failed");
        }
    };

    const toggleDocument = (docId) => {
        setFormData(prev => ({
            ...prev,
            documents: prev.documents.includes(docId)
                ? prev.documents.filter(id => id !== docId)
                : [...prev.documents, docId]
        }));
    };

    const filteredPackages = packages.filter(pkg => 
        pkg.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-white p-6 md:p-8">
            <DocumentHeader 
                title="Packages" 
                rightContent={
                    <Button 
                        onClick={() => handleOpenDialog()}
                        className="bg-black hover:bg-zinc-800 text-white font-normal shadow-sm h-10 px-5 gap-2"
                    >
                        <Plus className="h-4 w-4" /> New Package
                    </Button>
                }
            />

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Search by package name..." 
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
                                <th className="px-6 py-4">Package Name</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Documents</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                            <span className="text-[13px] text-gray-500">Loading packages...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPackages.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <PackageIcon className="h-8 w-8 text-gray-300" />
                                            <p className="text-[13px] text-gray-500">No packages found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredPackages.map((pkg) => (
                                    <tr key={pkg._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            <div className="flex items-center gap-3">
                                                <PackageIcon className="h-4 w-4 text-slate-400" />
                                                {pkg.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[12px]">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${pkg.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {pkg.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-700 text-[12px] font-normal">
                                            {pkg.documents?.length || 0} Documents
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleOpenDialog(pkg)}
                                                    className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-normal text-black bg-white hover:bg-gray-50 transition-colors shadow-sm"
                                                >
                                                    Edit
                                                </button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <button 
                                                            className="px-4 py-2 border border-transparent rounded-lg text-[13px] font-normal text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-white max-w-sm rounded-xl">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="text-black font-normal">Delete Package</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-gray-500 text-[13px]">
                                                                Are you sure you want to delete this package?
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter className="mt-4">
                                                            <AlertDialogCancel className="h-9 px-4 rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50 text-[13px] font-normal">Cancel</AlertDialogCancel>
                                                            <AlertDialogAction 
                                                                onClick={() => handleDelete(pkg._id)} 
                                                                className="h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[13px] font-normal border-none"
                                                            >
                                                                Delete Package
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="font-normal text-xl">{editingPackage ? 'Edit Package' : 'New Package'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-black">Package Name</label>
                            <Input 
                                placeholder="Enter package name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-black">Status</label>
                            <select 
                                className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="Draft">Draft</option>
                                <option value="Published">Published</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-black">Select Documents</label>
                            <div className="border border-gray-200 rounded-md max-h-[200px] overflow-y-auto divide-y divide-gray-100">
                                {documents.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-500">No documents available</div>
                                ) : (
                                    documents.map(doc => (
                                        <div 
                                            key={doc._id} 
                                            className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                                            onClick={() => toggleDocument(doc._id)}
                                        >
                                            <input 
                                                type="checkbox" 
                                                checked={formData.documents.includes(doc._id)}
                                                onChange={() => {}}
                                                className="h-4 w-4 text-black rounded border-gray-300 focus:ring-black"
                                            />
                                            <span className="text-sm text-gray-800">{doc.name || doc.originalName}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-normal rounded-lg">Cancel</Button>
                        <Button onClick={handleSave} className="bg-black hover:bg-zinc-800 text-white font-normal rounded-lg">
                            {editingPackage ? 'Update Package' : 'Create Package'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
