import React, { useState, useEffect, useMemo } from 'react';
import { ViewType, Task, Dedication, Keyword, Routine, ThemeConfig, PriorityLevel, PlanTimeframe, TimeSavedStats, TimeSavedRecord } from './types';
import { 
  INITIAL_TASKS, 
  INITIAL_COMPLETED_TASKS, 
  INITIAL_DEDICATIONS, 
  INITIAL_KEYWORDS, 
  INITIAL_ROUTINES, 
  THEMES,
  DEFAULT_PRIORITY_COLORS,
  GUIDE_STEPS 
} from './data/initialData';
import { Header } from './components/Header';
import { NavigationDrawer } from './components/NavigationDrawer';
import { InteractiveGuide } from './components/InteractiveGuide';
import { DailyPlanView } from './components/DailyPlanView';
import { PrioritiesView } from './components/PrioritiesView';
import { DedicationsView } from './components/DedicationsView';
import { KeywordsView } from './components/KeywordsView';
import { RoutinesView } from './components/RoutinesView';
import { FlowView } from './components/FlowView';
import { AllDoneView } from './components/AllDoneView';
import { WidgetView } from './components/WidgetView';
import { SettingsView } from './components/SettingsView';
import { FloatingBubbles, BubbleDensity } from './components/FloatingBubbles';
import { DeleteRepeatTaskModal } from './components/DeleteRepeatTaskModal';
import { formatLocalDateToIso } from './utils/time';
import { 
  generateRecurringInstances, 
  isRepeatingTask, 
  getFollowingRepeatTasks 
} from './utils/recurringTasks';

export default function App() {
  // Navigation & View
  const [currentView, setCurrentView] = useState<ViewType>('daily-plan');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [planTimeframe, setPlanTimeframe] = useState<PlanTimeframe>('Day');
  const [monthYearLabel, setMonthYearLabel] = useState<string>(() => {
    const d = new Date();
    const MONTH_NAMES = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  });

  const weekDateLabel = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const startM = start.toLocaleDateString('en-US', { month: 'short' });
    const endM = end.toLocaleDateString('en-US', { month: 'short' });
    if (startM === endM) {
      return `${startM} ${start.getDate()} – ${end.getDate()}`;
    }
    return `${startM} ${start.getDate()} – ${endM} ${end.getDate()}`;
  }, []);

  // Guide state: only show automatically on the first visit, then replay via the top-right star
  const [isGuideActive, setIsGuideActive] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const seen = localStorage.getItem('priorities_tutorial_seen');
    return !seen;
  });
  const [guideStepIndex, setGuideStepIndex] = useState<number>(0);

  // Clear out any previous mock seed data so all menus start completely empty by default
  const CLEAN_MIGRATION_KEY = 'priorities_clean_v4';
  if (typeof window !== 'undefined' && localStorage.getItem(CLEAN_MIGRATION_KEY) !== 'true') {
    // If stored tasks/dedications contain the initial sample IDs, clear them
    const existingTasksStr = localStorage.getItem('priorities_tasks');
    if (!existingTasksStr || existingTasksStr.includes('task-1') || existingTasksStr.includes('task-2') || existingTasksStr.includes('Shower')) {
      localStorage.removeItem('priorities_tasks');
    }
    const existingCompStr = localStorage.getItem('priorities_completed');
    if (!existingCompStr || existingCompStr.includes('completed-1') || existingCompStr.includes('Taxes')) {
      localStorage.removeItem('priorities_completed');
    }
    const existingDedStr = localStorage.getItem('priorities_dedications');
    if (!existingDedStr || existingDedStr.includes('ded-1') || existingDedStr.includes('Health & Fitness')) {
      localStorage.removeItem('priorities_dedications');
    }
    const existingKwStr = localStorage.getItem('priorities_keywords');
    if (!existingKwStr || existingKwStr.includes('kw-1') || existingKwStr.includes('Brush Teeth') || existingKwStr.includes('Shower')) {
      localStorage.removeItem('priorities_keywords');
    }
    const existingRtStr = localStorage.getItem('priorities_routines');
    if (!existingRtStr || existingRtStr.includes('rt-1') || existingRtStr.includes('Morning Routine')) {
      localStorage.removeItem('priorities_routines');
    }
    localStorage.setItem(CLEAN_MIGRATION_KEY, 'true');
  }

  // App State with local persistence (clean defaults: empty arrays)
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('priorities_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [completedTasks, setCompletedTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('priorities_completed');
    return saved ? JSON.parse(saved) : INITIAL_COMPLETED_TASKS;
  });

  const [dedications, setDedications] = useState<Dedication[]>(() => {
    const saved = localStorage.getItem('priorities_dedications');
    return saved ? JSON.parse(saved) : INITIAL_DEDICATIONS;
  });

  const [keywords, setKeywords] = useState<Keyword[]>(() => {
    const saved = localStorage.getItem('priorities_keywords');
    return saved ? JSON.parse(saved) : INITIAL_KEYWORDS;
  });

  const [routines, setRoutines] = useState<Routine[]>(() => {
    const saved = localStorage.getItem('priorities_routines');
    return saved ? JSON.parse(saved) : INITIAL_ROUTINES;
  });

  const [savedThemes, setSavedThemes] = useState<ThemeConfig[]>(() => {
    try {
      const saved = localStorage.getItem('priorities_saved_themes');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return THEMES;
  });

  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(() => {
    try {
      const saved = localStorage.getItem('priorities_theme');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.priorityColors) {
          parsed.priorityColors = DEFAULT_PRIORITY_COLORS;
        }
        return parsed;
      }
    } catch {}
    return THEMES[0];
  });

  const handleSaveCustomTheme = (theme: ThemeConfig) => {
    setSavedThemes(prev => {
      const filtered = prev.filter(t => t.id !== theme.id);
      const updated = [...filtered, theme];
      try {
        localStorage.setItem('priorities_saved_themes', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setCurrentTheme(theme);
  };

  const handleDeleteCustomTheme = (themeId: string) => {
    setSavedThemes(prev => {
      const updated = prev.filter(t => t.id !== themeId);
      try {
        localStorage.setItem('priorities_saved_themes', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (currentTheme.id === themeId) {
      setCurrentTheme(THEMES[0]);
    }
  };

  // Time Saved Tracking (Tracked on Settings tab)
  const [timeSavedStats, setTimeSavedStats] = useState<TimeSavedStats>(() => {
    try {
      const saved = localStorage.getItem('priorities_time_saved_stats');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      totalSecondsSaved: 0,
      tasksCompletedEarlyCount: 0,
      history: [],
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('priorities_time_saved_stats', JSON.stringify(timeSavedStats));
    } catch {}
  }, [timeSavedStats]);

  const handleRecordTimeSaved = (record: { taskId: string; taskTitle: string; secondsSaved: number }) => {
    if (record.secondsSaved <= 0) return;
    setTimeSavedStats(prev => {
      const newRecord: TimeSavedRecord = {
        id: `saved-${Date.now()}`,
        taskId: record.taskId,
        taskTitle: record.taskTitle,
        secondsSaved: record.secondsSaved,
        completedAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      };
      return {
        totalSecondsSaved: prev.totalSecondsSaved + record.secondsSaved,
        tasksCompletedEarlyCount: prev.tasksCompletedEarlyCount + 1,
        history: [newRecord, ...prev.history.slice(0, 49)],
      };
    });
  };

  const handleResetTimeSaved = () => {
    setTimeSavedStats({
      totalSecondsSaved: 0,
      tasksCompletedEarlyCount: 0,
      history: [],
    });
  };

  // Bubbles state & settings (mindful floating pop bubbles)
  const [bubblesEnabled, setBubblesEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('priorities_bubbles_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [bubbleDensity, setBubbleDensity] = useState<BubbleDensity>(() => {
    const saved = localStorage.getItem('priorities_bubble_density');
    return (saved as BubbleDensity) || 'normal';
  });

  const [bubblesPoppedCount, setBubblesPoppedCount] = useState<number>(() => {
    const saved = localStorage.getItem('priorities_bubble_pop_count');
    return saved ? parseInt(saved, 10) : 0;
  });

  const handleToggleBubbles = (enabled: boolean) => {
    setBubblesEnabled(enabled);
    try {
      localStorage.setItem('priorities_bubbles_enabled', String(enabled));
    } catch {}
  };

  const handleSelectBubbleDensity = (density: BubbleDensity) => {
    setBubbleDensity(density);
    try {
      localStorage.setItem('priorities_bubble_density', density);
    } catch {}
  };

  const handleBubblePopped = (count: number) => {
    setBubblesPoppedCount(count);
  };

  // Active task for Flow timer
  const [activeFlowTaskId, setActiveFlowTaskId] = useState<string | null>('task-1');

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('priorities_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('priorities_completed', JSON.stringify(completedTasks));
  }, [completedTasks]);

  useEffect(() => {
    localStorage.setItem('priorities_dedications', JSON.stringify(dedications));
  }, [dedications]);

  useEffect(() => {
    localStorage.setItem('priorities_keywords', JSON.stringify(keywords));
  }, [keywords]);

  useEffect(() => {
    localStorage.setItem('priorities_routines', JSON.stringify(routines));
  }, [routines]);

  useEffect(() => {
    localStorage.setItem('priorities_theme', JSON.stringify(currentTheme));
  }, [currentTheme]);

  // Task Actions
  const handleToggleCompleteTask = (taskId: string, timeSavedSeconds?: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.completed) {
      // Record time saved if completed early
      if (typeof timeSavedSeconds === 'number' && timeSavedSeconds > 0) {
        handleRecordTimeSaved({
          taskId,
          taskTitle: task.title,
          secondsSaved: timeSavedSeconds,
        });
      }

      // Mark completed & add to All Done
      const updatedTask: Task = {
        ...task,
        completed: true,
        completedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };

      setTasks(prev => prev.filter(t => t.id !== taskId));
      setCompletedTasks(prev => [updatedTask, ...prev]);

      // Automatically advance activeFlowTaskId to the next task of the routine
      const remainingTasks = tasks.filter(t => t.id !== taskId && !t.completed);
      const nextInRoutine = task.routineId 
        ? remainingTasks.find(t => t.routineId === task.routineId) 
        : remainingTasks[0];
      if (nextInRoutine) {
        setActiveFlowTaskId(nextInRoutine.id);
      }

      // Award dedication points: 1 point * multiplier (default 1)
      if (task.dedicationId) {
        setDedications(prev => prev.map(d => {
          if (d.id === task.dedicationId) {
            const mult = typeof d.pointMultiplier === 'number' && !isNaN(d.pointMultiplier) ? d.pointMultiplier : 1;
            const pointsToAdd = Math.round(1 * mult * 10) / 10;
            return { ...d, score: (d.score || 0) + pointsToAdd };
          }
          return d;
        }));
      }
    }
  };

  const handleUndoComplete = (taskId: string) => {
    const task = completedTasks.find(t => t.id === taskId);
    if (!task) return;

    const restoredTask: Task = {
      ...task,
      completed: false,
      completedAt: undefined,
    };

    setCompletedTasks(prev => prev.filter(t => t.id !== taskId));
    setTasks(prev => [...prev, restoredTask]);

    // Reverse dedication points: 1 point * multiplier (default 1)
    if (task.dedicationId) {
      setDedications(prev => prev.map(d => {
        if (d.id === task.dedicationId) {
          const mult = typeof d.pointMultiplier === 'number' && !isNaN(d.pointMultiplier) ? d.pointMultiplier : 1;
          const pointsToDeduct = Math.round(1 * mult * 10) / 10;
          return { ...d, score: Math.max(0, Math.round(((d.score || 0) - pointsToDeduct) * 10) / 10) };
        }
        return d;
      }));
    }
  };

  // Task pending deletion modal state for repeating tasks
  const [taskPendingDeletion, setTaskPendingDeletion] = useState<Task | null>(null);

  const handleAddTask = (newTask: Omit<Task, 'id' | 'completed'>) => {
    const baseId = `task-${Date.now()}`;
    const baseTask: Task = {
      ...newTask,
      id: baseId,
      completed: false,
    };

    if (baseTask.repeat && baseTask.repeat !== 'None') {
      const groupId = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      baseTask.recurringGroupId = groupId;
      const recurringInstances = generateRecurringInstances(baseTask);
      setTasks(prev => [...prev, baseTask, ...recurringInstances]);
    } else {
      setTasks(prev => [...prev, baseTask]);
    }
  };

  const handleDeleteTask = (taskId: string, forceMode?: 'only_this' | 'all_following') => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      // If not found in active tasks, remove from completed just in case
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setCompletedTasks(prev => prev.filter(t => t.id !== taskId));
      return;
    }

    const isRepeating = isRepeatingTask(task, tasks);

    // If it's a repeating task and no explicit force mode was requested, open the option dialog!
    if (isRepeating && !forceMode) {
      setTaskPendingDeletion(task);
      return;
    }

    if (forceMode === 'all_following') {
      executeDeleteAllFollowing(task);
    } else {
      executeDeleteOnlyThis(task.id);
    }
  };

  const executeDeleteOnlyThis = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setCompletedTasks(prev => prev.filter(t => t.id !== taskId));
    setTaskPendingDeletion(null);
  };

  const executeDeleteAllFollowing = (targetTask: Task) => {
    const targetDate = targetTask.date || formatLocalDateToIso();

    setTasks(prev =>
      prev.filter(t => {
        // Delete this exact task
        if (t.id === targetTask.id) return false;

        // Delete any task with matching recurringGroupId from targetDate onward
        if (targetTask.recurringGroupId && t.recurringGroupId === targetTask.recurringGroupId) {
          return (t.date || '') < targetDate;
        }

        // Fallback: delete matching repeat tasks with same title & startTime from targetDate onward
        if (
          targetTask.repeat &&
          targetTask.repeat !== 'None' &&
          t.title.toLowerCase() === targetTask.title.toLowerCase() &&
          t.startTime === targetTask.startTime
        ) {
          return (t.date || '') < targetDate;
        }

        return true;
      })
    );

    setCompletedTasks(prev =>
      prev.filter(t => {
        if (t.id === targetTask.id) return false;
        if (targetTask.recurringGroupId && t.recurringGroupId === targetTask.recurringGroupId) {
          return (t.date || '') < targetDate;
        }
        return true;
      })
    );

    setTaskPendingDeletion(null);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => {
      const existingTask = prev.find(t => t.id === taskId);
      if (!existingTask) return prev;

      // If repeat changed
      if (updates.repeat !== undefined && updates.repeat !== existingTask.repeat) {
        const taskDate = existingTask.date || formatLocalDateToIso();
        if (updates.repeat === 'None') {
          // Remove following instances of the recurring group
          return prev
            .filter(t => {
              if (existingTask.recurringGroupId && t.recurringGroupId === existingTask.recurringGroupId && t.id !== taskId) {
                return (t.date || '') <= taskDate;
              }
              return true;
            })
            .map(t => (t.id === taskId ? { ...t, ...updates, repeat: 'None', recurringGroupId: undefined } : t));
        } else {
          // Changed to repeating or new interval
          const newGroupId = existingTask.recurringGroupId || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const updatedTask: Task = {
            ...existingTask,
            ...updates,
            recurringGroupId: newGroupId,
          };
          // Remove old future instances if any
          const filtered = prev.filter(t => {
            if (existingTask.recurringGroupId && t.recurringGroupId === existingTask.recurringGroupId && t.id !== taskId) {
              return (t.date || '') < taskDate;
            }
            return true;
          });
          const futureInstances = generateRecurringInstances(updatedTask);
          return [...filtered.map(t => (t.id === taskId ? updatedTask : t)), ...futureInstances];
        }
      }

      return prev.map(t => (t.id === taskId ? { ...t, ...updates } : t));
    });
  };

  const handleUpdateTaskPriority = (taskId: string, priority: PriorityLevel) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, priority } : t));
  };

  // Dedication Actions
  const handleAddDedication = (newDed: Omit<Dedication, 'id' | 'score'>) => {
    const ded: Dedication = {
      ...newDed,
      id: `ded-${Date.now()}`,
      score: 0,
      pointMultiplier: newDed.pointMultiplier ?? 1,
    };
    setDedications(prev => [...prev, ded]);
  };

  const handleUpdateDedication = (dedicationId: string, updates: Partial<Dedication>) => {
    setDedications(prev => prev.map(d => d.id === dedicationId ? { ...d, ...updates } : d));
  };

  const handleDeleteDedication = (dedicationId: string) => {
    setDedications(prev => prev.filter(d => d.id !== dedicationId));
    // Detach deleted dedication from tasks
    setTasks(prev => prev.map(t => t.dedicationId === dedicationId ? { ...t, dedicationId: undefined } : t));
  };

  // Keyword & Routine Actions
  const handleAddKeyword = (kw: Omit<Keyword, 'id'>) => {
    const newKw: Keyword = { ...kw, id: `kw-${Date.now()}` };
    setKeywords(prev => [...prev, newKw]);
  };

  const handleUpdateKeyword = (keywordId: string, updates: Partial<Keyword>) => {
    setKeywords(prev => prev.map(k => k.id === keywordId ? { ...k, ...updates } : k));
  };

  const handleDeleteKeyword = (keywordId: string) => {
    setKeywords(prev => prev.filter(k => k.id !== keywordId));
  };

  const handleAddRoutine = (rt: Omit<Routine, 'id'>) => {
    const newRt: Routine = { ...rt, id: `rt-${Date.now()}` };
    setRoutines(prev => [...prev, newRt]);
  };

  const handleUpdateRoutine = (updatedRoutine: Routine) => {
    setRoutines(prev => prev.map(r => r.id === updatedRoutine.id ? updatedRoutine : r));
  };

  const handleDeleteRoutine = (routineId: string) => {
    setRoutines(prev => prev.filter(r => r.id !== routineId));
  };

  const handleApplyRoutineToPlan = (routine: Routine, targetDate?: string, targetStartTime?: string) => {
    const activeDate = targetDate || formatLocalDateToIso(new Date());
    const dayTasks = tasks.filter(t => (t.date || formatLocalDateToIso(new Date())) === activeDate);
    let lastEnd = targetStartTime || (dayTasks.length > 0 ? dayTasks[dayTasks.length - 1].endTime : '7:00 AM');
    
    // Parse helper
    const addMinutesToTime = (timeStr: string, addMins: number) => {
      let hours = 7;
      let minutes = 0;
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        const ampm = match[3]?.toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
      }
      const total = hours * 60 + minutes + addMins;
      let nh = Math.floor(total / 60) % 24;
      const nm = total % 60;
      const na = nh >= 12 ? 'PM' : 'AM';
      if (nh > 12) nh -= 12;
      if (nh === 0) nh = 12;
      return `${nh}:${nm.toString().padStart(2, '0')} ${na}`;
    };

    const newTasks: Task[] = routine.taskKeywords.map((item, index) => {
      const start = lastEnd;
      const end = addMinutesToTime(start, item.durationMinutes);
      lastEnd = end;
      return {
        id: `routine-task-${Date.now()}-${index}`,
        title: item.title,
        startTime: start,
        endTime: end,
        durationMinutes: item.durationMinutes,
        priority: item.priority,
        routineId: routine.id,
        routineName: routine.name,
        completed: false,
        date: activeDate,
      };
    });

    setTasks(prev => [...prev, ...newTasks]);

    // Increment usage for each keyword included in the routine
    setKeywords(prev =>
      prev.map(k => {
        const isUsed = routine.taskKeywords.some(
          tk => tk.keywordId === k.id || tk.title.toLowerCase() === k.name.toLowerCase()
        );
        return isUsed ? { ...k, usageCount: (k.usageCount || 0) + 1 } : k;
      })
    );
  };

  // Flow Mode Switch
  const handleStartFlowWithTask = (task: Task) => {
    setActiveFlowTaskId(task.id);
    setCurrentView('flow');
  };

  const activeTask = tasks.find(t => t.id === activeFlowTaskId) || null;
  const upcomingTasks = tasks.filter(t => t.id !== activeTask?.id && !t.completed);

  // Guide handlers
  const handleNextGuideStep = () => {
    if (guideStepIndex < GUIDE_STEPS.length - 1) {
      setGuideStepIndex(prev => prev + 1);
    } else {
      setIsGuideActive(false);
      localStorage.setItem('priorities_tutorial_seen', 'true');
    }
  };

  const handlePrevGuideStep = () => {
    if (guideStepIndex > 0) {
      setGuideStepIndex(prev => prev - 1);
    }
  };

  const handleStartGuide = () => {
    setGuideStepIndex(0);
    setIsGuideActive(true);
    setCurrentView('daily-plan');
    setPlanTimeframe('Day');
  };

  const handleSkipGuide = () => {
    setIsGuideActive(false);
    localStorage.setItem('priorities_tutorial_seen', 'true');
  };

  const handleResetData = () => {
    setTasks(INITIAL_TASKS);
    setCompletedTasks(INITIAL_COMPLETED_TASKS);
    setDedications(INITIAL_DEDICATIONS);
    setKeywords(INITIAL_KEYWORDS);
    setRoutines(INITIAL_ROUTINES);
    setCurrentTheme(THEMES[0]);
    localStorage.clear();
  };

  return (
    <div 
      className="min-h-screen flex flex-col font-sans transition-colors duration-300"
      style={{ 
        backgroundColor: currentTheme.bgColor,
        color: currentTheme.textColor,
      }}
    >
      {/* Top Header */}
      <Header
        currentView={currentView}
        currentTheme={currentTheme}
        onOpenMenu={() => setIsMenuOpen(true)}
        onStartGuide={handleStartGuide}
        isGuideActive={isGuideActive}
        onSkipGuide={handleSkipGuide}
        planTimeframe={planTimeframe}
        weekDateLabel={weekDateLabel}
        monthDateLabel={monthYearLabel}
        onJumpToToday={() => {
          setPlanTimeframe('Day');
        }}
      />

      {/* Navigation Slide Drawer */}
      <NavigationDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        currentView={currentView}
        onSelectView={(view) => setCurrentView(view)}
        onStartGuide={handleStartGuide}
        currentTheme={currentTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col w-full">
        {currentView === 'daily-plan' && (
          <DailyPlanView
            tasks={tasks}
            dedications={dedications}
            keywords={keywords}
            routines={routines}
            currentTheme={currentTheme}
            timeframe={planTimeframe}
            onChangeTimeframe={setPlanTimeframe}
            onToggleCompleteTask={handleToggleCompleteTask}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            onUpdateTask={handleUpdateTask}
            onStartFlowWithTask={handleStartFlowWithTask}
            onAddKeyword={handleAddKeyword}
            onApplyRoutine={handleApplyRoutineToPlan}
            onMonthYearChange={setMonthYearLabel}
          />
        )}

        {currentView === 'priorities' && (
          <PrioritiesView
            tasks={tasks}
            dedications={dedications}
            keywords={keywords}
            routines={routines}
            currentTheme={currentTheme}
            onToggleCompleteTask={handleToggleCompleteTask}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            onUpdateTaskPriority={handleUpdateTaskPriority}
            onUpdateTask={handleUpdateTask}
          />
        )}

        {currentView === 'dedications' && (
          <DedicationsView
            dedications={dedications}
            completedTasks={completedTasks}
            currentTheme={currentTheme}
            onAddDedication={handleAddDedication}
            onUpdateDedication={handleUpdateDedication}
            onDeleteDedication={handleDeleteDedication}
          />
        )}

        {currentView === 'keywords' && (
          <KeywordsView
            keywords={keywords}
            dedications={dedications}
            currentTheme={currentTheme}
            onAddKeyword={handleAddKeyword}
            onUpdateKeyword={handleUpdateKeyword}
            onDeleteKeyword={handleDeleteKeyword}
          />
        )}

        {currentView === 'routines' && (
          <RoutinesView
            routines={routines}
            keywords={keywords}
            currentTheme={currentTheme}
            onAddRoutine={handleAddRoutine}
            onUpdateRoutine={handleUpdateRoutine}
            onDeleteRoutine={handleDeleteRoutine}
            onAddKeyword={handleAddKeyword}
          />
        )}

        {currentView === 'flow' && (
          <FlowView
            activeTask={activeTask}
            allTasks={tasks}
            upcomingTasks={upcomingTasks}
            currentTheme={currentTheme}
            onCompleteTask={handleToggleCompleteTask}
            onSelectNextTask={(task) => setActiveFlowTaskId(task.id)}
            onRecordTimeSaved={handleRecordTimeSaved}
            onNavigateToDailyPlan={() => setCurrentView('daily-plan')}
          />
        )}

        {currentView === 'all-done' && (
          <AllDoneView
            completedTasks={completedTasks}
            currentTheme={currentTheme}
            onUndoComplete={handleUndoComplete}
            onClearHistory={() => setCompletedTasks([])}
          />
        )}

        {currentView === 'widget' && (
          <WidgetView
            tasks={tasks}
            activeTask={activeTask}
            onToggleTask={handleToggleCompleteTask}
            onStartFlowWithTask={(taskId) => {
              const target = tasks.find(t => t.id === taskId);
              if (target) {
                handleStartFlowWithTask(target);
              }
            }}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView
            currentTheme={currentTheme}
            savedThemes={savedThemes}
            onSelectTheme={setCurrentTheme}
            onSaveTheme={handleSaveCustomTheme}
            onDeleteSavedTheme={handleDeleteCustomTheme}
            onReplayTutorial={handleStartGuide}
            onResetData={handleResetData}
            bubblesEnabled={bubblesEnabled}
            onToggleBubbles={handleToggleBubbles}
            bubbleDensity={bubbleDensity}
            onSelectBubbleDensity={handleSelectBubbleDensity}
            bubblesPoppedCount={bubblesPoppedCount}
            tasks={tasks}
            activeTask={activeTask}
            timeSavedStats={timeSavedStats}
            onResetTimeSaved={handleResetTimeSaved}
            onToggleTask={handleToggleCompleteTask}
          />
        )}
      </main>

      {/* Mindful Floating Bubbles (Bubbles come up and can be popped with book, bop & pop sounds) */}
      <FloatingBubbles
        enabled={bubblesEnabled}
        density={bubbleDensity}
        onBubblePopped={handleBubblePopped}
      />

      {/* Interactive 14-Step Guide Walkthrough */}
      {isGuideActive && (
        <InteractiveGuide
          currentStepIndex={guideStepIndex}
          onNextStep={handleNextGuideStep}
          onPrevStep={handlePrevGuideStep}
          onFinishGuide={handleSkipGuide}
          onSelectView={setCurrentView}
          onSelectPlanTimeframe={setPlanTimeframe}
        />
      )}

      {/* Repeating Task Deletion Options Modal */}
      {taskPendingDeletion && (
        <DeleteRepeatTaskModal
          task={taskPendingDeletion}
          followingCount={getFollowingRepeatTasks(taskPendingDeletion, tasks).length}
          onDeleteOnlyThis={() => executeDeleteOnlyThis(taskPendingDeletion.id)}
          onDeleteAllFollowing={() => executeDeleteAllFollowing(taskPendingDeletion)}
          onClose={() => setTaskPendingDeletion(null)}
        />
      )}
    </div>
  );
}
