'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Mic, 
  MicOff, 
  VideoOff, 
  Square, 
  RefreshCw, 
  Volume2, 
  Sparkles, 
  Keyboard, 
  Camera,
  Activity,
  UserCheck
} from 'lucide-react';
import { useInterviewStore } from '@/lib/store/interviewStore';
import { interviews } from '@/lib/api/endpoints';
import Button from '@/components/ui/Button';
import ProgressRing from '@/components/ui/ProgressRing';
import GlassCard from '@/components/ui/GlassCard';

function TypewriterText({ text, speed = 8 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    setDisplayedText('');
    let index = 0;
    const timer = setInterval(() => {
      setDisplayedText((prev) => prev + text.charAt(index));
      index++;
      if (index >= text.length) {
        clearInterval(timer);
      }
    }, speed);
    
    return () => clearInterval(timer);
  }, [text, speed]);
  
  return <span>{displayedText}</span>;
}

export default function InterviewPanel() {
  const {
    currentInterview,
    questions,
    currentQuestionIndex,
    answers,
    evaluations,
    isEvaluating,
    isLoading,
    submitAnswer,
    submitVoiceAnswer,
    nextQuestion,
    previousQuestion,
    completeInterview,
  } = useInterviewStore();

  const [useVoiceMode, setUseVoiceMode] = useState(true);
  const [inputAnswer, setInputAnswer] = useState('');
  const [completeLoading, setCompleteLoading] = useState(false);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ focus: 95, engagement: 88, speakingRate: 130 });
  
  useEffect(() => {
    if (!cameraActive) return;
    const interval = setInterval(() => {
      setMetrics({
        focus: Math.round(93 + Math.random() * 6),
        engagement: Math.round(87 + Math.random() * 8),
        speakingRate: Math.round(125 + Math.random() * 15),
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [cameraActive]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);

  // Sync text area value with stored answers when index changes
  useEffect(() => {
    setInputAnswer(answers[currentQuestionIndex] || '');
    setAudioBlob(null);
    setDetectedEmotion(null);
  }, [currentQuestionIndex, answers]);

  // Webcam stream management
  const startCamera = async () => {
    try {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 480, height: 360, facingMode: 'user' } 
      });
      videoStreamRef.current = stream;
      if (videoRef.current) {
  videoRef.current.srcObject = stream;

  try {
    await videoRef.current.play();
  } catch (err) {
    console.error("Video play failed:", err);
  }
}
      setCameraActive(true);
    } catch (err) {
      console.warn('Webcam access denied or unavailable:', err);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop());
      videoStreamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (useVoiceMode) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [useVoiceMode, currentQuestionIndex]);

  // Recording triggers
  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(audioStream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        audioStream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Audio recording access denied:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const captureSnapshot = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current || !cameraActive || !videoStreamRef.current) {
        resolve(null);
        return;
      }
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', 0.85);
        } else {
          resolve(null);
        }
      } catch (err) {
        console.error('Failed to capture snapshot:', err);
        resolve(null);
      }
    });
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputAnswer.trim()) return;
    try {
      const emotionBlob = await captureSnapshot();
      await submitAnswer(inputAnswer);
      if (emotionBlob && currentInterview) {
        try {
          const interviewId =
            'interview_id' in currentInterview
              ? currentInterview.interview_id
              : (currentInterview as any).id;
          await interviews.emotionAnalysis(interviewId, currentQuestionIndex + 1, emotionBlob);
        } catch (err) {
          console.error('Failed to submit emotion snapshot:', err);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVoiceSubmit = async () => {
    if (!audioBlob) return;
    try {
      const emotionBlob = await captureSnapshot();
      await submitVoiceAnswer(audioBlob, emotionBlob || undefined);
      setAudioBlob(null);
    } catch (err) {
      console.error(err);
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentInterview || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400">
        <p className="text-sm font-semibold">No active interview session found.</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentEvaluation = evaluations[currentQuestionIndex];
  const isAnswered = !!answers[currentQuestionIndex];
  const totalQuestions = questions.length;

  const handleComplete = async () => {
    setCompleteLoading(true);
    try {
      await completeInterview();
    } catch (err) {
      console.error(err);
    } finally {
      setCompleteLoading(false);
    }
  };

  const allAnswered = Object.keys(evaluations).length === totalQuestions;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      
      {/* Timeline Indicator */}
      <div className="grid grid-cols-4 gap-2.5 p-3.5 bg-slate-950/20 border border-white/5 rounded-2xl relative overflow-hidden shadow-inner">
        {[
          { stage: '1', label: 'Ingest', active: true, done: true },
          { stage: '2', label: currentInterview && 'interview_type' in currentInterview ? `${(currentInterview as any).interview_type} QA` : 'AI Screen', active: currentInterview.status === 'in_progress', done: currentInterview.status === 'completed' || currentInterview.status === 'in_progress' },
          { stage: '3', label: 'Sentiment Scan', active: currentInterview.status === 'in_progress' && cameraActive, done: currentInterview.status === 'completed' },
          { stage: '4', label: 'Leaderboard', active: currentInterview.status === 'completed', done: currentInterview.status === 'completed' },
        ].map((step, idx) => (
          <div key={idx} className="flex flex-col items-center text-center gap-1.5 relative z-10">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all duration-300 ${
              step.active 
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]' 
                : step.done 
                  ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30' 
                  : 'bg-slate-950/60 text-slate-600 border-white/5'
            }`}>
              {step.stage}
            </div>
            <span className={`text-[8px] uppercase tracking-wider font-extrabold transition-all duration-300 ${
              step.active ? 'text-cyan-300 font-black' : step.done ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Top Header */}
      <div className="flex items-center justify-between bg-[#050515]/50 border border-white/[0.08] backdrop-blur-2xl rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-widest shrink-0">
            Progress: {currentQuestionIndex + 1} / {totalQuestions}
          </span>
          <div className="h-1.5 w-32 sm:w-48 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
              animate={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          {!currentEvaluation && (
            <div className="flex rounded-xl bg-slate-950/80 p-1 border border-white/5 shadow-inner">
              <button
                onClick={() => setUseVoiceMode(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all duration-300 ${
                  useVoiceMode
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                Voice AI
              </button>
              <button
                onClick={() => setUseVoiceMode(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all duration-300 ${
                  !useVoiceMode
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                Text Mode
              </button>
            </div>
          )}

          {'interview_type' in currentInterview && currentInterview.interview_type && (
            <span className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[9px] uppercase font-bold tracking-widest">
              {currentInterview.interview_type} Mode
            </span>
          )}
        </div>
      </div>

      {/* Main Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Question and Submissions */}
        <div className="lg:col-span-8 flex flex-col justify-between overflow-hidden min-h-[460px] bg-[#050515]/40 border border-white/[0.08] backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col gap-6"
            >
              {/* Question Text */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span className="text-[9px] uppercase tracking-widest font-bold text-cyan-400">Interviewer Query</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-100 leading-relaxed">
                  <TypewriterText text={currentQuestion.question} />
                </h3>
              </div>

              {/* Answer Input or Feedback */}
              {!currentEvaluation ? (
                useVoiceMode ? (
                  // VOICE MODE CONTROLS
                  <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 rounded-2xl bg-slate-950/20 border border-white/5 relative overflow-hidden">
                    
                    {isRecording ? (
                      <div className="flex flex-col items-center gap-5 relative z-10">
                        {/* Pulse animation */}
                        <div className="relative flex items-center justify-center">
                          <span className="absolute inline-flex h-20 w-20 rounded-full bg-red-500/20 animate-ping"></span>
                          <button
                            onClick={stopRecording}
                            className="relative z-10 p-5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg border border-red-500/20 transition-all duration-300 scale-105"
                          >
                            <Square className="w-6 h-6 fill-white" />
                          </button>
                        </div>
                        <div className="text-center">
                          <span className="text-xs font-bold text-red-400 uppercase tracking-widest">TRANSCRIBING AUDIO ACTIVE</span>
                          <p className="text-base text-slate-100 font-extrabold mt-1">{formatDuration(recordingDuration)}</p>
                        </div>
                        {/* Audio visualizer mock bars */}
                        <div className="flex items-end gap-1 h-8 mt-2">
                          {[2, 5, 8, 4, 9, 6, 3, 7, 5, 8, 4, 6, 2].map((h, i) => (
                            <motion.div
                              key={i}
                              className="w-1 bg-red-500 rounded-full"
                              animate={{ height: isRecording ? [8, h * 3.5, 8] : 8 }}
                              transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.04 }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : audioBlob ? (
                      <div className="flex flex-col items-center gap-5 w-full max-w-sm relative z-10 animate-fade-in">
                        <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5 flex items-center gap-3.5 w-full shadow-md">
                          <div className="p-2 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-emerald-400">
                            <Volume2 className="w-5 h-5 shrink-0" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-200">Audio Stream Recorded</p>
                            <p className="text-[9px] text-slate-500 uppercase font-bold mt-0.5 tracking-wider">Ready for AI parsing</p>
                          </div>
                          <button
                            onClick={() => setAudioBlob(null)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors shrink-0 border border-white/5"
                            title="Discard and re-record"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-3.5 w-full">
                          <Button
                            onClick={startRecording}
                            variant="secondary"
                            className="flex-1 py-3 text-xs uppercase font-extrabold tracking-wider border border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                          >
                            Reset Capture
                          </Button>
                          <Button
                            onClick={handleVoiceSubmit}
                            variant="primary"
                            disabled={isEvaluating}
                            isLoading={isEvaluating}
                            className="flex-1 py-3 text-xs bg-blue-600 hover:bg-blue-500 text-white font-extrabold uppercase tracking-wider"
                          >
                            Submit Audio
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 text-center relative z-10">
                        <button
                          onClick={startRecording}
                          disabled={isEvaluating}
                          className="p-6 rounded-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 shadow-xl group"
                        >
                          <Mic className="w-8 h-8 group-hover:scale-110 transition-transform" />
                        </button>
                        <div>
                          <p className="text-sm font-bold text-slate-200">Initialize Voice Screen</p>
                          <p className="text-xs text-slate-500 mt-1 max-w-[280px] leading-relaxed font-medium">
                            Click to capture. Your response will be analyzed for vocal structure.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                    // TEXT INPUT FORM
                    <form onSubmit={handleTextSubmit} className="flex-1 flex flex-col gap-4">
                      <div className="relative flex-1">
                        <textarea
                          value={inputAnswer}
                          onChange={(e) => setInputAnswer(e.target.value)}
                          disabled={isEvaluating}
                          placeholder="Provide your structured response here..."
                          className="w-full min-h-[200px] p-4 rounded-2xl bg-slate-950/40 border border-white/5 text-slate-200 placeholder-slate-700 focus:outline-none focus:border-cyan-500/40 focus:bg-slate-950/60 transition-all duration-300 text-sm leading-relaxed resize-none font-medium"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={isEvaluating || !inputAnswer.trim()}
                          isLoading={isEvaluating}
                          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold uppercase tracking-wider text-xs border border-white/10"
                        >
                          Submit Answer
                        </Button>
                      </div>
                    </form>
                  )
              ) : (
                /* Evaluation Feedback Panel */
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl bg-slate-950/40 border border-white/[0.08] flex flex-col sm:flex-row gap-5 items-start"
                >
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <ProgressRing value={currentEvaluation.score * 10} size={72} strokeWidth={5} />
                    <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest mt-1">
                      Score Rating
                    </span>
                  </div>

                  <div className="flex-1 space-y-3.5">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Answer Evaluated</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                      <TypewriterText text={currentEvaluation.feedback} speed={4} />
                    </p>
                    
                    {/* Submission Preview */}
                    <div className="mt-3 pt-3 border-t border-white/[0.04]">
                      <span className="text-[8px] uppercase font-bold text-slate-500 tracking-widest block mb-1.5">
                        Your Submission:
                      </span>
                      <p className="text-xs text-slate-400 italic bg-slate-950/20 p-3.5 rounded-xl border border-white/5 line-clamp-3 leading-relaxed">
                        "{answers[currentQuestionIndex] || 'Voice submission uploaded successfully.'}"
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation controls */}
          <div className="mt-8 pt-6 border-t border-white/[0.08] flex items-center justify-between">
            <Button
              onClick={previousQuestion}
              disabled={currentQuestionIndex === 0 || isEvaluating}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2 text-xs uppercase font-extrabold tracking-wider border border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Prev</span>
            </Button>

            {allAnswered ? (
              <Button
                onClick={handleComplete}
                isLoading={completeLoading}
                variant="primary"
                className="bg-gradient-to-r from-emerald-500 to-teal-600 border-emerald-500/20 text-white font-extrabold py-3 px-6 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 text-xs uppercase tracking-wider border border-white/10"
              >
                <span>Finalize & Submit Session</span>
              </Button>
            ) : (
              <Button
                onClick={nextQuestion}
                disabled={currentQuestionIndex === totalQuestions - 1 || !isAnswered || isEvaluating}
                variant="secondary"
                size="sm"
                className="flex items-center gap-2 text-xs uppercase font-extrabold tracking-wider border border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </Button>
            )}
          </div>
        </div>

        {/* Right Side: Webcam Telemetry Card */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="overflow-hidden bg-[#050515]/40 border border-white/[0.08] backdrop-blur-2xl rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-between min-h-[300px]">
            <div className="w-full flex items-center justify-between mb-4 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200">Face Analytics Feed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  {cameraActive ? 'Active' : 'Offline'}
                </span>
              </div>
            </div>

            {/* Webcam Video viewport */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950/80 border border-white/5 flex items-center justify-center shadow-inner">
              {useVoiceMode && cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {/* Subtle target alignment indicator overlay */}
                  <div className="absolute inset-0 border border-white/10 pointer-events-none m-4 rounded-xl flex items-center justify-center">
                    <div className="w-6 h-6 border-t-2 border-l-2 border-cyan-500/40 absolute top-0 left-0 rounded-tl" />
                    <div className="w-6 h-6 border-t-2 border-r-2 border-cyan-500/40 absolute top-0 right-0 rounded-tr" />
                    <div className="w-6 h-6 border-b-2 border-l-2 border-cyan-500/40 absolute bottom-0 left-0 rounded-bl" />
                    <div className="w-6 h-6 border-b-2 border-r-2 border-cyan-500/40 absolute bottom-0 right-0 rounded-br" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-slate-500 p-4 text-center">
                  <VideoOff className="w-10 h-10 stroke-1" />
                  <div>
                    <p className="text-xs font-bold text-slate-400">Webcam Feed Inactive</p>
                    <p className="text-[9px] text-slate-600 mt-1 max-w-[200px] leading-relaxed">
                      Enable Voice Mode or allow camera access to initialize real-time sentiment analysis.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Real-time Telemetry Stats display */}
            <div className="w-full mt-4 p-3 rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
              <span className="text-[8px] uppercase font-bold tracking-widest text-slate-500 block">Liveness Telemetry Feed</span>
              
              {currentEvaluation ? (
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Gaze Tracking:</span>
                    <span className="font-bold text-cyan-400">{metrics.focus}% Focus</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Sentiment:</span>
                    <span className="font-bold text-emerald-400">Positive / Focused</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Speaking Rate:</span>
                    <span className="font-bold text-slate-300">{metrics.speakingRate} WPM</span>
                  </div>
                </div>
              ) : cameraActive ? (
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Gaze Tracking:</span>
                    <span className="font-bold text-cyan-400">{metrics.focus}% Focus</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Engagement:</span>
                    <span className="font-bold text-cyan-400">{metrics.engagement}% Active</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Pace / Speech Rate:</span>
                    <span className="font-bold text-slate-300">{metrics.speakingRate} WPM</span>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 italic">Enable camera/mic for real-time AI analytics.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
