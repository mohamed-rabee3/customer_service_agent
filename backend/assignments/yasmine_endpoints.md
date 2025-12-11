# Yasmine - Endpoint Assignments
## Role: Data Queen (Archives + Admin + Complex Queries)

### 📋 Assigned Endpoints (8 total)

---

## Logic-Heavy Endpoints (4)

### 1. **`GET /archives`** - Get call/chat archive with filters
**Difficulty:** 🔴🔴🔴 **THE HARDEST**

**Logic Required:**
- Dynamic multi-filter query (agent_id, dates, phone, tags, pagination) – **hardest query**
- Build query dynamically based on which filters are provided
- Handle date range filtering (from_date, to_date)
- Handle phone number search (partial match)
- Handle tag filtering (JSON array contains)
- Maintain pagination with filtered results
- Optimize for performance (indexes needed)

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Supervisor can only see archives for their own agents
- ✅ **Data Privacy:** Ensure no cross-supervisor data leakage
- ✅ **SQL Injection:** Use Supabase query builder (parameterized queries)
- ✅ **Performance:** Consider query timeout limits

**Implementation Notes:**
- This is the **MOST COMPLEX** query in the entire project
- Build Supabase query dynamically:
  ```python
  query = supabase.table("archives").select("*")
  if agent_id:
      query = query.eq("agent_id", agent_id)
  if from_date:
      query = query.gte("started_at", from_date)
  if to_date:
      query = query.lte("started_at", to_date)
  if phone_number:
      query = query.ilike("phone_number", f"%{phone_number}%")
  if tags:
      # Handle JSON array contains - complex!
      # Tags is comma-separated string, need to parse and check JSON field
  query = query.order("started_at", desc=True)
  query = query.range((page - 1) * limit, page * limit - 1)
  ```
- **Tag Filtering Challenge:** Tags are stored as JSON. Need to check if JSON array contains any of the provided tags
- **Performance:** Consider adding database indexes on frequently filtered columns
- Return `ArchiveCard` schema for each item
- Return total count (for pagination) - this requires a separate count query

**Files:**
- `app/api/v1/endpoints/archives.py` (shared with Sundus - he handles PATCH)
- `app/services/archive_service.py`
- `app/repositories/archive_repository.py`
- `app/api/v1/schemas/archive.py`

---

### 2. **`GET /admin/dashboard`** - Get admin dashboard data
**Difficulty:** 🟡 Medium

**Logic Required:**
- Count active supervisors
- Retrieve top 5 supervisors ordered by `performance_score` (DESC) for leaderboard
- Return active supervisors (max 15) + leaderboard (top 5)

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Admin-only endpoint (use `require_admin` dependency)
- ✅ **Data Privacy:** Return only necessary fields for dashboard

**Implementation Notes:**
- Check if user is admin (use `require_admin` dependency)
- Query `supervisors` table:
  - Count total active supervisors (status check or based on recent activity)
  - Get top 15 active supervisors (ordered by recent activity or performance)
  - Get top 5 supervisors by `performance_score` (DESC) for leaderboard
- Return `SupervisorCard` schema for active supervisors
- Return `LeaderboardEntry` schema for leaderboard
- Consider caching this data (updates infrequently)

**Files:**
- `app/api/v1/endpoints/admin.py`
- `app/services/admin_service.py`
- `app/api/v1/schemas/admin.py`

---

### 3. **`GET /interactions/{interaction_id}`** - Get interaction details
**Difficulty:** 🟡 Medium

**Logic Required:**
- Join with realtime_metrics + tool_permissions
- Return complete interaction details with all related data

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Supervisor can only see interactions for their own agents
- ✅ **Data Privacy:** Ensure no cross-supervisor data leakage

**Implementation Notes:**
- Query `interactions` table by `interaction_id`
- Verify ownership: Check if interaction's agent belongs to current supervisor
- Join with `realtime_metrics` table (get all metrics for this interaction, ordered by timestamp)
- Join with `tool_permissions` table (get all permission requests for this interaction)
- Return `InteractionDetail` schema which includes:
  - Interaction data
  - `livekit_room_id`
  - `realtime_metrics` array
  - `tool_permissions` array

**Files:**
- `app/api/v1/endpoints/interactions.py`
- `app/services/interaction_service.py`
- `app/repositories/interaction_repository.py`
- `app/api/v1/schemas/interaction.py`

---

### 4. **`GET /archives/{interaction_id}`** - Get archive details
**Difficulty:** 🟡 Medium

**Logic Required:**
- Same as above but for completed interactions + summary/tags/CSAT
- Join with archive-specific data (summary, tags, CSAT score, issues, resolution_time, fcr_status)

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Supervisor can only see archives for their own agents
- ✅ **Data Privacy:** Ensure no cross-supervisor data leakage

**Implementation Notes:**
- Query `archives` table by `interaction_id`
- Verify ownership: Check if archive's agent belongs to current supervisor
- Archive table contains additional fields:
  - `summary` (text)
  - `tags` (JSON)
  - `csat_score` (float)
  - `issues` (JSON array)
  - `resolution_time_seconds` (integer)
  - `fcr_status` (boolean)
- Return `ArchiveDetail` schema with all archive-specific data

**Files:**
- `app/api/v1/endpoints/archives.py` (shared with Sundus - he handles PATCH)
- `app/services/archive_service.py`
- `app/repositories/archive_repository.py`
- `app/api/v1/schemas/archive.py`

---

## Simple Endpoints (4)

### 5. **`GET /interactions`** - List all interactions
**Difficulty:** 🟢 Simple

**Logic Required:**
- Simple list query with basic filtering
- Get all interactions for supervisor's agents

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Supervisor can only see interactions for their own agents
- ✅ **Data Privacy:** Filter by supervisor's agents

**Implementation Notes:**
- Get current supervisor's `userID`
- Query all agents for this supervisor
- Query `interactions` table filtered by `agent_id` IN (supervisor's agent IDs)
- Apply optional filters: `status`, `agent_id`, `page`, `limit`
- Return paginated list with `Interaction` schema
- Return `total`, `page`, `limit` for pagination

**Files:**
- `app/api/v1/endpoints/interactions.py`
- `app/services/interaction_service.py`
- `app/repositories/interaction_repository.py`
- `app/api/v1/schemas/interaction.py`

---

### 6. **`PATCH /interactions/{interaction_id}`** - Update interaction
**Difficulty:** 🟢 Simple

**Logic Required:**
- Direct update of interaction status
- End interaction or update status (completed, failed)
- Note: `phone_number` field is updated by agent internally, not frontend

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Supervisor can only update interactions for their own agents
- ✅ **Input Validation:** Validate status enum (completed, failed)
- ⚠️ **Note:** `phone_number` should only be updated by agent internally (via internal API call)

**Implementation Notes:**
- Query interaction by `interaction_id`
- Verify ownership: Check if interaction's agent belongs to current supervisor
- Update `status` field (if provided)
- Update `ended_at` timestamp if status is `completed` or `failed`
- Calculate `duration_seconds` if ending interaction
- **Important:** Do NOT allow frontend to update `phone_number` - this is agent-only
- Return updated `Interaction` schema

**Files:**
- `app/api/v1/endpoints/interactions.py`
- `app/services/interaction_service.py`
- `app/repositories/interaction_repository.py`
- `app/api/v1/schemas/interaction.py`

---

### 7. **`GET /analytics/supervisor/{supervisor_id}`** - Supervisor analytics
**Difficulty:** 🟢 Simple

**Logic Required:**
- Simple query - retrieve pre-calculated stats for specific supervisor
- Filter by time period (today, week, month, all_time)

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Admin can view any supervisor, supervisor can only view themselves
- ✅ **Data Privacy:** Ensure proper access control

**Implementation Notes:**
- Query analytics data for supervisor
- Data is pre-calculated by AI team (stored in `agent_analytics` table or calculated from `interactions` table)
- Apply time period filter:
  - `today`: Filter by `started_at >= today 00:00:00`
  - `week`: Filter by `started_at >= 7 days ago`
  - `month`: Filter by `started_at >= 30 days ago`
  - `all_time`: No filter
- Return `SupervisorAnalytics` schema:
  - `performance_score`
  - `fcr_percentage`
  - `avg_csat`
  - `avg_handle_time`
  - `total_interactions`
  - `agents_breakdown` (array of AgentAnalytics)

**Files:**
- `app/api/v1/endpoints/analytics.py`
- `app/services/analytics_service.py`
- `app/api/v1/schemas/analytics.py`

---

### 8. **`GET /analytics/agent/{agent_id}`** - Agent analytics
**Difficulty:** 🟢 Simple

**Logic Required:**
- Simple query - retrieve pre-calculated stats for specific agent
- Filter by time period (today, week, month, all_time)

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Supervisor can only view analytics for their own agents
- ✅ **Data Privacy:** Ensure no cross-supervisor data leakage

**Implementation Notes:**
- Query agent by `agent_id`
- Verify ownership: Check if agent belongs to current supervisor
- Query analytics data for this agent
- Data is pre-calculated by AI team (stored in `agent_analytics` table)
- Apply time period filter (same as supervisor analytics)
- Return `AgentAnalytics` schema:
  - `agent_id`, `agent_name`
  - `total_interactions`
  - `fcr_percentage`
  - `avg_csat`
  - `avg_handle_time`
  - `performance_score`

**Files:**
- `app/api/v1/endpoints/analytics.py`
- `app/services/analytics_service.py`
- `app/api/v1/schemas/analytics.py`

---

## 📁 Files to Create/Edit

### Endpoints
- `app/api/v1/endpoints/archives.py` - **Shared** (Yasmine: GET queries, Sundus: PATCH)
- `app/api/v1/endpoints/interactions.py` - **Yasmine exclusive**
- `app/api/v1/endpoints/admin.py` - **Yasmine exclusive**
- `app/api/v1/endpoints/analytics.py` - **Yasmine exclusive**
- `app/api/v1/endpoints/supervisors.py` - **Shared** (Yasmine: GET list, Moaz: GET detail + dashboard, Sundus: POST/PUT/DELETE)

### Services
- `app/services/archive_service.py` - **Shared** (Yasmine: GET methods, Sundus: PATCH method)
- `app/services/interaction_service.py` - **Yasmine exclusive**
- `app/services/admin_service.py` - **Yasmine exclusive**
- `app/services/analytics_service.py` - **Yasmine exclusive**
- `app/services/supervisor_service.py` - **Shared** (all three developers)

### Repositories
- `app/repositories/archive_repository.py` - **Shared** (Yasmine: GET methods, Sundus: PATCH method)
- `app/repositories/interaction_repository.py` - **Yasmine exclusive**
- `app/repositories/supervisor_repository.py` - **Shared** (all three developers)

### Schemas
- `app/api/v1/schemas/archive.py` - **Shared** (Yasmine and Sundus)
- `app/api/v1/schemas/interaction.py` - **Yasmine exclusive**
- `app/api/v1/schemas/admin.py` - **Yasmine exclusive**
- `app/api/v1/schemas/analytics.py` - **Yasmine exclusive**
- `app/api/v1/schemas/supervisor.py` - **Shared** (all three developers)

---

## 🎯 Workload Summary

- **Total Assigned Endpoints:** 8
- **Logic-Heavy:** 4 (1 THE HARDEST, 3 Medium)
- **Simple:** 4
- **Complexity:** High (most complex query in project)
- **Estimated Time:** 2 weeks

---

## ⚠️ File Sharing Notes

**Shared Files:**
- `archives.py` endpoint file is shared with Sundus
- `supervisors.py` endpoint file is shared with Moaz and Sundus
- **Clear Separation:**
  - **Yasmine:** GET /archives, GET /archives/{id} (queries)
  - **Sundus:** PATCH /archives/{id} (update)
  - **Yasmine:** GET /supervisors (list)
  - **Moaz:** GET /supervisors/{id}, GET /supervisors/me/dashboard
  - **Sundus:** POST, PUT, DELETE /supervisors/{id}
- **Coordination:** Use different function names, minimal overlap

---

## 📝 General Implementation Guidelines

1. **Authentication:** All endpoints require `get_current_user` dependency
2. **Authorization:** Verify ownership/role for each operation
3. **Error Handling:** Return appropriate HTTP status codes (400, 401, 403, 404)
4. **Validation:** Use Pydantic models for request/response validation
5. **Performance:** Optimize queries, especially for `GET /archives` (THE HARDEST)
6. **Security:** Never trust client input, always validate and sanitize
7. **Logging:** Log important operations for audit trail

---

## 🔒 Security Checklist

- [ ] All endpoints require authentication
- [ ] Authorization checks implemented (ownership/role)
- [ ] Input validation on all request bodies
- [ ] SQL injection prevention (use Supabase query builder)
- [ ] Data privacy: Filter by supervisor's agents
- [ ] Error messages don't leak sensitive information
- [ ] Performance: Consider query timeouts for complex queries

---

## 🚨 Special Notes for GET /archives (THE HARDEST)

This endpoint is the **MOST COMPLEX** query in the entire project. Key challenges:

1. **Dynamic Query Building:** Build query based on optional parameters
2. **Tag Filtering:** JSON array contains check (complex Supabase query)
3. **Performance:** Multiple filters can slow down query - consider indexes
4. **Pagination:** Need separate count query for total
5. **Date Range:** Handle timezone issues correctly
6. **Phone Search:** Partial match (ilike) can be slow on large datasets

**Recommendations:**
- Add database indexes on: `agent_id`, `started_at`, `phone_number`
- Consider caching frequently accessed filters
- Test with large datasets (1000+ records)
- Monitor query performance in production

