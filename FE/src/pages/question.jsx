import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchQuestions, addQuestion, updateQuestion,
  deleteQuestion, bulkDeleteQuestions,
} from '../store/slices/questionSlice';
import { toast } from 'sonner';
import {
  MoreHorizontal, Pencil, Plus, Trash, Loader2,
  Type, AlignLeft, CheckSquare, ChevronDown, Hash,
  Calendar, CircleDot, X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from '../components/ui/alert-dialog';

const QUESTION_TYPES = [
  {
    value: 'text',
    label: 'Text Input',
    icon: Type,
    desc: 'Single-line answer',
    preview: <input readOnly placeholder="Type your answer..." className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-400 cursor-default" />,
  },
  {
    value: 'textarea',
    label: 'Paragraph',
    icon: AlignLeft,
    desc: 'Multi-line answer',
    preview: <textarea readOnly placeholder="Type a longer answer..." rows={2} className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-400 cursor-default resize-none" />,
  },
  {
    value: 'checkbox',
    label: 'Checkbox',
    icon: CheckSquare,
    desc: 'Yes / No toggle',
    preview: (
      <div className="flex items-center gap-2">
        <div className="h-3.5 w-3.5 rounded border-2 border-slate-300 bg-white" />
        <span className="text-xs text-slate-400">Check if applicable</span>
      </div>
    ),
  },
  {
    value: 'dropdown',
    label: 'Dropdown',
    icon: ChevronDown,
    desc: 'Select from a list',
    preview: (
      <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-400">
        <span>Select an option</span>
        <ChevronDown className="h-3 w-3" />
      </div>
    ),
  },
  {
    value: 'number',
    label: 'Number',
    icon: Hash,
    desc: 'Numeric value only',
    preview: <input readOnly type="number" placeholder="0" className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-400 cursor-default" />,
  },
  {
    value: 'radio',
    label: 'Radio Buttons',
    icon: CircleDot,
    desc: 'Single choice from list',
    preview: (
      <div className="flex items-center gap-2">
        <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 bg-white" />
        <span className="text-xs text-slate-400">Option 1</span>
      </div>
    ),
  },
  {
    value: 'date',
    label: 'Date Picker',
    icon: Calendar,
    desc: 'Select a date',
    preview: <input readOnly type="date" className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-400 cursor-default" />,
  },
];

function TypePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {QUESTION_TYPES.map((t) => {
        const Icon = t.icon;
        const selected = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all text-center',
              selected
                ? 'border-gray-200 bg-black text-white shadow-md'
                : 'border-transparent text-gray-500 hover:text-black hover:border-gray-200 hover:bg-gray-50'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-[10px] font-medium leading-tight">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ExtraFormFields({ form, setForm, questions, editingItemId }) {
  const needsOptions = form.type === 'dropdown' || form.type === 'radio';
  const otherQuestions = questions.filter(q => q._id !== editingItemId);

  return (
    <div className="space-y-4 pt-4 border-t mt-4">
      {needsOptions && (
        <div className="space-y-2">
          <Label>Options</Label>
          <div className="flex flex-col gap-2">
            {form.options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input value={opt} onChange={(e) => {
                  const newOpts = [...form.options];
                  newOpts[i] = e.target.value;
                  setForm(p => ({ ...p, options: newOpts }));
                }} placeholder={`Option ${i + 1}`} />
                <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600 shrink-0" onClick={() => {
                  setForm(p => ({ ...p, options: p.options.filter((_, idx) => idx !== i) }));
                }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setForm(p => ({ ...p, options: [...p.options, ''] }))}>
              <Plus className="h-4 w-4 mr-1" /> Add Option
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}

const EMPTY_FORM = { 
  question: '', 
  type: '', 
  required: false,
  options: []
};

export function QuestionPage() {
  const dispatch = useDispatch();
  const { questions, loading, actionLoading, error } = useSelector((state) => state.questions);

  const [selectedIds, setSelectedIds] = useState([]);
  const [isAddOpen,   setIsAddOpen]   = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem,setDeletingItem]= useState(null);

  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (editingItem) {
      setEditForm({
        question: editingItem.question,
        type:     editingItem.type,
        required: editingItem.required || false,
        options:  editingItem.options || []
      });
    }
  }, [editingItem]);

  useEffect(() => {
    if (!isAddOpen) setAddForm(EMPTY_FORM);
  }, [isAddOpen]);

  useEffect(() => {
    dispatch(fetchQuestions())
      .unwrap()
      .catch((err) => toast.error(err || 'Failed to load questions.'));
  }, [dispatch]);

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!addForm.question.trim()) { toast.error('Question text is required!'); return; }
    if (!addForm.type)            { toast.error('Please select a question type!'); return; }
    if (addForm.type === 'dropdown' || addForm.type === 'radio') {
      if (!addForm.options || addForm.options.length === 0) { toast.error('Please add at least one option!'); return; }
      if (addForm.options.some(opt => !opt.trim())) { toast.error('All options must be filled!'); return; }
    }

    try {
      await dispatch(addQuestion({
        question: addForm.question.trim(),
        type:     addForm.type,
        required: addForm.required,
        options:  addForm.options || []
      })).unwrap();
      toast.success('Question created successfully ✓');
      setIsAddOpen(false);
    } catch (err) {
      toast.error(err || 'Failed to create question.');
    }
  };

  const handleEditQuestion = async (e) => {
    e.preventDefault();
    if (!editForm.question.trim()) { toast.error('Question text is required!'); return; }
    if (!editForm.type)            { toast.error('Please select a question type!'); return; }
    if (editForm.type === 'dropdown' || editForm.type === 'radio') {
      if (!editForm.options || editForm.options.length === 0) { toast.error('Please add at least one option!'); return; }
      if (editForm.options.some(opt => !opt.trim())) { toast.error('All options must be filled!'); return; }
    }

    try {
      await dispatch(updateQuestion({
        id: editingItem._id,
        payload: {
          question: editForm.question.trim(),
          type:     editForm.type,
          required: editForm.required,
          options:  editForm.options || []
        },
      })).unwrap();
      toast.success('Question updated ✓');
      setEditingItem(null);
    } catch (err) {
      toast.error(err || 'Failed to update question.');
    }
  };

  const handleDeleteSingle = async () => {
    const id = deletingItem._id;
    try {
      await dispatch(deleteQuestion(id)).unwrap();
      toast.success('Question deleted.');
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
      setDeletingItem(null);
    } catch (err) {
      toast.error(err || 'Failed to delete question.');
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.length;
    try {
      await dispatch(bulkDeleteQuestions(selectedIds)).unwrap();
      toast.success(`${count} question${count > 1 ? 's' : ''} deleted.`);
      setSelectedIds([]);
    } catch (err) {
      toast.error(err || 'Bulk deletion failed.');
    }
  };

  const toggleSelectAll = () =>
    setSelectedIds(
      questions.length > 0 && selectedIds.length === questions.length
        ? []
        : questions.map((q) => q._id)
    );

  const toggleSelectOne = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading questions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-sm text-red-500">Error: {error}</div>
    );
  }

  return (
    <div className="w-full space-y-4 p-6 text-left">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Questions Dashboard</h2>
          <p className="text-sm text-muted-foreground">Manage and view all your form questions.</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              className="flex items-center gap-2 border border-gray-400 hover:bg-gray-300"
              onClick={handleBulkDelete}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
              Delete ({selectedIds.length})
            </Button>
          )}

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-black text-white hover:bg-neutral-800">
                <Plus className="h-4 w-4" /> Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto bg-white text-black">
              <DialogHeader>
                <DialogTitle>Add New Question</DialogTitle>
                <DialogDescription>Create a new question for your form.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddQuestion} className="space-y-5 py-2">

                <div className="space-y-2">
                  <Label htmlFor="add-question">Question Text</Label>
                  <Textarea
                    id="add-question"
                    placeholder="e.g. What is your full name?"
                    className="min-h-[90px]"
                    value={addForm.question}
                    onChange={(e) => setAddForm((p) => ({ ...p, question: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select value={addForm.type} onValueChange={(t) => setAddForm((p) => ({ ...p, type: t }))}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {QUESTION_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2">
                            <t.icon className="h-4 w-4 text-slate-500" />
                            {t.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {addForm.type && (
                    <p className="text-xs text-muted-foreground">
                      {QUESTION_TYPES.find((t) => t.value === addForm.type)?.desc}
                    </p>
                  )}
                </div>

                <ExtraFormFields form={addForm} setForm={setAddForm} questions={questions} editingItemId={null} />

                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="add-required"
                    checked={addForm.required}
                    onCheckedChange={(checked) => setAddForm((p) => ({ ...p, required: !!checked }))}
                  />
                  <Label htmlFor="add-required" className="text-sm font-medium cursor-pointer">
                    Mark this question as mandatory
                  </Label>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="submit"
                    className="w-full bg-black text-white hover:bg-neutral-800"
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Saving...' : 'Save Question'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={questions.length > 0 && selectedIds.length === questions.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Question</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Requirement</TableHead>
              <TableHead className="text-right w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No questions yet. Click "Add Question" to create one.
                </TableCell>
              </TableRow>
            ) : (
              questions.map((item) => (
                <TableRow key={item._id} className={selectedIds.includes(item._id) ? 'bg-neutral-50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(item._id)}
                      onCheckedChange={() => toggleSelectOne(item._id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium max-w-md truncate">{item.question}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize flex items-center gap-1 w-fit">
                      {(() => {
                        const def = QUESTION_TYPES.find((t) => t.value === item.type);
                        const Icon = def?.icon;
                        return (
                          <>
                            {Icon && <Icon className="h-3 w-3" />}
                            {item.type}
                          </>
                        );
                      })()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.required ? (
                      <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Required</Badge>
                    ) : (
                      <Badge variant="outline">Optional</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px] bg-white text-black border shadow-md">
                        <DropdownMenuItem onClick={() => setEditingItem(item)} className="hover:bg-neutral-100 cursor-pointer">
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeletingItem(item)} className="text-red-600 focus:text-red-600 hover:bg-red-50 cursor-pointer">
                          <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto bg-white text-black">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>Modify this question's configuration.</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <form onSubmit={handleEditQuestion} className="space-y-5 py-2 text-left">

              <div className="space-y-2">
                <Label htmlFor="edit-question">Question Text</Label>
                <Textarea
                  id="edit-question"
                  className="min-h-[90px]"
                  value={editForm.question}
                  onChange={(e) => setEditForm((p) => ({ ...p, question: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select value={editForm.type} onValueChange={(t) => setEditForm((p) => ({ ...p, type: t }))}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {QUESTION_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          <t.icon className="h-4 w-4 text-slate-500" />
                          {t.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editForm.type && (
                  <p className="text-xs text-muted-foreground">
                    {QUESTION_TYPES.find((t) => t.value === editForm.type)?.desc}
                  </p>
                )}
              </div>

              <ExtraFormFields form={editForm} setForm={setEditForm} questions={questions} editingItemId={editingItem._id} />

              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="edit-required"
                  checked={editForm.required}
                  onCheckedChange={(checked) => setEditForm((p) => ({ ...p, required: !!checked }))}
                />
                <Label htmlFor="edit-required" className="text-sm font-medium cursor-pointer">
                  Mark as mandatory
                </Label>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="submit"
                  className="w-full bg-black text-white hover:bg-neutral-800"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Updating...' : 'Update Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent className="text-left bg-white text-black border shadow-lg max-w-[425px]">
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the question &quot;{deletingItem?.question}&quot;. This action cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter className="flex justify-end gap-2 pt-2">
            <AlertDialogCancel onClick={() => setDeletingItem(null)} className="border border-neutral-200">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white border-none"
              onClick={handleDeleteSingle}
              disabled={actionLoading}
            >
              {actionLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}