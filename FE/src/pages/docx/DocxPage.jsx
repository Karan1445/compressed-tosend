import React, { useRef, useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { renderAsync } from 'docx-preview';
import { Rnd } from 'react-rnd';
import { useDispatch, useSelector } from 'react-redux';
import { fetchQuestions, deleteQuestion, updateQuestion } from '../../store/slices/questionSlice';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Sheet, SheetContent, SheetHeader,
  SheetTitle, SheetDescription,
} from '../../components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Upload, FileText, Loader2, Search, CheckCircle2, Link2, X, RotateCcw, Save, History, CloudUpload, Trash2, Lightbulb, Hash, Type, AlignLeft, CheckSquare, Calendar, ChevronDown, CircleDot, Send } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { uploadDocx, fetchUploadedDocx, saveDocxMappings, deleteDocx, assignDocx, fetchSubmissions } from '../../store/slices/docxSlice';


function DependencyValueInput({ cond, updateCondition, index, mappedQuestions }) {
  const depField = mappedQuestions.find(mq => mq.fieldKey === cond.dependsOn);
  const qObj = depField?.questionObj;

  if (!qObj) {
    return <Input value={cond.value} onChange={e => updateCondition(index, 'value', e.target.value)} className="h-8 mt-1 text-xs" />;
  }

  if (qObj.type === 'checkbox') {
    return (
      <Select value={String(cond.value)} onValueChange={v => updateCondition(index, 'value', v)}>
        <SelectTrigger className="h-8 mt-1 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="true">Yes</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (qObj.type === 'dropdown' || qObj.type === 'radio') {
    const options = qObj.options || [];
    const selectedValues = Array.isArray(cond.value) ? cond.value : (cond.value ? [cond.value] : []);
    const handleToggle = (opt) => {
      if (selectedValues.includes(opt)) {
        updateCondition(index, 'value', selectedValues.filter(v => v !== opt));
      } else {
        updateCondition(index, 'value', [...selectedValues, opt]);
      }
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full h-8 mt-1 text-xs justify-start px-2 font-normal truncate bg-white hover:bg-slate-50">
            {selectedValues.length > 0 ? selectedValues.join(', ') : 'Select options...'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-white z-[100]">
          {options.map(opt => (
            <DropdownMenuCheckboxItem
              key={opt}
              checked={selectedValues.includes(opt)}
              onCheckedChange={() => handleToggle(opt)}
            >
              {opt}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return <Input value={cond.value} onChange={e => updateCondition(index, 'value', e.target.value)} className="h-8 mt-1 text-xs" />;
}

// --- NEW DEPENDENCY UI COMPONENTS ---
function GroupsSidebar({ layout, setLayout, onOpenGroupModal }) {
  const groups = layout.filter(item => item.type === 'group');

  const addGroup = () => {
    const newGroup = {
      id: 'group_' + Date.now(),
      type: 'group',
      label: 'New Group ' + (groups.length + 1),
      conditions: [],
      children: [],
      isNew: true
    };
    onOpenGroupModal(newGroup);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b bg-white shrink-0 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">Group Configuration</h3>
          <p className="text-[10px] text-slate-500 mt-1">Manage dynamic question groups</p>
        </div>
        <Button onClick={addGroup} size="sm" className="bg-slate-900 hover:bg-black text-xs text-white">
          + Create Group
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        {groups.length === 0 ? (
          <div className="text-center text-slate-400 py-10 text-sm">No groups created yet.</div>
        ) : (
          groups.map(g => (
            <div
              key={g.id}
              onClick={() => onOpenGroupModal(g)}
              className="bg-white border border-slate-200 rounded p-3 cursor-pointer hover:border-slate-400 hover:shadow-md transition-all flex justify-between items-center group"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">{g.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{g.children?.length || 0} fields • {g.conditions?.length || 0} conditions</div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white" onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the group and remove all its visibility rules.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.stopPropagation();
                        setLayout(prev => prev.filter(l => l.id !== g.id));
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function GroupConfigModal({ group, layout, setLayout, mappedQuestions, onClose }) {
  const [activeTab, setActiveTab] = useState('questions');
  const [localGroup, setLocalGroup] = useState(() => ({
    ...group,
    loopable: group.loopable || { enabled: false, sourceQuestionId: '', optionMappings: {} }
  }));

  const availableFields = mappedQuestions.filter(mq => {
    // Check if this field is already in another group
    const inAnotherGroup = layout.some(l => l.type === 'group' && l.id !== group.id && l.children?.some(c => c.fieldKey === mq.fieldKey));
    return !inAnotherGroup;
  });

  const handleToggleField = (fieldKey) => {
    setLocalGroup(prev => {
      const children = prev.children || [];
      if (children.some(c => c.fieldKey === fieldKey)) {
        return { ...prev, children: children.filter(c => c.fieldKey !== fieldKey) };
      } else {
        return { ...prev, children: [...children, { id: 'item_' + Date.now(), type: 'single_question', fieldKey }] };
      }
    });
  };

  const addCondition = () => {
    setLocalGroup(prev => ({
      ...prev,
      conditions: [...(prev.conditions || []), { dependsOn: '', operator: 'equals', value: '' }]
    }));
  };

  const updateCondition = (index, key, value) => {
    setLocalGroup(prev => {
      const newConds = [...prev.conditions];
      newConds[index] = { ...newConds[index], [key]: value };
      return { ...prev, conditions: newConds };
    });
  };

  const removeCondition = (index) => {
    setLocalGroup(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    if (!localGroup.children || localGroup.children.length === 0) {
      toast.error('Please add at least one question to the group.');
      return;
    }
    setLayout(prev => {
      if (localGroup.isNew) {
        const { isNew, ...groupToSave } = localGroup;
        return [...prev, groupToSave];
      }
      return prev.map(l => l.id === localGroup.id ? localGroup : l);
    });
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] h-[700px] flex flex-col p-0 overflow-hidden bg-white [&>button]:right-4 [&>button]:top-4 [&>button]:h-8 [&>button]:w-8 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full hover:[&>button]:bg-slate-100 [&>button]:text-slate-500 transition-colors">
        <DialogHeader className="p-6 pb-2 shrink-0 border-b">
          <DialogTitle className="flex items-center gap-3">
            <Input
              value={localGroup.label}
              onChange={e => setLocalGroup(prev => ({ ...prev, label: e.target.value }))}
              className="text-lg font-bold border-0 border-b border-transparent hover:border-slate-200 focus-visible:border-slate-900 focus-visible:ring-0 rounded-none px-1 h-9 bg-transparent transition-colors shadow-none w-full"
            />
          </DialogTitle>
          <div className="flex gap-4 mt-4 border-b">
            <button
              className={`pb-2 text-sm font-medium ${activeTab === 'questions' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500'}`}
              onClick={() => setActiveTab('questions')}
            >
              Add Questions
            </button>
            <button
              className={`pb-2 text-sm font-medium ${activeTab === 'dependencies' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500'}`}
              onClick={() => setActiveTab('dependencies')}
            >
              Add Dependencies
            </button>
            <button
              className={`pb-2 text-sm font-medium ${activeTab === 'loopable' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500'}`}
              onClick={() => setActiveTab('loopable')}
            >
              Loopable
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {activeTab === 'questions' ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 mb-4">Select questions to include in this group. Questions can only belong to one group.</p>
              {availableFields.map(mq => {
                const isSelected = localGroup.children?.some(c => c.fieldKey === mq.fieldKey);
                return (
                  <div
                    key={mq.fieldKey}
                    onClick={() => handleToggleField(mq.fieldKey)}
                    className="flex items-center gap-3 bg-white p-3 border rounded shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="h-4 w-4 text-slate-900 rounded border-gray-300 focus:ring-slate-900 pointer-events-none"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{mq.questionObj?.question}</div>
                      <div className="text-xs text-slate-500">Field ID: {mq.fieldKey}</div>
                    </div>
                  </div>
                )
              })}
              {availableFields.length === 0 && <div className="text-sm text-slate-500">No available mapped questions to add.</div>}
            </div>
          ) : activeTab === 'dependencies' ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 mb-2">Set visibility rules for this entire group.</p>
              {(localGroup.conditions || []).map((cond, index) => (
                <div key={index} className="flex items-end gap-2 bg-white p-3 border rounded shadow-sm">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-slate-700">Depends On</label>
                    <Select value={cond.dependsOn} onValueChange={v => updateCondition(index, 'dependsOn', v)}>
                      <SelectTrigger className="h-8 mt-1 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
                      <SelectContent className="bg-white">
                        {mappedQuestions.filter(mq => !localGroup.children?.some(c => c.fieldKey === mq.fieldKey)).map(mq => (
                          <SelectItem key={mq.fieldKey} value={mq.fieldKey}>{mq.questionObj?.question?.substring(0, 20) || mq.fieldKey}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-slate-700">Operator</label>
                    <Select value={cond.operator} onValueChange={v => updateCondition(index, 'operator', v)}>
                      <SelectTrigger className="h-8 mt-1 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="not_equals">Does Not Equal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-slate-700">Value</label>
                    <DependencyValueInput cond={cond} updateCondition={updateCondition} index={index} mappedQuestions={mappedQuestions} />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeCondition(index)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={addCondition} className="w-full text-xs border-dashed border-2">+ Add Condition</Button>
            </div>
          ) : activeTab === 'loopable' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 cursor-pointer flex items-center gap-2" onClick={() => setLocalGroup(prev => ({ ...prev, loopable: { ...prev.loopable, enabled: !prev.loopable?.enabled } }))}>
                  <input type="checkbox" checked={localGroup.loopable?.enabled || false} onChange={() => { }} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                  Enable Loopable Group
                </label>
              </div>
              {localGroup.loopable?.enabled && (
                <>
                  <div className="mt-4">
                    <label className="text-xs font-medium text-slate-700">Source Question</label>
                    <Select value={localGroup.loopable.sourceQuestionId} onValueChange={v => setLocalGroup(prev => ({ ...prev, loopable: { ...prev.loopable, sourceQuestionId: v } }))}>
                      <SelectTrigger className="h-8 mt-1 text-xs"><SelectValue placeholder="Select dropdown/radio field" /></SelectTrigger>
                      <SelectContent className="bg-white">
                        {mappedQuestions.filter(mq => ['dropdown', 'radio'].includes(mq.questionObj?.type) && !localGroup.children?.some(c => c.fieldKey === mq.fieldKey)).map(mq => (
                          <SelectItem key={mq.fieldKey} value={mq.fieldKey}>{mq.questionObj?.question?.substring(0, 30) || mq.fieldKey}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-slate-500 mt-1">Select a dropdown or radio button question that dictates how many times this group should repeat.</p>
                  </div>

                  {localGroup.loopable.sourceQuestionId && mappedQuestions.find(mq => mq.fieldKey === localGroup.loopable.sourceQuestionId)?.questionObj?.options?.length > 0 && (
                    <div className="space-y-2 mt-4 bg-slate-50 p-3 rounded border">
                      <label className="text-xs font-semibold text-slate-700">Configure Iterations per Option</label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="text-[10px] font-medium text-slate-500">Option Value</div>
                        <div className="text-[10px] font-medium text-slate-500">Number of Loops</div>
                        {mappedQuestions.find(mq => mq.fieldKey === localGroup.loopable.sourceQuestionId).questionObj.options.map(opt => (
                          <Fragment key={opt}>
                            <div className="text-xs flex items-center">{opt}</div>
                            <Input
                              type="number"
                              min="0"
                              max="20"
                              className="h-7 text-xs bg-white"
                              value={localGroup.loopable.optionMappings?.[opt] !== undefined ? localGroup.loopable.optionMappings[opt] : ''}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 0;
                                setLocalGroup(prev => ({
                                  ...prev,
                                  loopable: {
                                    ...prev.loopable,
                                    optionMappings: { ...(prev.loopable?.optionMappings || {}), [opt]: val }
                                  }
                                }));
                              }}
                            />
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>
        <DialogFooter className="p-4 border-t bg-white shrink-0 sm:justify-end">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="text-xs">Cancel</Button>
            <Button onClick={handleSave} className="text-xs bg-slate-900 hover:bg-black text-white">Save Group</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SingleDependencyModal({ fieldKey, questionObj, layout, setLayout, mappedQuestions, onClose }) {
  // Find or create layout entry
  const existingIndex = layout.findIndex(l => l.type === 'single_question' && l.fieldKey === fieldKey);
  const [conditions, setConditions] = useState(existingIndex >= 0 ? (layout[existingIndex].conditions || []) : []);

  const existingLoopIndex = layout.findIndex(l => l.type === 'loopable' && l.fieldKey === fieldKey);
  const [loopConfig, setLoopConfig] = useState(existingLoopIndex >= 0 ? layout[existingLoopIndex] : { type: 'loopable', fieldKey, enabled: false, sourceQuestionId: '', optionMappings: {} });

  const [activeTab, setActiveTab] = useState('dependencies'); // 'dependencies' | 'loopable'

  const addCondition = () => setConditions([...conditions, { dependsOn: '', operator: 'equals', value: '' }]);
  const updateCondition = (index, key, value) => {
    const newConds = [...conditions];
    newConds[index] = { ...newConds[index], [key]: value };
    setConditions(newConds);
  };
  const removeCondition = (index) => setConditions(conditions.filter((_, i) => i !== index));

  const handleSave = () => {
    // 1. Handle single_question layout
    let updatedLayout = [...layout];
    if (conditions.length === 0) {
      updatedLayout = updatedLayout.filter(l => !(l.type === 'single_question' && l.fieldKey === fieldKey));
    } else {
      if (existingIndex >= 0) {
        updatedLayout = updatedLayout.map((l, i) => i === existingIndex ? { ...l, conditions } : l);
      } else {
        updatedLayout.push({ id: 'item_' + Date.now(), type: 'single_question', fieldKey, conditions });
      }
    }

    // 2. Handle loopable layout
    if (!loopConfig.enabled) {
      updatedLayout = updatedLayout.filter(l => !(l.type === 'loopable' && l.fieldKey === fieldKey));
    } else {
      if (existingLoopIndex >= 0) {
        updatedLayout = updatedLayout.map((l, i) => i === existingLoopIndex ? loopConfig : l);
      } else {
        updatedLayout.push({ ...loopConfig, id: 'loop_' + Date.now() });
      }
    }

    setLayout(updatedLayout);
    onClose();
  };

  const loopableOptions = mappedQuestions.filter(mq => ['dropdown', 'radio'].includes(mq.questionObj?.type));
  const selectedSourceQuestion = loopableOptions.find(mq => mq.fieldKey === loopConfig.sourceQuestionId);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white [&>button]:right-4 [&>button]:top-4 [&>button]:h-8 [&>button]:w-8 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full hover:[&>button]:bg-slate-100 [&>button]:text-slate-500 transition-colors">
        <DialogHeader>
          <DialogTitle>Rules for: {questionObj?.question}</DialogTitle>
          <DialogDescription>Set visibility or loopable conditions.</DialogDescription>
          <div className="flex gap-4 mt-4 border-b">
            <button
              className={`pb-2 text-sm font-medium ${activeTab === 'dependencies' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500'}`}
              onClick={() => setActiveTab('dependencies')}
            >
              Visibility Dependencies
            </button>
            <button
              className={`pb-2 text-sm font-medium ${activeTab === 'loopable' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500'}`}
              onClick={() => setActiveTab('loopable')}
            >
              Loopable
            </button>
          </div>
        </DialogHeader>

        {activeTab === 'dependencies' ? (
          <div className="space-y-4 py-4 min-h-[150px]">
            {conditions.map((cond, index) => (
              <div key={index} className="flex items-end gap-2 bg-slate-50 p-3 border rounded shadow-sm">
                <div className="flex-1">
                  <label className="text-[10px] font-medium text-slate-700">Depends On</label>
                  <Select value={cond.dependsOn} onValueChange={v => updateCondition(index, 'dependsOn', v)}>
                    <SelectTrigger className="h-8 mt-1 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
                    <SelectContent className="bg-white">
                      {mappedQuestions.filter(mq => mq.fieldKey !== fieldKey).map(mq => (
                        <SelectItem key={mq.fieldKey} value={mq.fieldKey}>{mq.questionObj?.question?.substring(0, 20) || mq.fieldKey}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-medium text-slate-700">Operator</label>
                  <Select value={cond.operator} onValueChange={v => updateCondition(index, 'operator', v)}>
                    <SelectTrigger className="h-8 mt-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="not_equals">Does Not Equal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-[0.8]">
                  <label className="text-[10px] font-medium text-slate-700">Value</label>
                  <DependencyValueInput cond={cond} updateCondition={updateCondition} index={index} mappedQuestions={mappedQuestions} />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeCondition(index)} className="h-8 w-8 text-red-500"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" onClick={addCondition} className="w-full text-xs border-dashed border-2">+ Add Condition</Button>
          </div>
        ) : (
          <div className="space-y-4 py-4 min-h-[150px]">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 cursor-pointer flex items-center gap-2" onClick={() => setLoopConfig({ ...loopConfig, enabled: !loopConfig.enabled })}>
                <input type="checkbox" checked={loopConfig.enabled} onChange={() => { }} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                Enable Loopable
              </label>
            </div>
            {loopConfig.enabled && (
              <>
                <div className="mt-4">
                  <label className="text-xs font-medium text-slate-700">Source Question</label>
                  <Select value={loopConfig.sourceQuestionId} onValueChange={v => setLoopConfig({ ...loopConfig, sourceQuestionId: v })}>
                    <SelectTrigger className="h-8 mt-1 text-xs"><SelectValue placeholder="Select dropdown/radio field" /></SelectTrigger>
                    <SelectContent className="bg-white">
                      {loopableOptions.filter(mq => mq.fieldKey !== fieldKey).map(mq => (
                        <SelectItem key={mq.fieldKey} value={mq.fieldKey}>{mq.questionObj?.question?.substring(0, 30) || mq.fieldKey}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-500 mt-1">Select a dropdown or radio button question that dictates how many times this field should repeat.</p>
                </div>

                {selectedSourceQuestion && selectedSourceQuestion.questionObj?.options?.length > 0 && (
                  <div className="space-y-2 mt-4 bg-slate-50 p-3 rounded border">
                    <label className="text-xs font-semibold text-slate-700">Configure Iterations per Option</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="text-[10px] font-medium text-slate-500">Option Value</div>
                      <div className="text-[10px] font-medium text-slate-500">Number of Loops</div>
                      {selectedSourceQuestion.questionObj.options.map(opt => (
                        <Fragment key={opt}>
                          <div className="text-xs flex items-center">{opt}</div>
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            className="h-7 text-xs bg-white"
                            value={loopConfig.optionMappings[opt] !== undefined ? loopConfig.optionMappings[opt] : ''}
                            onChange={e => setLoopConfig({
                              ...loopConfig,
                              optionMappings: { ...loopConfig.optionMappings, [opt]: parseInt(e.target.value) || 0 }
                            })}
                          />
                        </Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-xs">Cancel</Button>
          <Button onClick={handleSave} className="text-xs bg-slate-900 hover:bg-black text-white">Save Rules</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
// --- END NEW DEPENDENCY UI COMPONENTS ---

const getQuestionIcon = (type, className = "h-4 w-4") => {
  switch (type) {
    case 'number': return <Hash className={className} />;
    case 'text': return <Type className={className} />;
    case 'textarea': return <AlignLeft className={className} />;
    case 'checkbox': return <CheckSquare className={className} />;
    case 'date': return <Calendar className={className} />;
    case 'dropdown': return <ChevronDown className={className} />;
    case 'radio': return <CircleDot className={className} />;
    default: return <Type className={className} />;
  }
};

export default function DocxPage() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const viewerRef = useRef(null);

  const { questions, loading: qLoading } = useSelector((state) => state.questions);
  const { token, user: currentUser } = useSelector(state => state.auth);

  useEffect(() => {
    dispatch(fetchQuestions()).unwrap().catch(() => { });
  }, [dispatch]);

  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [hasDoc, setHasDoc] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);
  const [activeGroupModal, setActiveGroupModal] = useState(null);
  const [activeSingleDependencyModal, setActiveSingleDependencyModal] = useState(null);

  const { documents, uploading, savingMappings, loading: docsLoading, submissions, loadingSubmissions } = useSelector((state) => state.docx || { documents: [], uploading: false, savingMappings: false, loading: false, submissions: [], loadingSubmissions: false });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const [draggedFields, setDraggedFields] = useState([]);
  const [fieldMappings, setFieldMappings] = useState({});

  const [interactionMode, setInteractionMode] = useState('edit');
  const [formValues, setFormValues] = useState({});
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [isSubmissionsModalOpen, setIsSubmissionsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  const [layout, setLayout] = useState([]);
  const [dependencyMode, setDependencyMode] = useState(false);
  const layoutRef = useRef(layout);
  useEffect(() => { layoutRef.current = layout; }, [layout]);


  useEffect(() => {
    if (isSendModalOpen) {
      setFetchingUsers(true);
      fetch('http://localhost:8888/', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setUsers(data.filter(u => u._id !== currentUser._id && u.role?.permissions?.includes('sign'))))
        .catch(err => toast.error('Failed to load users'))
        .finally(() => setFetchingUsers(false));
    }
  }, [isSendModalOpen, token, currentUser]);

  const handleSendDocx = async () => {
    if (selectedAssignees.length === 0) return toast.error("Select at least one user to assign.");
    if (!activeDoc) return toast.error("Please upload the document to the server before sending.");
    try {
      await dispatch(assignDocx({ docxId: activeDoc._id, assigneeIds: selectedAssignees })).unwrap();
      toast.success("Document sent successfully!");
      setIsSendModalOpen(false);
      setSelectedAssignees([]);
    } catch (err) {
      toast.error(err);
    }
  };

  const activeDocRef = useRef(activeDoc);
  useEffect(() => { activeDocRef.current = activeDoc; }, [activeDoc]);

  const fieldMappingsRefForSave = useRef(fieldMappings);
  useEffect(() => { fieldMappingsRefForSave.current = fieldMappings; }, [fieldMappings]);

  const draggedFieldsRef = useRef(draggedFields);
  useEffect(() => { draggedFieldsRef.current = draggedFields; }, [draggedFields]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeDocRef.current) {
          const mappingsToSave = {};
          Object.entries(fieldMappingsRefForSave.current).forEach(([fieldId, q]) => {
            mappingsToSave[fieldId] = {
              questionId: q._id,
              question: q.question,
              type: q.type,
              options: q.options,
              required: q.required,
              dependsOnId: q.dependsOnId || null,
              dependsOnValue: q.dependsOnValue || ''
            };
          });
          const draggedFieldsToSave = draggedFieldsRef.current.map(df => {
            const q = df.questionObj;
            return {
              id: df.id,
              questionId: df.questionId || (q ? q._id : null),
              question: q ? q.question : '',
              type: q ? q.type : '',
              options: q ? q.options : [],
              required: q ? q.required : false,
              x: df.x,
              y: df.y,
              width: df.width,
              height: df.height,
              dependsOnId: q?.dependsOnId || null,
              dependsOnValue: q?.dependsOnValue || ''
            };
          });
          dispatch(saveDocxMappings({
            docxId: activeDocRef.current._id,
            mappings: mappingsToSave,
            draggedFields: draggedFieldsToSave,
            layout: layoutRef.current
          })).unwrap().then(() => {
            toast.success('Mappings saved successfully!');
          }).catch(err => {
            toast.error(err || 'Failed to save mappings');
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  const filteredDocs = documents.filter(doc =>
    doc.originalName.toLowerCase().includes(historySearch.toLowerCase())
  );

  useEffect(() => {
    dispatch(fetchUploadedDocx()).unwrap().catch(() => { });
  }, [dispatch]);

  const [panelOpen, setPanelOpen] = useState(false);
  const [activeField, setActiveField] = useState(null);

  const fieldBtnsRef = useRef({});

  const fieldMappingsRef = useRef({});
  useEffect(() => { fieldMappingsRef.current = fieldMappings; }, [fieldMappings]);

  const handleRemoveMappingRef = useRef(null);

  const formValuesRef = useRef(formValues);
  useEffect(() => { formValuesRef.current = formValues; }, [formValues]);

  const isDependencyMet = useCallback((q) => {
    if (!q.dependsOnId) return true;

    const dependentFieldIds = [
      ...Object.keys(fieldMappings).filter(fid => fieldMappings[fid]?._id === q.dependsOnId),
      ...draggedFieldsRef.current.filter(df => df.questionObj?._id === q.dependsOnId).map(df => df.id)
    ];

    if (dependentFieldIds.length === 0) return false;

    return dependentFieldIds.some(fid => {
      let val = formValuesRef.current[fid];
      const parentQ = questions.find(x => x._id === q.dependsOnId);
      if (parentQ && parentQ.type === 'checkbox') {
        val = val === undefined ? 'false' : String(val);
      } else {
        val = val === undefined ? '' : String(val);
      }
      return val === q.dependsOnValue;
    });
  }, [fieldMappings, questions]);

  const handleSaveDependency = useCallback((qId, dependsOnId, dependsOnValue) => {
    setFieldMappings(prev => {
      const next = { ...prev };
      for (const fid in next) {
        if (next[fid]?._id === qId) {
          next[fid] = { ...next[fid], dependsOnId, dependsOnValue };
        }
      }
      return next;
    });

    setDraggedFields(prev => prev.map(df => {
      if (df.questionObj?._id === qId) {
        return { ...df, questionObj: { ...df.questionObj, dependsOnId, dependsOnValue } };
      }
      return df;
    }));

    toast.success('Dependency saved locally. Press Ctrl+S to save document!');
  }, []);

  useEffect(() => {
    Object.entries(fieldBtnsRef.current).forEach(([fieldId, btn]) => {
      if (!btn) return;
      const q = fieldMappings[fieldId];

      if (interactionMode === 'interact') {
        if (q) {
          const short = q.question.length > 22 ? q.question.substring(0, 22) + '…' : q.question;
          const currentVal = formValuesRef.current[fieldId] || '';
          if (q.type === 'checkbox') {
            const isChecked = currentVal === 'true' || currentVal === true;
            btn.innerHTML = `
              <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #ffffff; border: 1.5px solid #818cf8; box-sizing: border-box;" title="${short}">
                <input type="checkbox" data-field-id="${fieldId}" ${isChecked ? 'checked' : ''} style="cursor: pointer; width: 14px; height: 14px; accent-color: #4f46e5;" />
              </div>
            `;
            btn.style.padding = '0';
            btn.style.border = 'none';
            btn.style.background = 'transparent';
          } else if (q.type === 'dropdown' || q.type === 'radio') {
            const options = q.options || [];
            let optionsHtml = `<option value="" disabled ${!currentVal ? 'selected' : ''}>${short}</option>`;
            options.forEach(opt => {
              optionsHtml += `<option value="${opt}" ${currentVal === opt ? 'selected' : ''}>${opt}</option>`;
            });
            btn.innerHTML = `
              <select data-field-id="${fieldId}" style="width: 100%; height: 100%; box-sizing: border-box; border: 1.5px solid #818cf8; background: #ffffff; outline: none; padding: 0 4px; font-size: 11px; color: #1e1b4b; cursor: pointer;">
                ${optionsHtml}
              </select>
            `;
            btn.style.padding = '0';
            btn.style.border = 'none';
            btn.style.background = 'transparent';
          } else if (q.type === 'date') {
            btn.innerHTML = `<input type="date" data-field-id="${fieldId}" value="${currentVal}" style="width: 100%; height: 100%; box-sizing: border-box; border: 1.5px solid #818cf8; background: #ffffff; outline: none; padding: 0 4px; font-size: 11px; color: #1e1b4b; cursor: pointer;" />`;
            btn.style.padding = '0';
            btn.style.border = 'none';
            btn.style.background = 'transparent';
          } else if (q.type === 'textarea') {
            btn.innerHTML = `<textarea data-field-id="${fieldId}" placeholder="${short}" style="width: 100%; height: 100%; box-sizing: border-box; border: 1.5px solid #818cf8; background: #ffffff; outline: none; padding: 4px; font-size: 11px; color: #1e1b4b; resize: none;">${currentVal}</textarea>`;
            btn.style.padding = '0';
            btn.style.border = 'none';
            btn.style.background = 'transparent';
          } else {
            const typeAttr = q.type === 'number' ? 'number' : 'text';
            btn.innerHTML = `<input type="${typeAttr}" data-field-id="${fieldId}" placeholder="${short}" value="${currentVal}" style="width: 100%; height: 100%; box-sizing: border-box; border: 1.5px solid #0f172a; background: #ffffff; outline: none; padding: 0 4px; font-size: 11px; color: #0f172a;" />`;
            btn.style.padding = '0';
            btn.style.border = 'none';
            btn.style.background = 'transparent';
          }

          btn.title = q.question;
          btn.style.visibility = 'visible';

          const input = btn.querySelector('input, select, textarea');
          if (input) {
            input.onclick = (e) => e.stopPropagation();
            input.onmousedown = (e) => e.stopPropagation();
            input.onchange = (e) => {
              const val = input.type === 'checkbox' ? e.target.checked.toString() : e.target.value;
              setFormValues(prev => ({ ...prev, [fieldId]: val }));
            };
            if ((input.tagName === 'INPUT' && input.type !== 'checkbox' && input.type !== 'date') || input.tagName === 'TEXTAREA') {
              input.oninput = (e) => {
                setFormValues(prev => ({ ...prev, [fieldId]: e.target.value }));
              };
            }
          }
        } else {
          btn.style.visibility = 'hidden';
        }
      } else {
        btn.style.visibility = 'visible';
        if (q) {
          const short = q.question.length > 22 ? q.question.substring(0, 22) + '…' : q.question;
          btn.style.background = '#0f172a';
          btn.style.border = '1px solid #0f172a';
          btn.style.color = '#ffffff';
          btn.style.padding = '0 4px';
          btn.title = q.question;

          btn.innerHTML = `
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${q.dependsOnId ? '<span title="Has Dependency" style="margin-right:2px">🔗</span>' : ''}${short}
            </span>
            <span class="remove-mapping-icon" style="margin-left: 4px; padding: 0 4px; cursor: pointer; color: #ef4444; border-radius: 50%; font-size: 10px; font-weight: bold;" title="Remove mapping">✕</span>
          `;
          const removeIcon = btn.querySelector('.remove-mapping-icon');
          if (removeIcon) {
            removeIcon.onclick = (e) => {
              e.stopPropagation();
              if (handleRemoveMappingRef.current) {
                handleRemoveMappingRef.current(fieldId, btn);
              }
            };
          }
          btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dependencyMode) {
              setActiveSingleDependencyModal({ fieldKey: fieldId, questionObj: q });
            } else {
              if (handlePlusClickRef.current) {
                handlePlusClickRef.current(fieldId, btn);
              }
            }
          };
        } else {
          if (dependencyMode) {
            btn.style.visibility = 'hidden';
          } else {
            btn.innerText = '+';
            btn.title = 'Click to assign a question';
            btn.style.background = 'rgba(0, 0, 0, 0.05)';
            btn.style.border = '1px dashed #64748b';
            btn.style.color = '#64748b';
            btn.style.fontSize = '13px';
            btn.style.fontWeight = '600';
            btn.style.padding = '0';
            btn.style.justifyContent = 'center';
            btn.ondblclick = null;
            delete btn.dataset.assigned;
          }
        }
      }
    });
  }, [interactionMode, fieldMappings, dependencyMode]);

  useEffect(() => {
    if (interactionMode !== 'interact') return;
    Object.entries(fieldBtnsRef.current).forEach(([fieldId, btn]) => {
      if (!btn) return;
      const q = fieldMappings[fieldId];
      if (q) {
        const visible = shouldRender(fieldId, q);
        btn.style.visibility = visible ? 'visible' : 'hidden';
      }
    });
  }, [interactionMode, fieldMappings, formValues, shouldRender]);

  const filteredQuestions = questions.filter((q) =>
    q.question.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePlusClick = useCallback((fieldId, btn) => {
    const currentMapping = fieldMappingsRef.current[fieldId] || null;
    setActiveField({ id: fieldId, btn, currentMapping });
    setPanelOpen(true);
    setSearchTerm('');
  }, []);

  const handlePlusClickRef = useRef(handlePlusClick);
  useEffect(() => { handlePlusClickRef.current = handlePlusClick; }, [handlePlusClick]);

  const resetBtn = (btn) => {
    btn.innerText = '+';
    btn.title = 'Click to assign a question';
    btn.style.background = 'rgba(0, 0, 0, 0.05)';
    btn.style.border = '1px dashed #64748b';
    btn.style.color = '#64748b';
    btn.style.fontSize = '13px';
    btn.style.fontWeight = '600';
    btn.style.padding = '0';
    btn.style.justifyContent = 'center';
    delete btn.dataset.assigned;
  };

  const handleAssignQuestion = (question) => {
    if (!activeField) return;
    const { id, btn } = activeField;

    setFieldMappings((prev) => {
      const next = { ...prev };
      next[id] = question;
      return next;
    });

    const short = question.question.length > 22
      ? question.question.substring(0, 22) + '…'
      : question.question;

    btn.title = question.question;
    btn.dataset.assigned = question._id;
    btn.style.background = '#0f172a';
    btn.style.border = '1px solid #0f172a';
    btn.style.color = '#ffffff';
    btn.style.fontSize = '11px';
    btn.style.fontWeight = '500';
    btn.style.padding = '0 4px';
    btn.style.justifyContent = 'space-between';

    btn.innerHTML = `
      <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${short}</span>
      <span class="remove-mapping-icon" style="margin-left: 4px; padding: 0 4px; cursor: pointer; color: #dc2626; border-radius: 50%; font-size: 10px; font-weight: bold;" title="Remove mapping">✕</span>
    `;

    const removeIcon = btn.querySelector('.remove-mapping-icon');
    if (removeIcon) {
      removeIcon.onclick = (e) => {
        e.stopPropagation();
        handleRemoveMapping(id, btn);
      };
    }

    setPanelOpen(false);
    setActiveField(null);
    toast.success(`Mapped: "${short}"`);
  };

  const cleanupLayout = (fieldId) => {
    setLayout(prev => {
      let changed = false;
      const next = [];
      for (const item of prev) {
        if (item.type === 'single_question') {
          if (item.fieldKey === fieldId) {
            changed = true;
            continue;
          }
          const oldConds = item.conditions || [];
          const newConds = oldConds.filter(c => c.dependsOn !== fieldId);
          if (oldConds.length !== newConds.length) changed = true;
          next.push({ ...item, conditions: newConds });
        } else if (item.type === 'group') {
          const oldChildren = item.children || [];
          const newChildren = oldChildren.filter(c => c.fieldKey !== fieldId);
          if (oldChildren.length !== newChildren.length) changed = true;

          const oldConds = item.conditions || [];
          const newConds = oldConds.filter(c => c.dependsOn !== fieldId);
          if (oldConds.length !== newConds.length) changed = true;

          next.push({ ...item, children: newChildren, conditions: newConds });
        } else {
          next.push(item);
        }
      }
      return changed ? next : prev;
    });
  };

  const handleRemoveMapping = (id, btn) => {
    setFieldMappings((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    setFormValues((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    resetBtn(btn);
    cleanupLayout(id);
    setPanelOpen(false);
    setActiveField(null);
    toast.success('Field mapping removed');
  };

  useEffect(() => { handleRemoveMappingRef.current = handleRemoveMapping; });

  const handleDeleteQuestion = async (e, id) => {
    e.stopPropagation();
    try {
      await dispatch(deleteQuestion(id)).unwrap();
      toast.success('Question deleted');
      setFieldMappings(prev => {
        const next = { ...prev };
        let removed = false;
        Object.entries(next).forEach(([fId, q]) => {
          if (q._id === id) {
            delete next[fId];
            removed = true;
            cleanupLayout(fId);
            const btn = fieldBtnsRef.current[fId];
            if (btn) resetBtn(btn);
          }
        });
        if (removed && activeField && activeField.currentMapping?._id === id) {
          setActiveField(null);
          setPanelOpen(false);
        }
        return next;
      });
    } catch (err) {
      toast.error(err || 'Failed to delete question');
    }
  };

  const normalizeString = (str) => {
    if (!str) return '';

    const noNumbering = str.replace(/^(?:q(?:uestion)?\s*)?\d*[\.\-\):]+\s*/i, '');
    return noNumbering.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const injectFullWidthButtons = () => {
    if (!viewerRef.current) return {};

    const autoMatches = {};
    let autoMatchCount = 0;

    const textNodes = [];
    const walk = document.createTreeWalker(
      viewerRef.current, NodeFilter.SHOW_TEXT, null, false
    );
    let node;
    while ((node = walk.nextNode())) {
      if (/_{5,}/.test(node.nodeValue)) textNodes.push(node);
    }

    let fieldCount = 0;

    textNodes.forEach((textNode) => {
      const parent = textNode.parentNode;
      if (!parent) return;

      const block = parent.closest('tr') || parent.closest('li') || parent.closest('p, div, section, article') || parent;
      const range = document.createRange();
      range.setStart(block, 0);
      range.setEndBefore(parent);

      const wrapper = document.createElement('span');
      wrapper.style.display = 'inline';

      textNode.nodeValue.split(/(_{5,})/g).forEach((part) => {
        if (/_{5,}/.test(part)) {
          fieldCount++;
          const fieldId = `field-${fieldCount}`;

          const container = document.createElement('span');

          container.style.position = 'relative';
          container.style.display = 'inline-grid';
          container.style.verticalAlign = 'middle';

          const sizer = document.createElement('span');
          sizer.textContent = part;
          sizer.style.visibility = 'hidden';
          sizer.style.gridArea = '1 / 1';

          const btn = document.createElement('button');
          btn.className = 'docx-injected-input-wrapper';
          btn.innerText = '+';
          btn.type = 'button';
          btn.dataset.fieldId = fieldId;
          btn.title = `Field ${fieldCount} — click to assign a question`;

          btn.style.gridArea = '1 / 1';
          btn.style.width = '100%';
          btn.style.height = '100%';
          btn.style.zIndex = '10';
          btn.style.background = 'rgba(0, 0, 0, 0.05)';
          btn.style.border = '1px dashed #64748b';
          btn.style.color = '#64748b';
          btn.style.cursor = 'pointer';
          btn.style.borderRadius = '4px';
          btn.style.fontSize = '13px';
          btn.style.fontWeight = '600';
          btn.style.padding = '0';
          btn.style.display = 'flex';
          btn.style.alignItems = 'center';
          btn.style.justifyContent = 'center';
          btn.style.transition = 'background 0.15s, border-color 0.15s';

          btn.onmouseenter = () => {
            if (!btn.dataset.assigned) {
              btn.style.background = 'rgba(0, 0, 0, 0.1)';
              btn.style.borderColor = '#0f172a';
            }
          };
          btn.onmouseleave = () => {
            if (!btn.dataset.assigned) {
              btn.style.background = 'rgba(0, 0, 0, 0.05)';
              btn.style.borderColor = '#64748b';
            }
          };

          fieldBtnsRef.current[fieldId] = btn;

          const precedingText = range.toString() + (textNode.nodeValue.split(part)[0] || '');
          const precedingParts = precedingText.split(/_+|\+/);
          const rawQuestion = precedingParts[precedingParts.length - 1].trim();

          if (rawQuestion) {
            const normalizedRaw = normalizeString(rawQuestion);
            if (normalizedRaw.length > 0) {
              const matchedQ = questions.find(q => normalizeString(q.question) === normalizedRaw);
              if (matchedQ) {
                autoMatches[fieldId] = matchedQ;
                autoMatchCount++;

                const short = matchedQ.question.length > 22 ? matchedQ.question.substring(0, 22) + '…' : matchedQ.question;
                btn.title = matchedQ.question;
                btn.dataset.assigned = matchedQ._id;
                btn.style.background = 'rgba(34, 197, 94, 0.15)';
                btn.style.border = '1.5px solid #22c55e';
                btn.style.color = '#15803d';
                btn.style.fontSize = '11px';
                btn.style.fontWeight = '500';
                btn.style.padding = '0 4px';
                btn.style.justifyContent = 'space-between';
                btn.innerHTML = `
                  <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${short}</span>
                  <span class="remove-mapping-icon" style="margin-left: 4px; padding: 0 4px; cursor: pointer; color: #dc2626; border-radius: 50%; font-size: 10px; font-weight: bold;" title="Remove mapping">✕</span>
                `;
                const removeIcon = btn.querySelector('.remove-mapping-icon');
                if (removeIcon) {
                  removeIcon.onclick = (e) => {
                    e.stopPropagation();
                    handleRemoveMapping(fieldId, btn);
                  };
                }
              }
            }
          }

          btn.onclick = (e) => {
            e.stopPropagation();
            handlePlusClickRef.current(fieldId, btn);
          };

          container.appendChild(sizer);
          container.appendChild(btn);
          wrapper.appendChild(container);
        } else {
          wrapper.appendChild(document.createTextNode(part));
        }
      });

      parent.replaceChild(wrapper, textNode);
    });

    return autoMatches;
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.docx') && !file.name.endsWith('.pdf')) { toast.error('Please upload a .docx or .pdf file'); return; }

    setSelectedFile(file);
    setActiveDoc(null);
    setFileName(file.name);
    setLoading(true);
    setHasDoc(false);
    setFieldMappings({});
    fieldBtnsRef.current = {};

    try {
      const arrayBuffer = await file.arrayBuffer();
      if (viewerRef.current) {
        viewerRef.current.innerHTML = '';
        await renderAsync(arrayBuffer, viewerRef.current, null, {
          className: 'docx', inWrapper: true,
        });
        const autoMatches = injectFullWidthButtons();
        setFieldMappings(autoMatches);
        if (Object.keys(autoMatches).length > 0) {
          toast.success(`Auto-mapped ${Object.keys(autoMatches).length} questions!`);
        }
        setHasDoc(true);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to render the document. Make sure it is a valid .docx file.');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleUploadToServer = async () => {
    if (!selectedFile) return;
    try {
      const doc = await dispatch(uploadDocx(selectedFile)).unwrap();
      setActiveDoc(doc);
      toast.success('File uploaded to server successfully!');
    } catch (err) {
      toast.error(err || 'Failed to upload to server');
    }
  };

  const handleSaveMappings = async () => {
    if (!activeDoc) return;

    const mappingsToSave = {};
    Object.entries(fieldMappings).forEach(([fieldId, q]) => {
      mappingsToSave[fieldId] = {
        questionId: q._id,
        question: q.question,
        type: q.type,
        options: q.options,
        required: q.required,
        dependsOnId: q.dependsOnId || null,
        dependsOnValue: q.dependsOnValue || ''
      };
    });

    const draggedFieldsToSave = draggedFields.map(df => {
      const q = df.questionObj;
      return {
        id: df.id,
        questionId: df.questionId || (q ? q._id : null),
        question: q ? q.question : '',
        type: q ? q.type : '',
        options: q ? q.options : [],
        required: q ? q.required : false,
        x: df.x,
        y: df.y,
        width: df.width,
        height: df.height,
        dependsOnId: q?.dependsOnId || null,
        dependsOnValue: q?.dependsOnValue || ''
      };
    });

    try {
      await dispatch(saveDocxMappings({
        docxId: activeDoc._id,
        mappings: mappingsToSave,
        draggedFields: draggedFieldsToSave,
        layout
      })).unwrap();
      toast.success('Mappings saved successfully!');
    } catch (err) {
      toast.error(err || 'Failed to save mappings');
    }
  };

  const handleDeleteDoc = async (doc) => {
    try {
      await dispatch(deleteDocx(doc._id)).unwrap();
      toast.success(`Document "${doc.originalName}" deleted`);
      if (activeDoc?._id === doc._id) {
        setActiveDoc(null);
        setHasDoc(false);
        setFileName('');
        setSelectedFile(null);
        if (viewerRef.current) viewerRef.current.innerHTML = '';
      }
    } catch (err) {
      toast.error(err || 'Failed to delete document');
    }
  };

  const handleLoadFromHistory = async (doc) => {
    setHistoryOpen(false);
    setLoading(true);
    setHasDoc(false);
    setFileName(doc.originalName);
    setActiveDoc(doc);
    setFieldMappings({});
    setDraggedFields([]);
    fieldBtnsRef.current = {};

    try {
      const response = await fetch(`http://localhost:8888/${doc.path.replace(/\\/g, '/')}`);
      if (!response.ok) throw new Error('Network error');
      const arrayBuffer = await response.arrayBuffer();
      if (viewerRef.current) {
        viewerRef.current.innerHTML = '';
        await renderAsync(arrayBuffer, viewerRef.current, null, {
          className: 'docx', inWrapper: true,
        });
        const autoMatches = injectFullWidthButtons();
        setHasDoc(true);

        setSelectedFile(new File([arrayBuffer], doc.originalName, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
        if (doc.draggedFields && Array.isArray(doc.draggedFields)) {
          const restoredDraggedFields = doc.draggedFields.map(df => {
            const q = questions.find(q => q._id === df.questionId);
            const questionObj = q ? {
              ...q,
              dependsOnId: df.dependsOnId || q.dependsOnId,
              dependsOnValue: df.dependsOnValue || q.dependsOnValue
            } : null;
            return { ...df, questionObj };
          });
          setDraggedFields(restoredDraggedFields);
        }

        setLayout(doc.layout || []);

        if (doc.mappings && Object.keys(doc.mappings).length > 0) {
          const newMappings = { ...autoMatches };
          let restoredCount = 0;
          Object.entries(doc.mappings).forEach(([fieldId, mappingObj]) => {
            const qId = typeof mappingObj === 'string' ? mappingObj : mappingObj.questionId;
            const question = questions.find(q => q._id === qId);
            if (question) {
              const enhancedQ = typeof mappingObj === 'string' ? question : {
                ...question,
                dependsOnId: mappingObj.dependsOnId || question.dependsOnId,
                dependsOnValue: mappingObj.dependsOnValue || question.dependsOnValue
              };
              newMappings[fieldId] = enhancedQ;
              restoredCount++;


              const btn = fieldBtnsRef.current[fieldId];
              if (btn) {
                const short = question.question.length > 22 ? question.question.substring(0, 22) + '…' : question.question;
                btn.title = question.question;
                btn.dataset.assigned = question._id;
                btn.style.background = 'rgba(34, 197, 94, 0.15)';
                btn.style.border = '1.5px solid #22c55e';
                btn.style.color = '#15803d';
                btn.style.fontSize = '11px';
                btn.style.fontWeight = '500';
                btn.style.padding = '0 4px';
                btn.style.justifyContent = 'space-between';

                btn.innerHTML = `
                  <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${short}</span>
                  <span class="remove-mapping-icon" style="margin-left: 4px; padding: 0 4px; cursor: pointer; color: #dc2626; border-radius: 50%; font-size: 10px; font-weight: bold;" title="Remove mapping">✕</span>
                `;

                const removeIcon = btn.querySelector('.remove-mapping-icon');
                if (removeIcon) {
                  removeIcon.onclick = (e) => {
                    e.stopPropagation();
                    handleRemoveMapping(fieldId, btn);
                  };
                }
              }
            }
          });
          setFieldMappings(newMappings);
          if (restoredCount > 0) {
            toast.success(`Restored ${restoredCount} mapped questions!`);
          }
        } else if (Object.keys(autoMatches).length > 0) {
          setFieldMappings(autoMatches);
          toast.success(`Auto-mapped ${Object.keys(autoMatches).length} questions!`);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load document from history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.docToLoad && questions.length > 0) {
      handleLoadFromHistory(location.state.docToLoad);
      navigate('/docx-viewer', { replace: true, state: {} });
    }
  }, [location.state?.docToLoad, questions.length, navigate]);

  const mappedQuestionsList = useMemo(() => {
    const mapped = [];
    const seen = new Set();
    Object.entries(fieldMappings).forEach(([fieldKey, q]) => {
      if (q && !seen.has(fieldKey)) {
        mapped.push({ fieldKey, questionObj: q });
        seen.add(fieldKey);
      }
    });
    draggedFields.forEach(df => {
      if (df.questionObj && !seen.has(df.id)) {
        mapped.push({ fieldKey: df.id, questionObj: df.questionObj });
        seen.add(df.id);
      }
    });
    return mapped;
  }, [fieldMappings, draggedFields]);

  const handleFieldClickInDependencyMode = (fieldKey, questionObj) => {
    if (!dependencyMode) return;
    setActiveSingleDependencyModal({ fieldKey, questionObj });
  };

  const mappedCount = Object.keys(fieldMappings).length;

  function shouldRender(fieldId, qObj, actualFieldId) {
    const loopSuffix = actualFieldId && actualFieldId.includes('_loop_') ? actualFieldId.substring(actualFieldId.indexOf('_loop_')) : '';
    if (!layout.length && (!qObj || !qObj.dependsOnId)) return true;

    const evaluateCondition = (cond) => {
      let depQId = null;
      let depQObj = null;

      const depMapping = fieldMappings[cond.dependsOn];
      if (depMapping) {
        depQObj = typeof depMapping === 'string' ? questions.find(q => q._id === depMapping) : depMapping.type ? depMapping : questions.find(q => q._id === depMapping.questionId);
        depQId = depQObj?._id;
      } else {
        const dragged = draggedFields.find(df => df.id === cond.dependsOn);
        if (dragged) {
          depQObj = dragged.questionObj || questions.find(q => q._id === dragged.questionId);
          depQId = depQObj?._id;
        }
      }

      if (!depQId) return true;

      const dependentFieldIds = [];
      Object.entries(fieldMappings).forEach(([fId, q]) => {
        const id = typeof q === 'string' ? q : (q._id || q.questionId);
        if (id === depQId) dependentFieldIds.push(fId);
      });
      draggedFields.forEach(df => {
        const id = df.questionId || df.questionObj?._id;
        if (id === depQId) dependentFieldIds.push(df.id);
      });

      if (dependentFieldIds.length === 0) return false;

      return dependentFieldIds.some(fId => {
        let val = formValuesRef.current[fId + loopSuffix];
        if (val === undefined) val = formValuesRef.current[fId];
        if (depQObj && depQObj.type === 'checkbox') {
          val = val || 'false';
        } else {
          val = val || '';
        }

        if (cond.operator === 'equals') {
          if (Array.isArray(cond.value)) return cond.value.includes(String(val));
          return String(val) === String(cond.value);
        }
        if (cond.operator === 'not_equals') {
          if (Array.isArray(cond.value)) return !cond.value.includes(String(val));
          return String(val) !== String(cond.value);
        }
        return true;
      });
    };

    for (const group of layout.filter(l => l.type === 'group')) {
      if (group.children?.some(c => c.fieldKey === fieldId)) {
        if (group.conditions?.length > 0) {
          const visible = group.conditions.every(evaluateCondition);
          if (!visible) return false;
        }
      }
    }

    const singleRule = layout.find(l => l.type === 'single_question' && l.fieldKey === fieldId);
    if (singleRule && singleRule.conditions?.length > 0) {
      const visible = singleRule.conditions.every(evaluateCondition);
      if (!visible) return false;
    }

    if (qObj && qObj.dependsOnId) {
      const dependentFieldIds = [];
      Object.keys(fieldMappings).forEach(k => {
        const m = fieldMappings[k];
        if ((typeof m === 'string' ? m : m.questionId) === qObj.dependsOnId) {
          dependentFieldIds.push(k);
        }
      });
      draggedFields.forEach(df => {
        if ((df.questionId || df.questionObj?._id) === qObj.dependsOnId) {
          dependentFieldIds.push(df.id);
        }
      });

      if (dependentFieldIds.length > 0) {
        const isMet = dependentFieldIds.some(fId => {
          let val = formValuesRef.current[fId + loopSuffix];
          if (val === undefined) val = formValuesRef.current[fId];
          const parentQ = questions.find(x => x._id === qObj.dependsOnId);
          if (parentQ && parentQ.type === 'checkbox') {
            val = val === undefined ? 'false' : String(val);
          } else {
            val = val === undefined ? '' : String(val);
          }
          return val === qObj.dependsOnValue;
        });
        if (!isMet) return false;
      }
    }
    return true;
  };

  useEffect(() => {
    if (!viewerRef.current) return;

    if (interactionMode === 'edit') {
      const wrappers = viewerRef.current.querySelectorAll('.docx-injected-input-wrapper');
      wrappers.forEach(btn => {
        btn.style.visibility = 'visible';
        btn.style.pointerEvents = 'auto';
        if (btn.parentElement?.tagName === 'SPAN') {
          btn.parentElement.style.visibility = 'visible';
        }
        if (btn.previousElementSibling) btn.previousElementSibling.style.visibility = 'hidden';
      });
      return;
    }

    // 1. Process Loopable Configurations (DOM Cloning)
    const allLoopRules = [];
    layout.forEach(l => {
      if (l.type === 'loopable' && l.enabled) {
        allLoopRules.push({ rule: l, fields: [l.fieldKey], id: "single_" + l.fieldKey });
      } else if (l.type === 'group' && l.loopable?.enabled) {
        allLoopRules.push({ rule: l.loopable, fields: (l.children || []).map(c => c.fieldKey), id: "group_" + l.id });
      }
    });

    allLoopRules.forEach(({ rule, fields, id: loopId }) => {
      let loopCount = 1;
      if (rule.sourceQuestionId) {
        const sourceVal = formValues[rule.sourceQuestionId];
        if (sourceVal !== undefined && rule.optionMappings && rule.optionMappings[sourceVal] !== undefined) {
          loopCount = parseInt(rule.optionMappings[sourceVal]) || 0;
        }
      }

      // Collect original blocks
      const originalBlocks = [];
      fields.forEach(fieldKey => {
        const btn = viewerRef.current.querySelector(`.docx-injected-input-wrapper[data-field-id="${fieldKey}"]`);
        if (btn) {
          const block = btn.parentElement?.closest('tr') || btn.parentElement?.closest('li') || btn.parentElement?.closest('p, div, section, article') || btn.parentElement;
          if (block && !originalBlocks.includes(block)) {
            originalBlocks.push(block);
            block.dataset.loopOriginalFor = loopId;
          }
        }
      });

      if (originalBlocks.length === 0) return;

      const parentElement = originalBlocks[0].parentElement;
      const existingClones = Array.from(parentElement.children).filter(child => child.dataset.loopCloneForId === loopId);

      const currentIterations = originalBlocks.length > 0 ? Math.floor(existingClones.length / originalBlocks.length) : 0;
      const targetIterations = Math.max(0, loopCount - 1);

      if (currentIterations < targetIterations) {
        let lastReferenceNode = existingClones.length > 0 ? existingClones[existingClones.length - 1] : originalBlocks[originalBlocks.length - 1];

        for (let i = currentIterations + 1; i <= targetIterations; i++) {
          originalBlocks.forEach(origBlock => {
            const clone = origBlock.cloneNode(true);
            clone.dataset.loopCloneForId = loopId;
            clone.dataset.loopCloneIndex = i;
            delete clone.dataset.loopOriginalFor;

            const cloneInputs = clone.querySelectorAll('input, select, textarea, button.docx-injected-input-wrapper');
            cloneInputs.forEach(ci => {
              const origFieldId = ci.getAttribute('data-field-id');
              if (origFieldId && !origFieldId.includes('_loop_')) {
                const newId = origFieldId + '_loop_' + i;
                ci.setAttribute('data-field-id', newId);
              }
            });

            if (lastReferenceNode && lastReferenceNode.parentNode) {
              lastReferenceNode.parentNode.insertBefore(clone, lastReferenceNode.nextSibling);
              lastReferenceNode = clone;
            }
          });
        }
      } else if (currentIterations > targetIterations) {
        const clonesToRemove = existingClones.filter(c => parseInt(c.dataset.loopCloneIndex) > targetIterations);
        clonesToRemove.forEach(c => c.remove());
      }

      originalBlocks.forEach(origBlock => {
        if (loopCount === 0) {
          origBlock.style.display = 'none';
        } else {
          origBlock.style.display = '';
        }
      });
    });

    // 2. Process Visibility and Values for all inputs
    const wrappers = viewerRef.current.querySelectorAll('.docx-injected-input-wrapper');

    wrappers.forEach(btn => {
      const input = btn.querySelector('input, select, textarea') || btn;
      if (input) {
        const fieldId = input.getAttribute('data-field-id');
        if (fieldId) {
          const originalFieldId = fieldId.split('_loop_')[0];
          const mapping = fieldMappings[originalFieldId];
          let qObj = null;
          if (mapping) {
            if (typeof mapping === 'string') {
              qObj = questions.find(q => q._id === mapping);
            } else if (mapping.type) {
              qObj = mapping;
            } else {
              qObj = questions.find(q => q._id === mapping.questionId);
            }
          }

          if (!qObj) {
            btn.style.pointerEvents = 'none';
            btn.style.visibility = 'hidden';
            if (btn.parentElement?.tagName === 'SPAN') {
              btn.parentElement.style.visibility = 'hidden';
            }
            if (btn.previousElementSibling) btn.previousElementSibling.style.visibility = 'visible';
          } else {
            if (shouldRender(originalFieldId, qObj, fieldId)) {
              if (input && input.tagName !== 'DIV') {
                if (input.type === 'checkbox') {
                  const expected = (formValues[fieldId] === 'true' || formValues[fieldId] === true);
                  if (input.checked !== expected) input.checked = expected;
                } else {
                  const expected = formValues[fieldId] || '';
                  if (input.value !== expected) input.value = expected;
                }

                input.onchange = (e) => {
                  const val = input.type === 'checkbox' ? e.target.checked.toString() : e.target.value;
                  setFormValues(prev => ({ ...prev, [fieldId]: val }));
                };
                if ((input.tagName === 'INPUT' && input.type !== 'checkbox' && input.type !== 'date') || input.tagName === 'TEXTAREA') {
                  input.oninput = (e) => {
                    setFormValues(prev => ({ ...prev, [fieldId]: e.target.value }));
                  };
                }
              }

              btn.style.pointerEvents = 'auto';
              btn.style.visibility = 'visible';
              if (btn.parentElement?.tagName === 'SPAN') btn.parentElement.style.visibility = 'visible';
              if (btn.previousElementSibling) btn.previousElementSibling.style.visibility = 'hidden';
            } else {
              btn.style.pointerEvents = 'auto';
              btn.style.visibility = 'hidden';
              if (btn.parentElement?.tagName === 'SPAN') btn.parentElement.style.visibility = 'hidden';
              if (btn.previousElementSibling) btn.previousElementSibling.style.visibility = 'visible';
            }
          }
        }
      }
    });
  }, [formValues, interactionMode, fieldMappings, layout, questions]);



  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">DOCX Viewer</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a <code className="bg-muted px-1 rounded text-xs">.docx</code> file —
            blank fields <code className="bg-muted px-1 rounded text-xs">_____</code> become interactive{' '}
            <span className="text-indigo-600 font-semibold">+</span> buttons.
          </p>
        </div>
        {hasDoc && (
          <div className="flex flex-col items-end gap-2">
            {mappedCount > 0 && (
              <Badge className="bg-slate-100 text-slate-700 border-slate-200 flex items-center gap-1.5 px-3 py-1.5 shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {mappedCount} field{mappedCount > 1 ? 's' : ''} mapped
              </Badge>
            )}
            <div className="flex gap-2 items-center mt-1">

              <div className="flex items-center gap-2 bg-slate-100 rounded-md p-1 border shadow-sm px-3 mr-2">
                <span className={`text-xs font-semibold ${dependencyMode ? 'text-slate-900' : 'text-slate-500'}`}>Dependency Mode</span>
                <button
                  onClick={() => setDependencyMode(!dependencyMode)}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${dependencyMode ? 'bg-slate-900' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${dependencyMode ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <Button variant="outline" className="border-slate-300 text-slate-800 bg-white hover:bg-slate-50 h-8 text-xs font-semibold px-3" onClick={() => setIsSendModalOpen(true)}>
                <Send className="h-3.5 w-3.5 mr-1.5" /> Send Docx
              </Button>
              <div className="flex bg-slate-100 rounded-md p-1 border shadow-sm">
                <button
                  onClick={() => setInteractionMode('edit')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all ${interactionMode === 'edit' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Edit Mode
                </button>
                <button
                  onClick={() => setInteractionMode('interact')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all ${interactionMode === 'interact' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Interact Mode
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">

        <div className="flex-1 space-y-6 min-w-0 w-full">

          <Card className="shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Document Upload
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-3 cursor-pointer w-fit">
                    <Button asChild className="bg-black text-white hover:bg-neutral-800 flex items-center gap-2">
                      <span>
                        <Upload className="h-4 w-4" />
                        {fileName ? 'Change File' : 'Select Local File'}
                      </span>
                    </Button>
                    <input type="file" accept=".docx,.pdf" onChange={handleFileChange} className="hidden" />
                  </label>

                  {fileName && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate max-w-[200px] border px-2 py-1 bg-slate-50 rounded">
                        {fileName}
                      </span>

                      {!activeDoc ? (
                        <Button
                          variant="outline"
                          className="flex items-center gap-2 text-slate-700 border-slate-300 hover:bg-slate-100"
                          onClick={handleUploadToServer}
                          disabled={uploading}
                        >
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                          Upload to Server
                        </Button>
                      ) : (
                        <Button
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                          onClick={handleSaveMappings}
                          disabled={savingMappings}
                        >
                          {savingMappings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save Mappings
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" className="flex items-center gap-2" onClick={() => setHistoryOpen(true)}>
                    <History className="h-4 w-4" />
                    History
                  </Button>
                </div>
              </div>

              {loading && (
                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing document...
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardContent className="p-0">
              <div
                className="relative w-full min-h-[600px] bg-[#f8fafc] rounded-lg docx-scroll-wrapper"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const questionData = e.dataTransfer.getData('application/json');
                  if (!questionData) return;
                  try {
                    const question = JSON.parse(questionData);
                    const wrapper = e.currentTarget;
                    const rect = wrapper.getBoundingClientRect();

                    const x = e.clientX - rect.left + wrapper.scrollLeft;
                    const y = e.clientY - rect.top + wrapper.scrollTop;

                    setDraggedFields(prev => [
                      ...prev,
                      {
                        id: 'drag-' + Date.now(),
                        questionId: question._id,
                        questionObj: question,
                        x: Math.max(0, x - 100),
                        y: Math.max(0, y - 25),
                        width: 200,
                        height: 40
                      }
                    ]);
                  } catch (err) {
                    console.error(err);
                  }
                }}
              >
                <div
                  ref={viewerRef}
                  className="docx-viewer-container p-4 min-h-full"
                >
                  {!hasDoc && !loading && (
                    <div className="flex flex-col items-center justify-center h-96 text-muted-foreground gap-3">
                      <FileText className="h-12 w-12 opacity-20" />
                      <p className="text-sm">Upload a .docx file to preview it here</p>
                    </div>
                  )}
                </div>

                {hasDoc && draggedFields.map(field => {
                  const q = field.questionObj;
                  const isVisible = interactionMode === 'edit' || (q && shouldRender(field.id, q));

                  if (!isVisible) return null;

                  return (
                    <Rnd
                      key={field.id}
                      default={{
                        x: field.x,
                        y: field.y,
                        width: field.width,
                        height: field.height
                      }}
                      bounds="parent"
                      disableDragging={interactionMode === 'interact'}
                      enableResizing={interactionMode === 'edit'}
                      onDragStop={(e, d) => {
                        setDraggedFields(prev => prev.map(f => f.id === field.id ? { ...f, x: d.x, y: d.y } : f));
                      }}
                      onResizeStop={(e, direction, ref, delta, position) => {
                        setDraggedFields(prev => prev.map(f => f.id === field.id ? {
                          ...f,
                          width: parseInt(ref.style.width, 10),
                          height: parseInt(ref.style.height, 10),
                          ...position
                        } : f));
                      }}
                      onDoubleClick={() => {
                        if (interactionMode === 'edit' && q) {
                          handleFieldClickInDependencyMode(field.id, q);
                        }
                      }}
                      className={`absolute ${interactionMode === 'edit' ? 'bg-white/95 border-2 border-indigo-400 shadow-md flex items-center justify-center cursor-move group' : 'z-40'} rounded z-50`}
                    >
                      {interactionMode === 'edit' ? (
                        <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
                          <button
                            onClick={() => {
                              setDraggedFields(prev => prev.filter(f => f.id !== field.id));
                              cleanupLayout(field.id);
                            }}
                            className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 bg-red-100 text-red-600 rounded p-0.5 transition-opacity z-50 hover:bg-red-200"
                            title="Remove"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          {q?.dependsOnId && (
                            <div className="absolute top-0.5 left-0.5 bg-indigo-100 text-indigo-600 rounded p-0.5 z-40" title="Has Dependency">
                              <Link2 className="h-3 w-3" />
                            </div>
                          )}
                          <p className="text-xs font-semibold text-indigo-900 truncate px-2 select-none pointer-events-none text-center">
                            {field.questionObj?.question || 'Unknown Question'}
                          </p>
                        </div>
                      ) : field.questionObj?.type === 'checkbox' ? (
                        <div className="w-full h-full bg-white/90 shadow-sm border border-slate-300 rounded flex items-center justify-center" title={field.questionObj?.question}>
                          <input
                            type="checkbox"
                            checked={formValues[field.id] === 'true' || formValues[field.id] === true}
                            onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.checked.toString() }))}
                            className="cursor-pointer h-4 w-4 text-slate-800 rounded border-slate-300 focus:ring-slate-800"
                          />
                        </div>
                      ) : field.questionObj?.type === 'dropdown' || field.questionObj?.type === 'radio' ? (
                        <select
                          value={formValues[field.id] || ''}
                          onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                          className="w-full h-full border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 focus:border-slate-800 px-2 text-sm bg-white/90 shadow-sm cursor-pointer"
                        >
                          <option value="" disabled>{field.questionObj?.question}</option>
                          {(field.questionObj?.options || []).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.questionObj?.type === 'date' ? (
                        <input
                          type="date"
                          value={formValues[field.id] || ''}
                          onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                          className="w-full h-full border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 focus:border-slate-800 px-2 text-sm bg-white/90 shadow-sm"
                        />
                      ) : field.questionObj?.type === 'textarea' ? (
                        <textarea
                          value={formValues[field.id] || ''}
                          onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                          placeholder={field.questionObj?.question}
                          className="w-full h-full border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 focus:border-slate-800 p-2 text-sm bg-white/90 shadow-sm resize-none"
                        />
                      ) : (
                        <input
                          type={field.questionObj?.type === 'number' ? 'number' : 'text'}
                          value={formValues[field.id] || ''}
                          onChange={(e) => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                          placeholder={field.questionObj?.question}
                          className="w-full h-full border border-slate-300 rounded focus:ring-2 focus:ring-slate-800 focus:border-slate-800 px-2 text-sm bg-white/90 shadow-sm"
                        />
                      )}
                    </Rnd>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {hasDoc && (
          <div className="hidden lg:block w-80 shrink-0 sticky top-6">
            <Card className="shadow-md flex flex-col h-[calc(100vh-8rem)] overflow-hidden">
              {dependencyMode ? (
                <GroupsSidebar
                  layout={layout}
                  setLayout={setLayout}
                  onOpenGroupModal={setActiveGroupModal}
                />
              ) : (
                <>
                  <CardHeader className="pb-3 border-b bg-white shrink-0">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                      <CheckCircle2 className="h-4 w-4 text-slate-800" /> Drag Questions
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-1">
                      Drag and drop these questions anywhere on your document to map them visually.
                    </p>
                  </CardHeader>

                  <div className="p-3 bg-slate-50 border-b shrink-0">
                    <Input
                      placeholder="Search questions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-white border-slate-200 focus:bg-white text-sm h-9 w-full"
                    />
                  </div>

                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
                    {filteredQuestions.length === 0 ? (
                      <div className="text-center text-slate-400 py-10 text-sm">No questions found.</div>
                    ) : (
                      filteredQuestions.map(q => (
                        <div
                          key={q._id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/json', JSON.stringify(q));
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          className="bg-white border border-slate-200 rounded p-3 text-sm text-slate-700 shadow-sm cursor-grab active:cursor-grabbing hover:border-slate-400 hover:shadow-md transition-all select-none flex items-center gap-2"
                        >
                          <div className="text-slate-400 shrink-0">
                            {getQuestionIcon(q.type)}
                          </div>
                          <span className="truncate">{q.question}</span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        )}
      </div>

      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent
          side="right"
          className="w-[420px] sm:w-[460px] flex flex-col gap-0 p-0 bg-white shadow-2xl border-l border-slate-200"
        >
          <SheetHeader className="px-6 pt-6 pb-4 shrink-0 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="h-5 w-5 text-slate-800" />
              <SheetTitle className="text-slate-900 text-lg font-semibold tracking-tight">
                Assign Question
              </SheetTitle>
            </div>
            <SheetDescription className="text-slate-500 text-sm">
              Pick a question to link to this blank field.
            </SheetDescription>
          </SheetHeader>

          <div className="px-5 pt-4 pb-3 shrink-0 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white text-sm h-10"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
            {qLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading questions...</span>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <Search className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium">
                  {searchTerm ? 'No questions match your search' : 'No questions yet'}
                </p>
              </div>
            ) : (
              filteredQuestions.map((q, idx) => {
                const isCurrentlyMapped = activeField?.currentMapping?._id === q._id;

                return (
                  <div
                    key={q._id}
                    className="w-full text-left rounded-md border border-slate-200 transition-colors flex flex-col hover:bg-slate-50"
                  >
                    <div className="flex items-stretch bg-transparent">
                      <button
                        type="button"
                        onClick={() => handleAssignQuestion(q)}
                        className="flex-1 px-4 py-3 flex items-start justify-between gap-2 transition-colors cursor-pointer active:bg-slate-100"
                      >
                        <div className="flex-1 min-w-0 text-left flex items-start gap-2">
                          <div className="text-slate-400 shrink-0 mt-0.5">
                            {getQuestionIcon(q.type)}
                          </div>
                          <p className="text-sm text-slate-800 font-medium leading-relaxed">
                            {q.question}
                          </p>
                        </div>
                        {isCurrentlyMapped && (
                          <div className="flex items-center justify-center shrink-0 ml-2">
                            <CheckCircle2 className="h-5 w-5 text-slate-800" />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-400">
              {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''}
              {searchTerm && <> · <span className="text-slate-500">"{searchTerm}"</span></>}
            </span>
            {mappedCount > 0 && (
              <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {mappedCount} mapped
              </span>
            )}
          </div>

        </SheetContent>
      </Sheet>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="w-[400px] sm:w-[460px] flex flex-col gap-0 p-0 bg-slate-50 shadow-2xl border-r border-slate-200">
          <SheetHeader className="px-6 pt-6 pb-4 border-b bg-white shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <History className="h-5 w-5 text-indigo-600" />
              <SheetTitle className="text-lg">Document History</SheetTitle>
            </div>
            <SheetDescription className="text-sm">
              Previously uploaded documents. Click to load one into the viewer.
            </SheetDescription>
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search documents..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white text-sm h-10"
              />
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {docsLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading history...</span>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <FileText className="h-10 w-10 opacity-20" />
                <p>{historySearch ? 'No matching documents found.' : 'No documents uploaded yet.'}</p>
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const isActive = activeDoc?._id === doc._id;
                return (
                  <div
                    key={doc._id}
                    onClick={() => handleLoadFromHistory(doc)}
                    className={[
                      'rounded-xl p-4 flex items-start gap-3 transition-all cursor-pointer border',
                      isActive
                        ? 'bg-indigo-50/50 border-indigo-400 shadow-sm ring-1 ring-indigo-400'
                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md active:scale-[0.99]'
                    ].join(' ')}
                  >
                    <div className={`h-10 w-10 rounded flex items-center justify-center shrink-0 ${isActive ? 'bg-indigo-100' : 'bg-indigo-50'}`}>
                      <FileText className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-indigo-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate mb-1 ${isActive ? 'text-indigo-900' : 'text-slate-800'}`} title={doc.originalName}>
                        {doc.originalName}
                      </p>
                      <div className={`flex items-center gap-2 text-xs ${isActive ? 'text-indigo-600/70' : 'text-slate-500'}`}>
                        <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                        <span>·</span>
                        <span className="truncate">{doc.fileName.substring(0, 15)}...</span>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
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
                            onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc); }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Send Document</DialogTitle>
            <DialogDescription>
              Select the signers you want to assign this document to.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3 max-h-60 overflow-y-auto">
            {fetchingUsers ? (
              <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
            ) : users.length === 0 ? (
              <p className="text-sm text-slate-500 text-center">No signers available.</p>
            ) : (
              users.map(u => (
                <label key={u._id} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-slate-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedAssignees.includes(u._id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedAssignees(prev => [...prev, u._id]);
                      else setSelectedAssignees(prev => prev.filter(id => id !== u._id));
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-700">{u.name || 'Unknown User'} <span className="text-slate-400 font-normal">({u.email})</span></span>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSendDocx} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={fetchingUsers || selectedAssignees.length === 0}>
              Send Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSubmissionsModalOpen} onOpenChange={setIsSubmissionsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Document Submissions</DialogTitle>
            <DialogDescription>
              View the answers submitted by assigned users.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto bg-slate-50 p-6">
            {loadingSubmissions ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : submissions?.length > 0 ? (
              (() => {
                const qIds = new Set();
                if (activeDoc?.mappings) {
                  Object.values(activeDoc.mappings).forEach(m => qIds.add(typeof m === 'string' ? m : m.questionId));
                }
                if (activeDoc?.draggedFields) {
                  activeDoc.draggedFields.forEach(df => qIds.add(df.questionId));
                }
                const uniqueQuestions = Array.from(qIds)
                  .map(id => questions.find(q => q._id === id))
                  .filter(Boolean);

                const getAnswerForQuestion = (sub, qId) => {
                  if (activeDoc?.mappings) {
                    for (const [fId, m] of Object.entries(activeDoc.mappings)) {
                      const mappedQId = typeof m === 'string' ? m : m.questionId;
                      if (mappedQId === qId && sub.answers[fId] !== undefined) {
                        return sub.answers[fId];
                      }
                    }
                  }
                  if (activeDoc?.draggedFields) {
                    for (const df of activeDoc.draggedFields) {
                      if (df.questionId === qId && sub.answers[df.id] !== undefined) {
                        return sub.answers[df.id];
                      }
                    }
                  }
                  return '-';
                };

                return (
                  <div className="bg-white border rounded-md shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
                          <tr>
                            <th className="px-4 py-3 sticky left-0 bg-slate-100 border-r z-10 w-48">Signer Name</th>
                            <th className="px-4 py-3 sticky left-48 bg-slate-100 border-r z-10 w-64">Signer Email</th>
                            <th className="px-4 py-3 border-r">Date</th>
                            {uniqueQuestions.map((q, i) => (
                              <th key={i} className="px-4 py-3 border-r max-w-xs truncate" title={q.question}>
                                {q.question}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {submissions.map((sub) => (
                            <tr key={sub._id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 sticky left-0 bg-white border-r z-10 font-medium">
                                {sub.signerId?.name || 'Unknown'}
                              </td>
                              <td className="px-4 py-3 sticky left-48 bg-white border-r z-10 text-slate-500">
                                {sub.signerId?.email || 'Unknown'}
                              </td>
                              <td className="px-4 py-3 border-r text-slate-500">
                                {new Date(sub.submittedAt).toLocaleDateString()}
                              </td>
                              {uniqueQuestions.map((q, i) => (
                                <td key={i} className="px-4 py-3 border-r max-w-xs truncate" title={String(getAnswerForQuestion(sub, q._id))}>
                                  {getAnswerForQuestion(sub, q._id)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-12 text-slate-500">
                No submissions found for this document.
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-slate-50">
            <Button variant="outline" onClick={() => setIsSubmissionsModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Render Modals */}
      {activeGroupModal && (
        <GroupConfigModal
          group={activeGroupModal}
          layout={layout}
          setLayout={setLayout}
          mappedQuestions={mappedQuestionsList}
          onClose={() => setActiveGroupModal(null)}
        />
      )}

      {activeSingleDependencyModal && (
        <SingleDependencyModal
          fieldKey={activeSingleDependencyModal.fieldKey}
          questionObj={activeSingleDependencyModal.questionObj}
          layout={layout}
          setLayout={setLayout}
          mappedQuestions={mappedQuestionsList}
          onClose={() => setActiveSingleDependencyModal(null)}
        />
      )}
    </div>
  );
}