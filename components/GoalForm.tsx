import React, { useState, useEffect, useRef } from 'react';
import { GoalLevel, GoalPriority, Goal, SubTask, LifeArea } from '../types';
import { getTaskBreakdown, suggestDescription } from '../services/geminiService';

interface GoalFormProps {
  onAdd: (goal: Omit<Goal, 'id' | 'createdAt' | 'completed' | 'subTasks'> & { subTasks: Partial<SubTask>[] }) => void;
  onUpdate?: (goalId: string, updatedData: Partial<Goal>) => void;
  onClose: () => void;
  initialData?: Goal;
  autoFocusSubTasks?: boolean;
  categories: string[];
}

const BUTTON_STYLE = "rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center text-sm";

const GoalForm: React.FC<GoalFormProps> = ({ onAdd, onUpdate, onClose, initialData, autoFocusSubTasks, categories }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [level, setLevel] = useState<GoalLevel>(initialData?.level || GoalLevel.MEDIUM);
  const [priority, setPriority] = useState<GoalPriority>(initialData?.priority || GoalPriority.MEDIUM);
  const [area, setArea] = useState<string>(initialData?.area || categories[0] || '');
  const [deadline, setDeadline] = useState(initialData?.deadline ? new Date(initialData.deadline).toISOString().split('T')[0] : '');
  const [cost, setCost] = useState(initialData?.estimatedCost || 0);
  const [pinned, setPinned] = useState(initialData?.pinned || false);
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [subTasks, setSubTasks] = useState<Partial<SubTask>[]>(initialData?.subTasks || []);

  const subTasksRef = useRef<HTMLDivElement>(null);
  const todayStr = new Date().toISOString().split('T')[0];
  const isEditing = !!initialData?.id;

  useEffect(() => {
    if (autoFocusSubTasks && subTasksRef.current) {
      setTimeout(() => {
        subTasksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [autoFocusSubTasks]);

  const handleAddSubTask = (index?: number) => {
    const newTask = { 
      id: crypto.randomUUID(), 
      text: '', 
      completed: false, 
      currentProgress: 0, 
      targetProgress: 0, 
      level: GoalLevel.MEDIUM, 
      priority: GoalPriority.MEDIUM,
      deadline: undefined
    };
    if (typeof index === 'number') {
      const updated = [...subTasks];
      updated.splice(index + 1, 0, newTask);
      setSubTasks(updated);
    } else {
      setSubTasks([...subTasks, newTask]);
    }
  };

  const handleRemoveSubTask = (id: string) => setSubTasks(subTasks.filter((task) => task.id !== id));
  const handleSubTaskChange = (id: string, field: string, value: any) => setSubTasks(subTasks.map((task) => task.id === id ? { ...task, [field]: value } : task));

  const handleAIGenerateSteps = async () => {
    if (!title.trim()) return;
    setIsBreakingDown(true);
    try {
      const breakdown = await getTaskBreakdown(title, description);
      setSubTasks([...subTasks, ...breakdown.map(item => ({ 
        id: crypto.randomUUID(), 
        text: item.text, 
        level: item.level as GoalLevel, 
        priority: GoalPriority.MEDIUM, 
        completed: false, 
        currentProgress: 0, 
        targetProgress: 1 
      }))]);
    } finally { setIsBreakingDown(false); }
  };

  const handleAIDescriptionAction = async () => {
    if (!title.trim()) return;
    setIsSuggesting(true);
    try { 
      const suggested = await suggestDescription(title, description);
      setDescription(suggested); 
    } finally { setIsSuggesting(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const goalData = { 
      title, 
      description, 
      level, 
      priority, 
      area: area as LifeArea, 
      deadline: deadline ? new Date(deadline).getTime() : undefined, 
      estimatedCost: cost, 
      pinned,
      lastInteractionAt: Date.now(),
      order: initialData?.order ?? 0
    };
    if (isEditing && onUpdate && initialData?.id) {
      onUpdate(initialData.id, { ...goalData, subTasks: subTasks.filter(t => t.text?.trim()) as SubTask[] });
    } else {
      onAdd({ ...goalData, subTasks: subTasks.filter(t => t.text?.trim()) });
    }
    onClose();
  };

  const labelClass = "block text-[10px] font-bold text-slate-400 tracking-tight mb-1.5 ml-1";
  const pillBtnClass = (active: boolean, color: string) => `flex-1 py-3 px-2 rounded-xl text-[10px] font-bold tracking-tight transition-all border ${active ? `${color} text-white shadow-sm` : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[200] backdrop-blur-md">
      <div className="bg-white w-full max-w-2xl p-8 md:p-14 rounded-[3.5rem] shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto custom-scrollbar border border-white/20">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-4">
            <span className="text-orange-600 text-4xl">{isEditing ? '✍️' : '🚀'}</span> {isEditing ? 'Update strategy' : 'Create your goal'}
          </h2>
          <button onClick={onClose} type="button" className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-8">
            <div className="flex items-center gap-3 bg-orange-50/50 p-4 rounded-3xl border border-orange-100/50 w-fit">
              <input type="checkbox" id="pinnedGoal" className="w-4 h-4 rounded border-orange-200 text-orange-600" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              <label htmlFor="pinnedGoal" className="text-[11px] font-bold text-orange-700 tracking-tight cursor-pointer">Mark as high-priority goal</label>
            </div>

            <div>
              <label className={labelClass}>Goal title</label>
              <input required className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-6 focus:outline-none focus:ring-4 focus:ring-orange-500/5 text-slate-900 font-bold text-2xl transition-all tracking-tight placeholder:font-normal placeholder:text-[13px] placeholder:text-slate-300" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Run a marathon, learn piano..." />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <label className={labelClass}>A little more context</label>
                  <p className="text-[9px] text-slate-400 font-medium -mt-1 ml-1 italic leading-tight">Try adding some thoughts or generate with AI</p>
                </div>
                <button 
                  type="button" 
                  onClick={handleAIDescriptionAction} 
                  disabled={isSuggesting || !title.trim()} 
                  className="text-[10px] font-bold tracking-tight text-orange-600 hover:text-orange-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  ✨ {description.trim() ? 'Enhance with AI' : 'AI generate'}
                </button>
              </div>
              <textarea className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] px-6 py-6 focus:outline-none focus:ring-4 focus:ring-orange-500/5 text-slate-900 font-medium text-base min-h-[140px] resize-none tracking-tight leading-relaxed placeholder:font-normal placeholder:text-slate-300" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the feeling of reaching this milestone..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Difficulty</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setLevel(GoalLevel.EASY)} className={pillBtnClass(level === GoalLevel.EASY, 'bg-emerald-500 border-emerald-500')}>Easy</button>
                  <button type="button" onClick={() => setLevel(GoalLevel.MEDIUM)} className={pillBtnClass(level === GoalLevel.MEDIUM, 'bg-amber-500 border-amber-500')}>Medium</button>
                  <button type="button" onClick={() => setLevel(GoalLevel.HARD)} className={pillBtnClass(level === GoalLevel.HARD, 'bg-rose-500 border-rose-500')}>Hard</button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Priority</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPriority(GoalPriority.LOW)} className={pillBtnClass(priority === GoalPriority.LOW, 'bg-slate-500 border-slate-500')}>Low</button>
                  <button type="button" onClick={() => setPriority(GoalPriority.MEDIUM)} className={pillBtnClass(priority === GoalPriority.MEDIUM, 'bg-orange-500 border-orange-500')}>Medium</button>
                  <button type="button" onClick={() => setPriority(GoalPriority.HIGH)} className={pillBtnClass(priority === GoalPriority.HIGH, 'bg-rose-600 border-rose-600')}>High</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Life area</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-5 py-4 text-slate-900 font-normal text-base tracking-tight focus:outline-none focus:ring-2 focus:ring-orange-500/10" value={area} onChange={(e) => setArea(e.target.value)}>
                  {categories.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Deadline</label>
                <input 
                  type="date" 
                  min={todayStr}
                  className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-5 py-4 text-slate-900 font-normal text-base tracking-tight focus:outline-none focus:ring-2 focus:ring-orange-500/10 appearance-none" 
                  value={deadline} 
                  onChange={(e) => setDeadline(e.target.value)}
                  onClick={(e) => (e.target as any).showPicker?.()}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Budget (EUR)</label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-normal text-base">€</span>
                <input type="number" min="0" className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] pl-12 pr-6 py-5 text-slate-900 font-normal text-base tracking-tight placeholder:font-normal placeholder:text-slate-300" value={cost} onChange={(e) => setCost(parseFloat(e.target.value) || 0)} placeholder="0.00" />
              </div>
            </div>

            <div ref={subTasksRef} className="pt-10 border-t border-slate-100 scroll-mt-10">
              <label className="text-sm font-bold text-slate-900 tracking-tight mb-1 block">Goal steps</label>
              <p className="text-[10px] text-slate-400 font-medium mb-4 ml-1 leading-relaxed">
                Pro Tip: Think of these as small wins. It's much easier to reach a big goal when we take it one tiny step at a time.
              </p>
              <div className="flex gap-8 mb-8">
                <button type="button" onClick={handleAIGenerateSteps} disabled={isBreakingDown || !title.trim()} className="text-amber-600 text-[10px] font-bold tracking-tight hover:text-amber-700 transition-colors disabled:opacity-30">⚡ AI breakdown</button>
                <button type="button" onClick={() => handleAddSubTask()} className="text-orange-600 text-[10px] font-bold tracking-tight hover:text-orange-700 transition-colors">+ Add manual step</button>
              </div>

              <div className="space-y-4">
                {subTasks.map((task, idx) => (
                  <React.Fragment key={task.id}>
                    <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-200 relative group">
                      <button type="button" onClick={() => handleRemoveSubTask(task.id!)} className="absolute -top-2 -right-2 w-7 h-7 bg-slate-900 text-white rounded-full flex items-center justify-center text-sm shadow-xl hover:bg-rose-600 opacity-0 group-hover:opacity-100 transition-all z-20">&times;</button>
                      <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                           <label className="text-[9px] font-bold tracking-tight text-slate-400 ml-1">What's the next small win?</label>
                           <input className="w-full bg-white border border-slate-200 rounded-[1rem] px-4 py-4 text-base font-normal tracking-tight outline-none focus:ring-2 focus:ring-orange-500/10 placeholder:font-normal" value={task.text} onChange={(e) => handleSubTaskChange(task.id!, 'text', e.target.value)} placeholder="What's the win?" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-bold tracking-tight text-slate-300 ml-1 flex flex-col">
                              Check-ins
                              <span className="text-[7px] opacity-60 font-medium">Frequency</span>
                            </label>
                            <input type="number" min="0" className="w-full bg-white border border-slate-200 rounded-[1rem] px-4 py-3 text-xs font-normal h-11" value={task.targetProgress} onChange={(e) => handleSubTaskChange(task.id!, 'targetProgress', parseInt(e.target.value) || 0)} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-bold tracking-tight text-slate-300 ml-1">Priority</label>
                            <select className="w-full bg-white border border-slate-200 rounded-[1rem] px-2 py-3 text-[10px] h-11" value={task.priority} onChange={(e) => handleSubTaskChange(task.id!, 'priority', e.target.value as GoalPriority)}>
                              {Object.values(GoalPriority).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-bold tracking-tight text-slate-300 ml-1">Difficulty</label>
                            <select className="w-full bg-white border border-slate-200 rounded-[1rem] px-2 py-3 text-[10px] h-11" value={task.level} onChange={(e) => handleSubTaskChange(task.id!, 'level', e.target.value as GoalLevel)}>
                              {Object.values(GoalLevel).map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[8px] font-bold tracking-tight text-slate-300 ml-1">Due date</label>
                            <input type="date" min={todayStr} max={deadline || undefined} className="w-full bg-white border border-slate-200 rounded-[1rem] px-4 py-3 text-[10px] h-11" value={task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : ''} onChange={(e) => handleSubTaskChange(task.id!, 'deadline', e.target.value ? new Date(e.target.value).getTime() : undefined)} onClick={(e) => (e.target as any).showPicker?.()} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center -my-2 py-2 relative z-10 group/add">
                      <button type="button" onClick={() => handleAddSubTask(idx)} className="w-8 h-8 rounded-full bg-white border border-slate-100 text-slate-300 hover:text-orange-600 flex items-center justify-center shadow-sm opacity-20 group-hover/add:opacity-100 transition-all"><span className="text-lg font-bold">+</span></button>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-10 border-t border-slate-100">
            <button type="button" onClick={onClose} className={`flex-1 py-5 ${BUTTON_STYLE} text-slate-400 bg-slate-50`}>Cancel</button>
            <button type="submit" className={`flex-[2] bg-slate-900 hover:bg-orange-600 text-white py-5 ${BUTTON_STYLE} shadow-2xl transition-all`}>{isEditing ? 'Update strategy' : 'Set the goal'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalForm;