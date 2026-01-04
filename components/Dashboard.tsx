import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  ResponsiveContainer, Tooltip, 
  XAxis, YAxis, BarChart, Bar, Cell,
  PieChart, Pie,
  CartesianGrid,
  Label,
  LabelList
} from 'recharts';
import { Goal, GoalLevel, LifeArea, GoalPriority } from '../types';

interface DashboardProps {
  goals: Goal[];
  onDifficultyClick?: (level: GoalLevel) => void;
  onAreaClick?: (area: LifeArea) => void;
  onStatusClick?: (status: 'Completed' | 'Active') => void;
  onPriorityClick?: (priority: GoalPriority) => void;
}

const AREA_COLORS: Record<string, string> = {
  [LifeArea.HEALTH]: '#10b981', 
  [LifeArea.TRAVEL]: '#0ea5e9', 
  [LifeArea.RELATIONSHIPS]: '#f472b6', 
  [LifeArea.GROWTH]: '#f97316',
  [LifeArea.OTHERS]: '#94a3b8', 
  [LifeArea.CAREER]: '#f59e0b', 
};

type WidgetId = 'LIFE_FOCUS' | 'EXECUTION' | 'DIFFICULTY' | 'PRIORITY';
type ViewMode = 'CAROUSEL' | 'GRID';

const BUTTON_STYLE = "rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center";

const Dashboard: React.FC<DashboardProps> = ({ 
  goals, 
  onDifficultyClick, 
  onAreaClick, 
  onStatusClick, 
  onPriorityClick 
}) => {
  const [pinnedWidgets, setPinnedWidgets] = useState<WidgetId[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('CAROUSEL');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(['LIFE_FOCUS', 'EXECUTION', 'DIFFICULTY', 'PRIORITY']);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draggedWidgetId, setDraggedWidgetId] = useState<WidgetId | null>(null);

  useEffect(() => {
    const savedPins = localStorage.getItem('vision2026_pinned_widgets');
    if (savedPins) setPinnedWidgets(JSON.parse(savedPins));
    const savedView = localStorage.getItem('vision2026_dashboard_view');
    if (savedView) setViewMode(savedView as ViewMode);
    const savedCollapsed = localStorage.getItem('vision2026_dashboard_collapsed');
    if (savedCollapsed) setIsCollapsed(JSON.parse(savedCollapsed));
    const savedOrder = localStorage.getItem('vision2026_widget_order');
    if (savedOrder) setWidgetOrder(JSON.parse(savedOrder));
  }, []);

  const toggleViewMode = () => {
    const next = viewMode === 'CAROUSEL' ? 'GRID' : 'CAROUSEL';
    setViewMode(next);
    localStorage.setItem('vision2026_dashboard_view', next);
  };

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('vision2026_dashboard_collapsed', JSON.stringify(next));
  };

  const togglePin = (id: WidgetId, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPins = pinnedWidgets.includes(id) 
      ? pinnedWidgets.filter(p => p !== id)
      : [...pinnedWidgets, id];
    setPinnedWidgets(newPins);
    localStorage.setItem('vision2026_pinned_widgets', JSON.stringify(newPins));
  };

  const handleDragStart = (id: WidgetId) => setDraggedWidgetId(id);
  const handleDragOver = (e: React.DragEvent, id: WidgetId) => {
    e.preventDefault();
    if (draggedWidgetId && draggedWidgetId !== id) {
      const newOrder = [...widgetOrder];
      const draggedIndex = newOrder.indexOf(draggedWidgetId);
      const targetIndex = newOrder.indexOf(id);
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedWidgetId);
      setWidgetOrder(newOrder);
    }
  };
  const handleDrop = () => {
    setDraggedWidgetId(null);
    localStorage.setItem('vision2026_widget_order', JSON.stringify(widgetOrder));
  };

  const stats = useMemo(() => {
    const totalGoals = goals.length;
    const completedCount = goals.filter(g => g.completed).length;
    const activeCount = totalGoals - completedCount;
    const completionRate = totalGoals > 0 ? Math.round((completedCount / totalGoals) * 100) : 0;
    const statusData = [{ name: 'Completed', value: completedCount, color: '#10b981' }, { name: 'Active', value: activeCount, color: '#ea580c' }];
    const areaData = Object.values(LifeArea).map(area => ({
      name: area, value: goals.filter(g => g.area === area).length, color: AREA_COLORS[area] || '#ea580c'
    })).filter(item => item.value > 0);
    const difficultyData = [
      { name: GoalLevel.EASY, count: goals.filter(g => g.level === GoalLevel.EASY).length, color: '#10b981' },
      { name: GoalLevel.MEDIUM, count: goals.filter(g => g.level === GoalLevel.MEDIUM).length, color: '#f59e0b' },
      { name: GoalLevel.HARD, count: goals.filter(g => g.level === GoalLevel.HARD).length, color: '#f43f5e' }
    ];
    const priorityData = [
      { name: GoalPriority.HIGH, count: goals.filter(g => g.priority === GoalPriority.HIGH).length, color: '#f43f5e' },
      { name: GoalPriority.MEDIUM, count: goals.filter(g => g.priority === GoalPriority.MEDIUM).length, color: '#ea580c' },
      { name: GoalPriority.LOW, count: goals.filter(g => g.priority === GoalPriority.LOW).length, color: '#94a3b8' }
    ];
    return { totalGoals, completedCount, activeCount, completionRate, statusData, areaData, difficultyData, priorityData };
  }, [goals]);

  const renderWidget = (id: WidgetId) => {
    const isPinned = pinnedWidgets.includes(id);
    const isGrid = viewMode === 'GRID';
    const isDragging = draggedWidgetId === id;
    const commonClasses = `bg-white transition-all duration-300 relative group flex flex-col cursor-pointer ${isPinned ? 'border-orange-400 shadow-orange-100 ring-1 ring-orange-50' : 'border-slate-100 shadow-sm'} ${isDragging ? 'opacity-30 scale-95' : 'opacity-100 scale-100'} ${isGrid ? 'p-4 rounded-2xl border h-[280px] w-full' : 'p-7 rounded-[3rem] border-2 flex-shrink-0 w-[310px] md:w-[400px] snap-center h-[480px]'}`;
    const PinButton = () => (
      <button onClick={(e) => togglePin(id, e)} className={`absolute top-4 right-4 p-1.5 rounded-full transition-all z-10 ${isPinned ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-50 text-slate-300 hover:text-orange-400 opacity-0 group-hover:opacity-100'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
      </button>
    );
    const titleClass = "text-slate-900 font-bold tracking-tight flex items-center gap-2 pointer-events-none " + (isGrid ? "text-[8px] mb-2" : "text-[12px] mb-5");
    const widgetContent = (() => {
      switch (id) {
        case 'LIFE_FOCUS':
          return (
            <>
              <h3 className={titleClass}><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Life focus</h3>
              <div className="flex-1 w-full overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.areaData} cx="50%" cy="50%" innerRadius={isGrid ? 30 : 60} outerRadius={isGrid ? 45 : 90} paddingAngle={isGrid ? 3 : 6} dataKey="value" stroke="none" onClick={(data) => onAreaClick?.(data.name as LifeArea)}>
                      {stats.areaData.map((e, i) => <Cell key={i} fill={e.color} cursor="pointer" />)}
                      {!isGrid && <LabelList dataKey="value" position="outside" fill="#94a3b8" style={{ fontSize: '10px', fontWeight: 700 }} />}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '9px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className={`mt-3 flex flex-wrap gap-x-3 gap-y-1 justify-center max-h-[80px] overflow-y-auto no-scrollbar`}>
                {stats.areaData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-opacity" onClick={() => onAreaClick?.(item.name as LifeArea)}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className={`font-bold text-slate-500 tracking-tight ${isGrid ? 'text-[7px]' : 'text-[9px]'}`}>{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </>
          );
        case 'EXECUTION':
          return (
            <>
              <h3 className={titleClass}><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Completion rate</h3>
              <div className="flex-1 w-full overflow-hidden relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={isGrid ? 38 : 75} outerRadius={isGrid ? 53 : 105} paddingAngle={isGrid ? 6 : 12} dataKey="value" stroke="none" onClick={(data) => onStatusClick?.(data.name as 'Completed' | 'Active')}>
                      {stats.statusData.map((e, i) => <Cell key={i} fill={e.color} cursor="pointer" />)}
                      <Label value={`${stats.completionRate}%`} position="center" fill="#1e293b" style={{ fontSize: isGrid ? '14px' : '32px', fontWeight: 700, fontFamily: 'Inter' }} />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '9px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-wrap gap-4 justify-center">
                {stats.statusData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 cursor-pointer hover:opacity-70" onClick={() => onStatusClick?.(item.name as 'Completed' | 'Active')}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className={`font-bold text-slate-500 tracking-tight ${isGrid ? 'text-[7px]' : 'text-[9px]'}`}>{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </>
          );
        case 'DIFFICULTY':
          return (
            <>
              <h3 className={titleClass}><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Goals intensity</h3>
              <div className="flex-1 w-full overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.difficultyData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700, fill: '#cbd5e1' }} dy={5} />
                    <YAxis hide />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '9px', fontWeight: 'bold' }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={isGrid ? 25 : 55} onClick={(data) => onDifficultyClick?.(data.name as GoalLevel)}>
                      {stats.difficultyData.map((e, i) => <Cell key={i} fill={e.color} cursor="pointer" />)}
                      <LabelList dataKey="count" position="top" fill="#94a3b8" style={{ fontSize: '10px', fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className={`mt-3 flex flex-wrap gap-x-3 gap-y-1 justify-center`}>
                {stats.difficultyData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-opacity" onClick={() => onDifficultyClick?.(item.name as GoalLevel)}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className={`font-bold text-slate-500 tracking-tight ${isGrid ? 'text-[7px]' : 'text-[9px]'}`}>{item.name}: {item.count}</span>
                  </div>
                ))}
              </div>
            </>
          );
        case 'PRIORITY':
          return (
            <>
              <h3 className={titleClass}><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Priority goals</h3>
              <div className="flex-1 w-full overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.priorityData} layout="vertical" margin={{ left: -15, right: 30 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700, fill: '#cbd5e1' }} width={isGrid ? 50 : 85} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '9px', fontWeight: 'bold' }} />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={isGrid ? 15 : 32} onClick={(data) => onPriorityClick?.(data.name as GoalPriority)}>
                      {stats.priorityData.map((e, i) => <Cell key={i} fill={e.color} cursor="pointer" />)}
                      <LabelList dataKey="count" position="right" fill="#94a3b8" style={{ fontSize: '10px', fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          );
      }
    })();
    return (
      <div key={id} className={commonClasses} draggable onDragStart={() => handleDragStart(id)} onDragOver={(e) => handleDragOver(e, id)} onDrop={handleDrop}>
        <PinButton />
        {widgetContent}
      </div>
    );
  };

  if (goals.length === 0) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex items-center justify-between px-4 mt-12">
        <div className="flex items-center gap-4">
          <button onClick={toggleCollapse} className="w-9 h-9 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm text-slate-400 hover:text-orange-600 group active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-500 ${isCollapsed ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
          </button>
          <div className="flex flex-col">
            <h2 className="text-[11px] font-bold text-slate-500 tracking-tight">Goals analytics</h2>
            <div className="h-0.5 w-12 bg-orange-500 rounded-full mt-1"></div>
          </div>
        </div>
        {!isCollapsed && (
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 shadow-inner">
            <button onClick={() => viewMode !== 'CAROUSEL' && toggleViewMode()} className={`px-4 py-2 ${BUTTON_STYLE} text-[10px] tracking-tight ${viewMode === 'CAROUSEL' ? 'bg-white shadow-md text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}>Boards</button>
            <button onClick={() => viewMode !== 'GRID' && toggleViewMode()} className={`px-4 py-2 ${BUTTON_STYLE} text-[10px] tracking-tight ${viewMode === 'GRID' ? 'bg-white shadow-md text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}>Grid</button>
          </div>
        )}
      </div>
      <div className={`transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1400px] opacity-100'}`}>
        {viewMode === 'CAROUSEL' ? (
          <div className="relative group/dash">
            <div ref={scrollRef} className="flex gap-6 overflow-x-auto snap-x no-scrollbar pb-10 pt-4 px-6 -mx-6 scroll-smooth">
              {widgetOrder.map(id => renderWidget(id))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
            {widgetOrder.map(id => renderWidget(id))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
