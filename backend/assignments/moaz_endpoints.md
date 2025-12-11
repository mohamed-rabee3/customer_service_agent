# Moaz - Endpoint Assignments
## Role: Entity Owner (Mutations + Dashboard)

### 📋 Assigned Endpoints (8 total)

---

## Logic-Heavy Endpoints (4)

### 1. **`POST /agents`** - Create agent
**Difficulty:** 🔴 **HARD**

**Logic Required:**
- Check if supervisor already has 3 agents → reject with 400 Bad Request
- Validate agent configuration (name, system_prompt, mcp_tools)
- Assign agent to current supervisor (from JWT token)

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Supervisor can only create agents for themselves
- ✅ **Input Validation:** Validate all required fields, sanitize system_prompt
- ✅ **Business Rule:** Enforce max 3 agents per supervisor strictly
- ⚠️ **Rate Limiting:** Consider rate limiting to prevent abuse

**Implementation Notes:**
- Query `agents` table filtered by `supervisor_id` to count existing agents
- Return `400 Bad Request` with message: "Maximum 3 agents allowed per supervisor"
- Use transaction to ensure atomicity (check + insert)
- Validate `mcp_tools` JSON structure
- Set default `status` to `idle`
- Set `created_at` timestamp

**Files:**
- `app/api/v1/endpoints/agents.py`
- `app/services/agent_service.py`
- `app/repositories/agent_repository.py`
- `app/api/v1/schemas/agent.py`

---

### 2. **`PUT /agents/{agent_id}`** - Update agent
**Difficulty:** 🟡 Medium

**Logic Required:**
- Block update if agent status = `in_call` or `in_chat`
- Allow update only when agent is `idle` or `paused`
- Validate supervisor owns this agent

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Supervisor can only update their own agents
- ✅ **Status Check:** Verify agent status before allowing update
- ✅ **Input Validation:** Validate all update fields
- ⚠️ **Concurrency:** Handle race conditions (agent status might change during update)

**Implementation Notes:**
- First query agent to get current `status`
- If `status` is `in_call` or `in_chat`, return `409 Conflict` with message: "Cannot update agent while in active call/chat"
- If `status` is `idle` or `paused`, proceed with update
- Verify `supervisor_id` matches current user
- Update only provided fields (partial update)
- Update `updated_at` timestamp

**Files:**
- `app/api/v1/endpoints/agents.py`
- `app/services/agent_service.py`
- `app/repositories/agent_repository.py`
- `app/api/v1/schemas/agent.py`

---

### 3. **`DELETE /agents/{agent_id}`** - Delete agent
**Difficulty:** 🟡 Medium

**Logic Required:**
- Block or force-end if agent is active (in_call or in_chat)
- Check for active interactions before deletion
- Optionally: Force-end active interactions before deletion

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Supervisor can only delete their own agents
- ✅ **Status Check:** Verify agent status before deletion
- ✅ **Cascade Handling:** Decide whether to force-end active interactions or reject deletion
- ⚠️ **Data Integrity:** Ensure no orphaned records

**Implementation Notes:**
- Query agent to get current `status` and `supervisor_id`
- Verify ownership
- If `status` is `in_call` or `in_chat`:
  - Option 1: Return `409 Conflict` with message: "Cannot delete agent while in active call/chat"
  - Option 2: Force-end active interactions first, then delete
- Check for active interactions in `interactions` table
- Delete agent record (cascade will handle related records if FK constraints are set)
- Return `204 No Content` on success

**Files:**
- `app/api/v1/endpoints/agents.py`
- `app/services/agent_service.py`
- `app/repositories/agent_repository.py`

---

### 4. **`GET /supervisors/me/dashboard`** - Get supervisor dashboard
**Difficulty:** 🔴 **HARD**

**Logic Required:**
- Join agents + current interactions + real-time metrics + counts
- Return all agents (max 3) for current supervisor
- Include current interaction details if agent is active
- Include latest real-time metrics if agent is active
- Optimize for dashboard rendering (single response with all data)

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Supervisor can only see their own dashboard
- ✅ **Data Privacy:** Ensure no data leakage between supervisors
- ✅ **Performance:** Optimize query to avoid N+1 problems

**Implementation Notes:**
- Use `get_current_user` to get current supervisor's `userID`
- Query all agents for this supervisor (max 3)
- For each agent:
  - Get current interaction (if status is `in_call` or `in_chat`)
  - Get latest real-time metrics (from `realtime_metrics` table, ordered by timestamp DESC, limit 1)
  - Calculate counts (total_interactions, etc.)
- Use Supabase joins or multiple queries (optimize based on performance)
- Return `AgentDashboardCard` schema for each agent
- Include `total` count of agents

**Files:**
- `app/api/v1/endpoints/supervisors.py`
- `app/services/supervisor_service.py`
- `app/repositories/supervisor_repository.py`
- `app/api/v1/schemas/supervisor.py`

---

## Simple Endpoints (4)

### 5. **`GET /agents/{agent_id}`** - Get agent details
**Difficulty:** 🟢 Simple

**Logic Required:**
- Simple query to get agent details
- Include system_prompt, mcp_tools, current_interaction, analytics

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Supervisor can only view their own agents
- ✅ **Data Privacy:** Ensure no data leakage

**Implementation Notes:**
- Query agent by `agent_id`
- Verify `supervisor_id` matches current user
- Join with current interaction (if exists)
- Join with analytics data
- Return `AgentDetail` schema

**Files:**
- `app/api/v1/endpoints/agents.py`
- `app/services/agent_service.py`
- `app/repositories/agent_repository.py`
- `app/api/v1/schemas/agent.py`

---

### 6. **`GET /agents/{agent_id}/status`** - Get agent current status
**Difficulty:** 🟢 Simple

**Logic Required:**
- Simple query for agent status and current interaction

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Supervisor can only view their own agents' status

**Implementation Notes:**
- Query agent by `agent_id`
- Verify ownership
- Get current interaction (if exists)
- Get latest realtime_metrics (if agent is active)
- Return `AgentStatus` schema

**Files:**
- `app/api/v1/endpoints/agents.py`
- `app/services/agent_service.py`
- `app/repositories/agent_repository.py`
- `app/api/v1/schemas/agent.py`

---

### 7. **`GET /supervisors`** - List all supervisors
**Difficulty:** 🟢 Simple

**Logic Required:**
- Simple list query with pagination
- Optional filter by `supervisor_type` (voice, chat)

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Admin-only endpoint (use `require_admin` dependency)
- ✅ **Data Privacy:** Return only necessary fields

**Implementation Notes:**
- Check if user is admin (use `require_admin` dependency)
- Query `supervisors` table with pagination
- Apply optional `supervisor_type` filter
- Return paginated list with `total`, `page`, `limit`
- Return `Supervisor` schema for each item

**Files:**
- `app/api/v1/endpoints/supervisors.py` (shared with Yasmine - she handles GET list, you handle this one)
- `app/services/supervisor_service.py`
- `app/repositories/supervisor_repository.py`
- `app/api/v1/schemas/supervisor.py`

---

### 8. **`GET /supervisors/{supervisor_id}`** - Get supervisor details
**Difficulty:** 🟢 Simple

**Logic Required:**
- Simple query to get supervisor details
- Include agents array and recent_interactions array

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Admin can view any supervisor, supervisor can only view themselves
- ✅ **Data Privacy:** Ensure proper access control

**Implementation Notes:**
- Query supervisor by `supervisor_id`
- Check authorization:
  - If admin: allow access to any supervisor
  - If supervisor: only allow access to their own data
- Join with agents table (get all agents for this supervisor)
- Join with interactions table (get recent interactions, limit to last 10)
- Return `SupervisorDetail` schema

**Files:**
- `app/api/v1/endpoints/supervisors.py` (shared with Yasmine and Sundus)
- `app/services/supervisor_service.py`
- `app/repositories/supervisor_repository.py`
- `app/api/v1/schemas/supervisor.py`

---

## 📁 Files to Create/Edit

### Endpoints
- `app/api/v1/endpoints/agents.py` - **Moaz exclusive** (all agent endpoints)
- `app/api/v1/endpoints/supervisors.py` - **Shared** (Moaz: GET detail + dashboard, Yasmine: GET list, Sundus: POST/PUT/DELETE)

### Services
- `app/services/agent_service.py` - **Moaz exclusive**
- `app/services/supervisor_service.py` - **Shared** (all three developers)

### Repositories
- `app/repositories/agent_repository.py` - **Moaz exclusive**
- `app/repositories/supervisor_repository.py` - **Shared** (all three developers)

### Schemas
- `app/api/v1/schemas/agent.py` - **Moaz exclusive**
- `app/api/v1/schemas/supervisor.py` - **Shared** (all three developers)

---

## 🎯 Workload Summary

- **Total Assigned Endpoints:** 8
- **Logic-Heavy:** 4 (2 HARD, 2 Medium)
- **Simple:** 4
- **Complexity:** High (most complex business logic)
- **Estimated Time:** 2 weeks

---

## ⚠️ File Sharing Notes

**Shared Files:**
- `supervisors.py` endpoint file is shared with Yasmine and Sundus
- **Clear Separation:**
  - **Moaz:** GET /supervisors/{id} (detail), GET /supervisors/me/dashboard
  - **Yasmine:** GET /supervisors (list)
  - **Sundus:** POST, PUT, DELETE /supervisors/{id}
- **Coordination:** Use different function names, minimal overlap
- **Services/Repositories:** Shared but different methods, no conflicts

---

## 📝 General Implementation Guidelines

1. **Authentication:** All endpoints require `get_current_user` dependency
2. **Authorization:** Verify ownership/role for each operation
3. **Error Handling:** Return appropriate HTTP status codes (400, 401, 403, 404, 409)
4. **Validation:** Use Pydantic models for request/response validation
5. **Transactions:** Use transactions for multi-step operations
6. **Performance:** Optimize queries, avoid N+1 problems
7. **Security:** Never trust client input, always validate and sanitize
8. **Logging:** Log important operations (create, update, delete) for audit trail

---

## 🔒 Security Checklist

- [ ] All endpoints require authentication
- [ ] Authorization checks implemented (ownership/role)
- [ ] Input validation on all request bodies
- [ ] SQL injection prevention (use parameterized queries via Supabase)
- [ ] Rate limiting considered for mutation endpoints
- [ ] Error messages don't leak sensitive information
- [ ] Audit logging for dangerous operations (delete, update)

