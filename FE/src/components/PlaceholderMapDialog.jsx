import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Loader2 } from 'lucide-react';

export function PlaceholderMapDialog({ open, onClose, fields, currentMapping, onSelect, onClear }) {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(()=>{setSearchTerm('')},[open,onClose])

  const filteredFields = fields.filter(f =>
    f.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.question.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-normal">Map Placeholder</DialogTitle>
          <DialogDescription className="text-gray-700 text-sm mt-1">
            Select a field to map to this placeholder.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 border-gray-300 rounded focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:border-blue-400"
              autoFocus
            />
          </div>

          <div className="max-h-[350px] overflow-y-auto space-y-2.5 pr-2 custom-scrollbar">
            {filteredFields.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500">No fields found</div>
            ) : (
                filteredFields.map(field => (
                  <button
                    key={field.questionId}
                    onClick={() => onSelect(field)}
                    className="w-full text-left px-4 py-3.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between group">
                    <div className="space-y-1">
                      <div className="text-[14px] font-normal text-black">{field.label}</div>
                      <div className="text-[13px] text-gray-500 truncate max-w-[280px]">{field.question}</div>
                    </div>
                    {currentMapping === field.label && (
                      <span className="text-[10px] font-normal text-black bg-gray-200 border border-gray-300 rounded px-2 py-1 uppercase">Mapped</span>
                    )}
                  </button>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between pt-2">
          <Button onClick={onClear} className="text-white bg-black hover:bg-zinc-800 rounded-lg h-10 px-5 text-sm font-normal">
            Clear Mapping
          </Button>
          <Button variant="outline" onClick={onClose} className="rounded-lg border-gray-200 hover:bg-gray-100 text-black h-10 px-5 text-sm font-normal">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
