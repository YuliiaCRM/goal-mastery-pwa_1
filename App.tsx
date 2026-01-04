import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Goal, GoalLevel, GoalPriority, LifeArea, SubTask } from './types';
import GoalForm from './components/GoalForm';
import Dashboard from './components/Dashboard';
import Fireworks from './components/Fireworks';
import ChatAssistant from './components/ChatAssistant';
import WelcomeScreen from './components/WelcomeScreen';
import { getFriendlyNudge, getDailyGreeting } from './services/geminiService';

type SortOption = 'Newest' | 'Priority' | 'Difficulty' | 'Deadline' | 'Reset';

const AREA_UI_CONFIG: Record<string, { icon: string, color: string, textColor: string, lightBg: string, glassColor: string }> = {
  [LifeArea.HEALTH]: { icon: '🌿', color: 'bg-[#4ade80]', textColor: 'text-[#065f46]', lightBg: 'bg-[#ecfdf5]', glassColor: 'bg-emerald-500/20' },
  [LifeArea.TRAVEL]: { icon: '✈️', color: 'bg-[#38bdf8]', textColor: 'text-[#075985]', lightBg: 'bg-[#f0f9ff]', glassColor: 'bg-sky-500/20' },
  [LifeArea.RELATIONSHIPS]: { icon: '🤝', color: 'bg-[#fb7185]', textColor: 'text-[#9f1239]', lightBg: 'bg-[#fff1f2]', glassColor: 'bg-rose-500/20' },
  [LifeArea.GROWTH]: { icon: '📈', color: 'bg-[#a855f7]', textColor: 'text-[#581c87]', lightBg: 'bg-[#faf5ff]', glassColor: 'bg-purple-500/20' },
  [LifeArea.OTHERS]: { icon: '🎯', color: 'bg-[#94a3b8]', textColor: 'text-[#1e293b]', lightBg: 'bg-[#f8fafc]', glassColor: 'bg-slate-500/20' },
  [LifeArea.CAREER]: { icon: '💼', color: 'bg-[#fbbf24]', textColor: 'text-[#92400e]', lightBg: 'bg-[#fffbeb]', glassColor: 'bg-amber-500/20' }
};

const CUSTOM_THEMES = [
  { colors: 'bg-[#f97316]', textColor: 'text-[#7c2d12]', lightBg: 'bg-[#fff7ed]', glassColor: 'bg-orange-600/20', icon: '🔥' },
  { colors: 'bg-[#ec4899]', textColor: 'text-[#831843]', lightBg: 'bg-[#fdf2f8]', glassColor: 'bg-pink-500/20', icon: '💖' },
  { colors: 'bg-[#8b5cf6]', textColor: 'text-[#4c1d95]', lightBg: 'bg-[#f5f3ff]', glassColor: 'bg-violet-500/20', icon: '✨' },
  { colors: 'bg-[#14b8a6]', textColor: 'text-[#134e4a]', lightBg: 'bg-[#f0fdfa]', glassColor: 'bg-teal-500/20', icon: '💎' },
  { colors: 'bg-[#eab308]', textColor: 'text-[#713f12]', lightBg: 'bg-[#fefce8]', glassColor: 'bg-yellow-500/20', icon: '🌟' },
];

const BUTTON_STYLE = "rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center text-sm cursor-pointer";

const ACHIEVED_PHRASES = [
  "Goal achieved. Well done.",
  "You did it. This one’s complete.",
  "Completed — take a moment to enjoy this."
];

interface AppNotification {
  id: string;
  type: 'nudge' | 'deadline';
  title: string;
  message: string;
  timestamp: number;
}

const getLevelDisplay = (level: GoalLevel) => {
  switch (level) {
    case GoalLevel.EASY: return { text: 'Difficulty: Easy', styles: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
    case GoalLevel.MEDIUM: return { text: 'Difficulty: Medium', styles: 'bg-amber-50 text-amber-600 border-amber-100' };
    case GoalLevel.HARD: return { text: 'Difficulty: Hard', styles: 'bg-rose-50 text-rose-600 border-rose-100' };
    default: return { text: 'Difficulty: Medium', styles: 'bg-slate-50 text-slate-600 border-slate-100' };
  }
};

const getPriorityDisplay = (priority: GoalPriority) => {
  switch (priority) {
    case GoalPriority.LOW: return { text: 'Priority: Low', styles: 'bg-slate-50 text-slate-500 border-slate-100' };
    case GoalPriority.MEDIUM: return { text: 'Priority: Medium', styles: 'bg-orange-50 text-orange-600 border-orange-100' };
    case GoalPriority.HIGH: return { text: 'Priority: High', styles: 'bg-rose-100 text-rose-700 border-rose-200 font-bold' };
    default: return { text: 'Priority: Medium', styles: 'bg-orange-50 text-orange-600 border-orange-100' };
  }
};

const getLevelEmoji = (level: GoalLevel) => {
  if (level === GoalLevel.EASY) return '🟢';
  if (level === GoalLevel.MEDIUM) return '🟡';
  return '🔴';
};

const getPriorityEmoji = (priority: GoalPriority) => {
  if (priority === GoalPriority.LOW) return '⏳';
  if (priority === GoalPriority.MEDIUM) return '⚡';
  return '🚨';
};

const App: React.FC = () => {
  const [userName, setUserName] = useState<string>('');
  const [userCategories, setUserCategories] = useState<string[]>(Object.values(LifeArea));
  const [archivedCategories, setArchivedCategories] = useState<string[]>([]);
  const [showWelcome, setShowWelcome] = useState<boolean>(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState<boolean | string>(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<{goal: Goal, focusSubTasks?: boolean} | undefined>(undefined);
  const [celebration, setCelebration] = useState({ active: false, title: '', message: '' });
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('Newest');
  const [activeSort, setActiveSort] = useState<{type: 'difficulty' | 'priority' | 'status' | 'area', value: any} | null>(null);
  const [areaOrder, setAreaOrder] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [dailyGreeting, setDailyGreeting] = useState<string>('Ready to make 2026 your best year?');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const strategyHeaderRef = useRef<HTMLDivElement>(null);
  const searchSectionRef = useRef<HTMLDivElement>(null);
  const analyticsSectionRef = useRef<HTMLDivElement>(null);
  const archivedSectionRef = useRef<HTMLDivElement>(null);

  const getAreaConfig = (area: string) => {
    if (AREA_UI_CONFIG[area]) return AREA_UI_CONFIG[area];
    const idx = userCategories.indexOf(area);
    const themeIdx = Math.max(0, idx) % CUSTOM_THEMES.length;
    const theme = CUSTOM_THEMES[themeIdx];
    return {
      icon: theme.icon,
      color: theme.colors,
      textColor: theme.textColor,
      lightBg: theme.lightBg,
      glassColor: theme.glassColor
    };
  };

  useEffect(() => {
    const savedProfile = localStorage.getItem('vision2026_profile');
    if (savedProfile) {
      const { name, categories, archivedCats } = JSON.parse(savedProfile);
      setUserName(name);
      setUserCategories(categories);
      setArchivedCategories(archivedCats || []);
      if (expandedAreas.size === 0 && categories.length > 0) {
        setExpandedAreas(new Set([categories[0]]));
      }
      getDailyGreeting(name).then(setDailyGreeting);
    } else {
      setShowWelcome(true);
    }

    const savedGoals = localStorage.getItem('vision2026_goals');
    if (savedGoals) {
      const parsed = JSON.parse(savedGoals);
      setGoals(parsed.map((g: any, i: number) => ({ 
        ...g, 
        order: g.order ?? i, 
        achievedMilestones: g.achievedMilestones || [],
        archived: !!g.archived,
        lastInteractionAt: g.lastInteractionAt || g.createdAt || Date.now(),
        subTasks: (g.subTasks || []).map((t: any) => ({ ...t, deleted: !!t.deleted }))
      })));
    }

    const savedAreaOrder = localStorage.getItem('vision2026_area_order');
    if (savedAreaOrder) {
      setAreaOrder(JSON.parse(savedAreaOrder));
    }
  }, []);

  useEffect(() => {
    const targetDate = new Date('2026-12-31T23:59:59').getTime();
    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = targetDate - now;
      if (diff > 0) {
        setTimeLeft({ days: Math.floor(diff / 86400000), hours: Math.floor((diff / 3600000) % 24), mins: Math.floor((diff / 60000) % 60) });
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (goals.length === 0 || showWelcome) return;
    const checkSystems = async () => {
      const now = Date.now();
      const newAlerts: AppNotification[] = [];

      goals.forEach(g => {
        if (!g.completed && !g.archived && g.deadline) {
          const daysLeft = (g.deadline - now) / 86400000;
          if (daysLeft > 0 && daysLeft <= 3) {
            newAlerts.push({
              id: `deadline-${g.id}`,
              type: 'deadline',
              title: 'Deadline approaching',
              message: `Your goal "${g.title}" ends soon. Take a small step today!`,
              timestamp: now
            });
          }
        }
      });

      const fourDaysMs = 4 * 24 * 60 * 60 * 1000;
      const neglectedGoal = goals
        .filter(g => !g.completed && !g.archived)
        .sort((a, b) => a.lastInteractionAt - b.lastInteractionAt)[0];
      
      if (neglectedGoal && (now - neglectedGoal.lastInteractionAt) > fourDaysMs) {
        const nudgeMessage = await getFriendlyNudge(neglectedGoal.title, neglectedGoal.area);
        newAlerts.push({
          id: `nudge-${neglectedGoal.id}`,
          type: 'nudge',
          title: 'A gentle nudge',
          message: nudgeMessage,
          timestamp: now
        });
      }

      if (newAlerts.length > 0) {
        setNotifications(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const fresh = newAlerts.filter(a => !existingIds.has(a.id));
          if (fresh.length > 0) {
            setActiveToast(fresh[0]);
            setTimeout(() => setActiveToast(null), 7000);
          }
          return [...fresh, ...prev];
        });
      }
    };
    const timer = setTimeout(checkSystems, 5000);
    return () => clearTimeout(timer);
  }, [goals.length, showWelcome]);

  useEffect(() => { localStorage.setItem('vision2026_goals', JSON.stringify(goals)); }, [goals]);
  useEffect(() => { 
    localStorage.setItem('vision2026_area_order', JSON.stringify(areaOrder));
    localStorage.setItem('vision2026_profile', JSON.stringify({ name: userName, categories: userCategories, archivedCats: archivedCategories }));
  }, [areaOrder, userCategories, userName, archivedCategories]);

  const handleWelcomeComplete = (name: string, categories: string[]) => {
    setUserName(name);
    setUserCategories(categories);
    setAreaOrder(categories);
    setExpandedAreas(new Set([categories[0]]));
    localStorage.setItem('vision2026_profile', JSON.stringify({ name, categories, archivedCats: [] }));
    localStorage.setItem('vision2026_area_order', JSON.stringify(categories));
    setShowWelcome(false);
    getDailyGreeting(name).then(setDailyGreeting);
  };

  const handleAddNewCategory = () => {
    if (newCategoryName.trim() && !userCategories.includes(newCategoryName.trim())) {
      const updatedCategories = [...userCategories, newCategoryName.trim()];
      setUserCategories(updatedCategories);
      setAreaOrder(prev => [...prev, newCategoryName.trim()]);
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  const toggleArea = (area: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

  const expandAllCategories = () => {
    setExpandedAreas(new Set(areaOrder));
  };

  const handleUpdateGoal = (id: string, updatedData: Partial<Goal>) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updatedData, lastInteractionAt: Date.now() } : g));
    setEditingGoal(undefined);
  };

  const handleTogglePinned = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGoals(prev => prev.map(g => g.id === id ? { ...g, pinned: !g.pinned, lastInteractionAt: Date.now() } : g));
  };

  const handleDeleteGoal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this goal? This option cannot be undone.')) {
      setGoals(prev => prev.filter(g => g.id !== id));
    }
  };

  const handleToggleArchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGoals(prev => prev.map(g => g.id === id ? { ...g, archived: !g.archived, lastInteractionAt: Date.now() } : g));
  };

  const handleArchiveCategory = (area: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Archive the entire category "${area}"?`)) {
      setUserCategories(prev => prev.filter(c => c !== area));
      setAreaOrder(prev => prev.filter(c => c !== area));
      setArchivedCategories(prev => [...prev, area]);
      setGoals(prev => prev.map(g => g.area === area ? { ...g, archived: true } : g));
    }
  };

  const handleToggleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        const nextState = !g.completed;
        const now = Date.now();
        if (nextState) {
          const phrase = ACHIEVED_PHRASES[Math.floor(Math.random() * ACHIEVED_PHRASES.length)];
          setCelebration({ active: true, title: "Victory!", message: phrase });
        }
        return { 
          ...g, 
          completed: nextState, 
          archived: nextState ? true : false, 
          completedAt: nextState ? now : undefined, 
          lastInteractionAt: now 
        };
      }
      return g;
    }));
  };

  const handleToggleSubTask = (goalId: string, subTaskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const updatedSubTasks = g.subTasks.map(t => {
          if (t.id === subTaskId) {
            const nextCompleted = !t.completed;
            const target = Math.max(1, t.targetProgress || 0);
            return { ...t, completed: nextCompleted, currentProgress: nextCompleted ? target : 0 };
          }
          return t;
        });
        return { ...g, subTasks: updatedSubTasks, lastInteractionAt: Date.now() };
      }
      return g;
    }));
  };

  const handleSubTaskProgress = (goalId: string, subTaskId: string, delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const updatedSubTasks = g.subTasks.map(t => {
          if (t.id === subTaskId) {
            const target = Math.max(1, t.targetProgress || 0);
            const nextProgress = Math.max(0, Math.min(target, t.currentProgress + delta));
            return { ...t, currentProgress: nextProgress, completed: nextProgress >= target };
          }
          return t;
        });
        return { ...g, subTasks: updatedSubTasks, lastInteractionAt: Date.now() };
      }
      return g;
    }));
  };

  const handleSyncCalendar = (goal: Goal, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!goal.deadline) return;
    const dateStr = new Date(goal.deadline).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(goal.title)}&dates=${dateStr}/${dateStr}&details=${encodeURIComponent(goal.description)}`;
    window.open(url, '_blank');
  };

  const handleAddGoal = (goalData: any) => {
    const newGoal: Goal = {
      id: crypto.randomUUID(), ...goalData,
      order: goals.length, achievedMilestones: [], completed: false, createdAt: Date.now(),
      lastInteractionAt: Date.now(),
      archived: false,
      subTasks: (goalData.subTasks || []).map((t: any) => ({ 
        id: crypto.randomUUID(), 
        ...t, 
        completed: t.targetProgress > 0 ? (t.currentProgress >= t.targetProgress) : !!t.completed, 
        currentProgress: t.currentProgress || 0,
        deleted: false
      }))
    };
    setGoals(prev => [newGoal, ...prev]);
    setShowForm(false);
  };

  const scrollToStrategy = () => strategyHeaderRef.current?.scrollIntoView({ behavior: 'smooth' });
  const scrollToSearch = () => {
    searchSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
        const input = searchSectionRef.current?.querySelector('input');
        if (input) (input as HTMLInputElement).focus();
    }, 500);
  };
  const scrollToAnalytics = () => analyticsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  const scrollToArchived = () => {
    setShowArchived(true);
    setTimeout(() => archivedSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSortOrFilterAction = (action: () => void) => {
    expandAllCategories();
    action();
    scrollToStrategy();
  };

  const handleDifficultyClick = (level: GoalLevel) => handleSortOrFilterAction(() => setActiveSort({ type: 'difficulty', value: level }));
  const handleDashboardAreaClick = (area: LifeArea) => handleSortOrFilterAction(() => { setActiveSort({ type: 'area', value: area }); setExpandedAreas(prev => new Set(prev).add(area)); });
  const handleStatusClick = (status: 'Completed' | 'Active') => handleSortOrFilterAction(() => setActiveSort({ type: 'status', value: status }));
  const handlePriorityClick = (priority: GoalPriority) => handleSortOrFilterAction(() => setActiveSort({ type: 'priority', value: priority }));
  const handleResetFilters = () => handleSortOrFilterAction(() => { setActiveSort(null); setSortBy('Newest'); setSearchQuery(''); });

  const activeGoalsByArea = useMemo(() => {
    const grouped: Record<string, Goal[]> = areaOrder.reduce((acc, area) => ({ ...acc, [area]: [] }), {} as Record<string, Goal[]>);
    goals.filter(g => !g.archived).forEach(goal => {
      if (!searchQuery || goal.title.toLowerCase().includes(searchQuery.toLowerCase()) || goal.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
        if (grouped[goal.area]) grouped[goal.area].push(goal);
      }
    });

    const priorityScore = (p: GoalPriority) => p === GoalPriority.HIGH ? 3 : p === GoalPriority.MEDIUM ? 2 : 1;
    const difficultyScore = (d: GoalLevel) => d === GoalLevel.HARD ? 3 : d === GoalLevel.MEDIUM ? 2 : 1;

    Object.keys(grouped).forEach(area => {
      grouped[area].sort((a, b) => {
        if (activeSort) {
          let matchA = false, matchB = false;
          if (activeSort.type === 'difficulty') { matchA = a.level === activeSort.value; matchB = b.level === activeSort.value; }
          else if (activeSort.type === 'priority') { matchA = a.priority === activeSort.value; matchB = b.priority === activeSort.value; }
          else if (activeSort.type === 'status') { matchA = a.completed === (activeSort.value === 'Completed'); matchB = b.completed === (activeSort.value === 'Completed'); }
          else if (activeSort.type === 'area') { matchA = a.area === activeSort.value; matchB = b.area === activeSort.value; }
          if (matchA !== matchB) return matchA ? -1 : 1;
        }
        if (sortBy === 'Newest') return b.createdAt - a.createdAt;
        if (sortBy === 'Priority') return priorityScore(b.priority) - priorityScore(a.priority);
        if (sortBy === 'Difficulty') return difficultyScore(b.level) - difficultyScore(a.level);
        if (sortBy === 'Deadline') return (a.deadline || Infinity) - (b.deadline || Infinity);
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return a.order - b.order;
      });
    });
    return grouped;
  }, [goals, searchQuery, activeSort, sortBy, areaOrder]);

  const archivedGoals = useMemo(() => goals.filter(g => g.archived).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)), [goals]);

  const { activeCount, completedCountGlobal } = useMemo(() => {
    const countActive = goals.filter(g => !g.archived && !g.completed).length;
    const countCompleted = goals.filter(g => g.completed).length;
    return { activeCount: countActive, completedCountGlobal: countCompleted };
  }, [goals]);

  const renderGoalCard = (goal: Goal) => {
    const config = getAreaConfig(goal.area);
    const activeSubTasks = goal.subTasks.filter(t => !t.deleted);
    const totalTarget = activeSubTasks.reduce((acc, t) => acc + Math.max(1, t.targetProgress || 0), 0);
    const totalCurrent = activeSubTasks.reduce((acc, t) => acc + (t.currentProgress || 0), 0);
    const completedCount = activeSubTasks.filter(t => t.completed).length;
    
    let progressPct = 0;
    if (goal.completed) {
      progressPct = 100;
    } else if (totalTarget > 0) {
      const completionRatio = totalCurrent / totalTarget;
      if (!goal.deadline) {
        progressPct = Math.round(completionRatio * 100);
      } else {
        const now = Date.now();
        const start = goal.createdAt;
        const end = goal.deadline;
        const totalDuration = Math.max(1, end - start);
        const elapsed = Math.max(1, now - start);
        const timeRatio = Math.max(0.0001, Math.min(1, elapsed / totalDuration));
        progressPct = Math.round((completionRatio / timeRatio) * 100);
      }
    }
    const cappedProgressPct = Math.min(100, progressPct);
    const daysLeft = goal.deadline ? Math.ceil((goal.deadline - Date.now()) / (1000 * 60 * 60 * 24)) : null;

    return (
      <div 
        key={goal.id} 
        onClick={() => !goal.completed && setEditingGoal({goal})} 
        className={`flex-shrink-0 w-[88vw] md:w-[450px] max-w-full snap-center border-2 p-10 rounded-[3.5rem] shadow-sm hover:shadow-md transition-all group/card relative overflow-hidden flex flex-col cursor-pointer ${goal.completed ? 'bg-[#fafafa] border-slate-200' : 'bg-white border-slate-100'} ${goal.pinned && !goal.archived ? 'border-amber-400 ring-4 ring-amber-50 shadow-amber-100' : ''}`}
      >
        {goal.completed && (
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-orange-100/30 rounded-full flex items-center justify-center blur-3xl z-0"></div>
        )}

        <div className="flex items-start justify-between mb-8 relative z-10">
          <div className="flex flex-col gap-2">
            {goal.completed ? (
              <span className="px-4 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit shadow-lg shadow-black/10">
                <span className="text-sm">🏆</span> Achieved
              </span>
            ) : (
              <>
                <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold border w-fit ${getLevelDisplay(goal.level).styles}`}>{getLevelDisplay(goal.level).text}</span>
                <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold border w-fit ${getPriorityDisplay(goal.priority).styles}`}>{getPriorityDisplay(goal.priority).text}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!goal.completed && <button onClick={(e) => handleTogglePinned(goal.id, e)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${goal.pinned ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-300 hover:text-amber-500'} cursor-pointer`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={goal.pinned ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg></button>}
            <button onClick={(e) => handleToggleArchive(goal.id, e)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${goal.archived ? 'bg-orange-600 text-white' : 'bg-slate-50 text-slate-300 hover:text-orange-600'} cursor-pointer`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg></button>
            <button onClick={(e) => handleDeleteGoal(goal.id, e)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
          </div>
        </div>

        <div className="space-y-6 relative z-10 flex-1">
          <h5 className={`text-3xl font-black tracking-tight leading-tight ${goal.completed ? 'text-slate-900' : 'text-slate-800'}`}>{goal.title}</h5>
          
          {goal.completed ? (
            <div className="space-y-4 pt-2">
              <div className="p-6 bg-white border border-slate-100 rounded-[2.5rem] space-y-3 shadow-sm border-t-4 border-t-orange-400">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Victory Milestone</span>
                  <span className="text-orange-600">Level Mastered</span>
                </div>
                <p className="text-[14px] font-bold text-slate-800">Done on {goal.completedAt ? new Date(goal.completedAt).toLocaleDateString() : 'N/A'}</p>
              </div>
              {goal.description && <p className="text-[14px] text-slate-500 leading-relaxed font-medium italic border-l-4 border-slate-100 pl-4 py-1">"{goal.description}"</p>}
            </div>
          ) : (
            <>
              {goal.description && <p className="text-[15px] text-slate-500 leading-relaxed font-medium break-words">{goal.description}</p>}
              <div className="pt-2 flex flex-wrap gap-2">
                {goal.deadline && <div onClick={(e) => handleSyncCalendar(goal, e)} className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-full px-4 py-2 cursor-pointer hover:bg-orange-100 transition-colors"><span className="text-[11px]">📅</span><span className="text-[11px] font-bold text-orange-700 tracking-tight">{new Date(goal.deadline).toLocaleDateString()}{!goal.completed && !goal.archived && daysLeft !== null && <span className="ml-1 opacity-70">({daysLeft}d left)</span>}</span></div>}
                {goal.estimatedCost > 0 && <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-2"><span className="text-[11px]">💰</span><span className="text-[11px] font-bold text-emerald-700 tracking-tight">€{goal.estimatedCost.toLocaleString()}</span></div>}
              </div>
            </>
          )}

          {!goal.completed && activeSubTasks.length > 0 && <div className="pt-6 space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-[10px] font-black text-slate-400 tracking-tight uppercase">Goal Steps</div>
              <div className="text-[10px] font-medium text-orange-500 bg-orange-50 px-3 py-1 rounded-full">{completedCount}/{activeSubTasks.length} done</div>
            </div>
            <div className="space-y-3">
              {activeSubTasks.map(task => {
                return (
                  <div 
                    key={task.id} 
                    className={`flex flex-col gap-2 p-3 bg-slate-50/30 rounded-2xl transition-all border border-transparent relative overflow-hidden ${task.deleted ? 'opacity-40 line-through grayscale' : ''}`}
                  >
                    <div className="flex items-center justify-between group/step relative z-10">
                      <div className="flex items-start gap-3 flex-1 mr-4">
                        <div className={`mt-1.5 flex-shrink-0 w-2.5 h-2.5 rounded-full border-2 ${task.completed ? 'bg-orange-500 border-orange-500' : 'border-slate-200'}`}></div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[14px] font-bold tracking-tight ${task.completed ? 'text-slate-300 line-through' : 'text-slate-700'}`}>{task.text}</span>
                            <div className="flex gap-1">
                              {task.level && <span className="text-[10px] bg-white/70 px-1 rounded border border-black/5 flex items-center justify-center h-5 w-5">{getLevelEmoji(task.level)}</span>}
                              {task.priority && <span className="text-[10px] bg-white/70 px-1 rounded border border-black/5 flex items-center justify-center h-5 w-5">{getPriorityEmoji(task.priority)}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                      {!goal.completed && !goal.archived && !task.deleted && (
                        <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-xl border border-slate-100 shadow-sm" onClick={e => e.stopPropagation()}>
                          {(task.targetProgress || 0) <= 1 ? (
                            <button onClick={e => handleToggleSubTask(goal.id, task.id, e)} className={`w-6 h-6 rounded-md flex items-center justify-center transition-all border ${task.completed ? 'bg-orange-600 border-orange-600 text-white' : 'bg-slate-50 border-slate-200 text-transparent'} cursor-pointer`}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </button>
                          ) : (
                            <>
                              <button onClick={e => handleSubTaskProgress(goal.id, task.id, -1, e)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-400 font-bold text-sm cursor-pointer">-</button>
                              <span className="text-[12px] font-medium text-slate-700 min-w-[24px] text-center">{task.currentProgress}/{task.targetProgress}</span>
                              <button onClick={e => handleSubTaskProgress(goal.id, task.id, 1, e)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-400 font-bold text-sm cursor-pointer">+</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="px-2 mt-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setEditingGoal({ goal, focusSubTasks: true }); }}
                  className="text-[10px] font-bold text-slate-400 hover:text-orange-600 transition-colors cursor-pointer"
                >
                  add extra step
                </button>
              </div>
            </div>
          </div>}
        </div>

        <div className="mt-10 space-y-6 relative z-10">
          {goal.completed ? (
            <button onClick={e => handleToggleComplete(goal.id, e)} className={`w-full py-5 ${BUTTON_STYLE} bg-slate-900 text-white shadow-xl hover:bg-orange-600`}>
              Reactivate Goal
            </button>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-black text-slate-400 tracking-tight uppercase">
                  <span>Execution</span>
                  <span>{cappedProgressPct}%</span>
                </div>
                <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-black/5 p-0.5">
                  <div className={`h-full ${config.color} transition-all duration-700 shadow-sm rounded-full`} style={{ width: `${cappedProgressPct}%` }}></div>
                </div>
              </div>
              <button onClick={e => handleToggleComplete(goal.id, e)} className={`w-full py-5 ${BUTTON_STYLE} bg-slate-900 text-white shadow-xl shadow-orange-100/50 hover:bg-orange-600`}>
                Achieve the goal
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  if (showWelcome) return <WelcomeScreen onComplete={handleWelcomeComplete} />;

  return (
    <div className="min-h-screen pb-32 bg-white text-[#1a1a1a] antialiased relative">
      <Fireworks active={celebration.active} title={celebration.title} message={celebration.message} onComplete={() => setCelebration(p => ({ ...p, active: false }))} />
      
      {/* Push Notification Toast */}
      {activeToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[500] w-[90vw] max-w-md animate-fade-in pointer-events-none">
          <div className="bg-white/90 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-orange-100 shadow-[0_20px_60px_rgba(0,0,0,0.1)] flex items-center gap-5 pointer-events-auto ring-4 ring-orange-50/50">
            <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center text-2xl shadow-sm ${activeToast.type === 'deadline' ? 'bg-rose-50 text-rose-600' : 'bg-orange-50 text-orange-600'}`}>
              {activeToast.type === 'deadline' ? '📅' : '✨'}
            </div>
            <div className="flex-1">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{activeToast.title}</h4>
              <p className="text-[13px] font-bold text-slate-800 leading-snug">{activeToast.message}</p>
            </div>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveToast(null); }} 
              className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all pointer-events-auto cursor-pointer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-[300] bg-white/70 backdrop-blur-xl border-t border-black/5 shadow-[0_-8px_32px_0_rgba(0,0,0,0.05)]">
        <div className="max-w-xl mx-auto py-3 px-6 flex items-center justify-around">
          <button onClick={scrollToSearch} className="flex flex-col items-center gap-1 transition-all active:scale-90 text-slate-500 hover:text-orange-600 cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center border border-black/5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <span className="text-[9px] font-bold">Search</span>
          </button>
          <button onClick={() => setIsChatOpen(!isChatOpen)} className={`flex flex-col items-center gap-1 transition-all active:scale-90 cursor-pointer ${isChatOpen ? 'text-orange-600' : 'text-slate-500 hover:text-orange-600'}`}>
            <div className={`w-9 h-9 rounded-xl ${isChatOpen ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-black/5'} flex items-center justify-center border`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="text-[9px] font-bold">AI Assistant</span>
          </button>
          <button onClick={() => setShowForm(true)} className="flex flex-col items-center gap-1 transition-all active:scale-95 group cursor-pointer">
            <div className="w-11 h-11 rounded-[1.2rem] bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-600/20 group-hover:bg-orange-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            </div>
            <span className="text-[9px] font-bold text-orange-600">Goal</span>
          </button>
          <button onClick={scrollToAnalytics} className="flex flex-col items-center gap-1 transition-all active:scale-90 text-slate-500 hover:text-orange-600 cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center border border-black/5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <span className="text-[9px] font-bold">Stats</span>
          </button>
          <button onClick={scrollToArchived} className="flex flex-col items-center gap-1 transition-all active:scale-90 text-slate-500 hover:text-orange-600 cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center border border-black/5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
            </div>
            <span className="text-[9px] font-bold">Achieved</span>
          </button>
        </div>
      </div>

      <nav className="fixed top-0 left-0 right-0 z-[150] bg-white/70 backdrop-blur-xl border-b border-black/5 px-6 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="text-lg font-bold tracking-tight text-black">Goalflow</div>
          <div className="relative">
            <button onClick={() => setShowNotifications(!showNotifications)} className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 relative transition-all cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {notifications.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-orange-600 rounded-full ring-2 ring-white"></span>}
            </button>
            {showNotifications && (
              <div className={`absolute right-0 mt-3 w-80 max-h-[400px] overflow-y-auto p-4 rounded-[2.5rem] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 z-[400] animate-fade-in`}>
                <div className="flex justify-between items-center mb-4 px-2">
                  <h4 className="text-[10px] font-bold text-slate-400 tracking-tight">Notifications</h4>
                  <button onClick={() => setNotifications([])} className="text-[10px] font-bold text-orange-600 hover:text-orange-700 transition-colors tracking-tight cursor-pointer">Clear all</button>
                </div>
                <div className="space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-10 font-medium italic">Your inbox is clear!</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all space-y-1">
                        <div className="flex justify-between items-start">
                          <h5 className="text-[11px] font-bold text-slate-800">{n.title}</h5>
                          <span className="text-[8px] font-bold text-slate-300 tracking-tight">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="pt-20 px-6 max-w-xl mx-auto space-y-8">
        <header className="space-y-6">
          <div className="pt-10 space-y-2 text-center flex flex-col items-center">
            <h1 className="text-6xl font-bold tracking-tight text-black leading-none">Hi {userName}</h1>
            <p className="text-xl font-medium text-slate-500 tracking-tight leading-snug">{dailyGreeting}</p>
          </div>
          <div className="w-full bg-slate-50 rounded-[2.5rem] p-8 border border-black/5 relative overflow-hidden">
            <div className="relative z-10 flex flex-row justify-between items-center px-4">
              <div className="flex flex-col items-center"><span className="text-4xl font-bold text-black">{timeLeft.days}</span><span className="text-[10px] font-bold tracking-tight text-slate-400 mt-2">Days</span></div>
              <div className="h-8 w-px bg-black/5"></div>
              <div className="flex flex-col items-center"><span className="text-4xl font-bold text-black">{timeLeft.hours}</span><span className="text-[10px] font-bold tracking-tight text-slate-400 mt-2">Hours</span></div>
              <div className="h-8 w-px bg-black/5"></div>
              <div className="flex flex-col items-center"><span className="text-4xl font-bold text-black">{timeLeft.mins}</span><span className="text-[10px] font-bold tracking-tight text-slate-400 mt-2">Mins</span></div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div onClick={scrollToStrategy} className="bg-slate-50 rounded-[1.8rem] p-5 border border-black/5 flex flex-col items-center justify-center space-y-1 cursor-pointer hover:bg-slate-100 transition-all active:scale-95 group">
              <span className="text-3xl font-bold text-black group-hover:text-orange-600 transition-colors">{activeCount}</span>
              <span className="text-[9px] font-bold tracking-tight text-slate-400">Active Goals</span>
            </div>
            <div onClick={scrollToArchived} className="bg-slate-50 rounded-[1.8rem] p-5 border border-black/5 flex flex-col items-center justify-center space-y-1 cursor-pointer hover:bg-slate-100 transition-all active:scale-95 group">
              <span className="text-3xl font-bold text-orange-600 group-hover:text-orange-700 transition-colors">{completedCountGlobal}</span>
              <span className="text-[9px] font-bold tracking-tight text-slate-400">Achieved goals</span>
            </div>
          </div>
        </header>

        <section className="space-y-4 pt-4" ref={searchSectionRef}>
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex justify-between items-center px-1"><h3 className="text-[10px] font-bold text-slate-400 tracking-tight">Find your vision</h3></div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none"><svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
                <input type="text" placeholder="Search goals..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-[1.5rem] py-4 pl-14 pr-6 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-orange-500/5 transition-all" />
              </div>
              <div className="flex bg-slate-50 border border-slate-100 rounded-[1.5rem] p-1.5 overflow-x-auto no-scrollbar gap-1">
                {(['Newest', 'Priority', 'Difficulty', 'Deadline', 'Reset'] as SortOption[]).map((option) => (
                  <button 
                    key={option} 
                    onClick={() => option === 'Reset' ? handleResetFilters() : handleSortOrFilterAction(() => setSortBy(option))} 
                    className={`px-4 py-2 rounded-xl text-[9px] font-bold transition-all whitespace-nowrap cursor-pointer ${sortBy === option ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {option === 'Reset' ? 'Reset all' : option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4" ref={strategyHeaderRef}>
            {areaOrder.map((area) => {
              const areaGoals = activeGoalsByArea[area] || [];
              const config = getAreaConfig(area);
              const isExpanded = expandedAreas.has(area);
              const completedCount = areaGoals.filter(g => g.completed).length;
              const inProgressCount = areaGoals.filter(g => !g.completed && g.subTasks.some(t => (t.completed || t.currentProgress > 0) && !t.deleted)).length;
              const activeCountTotal = areaGoals.length - completedCount;
              const inProgressPct = areaGoals.length > 0 ? (inProgressCount / areaGoals.length) * 100 : 0;

              return (
                <div key={area} className="group overflow-hidden transition-all duration-300 relative">
                  <button 
                    onClick={() => toggleArea(area)} 
                    className={`w-full flex flex-col p-6 rounded-[2.5rem] transition-all duration-300 border border-black/5 relative z-10 shadow-sm cursor-pointer ${isExpanded ? `${config.glassColor} backdrop-blur-3xl border-white/40 shadow-xl scale-[1.01]` : config.lightBg}`}
                  >
                    <div className="w-full flex items-center justify-between mb-1">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-white/30 flex items-center justify-center text-xl shadow-sm">{config.icon}</div>
                        <div className="text-left">
                          <h4 className={`text-lg font-bold tracking-tight ${isExpanded ? 'text-slate-900' : config.textColor}`}>{area}</h4>
                          <p className={`text-[10px] font-bold tracking-tight ${isExpanded ? 'text-slate-500' : 'text-slate-400'}`}>
                            Goals: {activeCountTotal} · Progress: {inProgressCount} · Done: {completedCount}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => handleArchiveCategory(area, e)} className={`w-8 h-8 rounded-2xl flex items-center justify-center transition-all bg-black/5 text-slate-400 hover:text-orange-600 cursor-pointer`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                        </button>
                        <div className={`w-8 h-8 rounded-2xl flex items-center justify-center transition-transform duration-500 ${isExpanded ? 'bg-white/40 rotate-180 text-slate-700' : 'bg-black/5 text-slate-400'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                    </div>
                    {inProgressCount > 0 && <div className="w-full mt-3 flex items-center gap-3"><div className={`h-1 flex-1 rounded-full bg-white/30 overflow-hidden`}><div className={`h-full bg-slate-800 rounded-full transition-all duration-700`} style={{ width: `${inProgressPct}%` }}></div></div><span className={`text-[8px] font-bold tracking-tight ${isExpanded ? 'text-slate-900' : config.textColor}`}>{Math.round(inProgressPct)}% active</span></div>}
                  </button>
                  <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                    {areaGoals.length > 0 ? (
                      <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory px-2 pb-10 items-start">
                        {areaGoals.map(goal => renderGoalCard(goal))}
                        <button onClick={() => setShowForm(area)} className="flex-shrink-0 w-[200px] snap-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 text-slate-300 hover:text-orange-600 transition-all min-h-[300px] cursor-pointer">
                          <span className="text-4xl">+</span>
                          <span className="text-[10px] font-bold">New Goal</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-10 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200 mx-2 mb-6 flex flex-col items-center justify-center min-h-[250px]">
                        <p className="text-[10px] font-bold text-slate-300 tracking-tight mb-4">Oops, No active goals here</p>
                        <button onClick={() => setShowForm(area)} className={`px-8 py-3 bg-white border border-slate-200 ${BUTTON_STYLE} text-slate-500 hover:text-orange-600 shadow-sm`}>
                          Add goal
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            <div className="pt-2 px-2 flex justify-center">
              {!showAddCategory ? (
                <button 
                  onClick={() => setShowAddCategory(true)} 
                  className="text-slate-400 hover:text-orange-600 transition-all font-bold text-[11px] tracking-tight flex items-center gap-3 px-6 py-4 group cursor-pointer"
                >
                  <span className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-sm font-light transition-colors group-hover:bg-orange-50 group-hover:border-orange-200 group-hover:text-orange-600">+</span>
                  Add new focus area
                </button>
              ) : (
                <div className="w-full p-6 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl animate-fade-in space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <h4 className="text-[10px] font-bold tracking-tight text-slate-400 uppercase">New Area Name</h4>
                    <button onClick={() => setShowAddCategory(false)} className="text-slate-300 hover:text-rose-500 transition-colors text-2xl cursor-pointer">&times;</button>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      autoFocus 
                      type="text" 
                      value={newCategoryName} 
                      onChange={(e) => setNewCategoryName(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNewCategory()} 
                      placeholder="e.g. Finance, Hobbies, Skills..." 
                      className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-6 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-orange-500/5 transition-all" 
                    />
                    <button 
                      onClick={handleAddNewCategory} 
                      disabled={!newCategoryName.trim()} 
                      className={`bg-slate-900 text-white px-6 ${BUTTON_STYLE} disabled:opacity-30`}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <div ref={analyticsSectionRef}>
          <Dashboard goals={goals.filter(g => !g.archived)} onDifficultyClick={handleDifficultyClick} onAreaClick={handleDashboardAreaClick} onStatusClick={handleStatusClick} onPriorityClick={handlePriorityClick} />
        </div>

        <section className="pt-12 border-t border-slate-100" ref={archivedSectionRef}>
          <button onClick={() => setShowArchived(!showArchived)} className="w-full py-6 flex items-center justify-between bg-slate-50 rounded-[2.5rem] px-8 hover:bg-slate-100 transition-all cursor-pointer">
            <div className="flex items-center gap-4">
              <span className="text-xl">🏆</span>
              <div className="text-left">
                <h3 className="text-lg font-bold text-slate-800">Achieved goals</h3>
                <p className="text-[10px] font-bold text-slate-400 tracking-tight">{archivedGoals.length} mission victories</p>
              </div>
            </div>
            <div className={`w-8 h-8 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 transition-transform duration-500 ${showArchived ? 'rotate-180' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </button>
          {showArchived && <div className="mt-8">{archivedGoals.length > 0 ? <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory px-2 pb-10 items-start">{archivedGoals.map(goal => renderGoalCard(goal))}</div> : <div className="p-16 text-center bg-slate-50/50 rounded-[3rem] italic text-slate-400 text-sm font-medium">Your achievement wall is waiting for its first trophy.</div>}</div>}
        </section>
      </div>

      <ChatAssistant goals={goals.filter(g => !g.archived)} isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
      
      {(showForm || editingGoal) && <GoalForm onAdd={handleAddGoal} onUpdate={handleUpdateGoal} onClose={() => { setShowForm(false); setEditingGoal(undefined); }} initialData={editingGoal ? editingGoal.goal : (typeof showForm === 'string' ? { area: showForm } as any : undefined)} autoFocusSubTasks={editingGoal?.focusSubTasks} categories={userCategories} />}
    </div>
  );
};

export default App;