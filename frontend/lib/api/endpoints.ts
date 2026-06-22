import client from './client';
import type {
  AuthResponse,
  User,
  Resume,
  ParsedResume,
  CandidateSkill,
  Skill,
  Job,
  MatchResult,
  Ranking,
  Interview,
  InterviewResult,
  GenerateInterviewResponse,
  DashboardStats,
  DashboardAnalytics,
  Offer,
} from '@/types';

// ─── Authentication ───────────────────────────────────────────────────────────

export const auth = {
  login: (email: string, password: string): Promise<AuthResponse> =>
    client.post('/auth/login', { email, password }).then((r) => r.data),

  register: (data: {
    email: string;
    password: string;
    full_name: string;
    role: string;
  }): Promise<AuthResponse> =>
    client.post('/auth/register', data).then((r) => r.data),

  getMe: (): Promise<User> =>
    client.get('/auth/me').then((r) => r.data),
};

// ─── Resumes ──────────────────────────────────────────────────────────────────

export const resumes = {
  upload: (file: File): Promise<Resume> => {
    const formData = new FormData();
    formData.append('file', file);
    return client
      .post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  list: (): Promise<Resume[]> =>
    client.get('/resumes').then((r) => r.data),

  parse: (id: number): Promise<ParsedResume> =>
    client.post(`/resumes/${id}/parse`).then((r) => r.data),
};

// ─── Skills ───────────────────────────────────────────────────────────────────

export const skills = {
  extract: (resumeId: number): Promise<CandidateSkill[]> =>
    client.post(`/skills/extract/${resumeId}`).then((r) => r.data),

  list: (): Promise<Skill[]> =>
    client.get('/skills').then((r) => r.data),
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export const jobs = {
  list: (): Promise<Job[]> =>
    client.get('/jobs').then((r) => r.data),

  getById: (id: number): Promise<Job> =>
    client.get(`/jobs/${id}`).then((r) => r.data),

  create: (data: Partial<Job>): Promise<Job> =>
    client.post('/jobs', data).then((r) => r.data),

  analyze: (description: string): Promise<Record<string, unknown>> =>
    client.post('/jobs/analyze', { description }).then((r) => r.data),

  importDataset: (): Promise<{ imported_count: number }> =>
    client.post('/jobs/import-dataset').then((r) => r.data),
};

// ─── Matching ─────────────────────────────────────────────────────────────────

export const matching = {
  matchCandidate: (candidateId: number): Promise<MatchResult[]> =>
    client.post(`/matching/candidate/${candidateId}`).then((r) => r.data),

  getCandidateMatches: (candidateId: number): Promise<MatchResult[]> =>
    client.get(`/matching/candidate/${candidateId}/jobs`).then((r) => r.data),
};

// ─── Rankings ─────────────────────────────────────────────────────────────────

export const rankings = {
  getByJob: (jobId: number): Promise<Ranking[]> =>
    client.get(`/rankings/job/${jobId}`).then((r) => r.data),

  getTop: (): Promise<Ranking[]> =>
    client.get('/rankings/top').then((r) => r.data),
};

// ─── Interviews ───────────────────────────────────────────────────────────────

export const interviews = {
  /**
   * Generate a new interview session.
   * Returns GenerateInterviewResponse with interview_id (not id).
   */
  generate: (data: {
    candidate_id: number;
    job_id: number;
    interview_type: string;
    category?: string;
    difficulty: string;
  }): Promise<GenerateInterviewResponse> =>
    client.post('/interviews/generate', data).then((r) => r.data),

  /**
   * Submit a candidate's answer for AI evaluation.
   * Only sends the fields the backend AnswerSubmitRequest actually requires.
   */
  evaluate: (data: {
    interview_id: number;
    question_number: number;
    candidate_answer: string;
  }): Promise<InterviewResult> =>
    client.post('/interviews/evaluate', data).then((r) => r.data),

  getById: (id: number): Promise<Interview> =>
    client.get(`/interviews/${id}`).then((r) => r.data),

  /**
   * Complete a finished interview.
   * Triggers Gemini summary feedback generation on the backend — uses a
   * 120-second per-request timeout to accommodate slow Gemini responses.
   */
  complete: (id: number): Promise<Interview> =>
    client.post(`/interviews/${id}/complete`, {}, { timeout: 120000 }).then((r) => r.data),

  getCategories: (): Promise<string[]> =>
    client.get('/interviews/categories').then((r) => r.data),

  voiceInterview: (
    interviewId: number,
    questionNumber: number,
    file: Blob
  ): Promise<{
    question_number: number;
    transcript: string;
    score: number;
    feedback: string;
    audio_path: string;
  }> => {
    const formData = new FormData();
    formData.append('question_number', String(questionNumber));
    formData.append('file', file, 'voice.wav');
    return client
      .post(`/interviews/${interviewId}/voice-interview`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  emotionAnalysis: (
    interviewId: number,
    questionNumber: number,
    file: Blob
  ): Promise<{
    question_number: number;
    emotion: string;
    analytics: Record<string, unknown>;
  }> => {
    const formData = new FormData();
    formData.append('question_number', String(questionNumber));
    formData.append('file', file, 'snapshot.jpg');
    return client
      .post(`/interviews/${interviewId}/emotion-analysis`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  getAllReports: (): Promise<Interview[]> =>
    client.get('/interviews/reports/all').then((r) => r.data),

  getReportById: (id: number): Promise<Interview> =>
    client.get(`/interviews/reports/${id}`).then((r) => r.data),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboard = {
  getStats: (): Promise<DashboardStats> =>
    client.get('/dashboard/stats').then((r) => r.data),

  getAnalytics: (): Promise<DashboardAnalytics> =>
    client.get('/dashboard/analytics').then((r) => r.data),
};

export const offers = {
  create: (data: {
    candidate_id: number;
    job_id: number;
    salary_offered: string;
  }): Promise<Offer> =>
    client.post('/offers/', data).then((r) => r.data),

  getByCandidate: (candidateId: number): Promise<Offer[]> =>
    client.get(`/offers/candidate/${candidateId}`).then((r) => r.data),

  respond: (offerId: number, status: 'accepted' | 'declined'): Promise<Offer> =>
    client.post(`/offers/${offerId}/respond`, { status }).then((r) => r.data),
};

// ─── Schedules ────────────────────────────────────────────────────────────────

import type { InterviewSchedule } from '@/types';

export const schedules = {
  create: (data: {
    candidate_id: number;
    job_id?: number;
    scheduled_time: string;
    duration_minutes?: number;
    meeting_link?: string;
  }): Promise<InterviewSchedule> =>
    client.post('/schedules/', data).then((r) => r.data),

  list: (): Promise<InterviewSchedule[]> =>
    client.get('/schedules/').then((r) => r.data),

  updateStatus: (id: number, status: 'scheduled' | 'completed' | 'canceled' | 'rescheduled'): Promise<InterviewSchedule> =>
    client.put(`/schedules/${id}/status`, { status }).then((r) => r.data),

  update: (id: number, data: {
    scheduled_time?: string;
    duration_minutes?: number;
    meeting_link?: string;
  }): Promise<InterviewSchedule> =>
    client.put(`/schedules/${id}`, data).then((r) => r.data),

  cancel: (id: number): Promise<InterviewSchedule> =>
    client.post(`/schedules/${id}/cancel`).then((r) => r.data),
};

// ─── Chatbot ──────────────────────────────────────────────────────────────────

import type { ChatMessage } from '@/types';

export const chatbot = {
  getHistory: (sessionId?: string): Promise<ChatMessage[]> =>
    client.get('/chatbot/history', { params: { session_id: sessionId } }).then((r) => r.data),

  clearSession: (sessionId?: string): Promise<{ status: string }> =>
    client.delete('/chatbot/session', { params: { session_id: sessionId } }).then((r) => r.data),
};

// ─── Emails ───────────────────────────────────────────────────────────────────

export const emails = {
  send: (data: { candidate_id: number; job_id?: number; email_type: string }): Promise<{ status: string }> =>
    client.post('/emails/send', data).then((r) => r.data),

  getLogs: (): Promise<any[]> =>
    client.get('/emails/logs').then((r) => r.data),
};

// ─── Predictions ──────────────────────────────────────────────────────────────

export const predictions = {
  salary: (candidateId: number, jobId?: number): Promise<any> =>
    client.post('/predictions/salary', { candidate_id: candidateId, job_id: jobId }).then((r) => r.data),

  offerAcceptance: (candidateId: number, jobId: number, salaryOffered: number): Promise<any> =>
    client.post('/predictions/offer-acceptance', { candidate_id: candidateId, job_id: jobId, salary_offered: salaryOffered }).then((r) => r.data),

  attrition: (candidateId: number, jobId: number): Promise<any> =>
    client.post('/predictions/attrition', { candidate_id: candidateId, job_id: jobId }).then((r) => r.data),
};
