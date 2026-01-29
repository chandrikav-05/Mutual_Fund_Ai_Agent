/**
 * API Service - Axios based API calls for Voice Assistant
 */

import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("[API] Request error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(
      "[API] Response error:",
      error.response?.data || error.message,
    );
    return Promise.reject(error);
  },
);

export interface ChatResponse {
  answer: string;
  voice_id?: string;
  user_name?: string;
  announcement?: string;
  announcement_voice_id?: string;
}

export interface SimulateUserResponse {
  message: string;
}

/**
 * Send a question to the chat endpoint
 */
export const sendChatMessage = async (
  question: string,
): Promise<ChatResponse> => {
  const response = await apiClient.post<ChatResponse>("/chat", {
    question,
  });
  return response.data;
};

/**
 * Simulate user turn for demo purposes
 */
export const simulateUserTurn = async (
  sessionId: string,
): Promise<SimulateUserResponse> => {
  const response = await apiClient.post<SimulateUserResponse>(
    "/api/simulate-user",
    {
      sessionId,
    },
  );
  return response.data;
};

export default apiClient;
