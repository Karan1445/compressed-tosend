import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { uploadDocx } from '../../store/slices/lawyerDocxSlice';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { DocumentHeader } from '../../components/shared/DocumentHeader';
import { FileUpload } from '../../components/shared/FileUpload';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function NewDocument() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    
    const [docName, setDocName] = useState("");
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!docName.trim()) {
            toast.error("Please enter a document name");
            return;
        }
        if (!uploadedFile || !uploadedFile.file) {
            toast.error("Please upload a document");
            return;
        }

        setIsSaving(true);
        try {
            const result = await dispatch(uploadDocx({
                file: uploadedFile.file, 
                name: docName
            })).unwrap();
            
            toast.success("Document uploaded successfully!");
            navigate(`/lawyer/documents/${result._id}/map`);
        } catch (err) {
            toast.error(err || "Failed to upload document");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white p-6 md:p-8">
            <DocumentHeader 
                title="New Document"
                rightContent={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => navigate("/lawyer/documents")}
                            className="h-9 px-6 bg-white border-slate-200 text-slate-700 font-semibold shadow-none rounded-md hover:bg-slate-50"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="h-9 px-8 bg-black hover:bg-zinc-800 text-white font-semibold shadow-none rounded-md gap-2"
                        >
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                            {isSaving ? "Saving..." : "Map fields"}
                        </Button>
                    </>
                }
            />

            <div className="w-full space-y-8 max-w-[800px] mx-auto mt-4">
                <div className="space-y-4 w-full">
                    <Label className="text-[13px] font-bold text-slate-800 flex items-center gap-1">
                        Document Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        value={docName}
                        onChange={(e) => setDocName(e.target.value)}
                        placeholder="e.g. Individual Revocable Living Trust"
                        className="w-full h-11 border-slate-200 focus-visible:ring-1 rounded-md text-[13px]"
                    />
                </div>

                <div className="space-y-4 w-full">
                    <Label className="text-[13px] font-bold text-slate-800 flex items-center gap-1">
                        Upload Document <span className="text-red-500">*</span>
                    </Label>
                    <FileUpload
                        onFileSelect={setUploadedFile}
                    />
                    <p className="text-[12px] italic text-slate-500">
                        Upon saving document, you will be redirected to map the placeholders.
                    </p>
                </div>
            </div>
        </div>
    );
}
