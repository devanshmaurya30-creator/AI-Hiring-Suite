import { create } from 'zustand';
import { chatbot } from '@/lib/api/endpoints';
import type { ChatMessage } from '@/types';

interface ChatbotState {
  messages: ChatMessage[];
  isLoading: boolean;
  sessionId: string | null;
  sendMessage: (message: string) => Promise<void>;
  fetchHistory: () => Promise<void>;
  clearSession: () => Promise<void>;
}

export const useChatbotStore = create<ChatbotState>((set, get) => ({
  messages: [],
  isLoading: false,
  sessionId: null,

  sendMessage: async (message: string) => {
    set({ isLoading: true });
    const userMsg: ChatMessage = { role: 'user', content: message };
    set((state) => ({ messages: [...state.messages, userMsg] }));

    try {
      const { sessionId } = get();
      const token = localStorage.getItem('auth_token');
      const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const response = await fetch(`${API_URL}/api/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message, session_id: sessionId || null }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      const aiMsg: ChatMessage = { role: 'assistant', content: '' };
      set((state) => ({ messages: [...state.messages, aiMsg], isLoading: false }));

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              if (data.response) {
                set((state) => {
                  const newMessages = [...state.messages];
                  newMessages[newMessages.length - 1].content += data.response;
                  return { messages: newMessages };
                });
              } else if (data.error) {
                set((state) => {
                  const newMessages = [...state.messages];
                  newMessages[newMessages.length - 1].content = data.error;
                  return { messages: newMessages };
                });
              }
            } catch (e) {
              console.error('Failed to parse stream chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      set({ isLoading: false });
    }
  },

  fetchHistory: async () => {
    set({ isLoading: true });
    try {
      const history = await chatbot.getHistory();
      set({ messages: history, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch history:', error);
      set({ isLoading: false });
    }
  },

  clearSession: async () => {
    try {
      await chatbot.clearSession();
      set({ messages: [], sessionId: null });
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  },
}));
