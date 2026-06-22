'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, TrendingUp, DollarSign, CheckCircle2, XCircle, Clock } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import AuthGuard from '@/components/layout/AuthGuard';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import { predictions, offers, auth } from '@/lib/api/endpoints';
import type { Offer, User } from '@/types';
import { useAuthStore } from '@/lib/store/authStore';

export default function CareerHubPage() {
  const { candidate } = useAuthStore();
  const [candidateOffers, setCandidateOffers] = useState<Offer[]>([]);
  const [salaryPrediction, setSalaryPrediction] = useState<any>(null);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(true);

  useEffect(() => {
    if (candidate?.id) {
      fetchOffers(candidate.id);
    } else {
      setLoadingOffers(false);
    }
  }, [candidate]);

  const fetchOffers = async (candidateId: number) => {
    try {
      const data = await offers.getByCandidate(candidateId);
      setCandidateOffers(data);
    } catch (err) {
      console.error('Failed to fetch offers:', err);
    } finally {
      setLoadingOffers(false);
    }
  };

  const generateSalaryPrediction = async () => {
    if (!candidate?.id) return;
    setLoadingSalary(true);
    try {
      const data = await predictions.salary(candidate.id);
      setSalaryPrediction(data);
    } catch (err) {
      console.error('Failed to predict salary:', err);
    } finally {
      setLoadingSalary(false);
    }
  };

  const handleOfferResponse = async (offerId: number, status: 'accepted' | 'declined') => {
    try {
      await offers.respond(offerId, status);
      // Refresh offers
      if (candidate?.id) {
        fetchOffers(candidate.id);
      }
    } catch (err) {
      console.error(`Failed to respond to offer: ${err}`);
    }
  };

  return (
    <AuthGuard requiredRole="candidate">
      <div className="min-h-screen bg-[#020208]">
        <Sidebar />
        <div className="lg:pl-[280px] flex flex-col min-h-screen">
          <Header title="Career AI Hub" />
          <main className="flex-1 p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-slate-200"
            >
              
              {/* Left Column: Salary Prediction */}
              <div className="lg:col-span-5 space-y-8">
                <GlassCard className="p-8 border border-white/[0.08] relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10">
                    <TrendingUp className="w-32 h-32 text-cyan-400" />
                  </div>
                  
                  <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-50 via-slate-100 to-cyan-200 mb-2 relative z-10">
                    AI Market Value Predictor
                  </h2>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-8 relative z-10">
                    Calculated via skills & experience logic
                  </p>

                  {!salaryPrediction ? (
                    <div className="flex flex-col items-center justify-center p-8 border border-white/5 rounded-2xl bg-[#050515]/40 relative z-10">
                      <Button
                        onClick={generateSalaryPrediction}
                        isLoading={loadingSalary}
                        variant="primary"
                        className="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 w-full py-4 uppercase font-extrabold text-xs tracking-widest shadow-lg shadow-cyan-500/20"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Generate Prediction
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6 relative z-10">
                      <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-cyan-500/20 shadow-inner">
                        <span className="text-[10px] uppercase font-black text-cyan-400 tracking-widest block mb-2">Estimated Annual Package (CTC)</span>
                        <div className="text-4xl font-extrabold text-slate-100">
                          ₹{Math.round(salaryPrediction.annual_salary || salaryPrediction.predicted_salary || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="flex items-center gap-2 mt-3 text-xs font-bold text-slate-400">
                          Range: <span className="text-slate-200">{salaryPrediction.salary_range || `₹${Math.round(salaryPrediction.min_salary || 0).toLocaleString('en-IN')} - ₹${Math.round(salaryPrediction.max_salary || 0).toLocaleString('en-IN')}`}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Market CTC</span>
                          <div className="text-sm font-bold text-slate-200 mt-1">₹{Math.round(salaryPrediction.market_average || 0).toLocaleString('en-IN')}</div>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5">
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Growth Potential</span>
                          <div className="text-sm font-bold text-cyan-400 mt-1">{salaryPrediction.lpa_band || "N/A"}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/50 border border-white/5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400">High Confidence Level ({Math.round((salaryPrediction.confidence || 0.85) * 100)}%)</span>
                      </div>
                    </div>
                  )}
                </GlassCard>
              </div>

              {/* Right Column: Offers */}
              <div className="lg:col-span-7 space-y-8">
                <GlassCard className="p-8 border border-white/[0.08] min-h-[400px]">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-50 via-slate-100 to-cyan-200">
                        Pending Offers
                      </h2>
                      <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">
                        Review and respond to job offers
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                      <Briefcase className="w-5 h-5 text-cyan-400" />
                    </div>
                  </div>

                  {loadingOffers ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                    </div>
                  ) : candidateOffers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-500 p-6 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                      <Clock className="w-8 h-8 mb-3 opacity-50" />
                      <p className="text-sm font-bold">No active offers yet</p>
                      <p className="text-xs mt-1 max-w-[250px]">Complete more interviews to receive offers from recruiters.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {candidateOffers.map((offer, idx) => (
                        <div key={`${offer.id}-${idx}`} className="p-5 rounded-2xl bg-[#050515]/60 border border-white/5 hover:border-white/10 transition-colors flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-100">{(offer as any).job_title || 'Role'} @ {(offer as any).company || 'Company'}</h3>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">
                                {offer.salary_offered}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                Received {new Date(offer.sent_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {offer.status === 'pending' ? (
                              <>
                                <button
                                  onClick={() => handleOfferResponse(offer.id, 'declined')}
                                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors uppercase tracking-widest"
                                >
                                  Decline
                                </button>
                                <button
                                  onClick={() => handleOfferResponse(offer.id, 'accepted')}
                                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors uppercase tracking-widest"
                                >
                                  Accept
                                </button>
                              </>
                            ) : (
                              <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border ${
                                offer.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}>
                                {offer.status}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </div>

            </motion.div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
