import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { MoreHorizontal, Pencil, Plus, Trash } from "lucide-react";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "../components/ui/alert-dialog";

export function QuestionPage() {
    const [questionData, setQuestionData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedIds, setSelectedIds] = useState([]);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deletingItem, setDeletingItem] = useState(null);

    const token = sessionStorage.getItem("token");
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
    const fetchQuestion = async () => {
        try {
            setIsLoading(true);
            const response = await fetch("http://localhost:8888/question", { method: 'GET', headers });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            setQuestionData(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message);
            toast.error("Failed to load questions");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchQuestion(); }, []);

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if (!formData.get('question')) {
            toast.error("All feilds are required!");
            return;
        }
        if(!formData.get('type')){
            toast.error("Type is required!")
            return;
        }
        const payload = { question: formData.get('question'), type: formData.get('type'), required: formData.get('required') === 'true' };
        try {
            const res = await fetch("http://localhost:8888/question", { method: 'POST', headers, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error();
            toast.success("Question created successfully");
            setIsAddOpen(false);
            fetchQuestion();
        } catch { toast.error("Failed to create question"); }
    };

    const handleEditQuestion = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const payload = { question: formData.get('question'), type: formData.get('type'), required: formData.get('required') === 'true' };
        try {
            const res = await fetch(`http://localhost:8888/question/${editingItem._id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error();
            toast.success("Question updated successfully");
            setEditingItem(null);
            fetchQuestion();
        } catch { toast.error("Failed to update question"); }
    };

    const handleDeleteSingle = async () => {
        try {
            const res = await fetch(`http://localhost:8888/question/${deletingItem._id}`, { method: 'DELETE', headers });
            if (!res.ok) throw new Error();
            toast.success("Question deleted successfully");
            setSelectedIds(prev => prev.filter(id => id !== deletingItem._id));
            setDeletingItem(null);
            fetchQuestion();
        } catch { toast.error("Failed to delete question"); }
    };

    const handleBulkDelete = async () => {
        try {
            const res = await fetch("http://localhost:8888/question/bulk/delete", {
                method: 'DELETE',
                headers,
                body: JSON.stringify({ ids: selectedIds })
            });
            if (!res.ok) throw new Error();
            console.log(res)
            toast.success("Selected questions deleted");
            setSelectedIds([]);
            fetchQuestion();
        } catch { toast.error("Bulk deletion failed"); }
    };
    const toggleSelectAll = () => {
        if (questionData.length > 0 && selectedIds.length === questionData.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(questionData.map(q => q._id));
        }
    };

    const toggleSelectOne = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    if (isLoading) return <div className="p-6 text-center text-sm">Loading dashboard...</div>;
    if (error) return <div className="p-6 text-center text-sm text-red-500">Error: {error}</div>;

    return (
        <div className="w-full space-y-4 p-6 text-left">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Questions Dashboard</h2>
                    <p className="text-sm text-muted-foreground">Manage and view all incoming user questions.</p>
                </div>
                <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                        <Button variant="destructive" className="flex items-center gap-2 border border-gray-400 hover:border-gray-500 hover:bg-gray-300" onClick={handleBulkDelete}>
                            <Trash className="h-4 w-4" />
                        </Button>
                    )}
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="flex items-center gap-2 bg-black text-white hover:bg-neutral-800"><Plus className="h-4 w-4" /> Add Question</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] bg-white text-black">
                            <DialogHeader>
                                <DialogTitle>Add New Question</DialogTitle>
                                <DialogDescription>Create a new question field for your form users.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddQuestion} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="add-question">Question Text</Label>
                                    <Textarea id="add-question" name="question" placeholder="Enter your question here..." minLength={5} maxLength={500} className="min-h-[100px]" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="add-type">Input Type</Label>
                                    <Select name="type">
                                        <SelectTrigger id="add-type"><SelectValue placeholder="Select type..." /></SelectTrigger>
                                        <SelectContent className="bg-white">
                                            <SelectItem value="text" className="hover:bg-gray-200">Text Input</SelectItem>
                                            <SelectItem value="textarea" className="hover:bg-gray-200">Textarea</SelectItem>
                                            <SelectItem value="dropdown" className="hover:bg-gray-200">Dropdown</SelectItem>
                                            <SelectItem value="number" className="hover:bg-gray-200">Number</SelectItem>
                                            <SelectItem value="checkbox" className="hover:bg-gray-200">Checkbox</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                    <Checkbox id="add-required" name="required" value="true" />
                                    <Label htmlFor="add-required" className="text-sm font-medium leading-none">Mark this question as mandatory</Label>
                                </div>
                                <DialogFooter className="pt-4">
                                    <Button type="submit" className="w-full bg-black text-white hover:bg-neutral-800">Save Question</Button>
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
                                <Checkbox checked={questionData.length > 0 && selectedIds.length === questionData.length} onCheckedChange={toggleSelectAll} />
                            </TableHead>
                            <TableHead>Question</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Requirement</TableHead>
                            <TableHead className="text-right w-[120px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {questionData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No questions found.</TableCell>
                            </TableRow>
                        ) : (
                            questionData.map((item) => (
                                <TableRow key={item._id} className={selectedIds.includes(item._id) ? "bg-neutral-50" : ""}>
                                    <TableCell>
                                        <Checkbox checked={selectedIds.includes(item._id)} onCheckedChange={() => toggleSelectOne(item._id)} />
                                    </TableCell>
                                    <TableCell className="font-medium max-w-md truncate">{item.question}</TableCell>
                                    <TableCell><Badge variant="outline" className="capitalize">{item.type}</Badge></TableCell>
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
                                                <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-[160px] bg-white text-black border shadow-md">
                                                <DropdownMenuItem onClick={() => setEditingItem(item)} className="hover:bg-neutral-100 cursor-pointer flex items-center"><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setDeletingItem(item)} className="text-red-600 focus:text-red-600 hover:bg-red-50 focus:bg-red-50 cursor-pointer flex items-center"><Trash className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
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
                <DialogContent className="sm:max-w-[425px] bg-white text-black">
                    <DialogHeader>
                        <DialogTitle>Edit Question</DialogTitle>
                        <DialogDescription>Modify configurations for this question.</DialogDescription>
                    </DialogHeader>
                    {editingItem && (
                        <form onSubmit={handleEditQuestion} className="space-y-4 py-4 text-left">
                            <div className="space-y-2">
                                <Label htmlFor="edit-question">Question Text</Label>
                                <Textarea id="edit-question" name="question" defaultValue={editingItem.question} required minLength={5} maxLength={500} className="min-h-[100px]" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-type">Input Type</Label>
                                <Select name="type" defaultValue={editingItem.type} required>
                                    <SelectTrigger id="edit-type"><SelectValue placeholder="Select type..." /></SelectTrigger>
                                    <SelectContent className="bg-white">
                                        <SelectItem value="text" className="hover:bg-gray-200">Text Input</SelectItem>
                                        <SelectItem value="textarea" className="hover:bg-gray-200">Textarea</SelectItem>
                                        <SelectItem value="dropdown" className="hover:bg-gray-200">Dropdown</SelectItem>
                                        <SelectItem value="number" className="hover:bg-gray-200">Number</SelectItem>
                                        <SelectItem value="checkbox" className="hover:bg-gray-200">Checkbox</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center space-x-2 pt-2">
                                <Checkbox id="edit-required" name="required" value="true" defaultChecked={editingItem.required} />
                                <Label htmlFor="edit-required" className="text-sm font-medium leading-none">Mark this question as mandatory</Label>
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="submit" className="w-full bg-black text-white hover:bg-neutral-800">Update Changes</Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
            <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
                <AlertDialogContent className="text-left bg-white text-black border shadow-lg max-w-[425px]">
                    <DialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the question &quot;{deletingItem?.question}&quot;.
                        </AlertDialogDescription>
                    </DialogHeader>
                    <AlertDialogFooter className="flex justify-end gap-2 pt-2">
                        <AlertDialogCancel onClick={() => setDeletingItem(null)} className="border border-neutral-200">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white border-none" onClick={handleDeleteSingle}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
