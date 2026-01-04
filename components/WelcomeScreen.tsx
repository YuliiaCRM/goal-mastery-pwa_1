
import React, { useState } from 'react';
import { LifeArea } from '../types';

interface WelcomeScreenProps {
  onComplete: (name: string, categories: string[]) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  [LifeArea.HEALTH]: 'border-[#4ade80] text-[#065f46] bg-[#ecfdf5]',
  [LifeArea.TRAVEL]: 'border-[#38bdf8] text-[#075985] bg-[#f0f9ff]',
  [LifeArea.RELATIONSHIPS]: 'border-[#fb7185] text-[#9f1239] bg-[#fff1f2]',
  [LifeArea.GROWTH]: 'border-[#fb923c] text-[#7c2d12] bg-[#fff7ed]',
  [LifeArea.OTHERS]: 'border-[#94a3b8] text-[#1e293b] bg-[#f8fafc]',
  [LifeArea.CAREER]: 'border-[#fbbf24] text-[#92400e] bg-[#fffbeb]'
};

const CATEGORY_EMOJIS: Record<string, string> = {
  [LifeArea.HEALTH]: '🌿',
  [LifeArea.TRAVEL]: '✈️',
  [LifeArea.RELATIONSHIPS]: '🤝',
  [LifeArea.GROWTH]: '📈',
  [LifeArea.OTHERS]: '🎯',
  [LifeArea.CAREER]: '💼'
};

const CUSTOM_THEMES = [
  { colors: 'border-[#f97316] text-[#7c2d12] bg-[#fff7ed]', emoji: '🔥' },
  { colors: 'border-[#ec4899] text-[#831843] bg-[#fdf2f8]', emoji: '💖' },
  { colors: 'border-[#8b5cf6] text-[#4c1d95] bg-[#f5f3ff]', emoji: '✨' },
  { colors: 'border-[#14b8a6] text-[#134e4a] bg-[#f0fdfa]', emoji: '💎' },
  { colors: 'border-[#eab308] text-[#713f12] bg-[#fefce8]', emoji: '🌟' },
  { colors: 'border-[#6366f1] text-[#312e81] bg-[#eef2ff]', emoji: '🌌' },
  { colors: 'border-[#ef4444] text-[#7f1d1d] bg-[#fef2f2]', emoji: '❤️' },
  { colors: 'border-[#22c55e] text-[#14532d] bg-[#f0fdf4]', emoji: '🔋' },
  { colors: 'border-[#a855f7] text-[#581c87] bg-[#faf5ff]', emoji: '🪄' },
  { colors: 'border-[#d946ef] text-[#701a75] bg-[#fdf4ff]', emoji: '🌸' },
];

const DEFAULT_CATEGORIES = Object.values(LifeArea);

const BUTTON_STYLE = "rounded-2xl font-bold transition-all active:scale-95 flex items-center justify-center text-sm";

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState('');

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const addCustomCategory = () => {
    if (customCategory.trim() && !selectedCategories.includes(customCategory.trim())) {
      setSelectedCategories(prev => [...prev, customCategory.trim()]);
      setCustomCategory('');
    }
  };

  const handleFinish = () => {
    if (name.trim() && selectedCategories.length > 0) {
      onComplete(name.trim(), selectedCategories);
    }
  };

  const getThemeForCategory = (cat: string, index: number) => {
    const isSelected = selectedCategories.includes(cat);
    if (CATEGORY_COLORS[cat]) {
      const baseColors = CATEGORY_COLORS[cat];
      const emoji = CATEGORY_EMOJIS[cat];
      if (isSelected) {
        return { style: `${baseColors} ring-2 ring-offset-2 ring-orange-100 shadow-sm opacity-100 scale-105`, emoji };
      }
      return { style: 'bg-white text-slate-400 border-slate-100 hover:border-slate-300 opacity-60', emoji };
    }
    const themeIdx = index % CUSTOM_THEMES.length;
    const theme = CUSTOM_THEMES[themeIdx];
    if (isSelected) {
      return { style: `${theme.colors} ring-2 ring-offset-2 ring-orange-100 shadow-sm opacity-100 scale-105`, emoji: theme.emoji };
    }
    return { style: 'bg-white text-slate-400 border-slate-100 hover:border-slate-300 opacity-60', emoji: theme.emoji };
  };

  return (
    <div className="fixed inset-0 z-[500] bg-white flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-md w-full space-y-10 py-12">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-black tracking-tight text-black leading-none">
            Welcome to <br/><span className="text-orange-600">Goalflow</span>
          </h1>
          <p className="text-slate-500 font-medium text-lg">Set your pace for 2026.</p>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-400 ml-1">What is your name?</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=""
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-6 text-base font-medium focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500/20 transition-all"
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-slate-400 ml-1">Select your focus areas</label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_CATEGORIES.map((cat, idx) => {
                const theme = getThemeForCategory(cat, idx);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-medium border transition-all flex items-center gap-2 ${theme.style}`}
                  >
                    <span>{theme.emoji}</span>
                    {cat}
                  </button>
                );
              })}
              {selectedCategories.filter(c => !DEFAULT_CATEGORIES.includes(c as any)).map((cat, idx) => {
                const theme = getThemeForCategory(cat, DEFAULT_CATEGORIES.length + idx);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-medium border transition-all flex items-center gap-2 ${theme.style}`}
                  >
                    <span>{theme.emoji}</span>
                    {cat}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 mt-4">
              <input 
                type="text" 
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomCategory()}
                placeholder="Add custom area..."
                className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl py-3 px-6 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-orange-500/5 transition-all"
              />
              <button 
                onClick={addCustomCategory}
                className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-orange-50 hover:text-orange-600 transition-all font-medium text-xl"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button 
            onClick={handleFinish}
            disabled={!name.trim() || selectedCategories.length === 0}
            className={`w-full bg-slate-900 text-white py-5 ${BUTTON_STYLE} shadow-xl shadow-orange-100/50 hover:bg-orange-600 disabled:opacity-30 disabled:pointer-events-none transition-all`}
          >
            Begin my journey
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
