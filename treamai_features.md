# TreamAI Feature Documentation

This document serves as a comprehensive index of all the functionalities currently implemented and available on the TreamAI platform.

## 1. User Authentication & Profile Management
- **Account Creation & Login**: Secure registration and login flow.
- **Rate Limiting**: IP-based rate limiting on login attempts to prevent brute-force attacks.
- **Password Reset**: Token-based password recovery system.
- **Profile Customization**: Users can seamlessly update their username across the platform.
- **Distinct Avatars**: Deterministic SHA-256 color generation based on User ID and Space ID to give everyone a unique, recognizable color in chats.

## 2. Friends System
- **Friend Requests**: Send outgoing requests, and accept/reject incoming requests.
- **Dynamic Layout**: A customized 2-column interface on Desktop (1-column on Mobile) for managing the network.
- **Outgoing Request Management**: Dedicated section to view and cancel pending outgoing requests.
- **Notification Hub**: Centralized notifications tab for accepting/rejecting incoming requests.
- **Custom Nicknames**: Users can assign local nicknames to friends. These nicknames dynamically replace the friend's original username everywhere in the UI (chat messages, sidebars, member lists).
- **Unfriending**: Removing a friend automatically cascades and cleans up associated database records (like nicknames).

## 3. Real-Time Messaging & Chat Rooms
- **Private & Team Chats**: Support for 1-on-1 direct messages and multi-member team environments.
- **Join by Code**: Users can securely join a team chat using a unique chat code.
- **Live WebSockets**: Real-time message delivery without page reloads.
- **Unread Badges**: Real-time unread message counters in the sidebar.
- **Chat Descriptions**: Team chats support editable descriptions to outline the group's purpose.

## 4. Group Lifecycle & Moderation
- **Leave Chat**: Users can leave a team chat. 
  - They are frozen in time (can view history up to that point, but the input box is locked).
  - A red `Left` badge appears next to the chat in their sidebar.
  - They are smartly hidden from the active "Members" list in the chat info page.
- **Rejoining**: If a user rejoins a chat they previously left, the database seamlessly reinstates them, updates their join time, and reactivates their messaging privileges.
- **System Announcements**: WhatsApp-style centered notification pills broadcast to the room whenever a user `joined` or `left` the chat.
- **Soft Deletion**: Users can delete chats from their sidebar. The backend utilizes "soft deletion", preserving their legacy messages for the rest of the group while hiding the chat from the user's view.
- **Ownership Transfer**: If the `owner` of a team chat leaves or deletes the chat, ownership is automatically transferred to the next oldest active member.
- **Auto-Cleanup**: If the final active member leaves/deletes a chat, the backend automatically executes a hard-delete, wiping all associated buffers, projects, and tables to save space.

## 5. TreamAI Agent Capabilities
- **Private Agent DMs**: Users can DM the TreamAI Agent directly. The agent bypasses standard classification and responds conversationally and immediately.
- **Team Chat Integration**: The agent can be added to team environments.
- **Smart Mentions**: In team chats, the agent responds when explicitly mentioned (e.g., `@agent`, or starting a message with `?`).
- **AI Listening Toggle**: Users can toggle the AI's "listening" status in chat info menus to control its autonomy in team settings.
- **Typing Indicators**: Animated typing dots (`.`, `..`, `...`) appear in the chat room while the agent is generating a response.
- **Context-Aware Memory**: The agent weights recent chat context and project data (Semantic Similarity & Recency) to provide highly relevant answers.

## 6. UI / UX Design
- **Responsive Architecture**: Fluid scaling between mobile and desktop environments.
- **Mobile Sidebar**: The mobile view features a specialized 100dvh layout with a smooth toggle button to hide/reveal the navigation sidebar.
- **Glassmorphism**: Sleek glass-panel overlays for modals and prompts (like the Permanent Delete Warning modal).
- **Smart Navigation**: Sidebar menus intelligently collapse and feature "Show More..." links that dynamically appear based on active chat counts.
