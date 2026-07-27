# AI Chat & Peer-to-Peer Chat Module Architecture

## Overview
Provides dual communication channels: AI conversational assistants (Gemini, OpenAI, Groq, or emulated local models) and real-time Peer-to-Peer messaging synced via Firestore with WhatsApp/Telegram bridge UI.

## Key Services & Components
- **`ChatService` (`chat.service.ts`):** Manages AI model configuration, prompt execution, and message history.
- **`PeerChatService` (`peer-chat.service.ts`):** Manages real-time contact synchronization from Firestore users and message broker streams (`onSnapshot` on `/chats/{chatId}/messages`).
- **`PeerChatComponent` (`peer-chat.component.ts`):** Responsive chat window with media attachments, unread indicators, and social channel integration.
