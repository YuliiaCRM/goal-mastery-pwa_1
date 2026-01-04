export enum GoalLevel {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard'
}

export enum GoalPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export enum LifeArea {
  HEALTH = 'Health & Wellness',
  RELATIONSHIPS = 'Relationships',
  CAREER = 'Career & Finances',
  GROWTH = 'Personal Growth',
  TRAVEL = 'Fun & Travels',
  OTHERS = 'Others'
}

export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
  currentProgress: number;
  targetProgress: number;
  level: GoalLevel;
  priority: GoalPriority;
  deadline?: number;
  tip?: string;
  deleted?: boolean; // Support soft-delete for swipe restore
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  level: GoalLevel;
  priority: GoalPriority;
  area: LifeArea;
  deadline?: number;
  estimatedCost: number;
  subTasks: SubTask[];
  completed: boolean;
  createdAt: number;
  completedAt?: number;
  lastInteractionAt: number;
  pinned: boolean;
  order: number;
  achievedMilestones?: number[];
  archived?: boolean;
}

export interface MotivationalQuote {
  text: string;
  author: string;
  date: string;
}