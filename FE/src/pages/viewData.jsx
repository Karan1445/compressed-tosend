import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const API_BASE = 'http://localhost:8888';

export default function ViewDataPage() {
  const token = sessionStorage.getItem('token');
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [error, setError] = useState('');

  const selectedTemplate = useMemo(
    () => templates.find((template) => template._id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        const res = await fetch(`${API_BASE}/pdf-templates`, { headers });
        if (!res.ok) throw new Error('Failed to load templates');
        const data = await res.json();
        const senderTemplates = Array.isArray(data) ? data : [];
        setTemplates(senderTemplates);
        if (senderTemplates.length > 0) {
          setSelectedTemplateId(senderTemplates[0]._id);
        }
      } catch (err) {
        setError(err.message);
        toast.error('Unable to load saved templates.');
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [headers]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!selectedTemplateId) {
        setSubmissions([]);
        return;
      }
      try {
        setIsLoadingSubmissions(true);
        const res = await fetch(`${API_BASE}/pdf-templates/${selectedTemplateId}/submissions`, { headers });
        if (!res.ok) throw new Error('Failed to load submissions');
        const data = await res.json();
        setSubmissions(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
        toast.error('Unable to load submissions.');
      } finally {
        setIsLoadingSubmissions(false);
      }
    };

    fetchSubmissions();
  }, [headers, selectedTemplateId]);

  const fieldColumns = selectedTemplate?.fields || [];

  const valueByField = (submission, field) => {
    const match = submission.values?.find(
      (value) =>
        String(value.fieldId) === String(field.id) ||
        (field.questionId && String(value.questionId) === String(field.questionId))
    );
    const raw = match?.enteredValue;
    return raw !== undefined && raw !== null && String(raw).trim() !== '' ? String(raw) : '-';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">View Data</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Saved template submissions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Select a template to see every signer response in one table.
          </p>
        </div>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Saved Templates</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTemplates ? (
              <p className="text-sm text-slate-500">Loading templates...</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-slate-500">No templates found.</p>
            ) : (
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="w-full max-w-md bg-white">
                  <SelectValue placeholder="Select a saved template" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {templates.map((template) => (
                    <SelectItem key={template._id} value={template._id}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-lg">
              {selectedTemplate ? `${selectedTemplate.title} responses` : 'Template responses'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {error ? (
              <div className="p-6 text-sm text-rose-600">{error}</div>
            ) : isLoadingSubmissions ? (
              <div className="p-6 text-sm text-slate-500">Loading submissions...</div>
            ) : !selectedTemplate ? (
              <div className="p-6 text-sm text-slate-500">Select a template above to view submissions.</div>
            ) : submissions.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No submissions available for this template.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">User Name</TableHead>
                      <TableHead className="whitespace-nowrap">Email</TableHead>
                      {fieldColumns.map((field) => (
                        <TableHead key={field.id} className="whitespace-nowrap">
                          {field.placeholder || field.questionId || 'Question'}
                        </TableHead>
                      ))}
                      <TableHead className="whitespace-nowrap">Submitted At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission._id}>
                        <TableCell className="font-medium">
                          {submission.submittedBy?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>{submission.submittedBy?.email || '-'}</TableCell>
                        {fieldColumns.map((field) => (
                          <TableCell key={field.id}>{valueByField(submission, field)}</TableCell>
                        ))}
                        <TableCell>
                          {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
