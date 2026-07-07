import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FileQuestion, Settings2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog';

const API = 'http://localhost:8888/api/lawyer/questions';

export default function QuestionsList() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadQuestions = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(API, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setQuestions(data);
    } catch {
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQuestions(); }, []);

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        toast.success('Question deleted successfully');
        setQuestions(q => q.filter(x => x._id !== id));
      } else {
        toast.error('Failed to delete question');
      }
    } catch {
      toast.error('Failed to delete question');
    }
  };

  return (
    <div className="w-full px-8 pb-12">
      <div className="flex items-center justify-between mb-8 pb-5 border-b border-gray-200">
        <div>
          <h1 className="text-[22px] font-bold text-gray-800">Questions</h1>
          <p className="text-[13px] text-gray-600 mt-1">
            Manage all questions for your legal document templates.
          </p>
        </div>
        <Button
          onClick={() => navigate('/lawyer/questions/new')}
          className="h-9 px-5 bg-gray-900 hover:bg-gray-800 text-white font-medium text-[13px] rounded-lg gap-2 shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Question
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-5 w-5 rounded-full border-2 border-gray-200 border-t-gray-800 animate-spin" />
            <p className="text-[13px] text-gray-400">Loading your questions...</p>
          </div>
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-gray-50/50 rounded-xl border border border-gray-200">
          <FileQuestion className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-[15px] font-semibold text-gray-700">No questions found</h3>
          <p className="text-[13px] text-gray-500 mt-1 mb-6 max-w-sm">
            You haven't added any questions yet. Create your first question to start building forms.
          </p>
          <Button
            onClick={() => navigate('/lawyer/questions/new')}
            className="h-9 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium text-[13px] rounded-lg gap-2"
          >
            <Plus className="h-4 w-4" />
            Create First Question
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {questions.map((q, i) => (
            <div
              key={q._id}
              className={`group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl ${!q?.required ?"hover:border-gray-900" :"hover:border-red-600"} hover:shadow-md transition-all`}
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-gray-100 text-gray-500 text-[11px] font-bold shrink-0 mt-0.5">
                  {i + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-gray-800 truncate">{q.title}</p>

                  {q.description && (
                    <p className="text-[13px] text-gray-500 mt-0.5 truncate max-w-2xl">{q.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-2.5">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-gray-600">
                      <Settings2 className="h-3 w-3 text-gray-400" />
                      <span className="text-[11px] font-semibold">{q.answerType}</span>
                    </div>

                    {q.answerType === 'Group Fields' && q.configuration?.repeatingEntries && (
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-gray-600 text-[11px] font-semibold">
                        Loopable
                      </span>
                    )}

                    {q.required && (
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-gray-600 text-[11px] font-semibold">
                        Required
                      </span>
                    )}

                    {q.appearanceCondition && (
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-gray-600 text-[11px] font-semibold">
                        Has Logic
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 ml-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => navigate(`/lawyer/questions/edit/${q._id}`)}
                  className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                  title="Edit question"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete document?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={(e) => { e.stopPropagation(); handleDelete(q._id) }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
