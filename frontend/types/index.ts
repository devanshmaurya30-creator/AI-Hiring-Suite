// ─── User & Authentication ────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'hr' | 'candidate';
}

export interface Candidate {
  id: number;
  user_id: number;
  phone: string;
  education: string;
  years_experience: number;
  current_title: string;
  summary: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  candidate?: Candidate;
}

// ─── Resume & Parsing ─────────────────────────────────────────────────────────

export interface Resume {
  id: number;
  candidate_id: number;
  filename: string;
  file_type: string;
  parsed_data: ParsedResume | null;
  raw_text: string;
  status: string;
  uploaded_at: string;
}

export interface ParsedResume {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  education: Education[];
  experience: Experience[];
  projects: Project[];
  certifications: string[];
}

export interface Education {
  degree: string;
  institution: string;
  year: string;
}

export interface Experience {
  title: string;
  company: string;
  duration: string;
  description: string;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export interface Job {
  id: number;
  title: string;
  company: string;
  description: string;
  required_skills: string;
  min_experience: number;
  max_experience: number;
  responsibilities: string;
  location: string;
  salary_range: string;
  status: string;
  created_at: string;
}

// ─── Skills ───────────────────────────────────────────────────────────────────

export interface Skill {
  id: number;
  name: string;
  category: string;
}

export interface CandidateSkill {
  id: number;
  candidate_id: number;
  skill_id: number;
  skill_name: string;
  proficiency_level: string;
}

// ─── Interviews ───────────────────────────────────────────────────────────────

/**
 * Shape returned by POST /api/interviews/generate.
 * Uses interview_id (not id) to match the backend response key exactly,
 * preventing the interview_id: undefined bug when evaluating answers.
 * status is included so page.tsx can branch between in_progress / completed.
 */
export interface GenerateInterviewResponse {
  interview_id: number;
  interview_type: 'technical' | 'hr';
  /** 'in_progress' immediately after generation */
  status: string;
  questions: GeneratedQuestion[];
}

/**
 * A single question as returned inside the /generate response.
 * Backend shape: { question_number, question, expected_answer }
 */
export interface GeneratedQuestion {
  question_number: number;
  question: string;
  expected_answer: string;
}

/**
 * Full interview record — returned by GET /api/interviews/:id
 * and POST /api/interviews/:id/complete.
 */
export interface Interview {
  id: number;
  candidate_id: number;
  job_id: number;
  interview_type: 'technical' | 'hr';
  status: string;
  total_score: number | null;
  feedback: string | null;
  started_at?: string;
  completed_at?: string;
  results?: InterviewResult[];
}

export interface InterviewResult {
  id?: number;
  question_number: number;
  question_text: string;
  candidate_answer: string;
  score: number;
  feedback: string;
}

// ─── Matching ─────────────────────────────────────────────────────────────────

export interface MatchResult {
  job_id: number;
  job_title: string;
  company: string;
  location?: string;
  match_percentage: number;
  overall_score?: number;
  matched_skills: string[];
  missing_skills: string[];
  skill_gap_analysis: string;
  recommendation: string;
}

// ─── Rankings ─────────────────────────────────────────────────────────────────

export interface Ranking {
  id: number;
  candidate_id: number;
  candidate_name: string;
  job_id: number;
  job_title?: string;
  resume_score: number;
  skill_match_score: number;
  experience_score: number;
  interview_score: number;
  overall_score: number;
  recommendation: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_candidates: number;
  total_jobs: number;
  interviews_conducted: number;
  avg_match_score: number;
  top_candidates: Ranking[];
}

export interface DashboardAnalytics {
  hiring_funnel: {
    applied: number;
    screened: number;
    interviewed: number;
    offered: number;
    hired: number;
  };
  candidate_pipeline: {
    applied: number;
    screened: number;
    interviewed: number;
    offered: number;
    hired: number;
  };
  offer_conversion_rate: number;
  skill_distribution: { skill: string; count: number }[];
  match_score_distribution: { range: string; count: number }[];
  job_match_distribution: { range: string; count: number }[];
  interview_analytics: {
    avg_score: number;
    total: number;
    by_type: { technical: number; hr: number };
  };
  hiring_trends: { month: string; candidates: number; interviews: number; hires?: number }[];
  fraud_alerts: FraudAlert[];
  suspicious_candidates?: SuspiciousCandidate[];
  duplicate_resume_analytics?: DuplicateResumeAnalytics;
  candidate_similarity_heatmap?: CandidateSimilarityItem[];
  fraud_trend_charts?: FraudTrendItem[];
  emotion_analytics?: { emotion: string; count: number }[];
  voice_interview_analytics?: {
    voice_answers_submitted: number;
    average_voice_score: number;
    voice_vs_text_ratio: { voice: number; text: number };
  };
}

export interface SuspiciousCandidate {
  candidate_id: number;
  name: string;
  fraud_score: number;
  risk_level: string;
  explanation: string;
  recommended_action: string;
}

export interface DuplicateResumeAnalytics {
  duplicate_emails: number;
  duplicate_phones: number;
  duplicate_linkedins: number;
  duplicate_githubs: number;
}

export interface CandidateSimilarityItem {
  candidate_1: string;
  candidate_2: string;
  similarity: number;
}

export interface FraudTrendItem {
  date: string;
  alerts: number;
  critical: number;
}

export interface FraudAlert {
  id: number;
  candidate_name: string;
  fraud_score: number;
  reason: string;
  detected_at: string;
}

export interface Offer {
  id: number;
  candidate_id: number;
  job_id: number;
  job_title: string;
  company: string;
  salary_offered: string;
  status: 'pending' | 'accepted' | 'declined';
  sent_at: string;
  responded_at?: string | null;
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string;
}

// ─── Schedules ────────────────────────────────────────────────────────────────

export interface InterviewSchedule {
  id: number;
  candidate_id: number;
  job_id: number | null;
  scheduled_time: string;
  duration_minutes: number;
  meeting_link: string | null;
  status: 'scheduled' | 'completed' | 'canceled' | 'rescheduled';
  created_at: string;
  candidate?: {
    id: number;
    user_id: number;
    full_name: string;
    email: string;
  };
  job?: {
    id: number;
    title: string;
  };
}

// ─── Chatbot ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id?: number;
  candidate_id?: number;
  role: 'user' | 'assistant';
  content: string;
  session_id?: string;
  created_at?: string;
}

export interface ChatResponse {
  message: string;
}

// ─── Email Pipeline ───────────────────────────────────────────────────────────

export interface EmailLog {
  id: number;
  candidate_id?: number;
  job_id?: number;
  email_type: string;
  recipient_email: string;
  subject: string;
  body: string;
  status: string;
  sent_at?: string;
  created_at: string;
}

export interface EmailTemplate {
  type: string;
  subject: string;
  body_html: string;
}

export interface EmailSendRequest {
  candidate_id: number;
  job_id?: number;
  email_type: string;
}

// ─── ML Predictions ───────────────────────────────────────────────────────────

export interface SalaryPrediction {
  predicted_salary: number;
  min_salary: number;
  max_salary: number;
  confidence: number;
}

export interface OfferAcceptancePrediction {
  probability: number;
  factors: Record<string, any>;
  confidence: number;
}

export interface AttritionPrediction {
  risk_score: number;
  risk_level: string;
  factors: Record<string, any>;
  confidence: number;
}

// ─── Interviews Enhancements ──────────────────────────────────────────────────

export interface InterviewReport {
  id: number;
  candidate_id: number;
  job_id: number | null;
  interview_type: string;
  total_score: number | null;
  feedback: string | null;
  results: InterviewResult[];
}

export interface SpeechEmotionResult {
  tone: string;
  pace: string;
  confidence: number;
  stress_level: number;
}

export interface PostureAnalysis {
  posture: string;
  engagement: number;
  gesture_frequency: string;
}

// ─── Pipeline Board ───────────────────────────────────────────────────────────

export interface PipelineCandidate {
  id: number;
  candidate_id: number;
  name: string;
  score: number;
  status: string;
}

export interface PipelineColumn {
  id: string;
  title: string;
  candidates: PipelineCandidate[];
}

