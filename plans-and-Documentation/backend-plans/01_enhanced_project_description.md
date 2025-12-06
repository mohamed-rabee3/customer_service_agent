# Customer Service AI Agents Platform

## Project Overview

**Timeline:** 2 months  
**Team Size:** 4 developers  
**Project Type:** Proof of Concept (POC) - Graduation Project

A modern customer service platform leveraging AI agents to handle voice calls and text-based chat interactions. The system provides comprehensive monitoring, analytics, and management capabilities for administrators and supervisors overseeing AI-powered customer service operations.

---

## System Architecture

### Technology Stack

**Backend:**
- **Framework:** FastAPI
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (JWT)
- **Real-time Communication:** LiveKit (WebRTC)
- **AI Framework:** LiveKit Agents SDK

**Frontend:**
- **Framework:** React
- **Deployment:** Progressive Web App (PWA)
- **Real-time Updates:** Server-Sent Events (SSE) + Supabase Real-time

**AI Models:**
- **Voice Agent LLM:** Gemini 2.5 Flash-Lite
- **Voice TTS:** Gemini 2.5 Flash Preview TTS
- **Voice STT:** Whisper v3 Large (via Groq)
- **Chat Agent LLM:** Gemini 2.5 Flash-Lite
- **Summary & Tags:** openai/gpt-oss-20b (via Groq)
- **Real-time Sentiment:** Lightweight specialized model
- **Real-time Satisfaction:** Lightweight specialized LLM

---

## User Roles & Responsibilities

### 1. Administrator

The administrator has full system control with the following capabilities:

#### Responsibilities:
- Create and delete supervisor accounts
- Monitor all supervisors and their performance metrics
- View system-wide analytics and statistics
- Manage system configuration

#### Access Level:
- Full access to all supervisor data
- System-wide analytics dashboard
- Supervisor management interface

---

### 2. Supervisors

Supervisors manage and monitor AI agents. There are two types:

1. **Voice Agent Supervisors** - Oversee AI agents handling phone calls
2. **Chat Agent Supervisors** - Oversee AI agents handling text-based chats

#### Responsibilities:
- Create and configure up to 3 AI agents
- Monitor active agent conversations in real-time
- Inject instructions to agents during interactions (whisper mode)
- Review and manage call/chat archives
- Approve or deny agent tool usage permissions
- Edit agent configurations and system instructions

#### Access Level:
- Access only to their own agents and data
- Cannot view other supervisors' information

---

## Administrator Interface

### 1. Dashboard Page

The admin dashboard provides a comprehensive overview of all active supervisors and system performance.

#### Active Supervisors Section

Displays supervisors currently handling active calls or chats in a card slider format (maximum 15 cards shown).

**Each supervisor card contains:**
- Supervisor name
- Agent type: "Voice Agents" or "Chat Agents"
- Performance bar: Today's performance percentage
- Active calls/chats: Current number of ongoing interactions
- Total calls/chats: Count for today
- Failed interactions: Number of failed calls/chats today

**Interaction:**
- Cards displayed in a horizontal slider
- Refreshes periodically to show real-time status
- Maximum 15 supervisor cards displayed

#### Leaderboard Component

Shows top-performing supervisors based on monthly metrics (displays top 5 supervisors).

**Leaderboard columns:**
- Supervisor name
- Agent type: "Voice Agents" or "Chat Agents"
- Total calls/chats: Monthly count
- Performance score: Calculated monthly aggregate
- Average Handle Time (AHT): Monthly average in minutes

**Features:**
- Updates on each page refresh
- Filterable by agent type (frontend filtering)
- Displays top 5 supervisors based on performance ranking

---

### 2. Supervisor Management Page

Centralized interface for managing all supervisor accounts.

#### Supervisor Table

**Columns:**
- Supervisor name
- Agent type: "Voice Agents" or "Chat Agents"
- Total calls/chats: All-time count
- Performance: All-time aggregate score
- Actions: Delete | Edit | Details

**Action Buttons:**

1. **Delete**: Permanently removes supervisor
   - Deletes all associated agents
   - Removes all historical data (call/chat archives)
   - Terminates any active calls/chats
   - Requires confirmation

2. **Edit**: Modify supervisor information
   - Update name
   - Change username
   - Reset password
   - Switch agent type (voice ↔ chat)

3. **Details**: Opens supervisor's call/chat archive page

#### Create New Supervisor

**Trigger:** "+" button opens creation form

**Required Fields:**
- Name
- Username (must be unique)
- Agent type: "Voice Agents" or "Chat Agents" (dropdown)
- Password (with strength validation)

**Validation Rules:**
- Username uniqueness check
- Strong password requirements (min length, special characters)
- All fields mandatory

---

### 3. Analytics Page

System-wide performance statistics with toggle between voice and chat agents.

#### Toggle View
- **Voice Agents Analytics**
- **Chat Agents Analytics**

#### Key Performance Indicators (KPIs) - Monthly Averages

**For Voice Agents:**
- First Contact Resolution (FCR): Percentage
- Customer Satisfaction Score (CSAT): Average score
- Average Handle Time (AHT): Time in minutes
- Overall Performance Score: Calculated metric

**For Chat Agents:**
- Resolution Time: Average time in minutes
- First Contact Resolution (FCR): Percentage
- Chat Satisfaction (CSAT): Average score
- Overall Performance Score: Calculated metric

**Display Format:**
- Large metric cards with trend indicators
- Month-over-month comparison (if applicable)
- Visual charts and graphs
- Filterable by date range

---

## Supervisor Interface

Both supervisor types (Voice and Chat) share similar interfaces with minor differences noted below.

### Common Features (Voice & Chat Supervisors)

#### 1. Dashboard Page

The central monitoring hub showing up to 3 active agents (enforced maximum).

**Agent Status Cards (up to 3 cards)**

Each agent card displays real-time information:

**Common Fields:**
- Agent name
- Status:
  - "In Call/Chat" - Currently handling customer
  - "Idle" - Available and waiting
  - "Paused" - Stopped due to issue or supervisor intervention
- Sentiment: "Good" | "Neutral" | "Critical" (AI-analyzed, updates every 5 seconds)
- Satisfaction percentage: Real-time AI-calculated satisfaction (updates every 5 seconds)
- Feed: Short AI-generated sentence summarizing current conversation (updates every 5 seconds)

**Voice Agent Specific:**
- **Whisper Button**: Inject instructions to agent
  - When clicked: Agent automatically excuses customer and pauses
  - Supervisor types instructions in chat interface
  - Clicks "Inject" to send
  - Agent receives confirmation message: "Received"
  - Agent resumes conversation with customer

**Chat Agent Specific:**
- **Whisper Button**: Send private message to agent
  - Customer does not see the message
  - When clicked: Agent pauses chatting to read instructions
  - Agent receives confirmation message: "Received"
  - Agent resumes conversation after reading

**Note:** Chat agent cards have identical structure to voice agent cards (agent name, status, sentiment, satisfaction, feed, whisper button).

#### Notifications Sidebar

Displays real-time notifications from agents about tool usage.

**Notification Types:**

1. **Informational Notifications** (No action required)
   - Agent name
   - Tool name being used
   - Automatic action description

2. **Permission-Required Notifications**
   - Agent name
   - Tool name requesting access
   - Action description (e.g., "Agent needs to access user details")
   - **Action Buttons:**
     - "Allow" - Grants permission
     - "Deny" - Rejects request
   
**Permission Timeout Behavior:**
- If supervisor doesn't respond within 1 minute: Alert re-appears (frontend timer)
- After 3 minutes: Another alert shown
- After 6 minutes: Automatically denied
  - Agent receives message: "Sorry, there is a problem"
- Tool permission required for each customer/call even if previously allowed

**Notification Display:**
- Shows agent type and agent name
- Tool names are predefined (from agent configuration)
- Real-time updates via SSE

---

#### 2. Call/Chat Archive Page

Historical record of all completed interactions displayed as rectangular cards.

**Archive Card Display (Outside View):**
- Phone number (for voice) / Phone number identifier (for chat)
  - Note: Agents ask customers for phone number at call/chat beginning
- Date: YYYY/MM/DD format
- Time range: Start - End (e.g., "10:50am - 12:30pm")
- Duration: Minutes and seconds (e.g., "21:05")
- Tags: AI-generated topic and issue tags

**Card Interaction:**
Click any card to open detailed popup

**Popup Detail View:**

When a card is clicked, a popup displays:
- **Summary**: AI-generated text summary of the interaction
- **Issues**: List of problems encountered (AI-generated)
- **Tags**: Topic, issue tags with resolution status
  - Editable by supervisor (only field supervisors can modify)
- **Customer Satisfaction Score (CSAT)**: Post-call satisfaction bar
- **Resolution Time**: Total duration from start to resolution

**Available Actions:**
- Edit tags only
- No call recording or transcript available (not implemented in POC)

---

#### 3. Agent Configuration Page

Interface for creating and managing AI agents (maximum 3 per supervisor, enforced).

**Initial State (No Agents):**
- Displays "+" button
- Click to open agent creation form

**Agent Creation Form:**

**Required Fields:**
- **Agent Name**: Unique identifier
- **System Instructions**: Textarea for agent behavior guidelines
- **MCP Tools**: Textarea accepting JSON configuration
  - Validates JSON structure
  - Templates provided for reference
  - Defines tools agent can access

**Validation:**
- JSON structure validation for MCP tools
- Agent name uniqueness per supervisor
- All fields mandatory

**Existing Agents Display:**

When agents exist, they appear as cards showing:
- Agent name
- Performance score: Calculated from average of all call/chat performances
- Total calls/chats: Lifetime count for this agent
- Tools available: List of tool names from MCP configuration

**Action Buttons:**
- **Delete**: Remove agent permanently
- **Edit**: Modify agent configuration
  - Only available when agent status is "Idle"
  - Cannot edit during active call/chat

---

## Key Performance Indicators (KPIs)

### Voice Agent KPIs

#### 1. First Contact Resolution (FCR)

**Definition:** Percentage of issues resolved during the customer's initial contact without requiring follow-up.

**Why It Matters:**
- Reduces repeat contacts
- Increases customer satisfaction
- Lowers operational costs and workload

**Calculation:**
```
FCR = (# issues resolved on first contact / total issues) × 100
```

**POC Implementation:**
- Based on AI-generated issue tags with resolution status
- Tracked per individual call
- If customer calls back within 3 days with the same issue (identified by phone number + issue tag):
  - Original call's FCR status is decremented
  - System automatically adjusts FCR calculation
- For calls with multiple issue tags:
  - ALL issues must be marked "resolved" for FCR success
  - If any issue reappears within 3 days, FCR is decremented
- Issues identified through AI analysis of call summary

**Improvement Strategy:**
- Empower agents with comprehensive knowledge base
- Provide broader tool access for problem resolution
- Improve agent training and system instructions

---

#### 2. Customer Satisfaction Score (CSAT)

**Definition:** AI-calculated satisfaction rating based on customer interaction quality.

**Why It Matters:**
- Direct measure of interaction quality
- Immediate feedback on agent performance
- Indicates customer experience effectiveness

**Calculation Methods:**

1. **Real-time CSAT** (every 5 seconds during call):
   - AI analyzes conversation tone and content
   - Updates satisfaction percentage continuously
   - Displayed on supervisor dashboard

2. **Post-call CSAT** (after call completion):
   - Calculated from complete call summary
   - Final satisfaction score
   - Stored in call archive

**Display Format:**
- Percentage (0-100%)
- Visual bar indicator
- Color-coded (green/yellow/red based on thresholds)

**Note:** Fully AI-generated, no customer survey involved in POC

---

#### 3. Average Handle Time (AHT)

**Definition:** Average time an agent spends managing one complete interaction.

**Why It Matters:**
- Balances efficiency with quality
- Too long: Resource waste, customer frustration
- Too short: May compromise solution quality

**Calculation:**
```
AHT = (Total talk time + Total hold time + Total after-call work) / # handled calls
```

**Components:**
- Talk time: Active conversation duration
- Hold time: Pauses or waits during call
- After-call work: Post-call processing time

**POC Implementation:**
- Automatically tracked by system
- Calculated per call and per agent
- Aggregated for supervisor performance metrics

---

#### 4. Overall Performance Score

**Definition:** Composite metric combining multiple KPIs weighted appropriately.

**Formula:**
```
Performance Score = (CSAT Weight × CSAT%) + (Call Volume Weight × Normalized Calls) + (AHT Weight × Normalized AHT)
```

**Weight Distribution** (Standard weights, configurable):
- CSAT Weight: 0.5 (50%)
- Call Volume Weight: 0.3 (30%)
- AHT Weight: 0.2 (20%)

**Normalization Process:**

1. **Normalized Calls:**
   - Converts raw call count to 0-1 scale
   - Higher call volume = higher normalized score
   - Formula: `(Agent's calls - Min calls) / (Max calls - Min calls)`

2. **Normalized AHT:**
   - Converts AHT to 0-1 scale (inverted)
   - Lower AHT = higher normalized score (better efficiency)
   - Formula: `1 - ((Agent's AHT - Min AHT) / (Max AHT - Min AHT))`

**Calculation Level:**
- Per supervisor (aggregate of all their agents)
- Displayed on admin dashboard and leaderboard
- Updated daily for "today's performance"
- Calculated monthly for leaderboard rankings

---

### Chat Agent KPIs

#### 1. Resolution Time

**Definition:** Total time from chat initiation to complete problem resolution.

**Why It Matters:**
- Shorter times improve efficiency
- Indicates agent effectiveness
- Directly impacts customer satisfaction

**Target:** 10-20 minutes per chat (varies by complexity)

**POC Implementation:**
- Automatically tracked from chat start to end
- Displayed in chat archive cards
- Used in performance score calculation

---

#### 2. First Contact Resolution (FCR)

**Definition:** Percentage of chats resolved instantly without follow-up or escalation.

**Why It Matters:**
- Demonstrates chat quality
- Shows agent knowledge and skill
- Reduces need for multiple interactions

**Target:** 70-85% FCR rate

**Calculation:**
```
FCR = (# chats resolved on first contact / total chats) × 100
```

**POC Implementation:**
- Based on AI-generated issue tags with resolution status
- If customer initiates new chat within 3 days with same issue (phone number + issue tag):
  - Original chat's FCR decremented
- For chats with multiple issues:
  - ALL must be resolved for FCR success
- System automatically adjusts FCR based on follow-up patterns

---

#### 3. Chat Satisfaction (CSAT)

**Definition:** AI-calculated customer satisfaction from chat interaction analysis.

**Why It Matters:**
- Direct feedback on agent performance
- Measures customer experience quality
- Immediate indicator of interaction success

**Target:** 85-95% satisfaction rate

**Calculation Methods:**

1. **Real-time CSAT** (every 5 seconds):
   - AI analyzes message tone and content
   - Updates satisfaction percentage
   - Visible to supervisor

2. **Post-chat CSAT**:
   - Calculated from complete chat summary
   - Final satisfaction score
   - Stored in archive

**Note:** Fully AI-generated in POC

---

#### 4. Overall Performance Score

Same formula as Voice Agents:
```
Performance Score = (CSAT Weight × CSAT%) + (Chat Volume Weight × Normalized Chats) + (Resolution Time Weight × Normalized Resolution Time)
```

**Normalization:**
- Normalized Chats: Similar to call volume (higher = better)
- Normalized Resolution Time: Inverted (lower time = higher score)

**Calculation Level:**
- Per supervisor (aggregate of all their agents)

---

## Real-time Features

### Server-Sent Events (SSE) Updates

The following metrics update in real-time via SSE (every 5 seconds):

1. **Real-time Sentiment**
   - Values: "Good" | "Neutral" | "Critical"
   - Analyzed by lightweight specialized AI model
   - Updates during active calls/chats

2. **Real-time Satisfaction**
   - Percentage value (0-100%)
   - Calculated by lightweight LLM
   - Continuous updates during interaction

3. **Feed (Conversation Summary)**
   - Short AI-generated sentence
   - Describes current conversation context
   - Updates every 5 seconds

4. **Agent Status**
   - Values: "In Call/Chat" | "Idle" | "Paused"
   - Immediate status changes
   - SSE push to supervisor dashboard

**Connection Architecture:**
- Each supervisor maintains one SSE connection per active agent
- Maximum 3 connections per supervisor (3 agents max)
- Automatic reconnection on connection loss

---

### Supabase Real-time Updates

Used for non-critical updates:
- New call/chat appearing in archive
- Supervisor list changes
- System notifications
- Configuration updates

---

## Agent Tool System

### Tool Configuration

**MCP (Model Context Protocol) Tools:**
- Configured per agent via JSON in agent configuration page
- Predefined tool templates provided
- JSON structure validation enforced

**Tool Types:**

1. **Auto-execute Tools**
   - Informational notifications only
   - No supervisor approval required
   - Examples: Fetch customer history, check account status

2. **Permission-required Tools**
   - Require supervisor approval (allow/deny)
   - Examples: Access sensitive data, modify account, process refund
   - Timeout behavior after 6 minutes (auto-deny)

### Permission Flow

1. Agent requests tool access during call/chat
2. Notification appears in supervisor sidebar
3. Displays: Agent name, tool name, action description
4. Supervisor actions:
   - Click "Allow": Tool executes immediately
   - Click "Deny": Agent receives rejection message
   - No response: Auto-deny after 6 minutes with alerts at 1, 3, and 6 minute marks
5. Permission required again for each customer/interaction

---

## Tag System

### Tag Categories

**1. Topic Tags**
- Call/chat subject classification
- Examples: Billing, Technical Support, General Inquiry, Complaint
- AI-generated from conversation analysis

**2. Issue Tags**
- Specific problems identified
- Include resolution status: "Resolved" or "Unresolved"
- Examples: 
  - "Payment Failed - Resolved"
  - "Account Access - Unresolved"
  - "Service Outage - Resolved"

**3. Sentiment Tags**
- Overall interaction sentiment
- Examples: Angry Customer, Satisfied Customer, Frustrated Customer
- Based on sentiment analysis

### Tag Management

- **Generation**: All tags AI-generated by openai/gpt-oss-20b (via Groq)
- **Timing**: Generated after call/chat completion from summary
- **Editing**: Supervisors can modify tags in archive popup
- **Validation**: Tags selected from predefined list (not free-form)
- **Purpose**: 
  - FCR calculation
  - Analytics and reporting
  - Searchability and filtering

---

## System Constraints & Limitations (POC)

### Scalability
- Maximum 10 simultaneous calls/chats
- Maximum 3 agents per supervisor
- Maximum 15 supervisor cards on admin dashboard

### Data Retention
- Configurable archive retention period
- Default: Based on system requirements

### Features Not Included in POC
- No actual phone system integration (mock interface only)
- No call recordings or transcripts
- No mobile native apps (PWA only)
- No advanced RBAC beyond admin/supervisor roles
- No customer-facing surveys (all satisfaction AI-generated)

### Mock Implementation Details
- **Phone Interface**: PWA with mock dialer
- **Call Initiation**: Enter mock phone number and press call
- **Agent Assignment**: System finds idle agent to connect
- **Purpose**: Demonstrate integration capabilities for future real phone system

---

## Future Enhancements (Post-POC)

1. Integration with real phone systems (Twilio, VoIP providers)
2. Call recording and transcription storage
3. Native mobile applications
4. Advanced analytics and reporting
5. Multi-language support
6. Customer self-service portal
7. Escalation workflows
8. Advanced RBAC and team hierarchies
9. Integration with CRM systems
10. Quality assurance and call scoring modules

---

## Success Metrics for POC

1. Successfully handle 10 concurrent interactions
2. Accurate real-time sentiment and satisfaction analysis
3. Functional whisper/instruction injection system
4. Proper FCR tracking with 3-day follow-up detection
5. Accurate KPI calculations and reporting
6. Stable SSE connections for real-time updates
7. Responsive PWA interface
8. Complete admin and supervisor workflows functional

---

## Technical Considerations

### Performance
- Optimize SSE connections to prevent overload
- Implement connection pooling for AI model APIs
- Cache frequently accessed data
- Use Supabase indexes for query optimization

### Security
- JWT token-based authentication
- Role-based access enforcement
- Secure WebRTC signaling
- API rate limiting
- Input validation and sanitization

### Reliability
- Graceful degradation on AI model failures
- Automatic SSE reconnection
- Error handling and logging
- Health check endpoints

### Monitoring
- Track AI model response times
- Monitor SSE connection stability
- Log system errors and exceptions
- Track API usage and costs

---

## Development Timeline Considerations

**2 Months | 4 Developers**

Recommended breakdown:
- **Week 1-2**: Backend foundation, auth, database schema
- **Week 3-4**: LiveKit integration, AI agent implementation
- **Week 5-6**: Frontend dashboard development, real-time features
- **Week 6-7**: SSE implementation, tool system, whisper functionality
- **Week 7-8**: Testing, bug fixes, documentation, presentation preparation

**Team Role Suggestions:**
- Backend Developer (2): FastAPI, LiveKit, AI integration
- Frontend Developer (1): React, PWA, real-time UI
- Full-stack Developer (1): Bridge work, testing, deployment
