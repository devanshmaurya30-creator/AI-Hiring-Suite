'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import {
  FileText,
  Search,
  Cpu,
  Trophy,
  MessageSquare,
  BarChart3,
  ArrowRight,
  TrendingUp,
  Award,
  Zap,
  ShieldCheck,
  CheckCircle,
  Users,
  Quote,
  DollarSign,
  LineChart,
  Fingerprint,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import Logo from '@/components/ui/Logo';
import SplineHero from '@/components/ui/spline-demo';

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } 
    },
  };

  const partners = [
    'Stripe',
    'OpenAI',
    'Linear',
    'Vercel',
    'Supabase',
    'Clerk',
    'Figma',
    'Notion',
  ];

  const testimonials = [
    {
      quote: "AI Hiring Suite cut our screening time by 70%. The automated interview evaluations are incredibly accurate and reliable.",
      author: "Sarah Jenkins",
      role: "VP of Talent, Stripe",
      avatar: "SJ"
    },
    {
      quote: "The integrity dashboard is a game changer. We caught multiple identity clones and stuffed resumes before they reached our teams.",
      author: "Marcus Chen",
      role: "Head of Recruiting, Linear",
      avatar: "MC"
    },
    {
      quote: "Running local Whisper transcriptions offline ensures candidate privacy while delivering flawless conversational transcription.",
      author: "Elena Rostova",
      role: "Director of HR, Supabase",
      avatar: "ER"
    }
  ];

  return (
    <div className="relative min-h-screen bg-surface overflow-hidden text-slate-200">
      {/* Ambient Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Glowing background meshes */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-cyan/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-violet/10 blur-[150px] pointer-events-none" />

      {/* 1. Navbar */}
      <header className="relative z-20 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/[0.03]">
        <div className="flex items-center gap-3">
          <Logo variant="navbar" />
          <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-brand-cyan to-brand-violet tracking-tight text-sm uppercase">
            AI Hiring Suite
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs uppercase font-bold tracking-wider text-slate-400 hover:text-slate-100">
              Log In
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="primary" size="sm" className="text-xs uppercase font-bold tracking-wider px-5 py-2">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* 2. Spline Hero */}
      <SplineHero />

      {/* 3. Trusted By */}
      <section className="relative z-10 py-10 border-y border-white/[0.03] bg-white/[0.01] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-4">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest text-center">
            TRUSTED BY THE WORLD'S LEADING RECRUITING TEAMS
          </p>
        </div>
        <div className="flex gap-16 items-center whitespace-nowrap overflow-hidden relative w-full">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#020208] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#020208] to-transparent z-10 pointer-events-none" />
          
          <motion.div
            animate={{ x: [0, -1000] }}
            transition={{ ease: 'linear', duration: 25, repeat: Infinity }}
            className="flex gap-16 text-lg font-semibold tracking-wider text-slate-400/50 uppercase"
          >
            {[...partners, ...partners, ...partners].map((partner, idx) => (
              <span key={idx} className="hover:text-brand-cyan/80 transition-colors cursor-default">
                {partner}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 4. Resume Intelligence */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-b border-white/[0.03]">
        <div className="text-center mb-16">
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-brand-cyan block mb-2">01 / Resume Analysis</span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Resume Intelligence & OCR parsing
          </h2>
          <p className="text-slate-400 text-sm mt-3 max-w-xl mx-auto font-light leading-relaxed">
            Extract structured JSON schemas from raw documents automatically. Built using Gemini OCR algorithms and advanced parser pipelines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard className="p-8 relative overflow-hidden group hover:border-brand-cyan/25 transition-all">
            <div className="p-3.5 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan w-fit mb-6">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-slate-100 font-bold text-lg mb-2">Multimodal OCR</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
              Ingests scanned PDFs and raw resume screenshots, restoring structure and headers perfectly via AI image extraction fallbacks.
            </p>
          </GlassCard>

          <GlassCard className="p-8 relative overflow-hidden group hover:border-brand-violet/25 transition-all">
            <div className="p-3.5 rounded-xl bg-brand-violet/10 border border-brand-violet/20 text-brand-violet w-fit mb-6">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-slate-100 font-bold text-lg mb-2">Dynamic Skill Extraction</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
              Identifies technical, professional, and soft skills automatically, mapping them against an industry-standard taxonomy.
            </p>
          </GlassCard>

          <GlassCard className="p-8 relative overflow-hidden group hover:border-brand-orange/25 transition-all">
            <div className="p-3.5 rounded-xl bg-brand-orange/10 border border-brand-orange/20 text-brand-orange w-fit mb-6">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-slate-100 font-bold text-lg mb-2">Jaccard Suitability Scoring</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
              Calculates overlap metrics based on skill densities, education degrees, experience timelines, and career suitability classifiers.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* 5. AI Interview System */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-b border-white/[0.03]">
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          <div className="w-full lg:w-1/2 space-y-6">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-brand-violet block">02 / Automated Screening</span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
              technical Interview Bot
            </h2>
            <p className="text-slate-400 text-sm font-light leading-relaxed">
              Automate mock conversational technical screenings. Candidates receive instant evaluation, specific highlights, and growth recommendations after completion.
            </p>
            <div className="space-y-4 pt-4">
              {[
                { icon: MessageSquare, title: 'Conversational Screenings', desc: 'Simulated AI voices conducting role-specific assessments.' },
                { icon: Cpu, title: 'Standalone Whisper Transcription', desc: 'Processes audio responses completely offline with maximum candidate data privacy.' },
                { icon: Activity, title: 'Real-time Sentiment & Posture Logs', desc: 'Tracks candidate confidence and facial cues using image snapshots.' }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-brand-violet w-fit h-fit shrink-0">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{item.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full lg:w-1/2 flex items-center justify-center">
            {/* Visual Demo element simulating an AI Interview transcript */}
            <GlassCard className="w-full max-w-lg p-6 border border-white/10 relative overflow-hidden bg-white/[0.02]">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <MessageSquare className="w-24 h-24 text-brand-violet" />
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Live Transcript Screen</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="space-y-4 text-xs font-light">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-brand-violet">AI INTERVIEWER</span>
                  <p className="p-3 bg-white/5 border border-white/5 rounded-xl rounded-tl-none text-slate-300">
                    How would you design a rate limiter middleware for a scalable microservices architecture?
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[9px] uppercase font-bold text-brand-cyan">CANDIDATE</span>
                  <p className="p-3 bg-brand-cyan/5 border border-brand-cyan/20 rounded-xl rounded-tr-none text-slate-300 text-left inline-block max-w-[85%]">
                    I would use Redis with a sliding window counter algorithm. It avoids race conditions and handles high throughput...
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-emerald-400">OFFLINE SCORING REPORT</span>
                  <p className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-slate-300">
                    Score: 8.5/10. Correctly details Redis cluster locking, transaction handling, and sliding window scaling advantages.
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* 6. Fraud Detection */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-b border-white/[0.03]">
        <div className="flex flex-col lg:flex-row-reverse gap-12 items-center">
          <div className="w-full lg:w-1/2 space-y-6">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-brand-orange block">03 / Security Sensor</span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
              Advanced Fraud Detection
            </h2>
            <p className="text-slate-400 text-sm font-light leading-relaxed">
              Verify candidate integrity in real time. Flag suspicious optimization layout patterns, duplicate resumes, unrealistic experience timelines, and identity clones before you set up calls.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5">
                <Fingerprint className="w-5 h-5 text-brand-orange mb-3" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">Identity checks</h4>
                <p className="text-xs text-slate-400 font-light leading-relaxed">Cross-checks duplicate phone numbers, email handles, GitHub, and LinkedIn URLs.</p>
              </div>
              <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5">
                <AlertTriangle className="w-5 h-5 text-brand-orange mb-3" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">Timeline Auditor</h4>
                <p className="text-xs text-slate-400 font-light leading-relaxed">Flags inflated claims (e.g. 10 years experience on a library released in 2020).</p>
              </div>
            </div>
          </div>
          <div className="w-full lg:w-1/2">
            <GlassCard className="p-6 border border-brand-orange/20 relative overflow-hidden shadow-[0_0_30px_rgba(255,138,0,0.05)] bg-[#0c0805]">
              <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                <ShieldCheck className="w-4.5 h-4.5 text-brand-orange" />
                <h3 className="text-xs uppercase font-extrabold text-slate-300 tracking-wider">Integrity Alert Report</h3>
              </div>
              <div className="space-y-4 text-xs font-light text-slate-300">
                <div className="flex justify-between items-center p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <div>
                    <span className="font-bold text-rose-400 uppercase text-[9px] block">CRITICAL FLAG</span>
                    <span>Duplicate phone and email mapping found on candidate database</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-rose-400 uppercase bg-rose-500/10 px-2 py-0.5 rounded">Risk 92%</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div>
                    <span className="font-bold text-amber-400 uppercase text-[9px] block">TIMELINE VERIFICATION</span>
                    <span>Claims 12 years of experience with FastAPI (released in 2018)</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded">Flagged</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <div>
                    <span className="font-bold text-indigo-400 uppercase text-[9px] block">KEYWORD STUFFING</span>
                    <span>Skill density pattern alert: term "Python" repeats 38 times in resume</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-indigo-400 uppercase bg-indigo-500/10 px-2 py-0.5 rounded">Warning</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* 7. Analytics Dashboard */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-b border-white/[0.03]">
        <div className="text-center mb-16">
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-brand-cyan block mb-2">04 / Predictive Insights</span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Analytics & Predictions Dashboard
          </h2>
          <p className="text-slate-400 text-sm mt-3 max-w-xl mx-auto font-light leading-relaxed">
            Gain deep insight into your candidate pools. Predict expected salary bands, calculate offer acceptance ratios, and run employee attrition risk models automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard className="p-8 relative overflow-hidden group hover:border-brand-cyan/25 transition-all text-center">
            <div className="mx-auto p-3.5 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan w-fit mb-6">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-slate-100 font-bold text-base mb-2">Salary Expectation Model</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-light">
              Predicts expected market salary ranges in USD based on candidate skills, education levels, and experience history.
            </p>
          </GlassCard>

          <GlassCard className="p-8 relative overflow-hidden group hover:border-brand-violet/25 transition-all text-center">
            <div className="mx-auto p-3.5 rounded-xl bg-brand-violet/10 border border-brand-violet/20 text-brand-violet w-fit mb-6">
              <LineChart className="w-5 h-5" />
            </div>
            <h3 className="text-slate-100 font-bold text-base mb-2">Offer Acceptance Probability</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-light">
              Calculates candidate conversion probability based on offered salary competitiveness, skill suitability, and role match score.
            </p>
          </GlassCard>

          <GlassCard className="p-8 relative overflow-hidden group hover:border-brand-orange/25 transition-all text-center">
            <div className="mx-auto p-3.5 rounded-xl bg-brand-orange/10 border border-brand-orange/20 text-brand-orange w-fit mb-6">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-slate-100 font-bold text-base mb-2">Attrition Risk Forecast</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-light">
              Assesses employee retention/attrition risk bands using Random Forest classifiers and career timeline gap metrics.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* 8. Hiring Pipeline */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-b border-white/[0.03]">
        <div className="text-center mb-16">
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-brand-violet block mb-2">05 / Operation Funnel</span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Automated Hiring Pipeline
          </h2>
          <p className="text-slate-400 text-sm mt-3 max-w-xl mx-auto font-light leading-relaxed">
            From initial resume parse to final candidate onboarding. Connect your hiring workflow into an enterprise recruiting funnel.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { step: '01', title: 'OCR Parse', desc: 'Extract clean metadata profiles from raw PDF uploads.' },
            { step: '02', title: 'Taxonomy Match', desc: 'Assess skills and map candidate overlap matrices.' },
            { step: '03', title: 'AI Conversational Bot', desc: 'Execute practice technical voice and text interviews.' },
            { step: '04', title: 'Leaderboards & Contract', desc: 'Review overall candidate rankings and trigger offer approvals.' },
          ].map((item, idx) => (
            <GlassCard key={idx} className="p-6 relative overflow-hidden group hover:border-brand-cyan/25 transition-all">
              <div className="text-3xl font-black text-brand-cyan/15 group-hover:text-brand-cyan/35 transition-colors mb-4">
                {item.step}
              </div>
              <h4 className="text-slate-100 font-bold text-base mb-2">{item.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-light">{item.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* 9. Testimonials */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24 border-b border-white/[0.03]">
        <div className="text-center mb-16">
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-brand-cyan block mb-2">06 / Customer Reviews</span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Trusted by recruiters worldwide
          </h2>
          <p className="text-slate-400 text-sm mt-3">
            See what talent leaders are saying about the AI Hiring platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <GlassCard key={idx} className="p-8 relative flex flex-col justify-between overflow-hidden bg-white/[0.01]">
              <Quote className="w-8 h-8 text-brand-cyan/10 absolute top-4 right-4" />
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light italic mb-6">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-cyan/10 border border-brand-cyan/25 text-brand-cyan flex items-center justify-center font-extrabold text-xs">
                  {t.avatar}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">{t.author}</h4>
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mt-0.5 block">{t.role}</span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* 10. CTA */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <GlassCard className="p-12 relative overflow-hidden rounded-3xl text-center border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-gradient-radial">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-brand-cyan to-transparent opacity-50" />
          <div className="absolute -top-32 left-1/2 transform -translate-x-1/2 w-96 h-96 rounded-full bg-brand-cyan/10 blur-[100px] pointer-events-none" />

          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to Upgrade Your Hiring Terminal?
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed font-light">
            Deploy automated AI matching, run conversational mock interviews, and evaluate candidate analytics inside a single dashboard.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/register">
              <Button variant="primary" className="px-8 py-3.5 text-xs uppercase font-bold tracking-wider">
                Create Account
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="text-slate-400 hover:text-white text-xs uppercase font-bold tracking-wider px-6 py-3.5">
                Talk to Sales
              </Button>
            </Link>
          </div>
        </GlassCard>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] py-10 text-center text-[10px] text-slate-500 tracking-wider uppercase font-semibold">
        <p>&copy; {new Date().getFullYear()} AI Hiring Suite. All Rights Reserved. Built using Next.js & FastAPI.</p>
      </footer>
    </div>
  );
}
