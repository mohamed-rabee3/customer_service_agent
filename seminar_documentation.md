# Customer Service AI Agents Platform

**Project Type:** Graduation Project (Proof of Concept - POC)
**Date:** January 2026

<br>
<br>
<br>

### Abstract
The **Customer Service AI Agents Platform** is an intelligent, voice-enabled support system designed to modernize customer service. It bridges the gap between automated chatbots and human agents by providing autonomous AI capable of natural conversation, real-time sentiment analysis, and seamless handoff to human supervisors. Our solution aims to resolve routine inquiries instantly while empowering human teams with powerful oversight tools, ensuring efficiency, scalability, and high customer satisfaction.

<br>
<br>

---

<div style="page-break-after: always;"></div>

# Table of Contents

I. [TEAM STRUCTURE](#i-team-structure)
II. [EXECUTIVE SUMMARY](#ii-executive-summary)
III. [HIGH-LEVEL SYSTEM ARCHITECTURE](#iii-high-level-system-architecture)
IV. [OPERATIONAL WORKFLOWS](#iv-operational-workflows)
V. [DEPLOYMENT & TECHNOLOGY STACK](#v-deployment--technology-stack)
VI. [KEY PERFORMANCE INDICATORS (KPIs)](#vi-key-performance-indicators-kpis)
VII. [FUTURE ROADMAP](#vii-future-roadmap)
VIII. [CONCLUSION](#viii-conclusion)

---

<div style="page-break-after: always;"></div>

# I. Team Structure

This project is brought to you by a dedicated team of developers divided into specialized units:

## A. Frontend Team
*   **Omnia Ashraf**
*   **Habiba Amr**
*   **Toqa Sayed**
*   **Basmalla Mohamed**

## B. Backend Team
*   **Yousef Mohamed**
*   **Moaz Mohamed**
*   **Sondos Mossad**
*   **Yasmin Ashraf**

## C. AI Team
*   **Omar Hegazy**
*   **Mohamed Rabiee**
*   **Omar Tamer**
*   **Ahmed Mohamed**
*   **Doha Ashraf**

## D. Testing & Deployment
*   **Amira ElSayed**

## E. App Development
*   **Manar Mosbah**

---

# II. Executive Summary

## A. Project Vision
The **Customer Service AI Agents Platform** is designed to bridge the gap between automated chatbots and human support. Traditional support bots often frustrate users with limited understanding, while human support is expensive and hard to scale. Our solution introduces **intelligent, voice-enabled AI agents** that can handle complex conversations, empathetic responses, and actionable tasks, all while being monitored in real-time by human supervisors.

## B. Core Objectives
*   **Autonomy:** Develop agents capable of resolving 70-80% of routine inquiries without human intervention.
*   **Oversight:** Create a "Human-in-the-Loop" architecture where supervisors can monitor, guide, and take over conversations seamlessly.
*   **Real-Time Intelligence:** Utilize ultralow-latency models to analyze sentiment and satisfaction instantly during calls.
*   **Scalability:** A cloud-native architecture capable of handling concurrent interactions with ease.

---

# III. High-Level System Architecture

The platform operates on a **Single-Backend Architecture** that unifies real-time communication, data persistence, and AI orchestration.

## A. The Three-Layer Design

1.  **Client Layer (The Interfaces)**
    *   *Admin Dashboard (React)*: For system governance, team management, and global analytics.
    *   *Supervisor Dashboard (React)*: The command center for monitoring agents, injecting instructions ("Whisper Mode"), and handling interventions.
    *   *Customer Touchpoint (PWA)*: A mobile-first Progressive Web App that simulates the customer's phone experience, featuring a mock dialer and WebRTC voice capabilities.

2.  **Application & Real-Time Layer (The Core)**
    *   *FastAPI Backend*: The central nervous system handling business logic, API requests, and standard HTTP interactions.
    *   *LiveKit Server*: A dedicated WebRTC engine that manages the audio/video streams between the customer and the AI agents, ensuring sub-second latency.
    *   *SSE (Server-Sent Events)*: A lightweight, unidirectional channel used to stream real-time metrics (like Sentiment Scores) from the server to the dashboard.

3.  **Intelligence & Data Layer (The Brains)**
    *   *AI Services*:
        *   Voice: Powered by **Gemini 2.5 Flash-Lite** for reasoning and **Gemini 2.5 Flash TTS** for speech.
        *   Hearing: **Whisper v3 Large** (deployed via **Groq**) for near-instant Speech-to-Text.
    *   *Database*: **Supabase** (PostgreSQL) is used for storing user profiles, call logs, and configuration, while its **Realtime** feature manages collaborative state updates.

---

# IV. Operational Workflows

## A. The Voice Interaction Flow
1.  **Initiation:** A customer initiates a call via the Mock Phone PWA.
2.  **Routing:** The FastAPI backend identifies an available "Idle" agent and assigns the call.
3.  **Connection:** A LiveKit room is created; the customer and the AI agent join the audio session.
4.  **Conversation:**
    *   The customer speaks -> LiveKit captures audio -> WhisperSTT (Groq) transcribes it.
    *   The text is sent to the AI Agent (Gemini Flash) -> Agent generates a response text.
    *   The response text -> TTS Service -> Audio streamed back to the customer.
5.  **Monitoring:** Concurrent to the call, a lightweight model analyzes the conversation text every 5 seconds to update the "Sentiment Score" on the Supervisor's dashboard.

## B. The "Human-in-the-Loop" Workflow
One of our key differentiators is the supervisor's ability to intervene.
*   **Monitoring:** A supervisor sees cards for up to 3 active agents. If an agent's sentiment drops to "Critical", the card flashes red.
*   **Whisper Mode (Instruction Injection):**
    *   The supervisor clicks "Whisper".
    *   The AI Agent pauses its response stream.
    *   The supervisor types: *"Offer them a 10% discount for the inconvenience."*
    *   The AI acknowledges: *"Received."*
    *   The AI resumes the conversation, seamlessly incorporating the discount offer into its next sentence.
*   **Takeover:** In extreme cases, the supervisor can click "Take Over," effectively muting the AI and connecting their own microphone to the customer.

---

# V. Deployment & Technology Stack

## A. Technology Choices & Justification

| Component | Technology | Why we chose it |
| :--- | :--- | :--- |
| **Backend** | **FastAPI** | High performance, native async support is crucial for handling multiple AI streams, and auto-generated documentation speeds up development. |
| **Real-Time** | **LiveKit** | The best open-source WebRTC infrastructure; handles the complexities of network jitter and audio coding so we don't have to. |
| **Database** | **Supabase** | It gives us a production-ready PostgreSQL DB with built-in Auth and Realtime subscriptions out of the box. |
| **AI Inference** | **Groq & Gemini Live API** | **Groq** delivers LPU (Language Processing Unit) speeds for instant STT transcription. **Gemini Live API** enables real-time, low-latency multidirectional voice interactions. |
| **LLM** | **Gemini 2.5** | Google's latest model offers an excellent balance of reasoning capability, speed (Flash-Lite), and cost-effectiveness. |

## B. Security Measures
*   **Authentication:** We use **JWT (JSON Web Tokens)** via Supabase Auth. Tokens have a short lifespan (1 hour) with secure refresh mechanisms.
*   **Role-Based Access Control (RBAC):**
    *   *Admins*: Can see all data and manage all users.
    *   *Supervisors*: Strictly scoped to see *only* their assigned agents and historical logs. Row-Level Security (RLS) policies in PostgreSQL enforce this at the database level.
*   **Data Safety:** All sensitive data (API keys, user passwords) is encrypted at rest. WebRTC streams are encrypted via DTLS-SRTP standards.

---

# VI. Key Performance Indicators (KPIs)

To measure success, the platform tracks specific metrics:

## A. First Contact Resolution (FCR)
*   **Definition:** The percentage of issues resolved during the initial interaction.
*   **Tracking:** If a customer calls back with the same "Issue Tag" within 3 days, the original call is marked as "Failed FCR".

## B. Customer Satisfaction Score (CSAT)
*   **Real-Time:** An AI model estimates satisfaction (0-100%) every 5 seconds based on tone and vocabulary.
*   **Post-Interaction:** A comprehensive score derived from the final analysis of the entire transcript.

## C. Average Handle Time (AHT)
*   **Relevance:** Measures efficiency. Lower is generally better, provided CSAT remains high.
*   **Components:** Talk Time + Hold Time + After-Call Work.

---

# VII. Future Roadmap

While the current Proof of Concept is robust, the path to a commercial product involves:

1.  **Telephony Integration:** Replace the Mock PWA with a SIP trunk to simple allow regular phone numbers to call into the system.
2.  **Vector Database (RAG):** Integrate a Knowledge Base so agents can "read" company manuals and PDFs to answer specific questions accurately.
3.  **Multilinguality:** Support for Arabic dialects and other global languages to expand market reach.
4.  **Omnichannel Support:** Expand beyond Voice and Chat to email and social media processing.

---

# VIII. Conclusion

 The **Customer Service AI Agents Platform** represents a significant step forward in automated support. By harmonizing the speed of AI with the empathy of human supervision, we are building a system that is not just a tool, but a teammate. This seminar documentation outlines the architectural and functional backbone of that vision.


