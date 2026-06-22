import { create } from 'zustand';
import type { GenerateInterviewResponse, GeneratedQuestion, InterviewResult, Interview } from '@/types';
import { interviews } from '@/lib/api/endpoints';

interface InterviewState {
  // Active session — typed to the actual /generate response shape (interview_id, not id)
  currentInterview: GenerateInterviewResponse | Interview | null;
  questions: GeneratedQuestion[];
  currentQuestionIndex: number;
  answers: Record<number, string>;
  evaluations: Record<number, InterviewResult>;
  isLoading: boolean;
  isEvaluating: boolean;
  startInterview: (data: {
    candidate_id: number;
    job_id: number;
    interview_type: string;
    category?: string;
    difficulty: string;
  }) => Promise<void>;
  submitAnswer: (answer: string) => Promise<void>;
  nextQuestion: () => void;
  previousQuestion: () => void;
  completeInterview: () => Promise<Interview | null>;
  submitVoiceAnswer: (audioBlob: Blob, emotionBlob?: Blob) => Promise<void>;
  reset: () => void;
}

const initialState = {
  currentInterview: null,
  questions: [] as GeneratedQuestion[],
  currentQuestionIndex: 0,
  answers: {} as Record<number, string>,
  evaluations: {} as Record<number, InterviewResult>,
  isLoading: false,
  isEvaluating: false,
};

export const useInterviewStore = create<InterviewState>((set, get) => ({
  ...initialState,

  startInterview: async (data) => {
    set({ isLoading: true });
    try {
      const response = await interviews.generate(data);
      // response.interview_id is now correctly typed — no more undefined
      set({
        currentInterview: response,
        questions: response.questions ?? [],
        currentQuestionIndex: 0,
        answers: {},
        evaluations: {},
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to start interview:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  submitAnswer: async (answer: string) => {
    const { currentInterview, currentQuestionIndex, questions } = get();
    if (!currentInterview || !questions[currentQuestionIndex]) return;

    set((state) => ({
      answers: { ...state.answers, [currentQuestionIndex]: answer },
      isEvaluating: true,
    }));

    try {
      // Resolve interview_id from whichever shape is in the store.
      // GenerateInterviewResponse uses interview_id; Interview uses id.
      const interviewId =
        'interview_id' in currentInterview
          ? currentInterview.interview_id
          : (currentInterview as Interview).id;

      const evaluation = await interviews.evaluate({
        interview_id: interviewId,
        question_number: currentQuestionIndex + 1,
        candidate_answer: answer,
      });

      set((state) => ({
        evaluations: { ...state.evaluations, [currentQuestionIndex]: evaluation },
        isEvaluating: false,
      }));
    } catch (error) {
      console.error('Failed to evaluate answer:', error);
      set({ isEvaluating: false });
      throw error;
    }
  },

  submitVoiceAnswer: async (audioBlob: Blob, emotionBlob?: Blob) => {
    const { currentInterview, currentQuestionIndex, questions } = get();
    if (!currentInterview || !questions[currentQuestionIndex]) return;

    set({ isEvaluating: true });

    try {
      const interviewId =
        'interview_id' in currentInterview
          ? currentInterview.interview_id
          : (currentInterview as Interview).id;

      const questionNumber = currentQuestionIndex + 1;

      // 1. Submit voice recording for transcription & evaluation
      const voiceResult = await interviews.voiceInterview(interviewId, questionNumber, audioBlob);

      // 2. Submit webcam snapshot if available
      if (emotionBlob) {
        try {
          await interviews.emotionAnalysis(interviewId, questionNumber, emotionBlob);
        } catch (e) {
          console.error('Failed to submit emotion snapshot:', e);
        }
      }

      const evaluation: InterviewResult = {
        question_number: voiceResult.question_number,
        question_text: questions[currentQuestionIndex].question,
        candidate_answer: voiceResult.transcript,
        score: voiceResult.score,
        feedback: voiceResult.feedback,
      };

      set((state) => ({
        answers: { ...state.answers, [currentQuestionIndex]: voiceResult.transcript },
        evaluations: { ...state.evaluations, [currentQuestionIndex]: evaluation },
        isEvaluating: false,
      }));
    } catch (error) {
      console.error('Failed to submit voice answer:', error);
      set({ isEvaluating: false });
      throw error;
    }
  },

  nextQuestion: () => {
    const { currentQuestionIndex, questions } = get();
    if (currentQuestionIndex < questions.length - 1) {
      set({ currentQuestionIndex: currentQuestionIndex + 1 });
    }
  },

  previousQuestion: () => {
    const { currentQuestionIndex } = get();
    if (currentQuestionIndex > 0) {
      set({ currentQuestionIndex: currentQuestionIndex - 1 });
    }
  },

  completeInterview: async () => {
    const { currentInterview } = get();
    if (!currentInterview) return null;

    // Resolve the numeric interview ID regardless of response shape
    const interviewId =
      'interview_id' in currentInterview
        ? currentInterview.interview_id
        : (currentInterview as Interview).id;

    set({ isLoading: true });
    try {
      const result = await interviews.complete(interviewId);
      set({ currentInterview: result, isLoading: false });
      return result;
    } catch (error) {
      console.error('Failed to complete interview:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  reset: () => {
    set(initialState);
  },
}));
