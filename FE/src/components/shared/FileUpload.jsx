import React, { useState } from "react";
import { Upload, X } from "lucide-react";

export function FileUpload({ onFileSelect, acceptedTypes = ".docx,.pdf", maxSizeText = "DOCX or PDF max 10 mb" }) {
    const [uploadedFile, setUploadedFile] = useState(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
            
            const fileData = {
                file: file,
                name: file.name,
                size: `${sizeInMb} mb`
            };
            setUploadedFile(fileData);
            onFileSelect(fileData);
        }
    };

    const handleClear = () => {
        setUploadedFile(null);
        onFileSelect(null);
    };

    if (uploadedFile) {
        return (
            <div className="w-full max-w-sm border border-slate-200 rounded-xl flex items-center justify-between p-4 bg-white h-[72px] shadow-sm">
                <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-[13px] font-bold text-slate-800 truncate block">
                        {uploadedFile.name}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 mt-0.5">
                        {uploadedFile.size}
                    </span>
                </div>
                <button
                    onClick={handleClear}
                    className="p-1.5 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0 text-slate-500 hover:text-slate-700"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="w-full border-2 border-solid border-gray-200 rounded-xl flex flex-col items-center justify-center relative cursor-pointer hover:bg-gray-50 transition-colors h-[180px] group">
            <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept={acceptedTypes}
                onChange={handleFileChange}
            />
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 pointer-events-none">
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-100 group-hover:bg-gray-200 transition-colors">
                    <Upload className="h-5 w-5 text-slate-600 group-hover:text-black" />
                </div>
                <div>
                    <p className="text-[14px] font-bold text-slate-800">Click to upload or Drag and Drop</p>
                    <p className="text-[12px] font-medium text-slate-500 mt-1">{maxSizeText}</p>
                </div>
            </div>
        </div>
    );
}
