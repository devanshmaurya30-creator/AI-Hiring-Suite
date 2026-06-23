'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Calendar, 
  ChevronRight, 
  User, 
  Mail, 
  Phone, 
  Cpu, 
  Sparkles,
  GraduationCap,
  Briefcase
} from 'lucide-react';
import { resumes as resumeApi, skills as skillApi } from '@/lib/api/endpoints';
import type { Resume } from '@/types';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import AuthGuard from '@/components/layout/AuthGuard';
import GlassCard from '@/components/ui/GlassCard';
import FileUpload from '@/components/ui/FileUpload';
import Button from '@/components/ui/Button';
import SkillBadge from '@/components/ui/SkillBadge';

export default function ResumeUploadPage() {
  const [resumesList, setResumesList] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [selectedResumeDetails, setSelectedResumeDetails] = useState<any>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const fetchResumes = async () => {
    try {
      const data = await resumeApi.list();
      setResumesList(data);
    } catch (err) {
      console.error('Failed to load resumes:', err);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleUploadComplete = () => {
    fetchResumes();
  };

  const handleSelectResume = (resume: Resume) => {
    setSelectedResume(resume);
    setSelectedResumeDetails(null);
  };

  const fetchResumeDetails = async (id: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/resumes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedResumeDetails(data);
        if (data.status === 'parsed' && selectedResume) {
          setSelectedResume({ ...selectedResume, status: 'parsed' });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedResume) {
      fetchResumeDetails(selectedResume.id);
    }
  }, [selectedResume]);

  const handleParse = async () => {
    if (!selectedResume) return;
    setIsParsing(true);
    try {
      await resumeApi.parse(selectedResume.id);
      await fetchResumeDetails(selectedResume.id);
      fetchResumes();
    } catch (err) {
      console.error('Failed to parse resume:', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleExtractSkills = async () => {
    if (!selectedResume) return;
    setIsExtracting(true);
    try {
      await skillApi.extract(selectedResume.id);
      await fetchResumeDetails(selectedResume.id);
      alert('Skills extracted successfully and synced to your profile!');
    } catch (err) {
      console.error('Failed to extract skills:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'parsed':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'uploaded':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      default:
        return 'text-slate-400 bg-white/5 border-white/10';
    }
  };

  const listContainerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const listItemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 260, damping: 25 } },
  };

  return (
    <AuthGuard requiredRole="candidate">
      <div className="min-h-screen bg-[#020208]">
        <Sidebar />
        <div className="lg:pl-[280px] flex flex-col min-h-screen">
          <Header title="Resume Operating Center" />
          <main className="flex-1 p-6 lg:p-8 grid grid-cols-1 xl:grid-cols-5 gap-6">
            
            {/* Left Section (Upload + Resumes List) */}
            <div className="xl:col-span-3 space-y-6 flex flex-col">
              <GlassCard className="p-6 border border-white/[0.08] flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-widest">Upload Profile Document</h3>
                </div>
                <FileUpload onUploadComplete={handleUploadComplete} />
              </GlassCard>

              <GlassCard className="p-6 border border-white/[0.08] flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-widest">Document Registry</h3>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{resumesList.length} items logged</span>
                  </div>

                  <motion.div 
                    variants={listContainerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-3"
                  >
                    {resumesList.length > 0 ? (
                      resumesList.map((res) => {
                        const isSelected = selectedResume?.id === res.id;
                        return (
                          <motion.div
                            key={res.id}
                            variants={listItemVariants}
                            onClick={() => handleSelectResume(res)}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                              isSelected
                                ? 'bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-500/40 shadow-inner'
                                : 'bg-white/[0.01] border-white/[0.04] hover:border-white/10 hover:bg-white/[0.02]'
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-slate-400">
                                <FileText className={`w-5 h-5 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-slate-200 truncate max-w-[160px] sm:max-w-[280px]">
                                  {res.filename}
                                </span>
                                <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                                  <Calendar className="w-3 h-3 text-slate-600" />
                                  <span>{new Date(res.uploaded_at).toLocaleDateString()}</span>
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <span className={`px-2.5 py-0.5 rounded-lg border text-[9px] uppercase font-bold tracking-wider ${getStatusColor(res.status)}`}>
                                {res.status}
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-600" />
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 text-slate-500 text-xs font-semibold">
                        No resumes uploaded yet.
                      </div>
                    )}
                  </motion.div>
                </div>
              </GlassCard>
            </div>

            {/* Right Section (Details / Parsing Output) */}
            <div className="xl:col-span-2 relative">
              <GlassCard className="p-6 border border-white/[0.08] min-h-[500px] flex flex-col justify-between relative overflow-hidden">
                {/* AI Laser Scanning Beam Animation Overlay */}
                <AnimatePresence>
                  {isParsing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-[#020208]/85 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center rounded-2xl"
                    >
                      <motion.div
                        className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_12px_#6366f1]"
                        animate={{ y: [0, 480, 0] }}
                        transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
                      />
                      <div className="p-4 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 mb-3 animate-pulse">
                        <Cpu className="w-7 h-7" />
                      </div>
                      <span className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-400 animate-pulse">
                        Executing Gemini OCR Parsing...
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {selectedResumeDetails ? (
                  <div className="space-y-6">
                    {/* Header info */}
                    <div className="border-b border-white/[0.04] pb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-indigo-400" />
                        <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-widest">Structure Schema</h3>
                      </div>
                      {selectedResume?.status === 'uploaded' ? (
                        <Button
                          onClick={handleParse}
                          isLoading={isParsing}
                          variant="primary"
                          className="text-xs px-4 py-2 uppercase font-extrabold tracking-wider"
                        >
                          Execute AI Parsing
                        </Button>
                      ) : (
                        <Button
                          onClick={handleExtractSkills}
                          isLoading={isExtracting}
                          variant="secondary"
                          className="text-xs px-4 py-2 uppercase font-extrabold tracking-wider border border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                        >
                          Extract & Sync Skills
                        </Button>
                      )}
                    </div>

                    {/* Parser Data Fields */}
                    {selectedResumeDetails.parsed_data ? (
                      <div className="space-y-6">
                        {/* Basic Details */}
                        <div className="grid grid-cols-1 gap-2.5 p-3.5 bg-slate-950/40 border border-white/5 rounded-xl">
                          <div className="flex items-center gap-3 text-xs text-slate-300 font-semibold">
                            <User className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span>Name: {selectedResumeDetails.parsed_data.name || 'Not extracted'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-300 font-semibold">
                            <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span className="truncate">Email: {selectedResumeDetails.parsed_data.email || 'Not extracted'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-300 font-semibold">
                            <Phone className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span>Phone: {selectedResumeDetails.parsed_data.phone || 'Not extracted'}</span>
                          </div>
                        </div>

                        {/* Skills badges */}
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-2.5">
                            EXTRACTED SKILLS ({selectedResumeDetails.parsed_data.skills?.length || 0})
                          </span>
                          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                            {selectedResumeDetails.parsed_data.skills && selectedResumeDetails.parsed_data.skills.length > 0 ? (
                              selectedResumeDetails.parsed_data.skills.map((skill: string) => (
                                <SkillBadge key={skill} name={skill} />
                              ))
                            ) : (
                              <span className="text-xs text-slate-500 italic">No skills extracted.</span>
                            )}
                          </div>
                        </div>

                        {/* Education */}
                        {selectedResumeDetails.parsed_data.education?.length > 0 && (
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-2.5">
                              EDUCATION HISTORY
                            </span>
                            <div className="space-y-2">
                              {selectedResumeDetails.parsed_data.education.map((edu: any, i: number) => (
                                <div key={i} className="p-3 rounded-xl bg-slate-950/30 border border-white/5 text-xs">
                                  <div className="flex items-start gap-2.5">
                                    <GraduationCap className="w-4.5 h-4.5 text-slate-500 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="font-bold text-slate-200">{edu.degree}</p>
                                      <p className="text-slate-400 mt-0.5">{edu.institution}</p>
                                      {edu.year && <span className="text-[10px] text-slate-500 block mt-1 font-bold">{edu.year}</span>}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Experience */}
                        {selectedResumeDetails.parsed_data.experience?.length > 0 && (
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest block mb-2.5">
                              WORK EXPERIENCE
                            </span>
                            <div className="space-y-2">
                              {selectedResumeDetails.parsed_data.experience.map((exp: any, i: number) => (
                                <div key={i} className="p-3 rounded-xl bg-slate-950/30 border border-white/5 text-xs">
                                  <div className="flex items-start gap-2.5">
                                    <Briefcase className="w-4.5 h-4.5 text-slate-500 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="font-bold text-slate-200">{exp.title}</p>
                                      <p className="text-slate-400 mt-0.5">{exp.company} | {exp.duration}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-20 text-slate-500 text-xs font-semibold">
                        This resume has not been parsed yet. Click "Execute AI Parsing" to structure the details.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-24 text-slate-500 text-xs font-semibold">
                    Select a resume from the list to view parsed metrics.
                  </div>
                )}
              </GlassCard>
            </div>

          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
