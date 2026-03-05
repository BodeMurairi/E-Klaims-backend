export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Hello! I'm your E-Klaims AI assistant. I can help you understand our insurance products, guide you through the onboarding process, and answer questions about required documents. How can I help you today?",
    timestamp: Date.now(),
  },
];
