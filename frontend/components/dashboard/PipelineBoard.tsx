'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Calendar, Mail, Star, Sparkles, CheckCircle2 } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';

type Stage = 'Applied' | 'Screened' | 'Interviewed' | 'Offered' | 'Hired';

interface CandidateCard {
  id: string;
  name: string;
  role: string;
  score: number;
  stage: Stage;
  avatar: string;
}

const STAGES: Stage[] = ['Applied', 'Screened', 'Interviewed', 'Offered', 'Hired'];

const INITIAL_DATA: CandidateCard[] = [
  { id: '1', name: 'Alex Rivera', role: 'Frontend Engineer', score: 94, stage: 'Interviewed', avatar: 'A' },
  { id: '2', name: 'Sarah Chen', role: 'Data Scientist', score: 88, stage: 'Screened', avatar: 'S' },
  { id: '3', name: 'Michael Chang', role: 'Backend Engineer', score: 92, stage: 'Offered', avatar: 'M' },
  { id: '4', name: 'Jessica Taylor', role: 'Product Designer', score: 85, stage: 'Applied', avatar: 'J' },
  { id: '5', name: 'David Park', role: 'Full Stack Dev', score: 97, stage: 'Hired', avatar: 'D' },
  { id: '6', name: 'Elena Rodriguez', role: 'DevOps Engineer', score: 89, stage: 'Screened', avatar: 'E' },
];

export default function PipelineBoard() {
  const [cards, setCards] = useState<CandidateCard[]>([]);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  useEffect(() => {
    // In a real app, this would fetch from API
    setCards(INITIAL_DATA);
  }, []);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCardId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to allow the drag image to generate before adding opacity
    setTimeout(() => {
      const el = document.getElementById(`card-${id}`);
      if (el) el.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent, id: string) => {
    setDraggedCardId(null);
    const el = document.getElementById(`card-${id}`);
    if (el) el.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStage: Stage) => {
    e.preventDefault();
    if (!draggedCardId) return;

    setCards((prev) =>
      prev.map((card) => {
        if (card.id === draggedCardId) {
          return { ...card, stage: targetStage };
        }
        return card;
      })
    );
  };

  const getStageColor = (stage: Stage) => {
    switch (stage) {
      case 'Applied': return 'from-slate-500/20 to-slate-400/10 text-slate-400 border-slate-500/30';
      case 'Screened': return 'from-blue-500/20 to-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'Interviewed': return 'from-indigo-500/20 to-purple-500/10 text-indigo-400 border-indigo-500/30';
      case 'Offered': return 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30';
      case 'Hired': return 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-8 snap-x min-h-[600px]">
      {STAGES.map((stage) => {
        const stageCards = cards.filter((c) => c.stage === stage);
        
        return (
          <div
            key={stage}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
            className="flex-shrink-0 w-80 snap-start flex flex-col gap-4"
          >
            {/* Column Header */}
            <div className={`flex items-center justify-between p-3 rounded-2xl bg-gradient-to-br border backdrop-blur-md shadow-lg ${getStageColor(stage)}`}>
              <h3 className="font-extrabold text-sm uppercase tracking-wider">{stage}</h3>
              <span className="text-xs font-black bg-black/20 px-2 py-1 rounded-lg">
                {stageCards.length}
              </span>
            </div>

            {/* Droppable Area */}
            <div className="flex-1 min-h-[200px] flex flex-col gap-4 rounded-3xl bg-white/[0.01] border border-white/[0.03] p-2 transition-colors duration-300">
              <AnimatePresence>
                {stageCards.map((card) => (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      id={`card-${card.id}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, card.id)}
                      onDragEnd={(e) => handleDragEnd(e, card.id)}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <GlassCard className="p-4 border border-white/[0.08] hover:border-cyan-500/40 transition-all duration-300 group">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-extrabold text-lg shadow-lg border border-white/20 group-hover:scale-105 transition-transform">
                              {card.avatar}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-100">{card.name}</h4>
                              <p className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider mt-0.5">{card.role}</p>
                            </div>
                          </div>
                          <button className="text-slate-600 hover:text-slate-300 transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.04]">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.03] text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer border border-white/5">
                              <Calendar className="w-3 h-3" />
                            </div>
                            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.03] text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer border border-white/5">
                              <Mail className="w-3 h-3" />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                            <span className="text-[10px] font-black text-cyan-400">{card.score}% FIT</span>
                          </div>
                        </div>
                      </GlassCard>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {stageCards.length === 0 && (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl m-2">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Drop Here</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
