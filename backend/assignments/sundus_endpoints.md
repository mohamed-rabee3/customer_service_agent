# Sundus - Endpoint Assignments
## Role: Admin & Control (Dangerous Actions + Tools)

### 📋 Assigned Endpoints (8 total)

---

## Logic-Heavy Endpoints (4)

### 1. **`DELETE /supervisors/{supervisor_id}`** - Delete supervisor
**Difficulty:** 🔴 **DANGEROUS**

**Logic Required:**
- Admin-only + cascade delete all agents/interactions + confirm no active calls
- This is a **DANGEROUS** operation that permanently deletes data
- Must check for active calls before deletion
- Cascade delete: supervisor → agents → interactions → archives → analytics

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Admin-only endpoint (use `require_admin` dependency)
- ✅ **Dangerous Operation:** This permanently deletes data - add extra confirmation
- ✅ **Active Call Check:** Must verify no active calls before deletion
- ✅ **Audit Logging:** Log this operation for audit trail
- ⚠️ **Soft Delete Consideration:** Consider implementing soft delete instead of hard delete
- ⚠️ **Rate Limiting:** Strict rate limiting on this endpoint

**Implementation Notes:**
- Check if user is admin (use `require_admin` dependency)
- Query supervisor by `supervisor_id`
- **Critical Check:** Query all agents for this supervisor
- **Critical Check:** For each agent, check if there are any active interactions (`status = 'active'`)
- If any active interactions exist:
  - Return `409 Conflict` with message: "Cannot delete supervisor with active calls/chats. Please wait for all interactions to complete."
- If no active interactions:
  - Start transaction
  - Delete all interactions for this supervisor's agents (cascade)
  - Delete all agents for this supervisor (cascade)
  - Delete supervisor record
  - Commit transaction
- **Audit Log:** Log this operation with: supervisor_id, deleted_by, timestamp, deleted_agents_count, deleted_interactions_count
- Return `204 No Content` on success

**Files:**
- `app/api/v1/endpoints/supervisors.py` (shared with Moaz and Yasmine)
- `app/services/supervisor_service.py`
- `app/repositories/supervisor_repository.py`
- `app/api/v1/schemas/supervisor.py`

---

### 2. **`POST /supervisors`** - Create supervisor
**Difficulty:** 🟡 Medium

**Logic Required:**
- Prevent duplicate email/username
- Create supervisor account in Supabase Auth
- Create supervisor record in database

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Admin-only endpoint (use `require_admin` dependency)
- ✅ **Input Validation:** Validate email format, username pattern, password strength
- ✅ **Duplicate Check:** Check both email and username uniqueness
- ✅ **Password Security:** Hash password before storing (Supabase Auth handles this)
- ⚠️ **Rate Limiting:** Consider rate limiting to prevent abuse

**Implementation Notes:**
- Check if user is admin (use `require_admin` dependency)
- Validate request body:
  - `name`: Required, string
  - `username`: Required, pattern `^[a-zA-Z0-9_]{3,20}$` (display name, not for login)
  - `email`: Required, valid email format (used for login)
  - `password`: Required, min 8 characters
  - `supervisor_type`: Required, enum (voice, chat)
- **Duplicate Check:**
  - Query `supervisors` table for existing `email`
  - Query `supervisors` table for existing `username`
  - If either exists, return `422 Unprocessable Entity` with message: "Email or username already exists"
- Create user in Supabase Auth:
  - Use Supabase Admin API to create user
  - Get the created user's UUID
- Create supervisor record in database:
  - Insert into `supervisors` table with:
    - `userID`: UUID from Supabase Auth
    - `name`, `username`, `email`, `supervisor_type`
    - `created_at`: Current timestamp
- Return `201 Created` with `Supervisor` schema

**Files:**
- `app/api/v1/endpoints/supervisors.py` (shared with Moaz and Yasmine)
- `app/services/supervisor_service.py`
- `app/repositories/supervisor_repository.py`
- `app/api/v1/schemas/supervisor.py`

---

### 3. **`PUT /supervisors/{supervisor_id}`** - Update supervisor
**Difficulty:** 🟡 Medium

**Logic Required:**
- Prevent duplicate email/username if changed
- Update supervisor information (name, username, password, supervisor_type)
- Update Supabase Auth if email/password changed

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Admin-only endpoint (use `require_admin` dependency)
- ✅ **Input Validation:** Validate all fields
- ✅ **Duplicate Check:** Check email/username uniqueness only if changed
- ✅ **Password Security:** Hash password if updated (Supabase Auth handles this)
- ⚠️ **Email Change:** If email changed, update Supabase Auth user

**Implementation Notes:**
- Check if user is admin (use `require_admin` dependency)
- Query supervisor by `supervisor_id`
- Validate request body (all fields optional):
  - `name`: Optional string
  - `username`: Optional, pattern `^[a-zA-Z0-9_]{3,20}$`
  - `email`: Optional, valid email format
  - `password`: Optional, min 8 characters
  - `supervisor_type`: Optional, enum (voice, chat)
- **Duplicate Check (only if changed):**
  - If `email` is provided and different from current:
    - Query `supervisors` table for existing `email` (excluding current supervisor)
    - If exists, return `422 Unprocessable Entity` with message: "Email already exists"
  - If `username` is provided and different from current:
    - Query `supervisors` table for existing `username` (excluding current supervisor)
    - If exists, return `422 Unprocessable Entity` with message: "Username already exists"
- Update Supabase Auth (if email or password changed):
  - Use Supabase Admin API to update user
- Update supervisor record in database:
  - Update only provided fields
  - Update `updated_at` timestamp
- Return `200 OK` with updated `Supervisor` schema

**Files:**
- `app/api/v1/endpoints/supervisors.py` (shared with Moaz and Yasmine)
- `app/services/supervisor_service.py`
- `app/repositories/supervisor_repository.py`
- `app/api/v1/schemas/supervisor.py`

---

### 4. **`POST /tools/permissions/{permission_id}/respond`** - Respond to tool permission request
**Difficulty:** 🟡 Medium

**Logic Required:**
- Validate "allowed"/"denied" + update status + set responded_at
- Update tool permission status based on supervisor response

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Supervisor can only respond to permissions for their own agents
- ✅ **Input Validation:** Validate response enum (allowed, denied)
- ✅ **Status Check:** Only allow response if status is "pending"
- ✅ **Timeout Handling:** Check if request has timed out

**Implementation Notes:**
- Query `tool_permissions` table by `permission_id`
- Verify ownership: Check if permission's interaction's agent belongs to current supervisor
- Check current `status`:
  - If `status` is not "pending", return `409 Conflict` with message: "Permission request already responded to"
  - If `status` is "timeout", return `408 Request Timeout` with message: "Permission request has timed out"
- Validate request body:
  - `response`: Required, enum ("allowed", "denied")
- Update `tool_permissions` record:
  - Set `status` to "allowed" or "denied" based on response
  - Set `supervisor_response` to response value
  - Set `responded_at` to current timestamp
- Return `200 OK` with updated permission data:
  - `permission_id`
  - `response`
  - `responded_at`

**Files:**
- `app/api/v1/endpoints/tools.py`
- `app/services/tool_service.py`
- `app/repositories/tool_permission_repository.py`
- `app/api/v1/schemas/tools.py`

---

## Simple Endpoints (4)

### 5. **`GET /admin/analytics`** - System-wide analytics
**Difficulty:** 🟢 Simple

**Logic Required:**
- Simple query - retrieve pre-calculated aggregate stats
- Filter by agent_type (optional: voice, chat)

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Admin-only endpoint (use `require_admin` dependency)
- ✅ **Data Privacy:** Return only aggregate statistics

**Implementation Notes:**
- Check if user is admin (use `require_admin` dependency)
- Query analytics data (pre-calculated by AI team)
- Apply optional `agent_type` filter (if provided)
- Return `SystemAnalytics` schema:
  - `agent_type` (if filtered)
  - `period` (today, month)
  - `fcr_percentage`
  - `avg_csat`
  - `avg_handle_time`
  - `avg_performance_score`
  - `total_interactions`

**Files:**
- `app/api/v1/endpoints/analytics.py`
- `app/services/analytics_service.py`
- `app/api/v1/schemas/analytics.py`

---

### 6. **`GET /tools/permissions/interaction/{interaction_id}`** - List tool permissions for interaction
**Difficulty:** 🟢 Simple

**Logic Required:**
- Simple query - get all tool permission requests for a specific call/chat

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Supervisor can only see permissions for their own agents' interactions
- ✅ **Data Privacy:** Ensure no cross-supervisor data leakage

**Implementation Notes:**
- Query interaction by `interaction_id`
- Verify ownership: Check if interaction's agent belongs to current supervisor
- Query `tool_permissions` table filtered by `interaction_id`
- Return array of `ToolPermission` schema:
  - `id`, `interaction_id`
  - `tool_name`, `tool_description`
  - `requested_at`
  - `status` (pending, allowed, denied, timeout)
  - `supervisor_response`
  - `responded_at`

**Files:**
- `app/api/v1/endpoints/tools.py`
- `app/services/tool_service.py`
- `app/repositories/tool_permission_repository.py`
- `app/api/v1/schemas/tools.py`

---

### 7. **`PATCH /archives/{interaction_id}`** - Update archive tags
**Difficulty:** 🟢 Simple

**Logic Required:**
- Allow supervisor to edit `tags` JSON field for specific interaction
- Simple update operation

**Security Notes:**
- ✅ **Authentication Required:** Use `get_current_user` dependency
- ✅ **Authorization:** Supervisor can only update tags for their own agents' archives
- ✅ **Input Validation:** Validate tags JSON structure
- ✅ **Data Privacy:** Ensure no cross-supervisor data leakage

**Implementation Notes:**
- Query archive by `interaction_id`
- Verify ownership: Check if archive's agent belongs to current supervisor
- Validate request body:
  - `tags`: Required, valid JSON structure (see `Tags` schema)
- Update `archives` table:
  - Update `tags` JSON field
  - Update `updated_at` timestamp
- Return `200 OK` with updated `ArchiveDetail` schema

**Files:**
- `app/api/v1/endpoints/archives.py` (shared with Yasmine - she handles GET queries)
- `app/services/archive_service.py`
- `app/repositories/archive_repository.py`
- `app/api/v1/schemas/archive.py`

---

### 8. **`GET /supervisors`** - List all supervisors (Simple GET)
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
- Return paginated list with `Supervisor` schema
- Return `total`, `page`, `limit` for pagination

**Note:** This endpoint is also listed in Yasmine's assignment. Since it's a simple GET, either developer can handle it. For clarity, Sundus will handle this as it's admin-related.

**Files:**
- `app/api/v1/endpoints/supervisors.py` (shared with Moaz and Yasmine)
- `app/services/supervisor_service.py`
- `app/repositories/supervisor_repository.py`
- `app/api/v1/schemas/supervisor.py`

---

## 📁 Files to Create/Edit

### Endpoints
- `app/api/v1/endpoints/supervisors.py` - **Shared** (Sundus: POST/PUT/DELETE + GET list, Moaz: GET detail + dashboard, Yasmine: GET list)
- `app/api/v1/endpoints/tools.py` - **Sundus exclusive**
- `app/api/v1/endpoints/analytics.py` - **Sundus exclusive** (GET /admin/analytics)
- `app/api/v1/endpoints/archives.py` - **Shared** (Sundus: PATCH, Yasmine: GET queries)

### Services
- `app/services/supervisor_service.py` - **Shared** (all three developers)
- `app/services/tool_service.py` - **Sundus exclusive**
- `app/services/analytics_service.py` - **Sundus exclusive**
- `app/services/archive_service.py` - **Shared** (Sundus: PATCH method, Yasmine: GET methods)

### Repositories
- `app/repositories/supervisor_repository.py` - **Shared** (all three developers)
- `app/repositories/tool_permission_repository.py` - **Sundus exclusive**
- `app/repositories/archive_repository.py` - **Shared** (Sundus: PATCH method, Yasmine: GET methods)

### Schemas
- `app/api/v1/schemas/supervisor.py` - **Shared** (all three developers)
- `app/api/v1/schemas/tools.py` - **Sundus exclusive**
- `app/api/v1/schemas/analytics.py` - **Sundus exclusive**
- `app/api/v1/schemas/archive.py` - **Shared** (Sundus and Yasmine)

---

## 🎯 Workload Summary

- **Total Assigned Endpoints:** 8
- **Logic-Heavy:** 4 (1 DANGEROUS, 3 Medium)
- **Simple:** 4
- **Complexity:** Medium-High (dangerous operations require extra care)
- **Estimated Time:** 2 weeks

---

## ⚠️ File Sharing Notes

**Shared Files:**
- `supervisors.py` endpoint file is shared with Moaz and Yasmine
- `archives.py` endpoint file is shared with Yasmine
- **Clear Separation:**
  - **Sundus:** POST, PUT, DELETE /supervisors/{id}, GET /supervisors (list)
  - **Moaz:** GET /supervisors/{id} (detail), GET /supervisors/me/dashboard
  - **Yasmine:** GET /supervisors (list) - Note: This overlaps with Sundus, coordinate
  - **Sundus:** PATCH /archives/{id}
  - **Yasmine:** GET /archives, GET /archives/{id}
- **Coordination:** Use different function names, minimal overlap

---

## 📝 General Implementation Guidelines

1. **Authentication:** All endpoints require `get_current_user` dependency
2. **Authorization:** Verify admin role or ownership for each operation
3. **Error Handling:** Return appropriate HTTP status codes (400, 401, 403, 404, 408, 409, 422)
4. **Validation:** Use Pydantic models for request/response validation
5. **Transactions:** Use transactions for multi-step operations (especially DELETE)
6. **Security:** Extra care for dangerous operations (DELETE supervisor)
7. **Logging:** Log all dangerous operations for audit trail
8. **Supabase Auth:** Use Admin API for user management operations

---

## 🔒 Security Checklist

- [ ] All endpoints require authentication
- [ ] Authorization checks implemented (admin role or ownership)
- [ ] Input validation on all request bodies
- [ ] SQL injection prevention (use Supabase query builder)
- [ ] Dangerous operations (DELETE) have extra confirmation
- [ ] Audit logging for dangerous operations
- [ ] Rate limiting on mutation endpoints
- [ ] Error messages don't leak sensitive information
- [ ] Supabase Auth operations use Admin API (service role key)

---

## 🚨 Special Notes for DELETE /supervisors (DANGEROUS)

This endpoint is the **MOST DANGEROUS** operation in the entire project. Key considerations:

1. **Permanent Deletion:** This permanently deletes data - cannot be undone
2. **Cascade Delete:** Deletes supervisor → agents → interactions → archives → analytics
3. **Active Call Check:** Must verify no active calls before deletion
4. **Audit Logging:** Must log this operation with full details
5. **Transaction Safety:** Use transaction to ensure atomicity
6. **Error Handling:** Comprehensive error handling for edge cases

**Recommendations:**
- Consider implementing soft delete instead of hard delete
- Add confirmation step (two-step deletion)
- Add rate limiting (max 1 deletion per hour per admin)
- Log all deletion attempts (successful and failed)
- Consider backup before deletion (if possible)

**Error Scenarios to Handle:**
- Supervisor not found (404)
- Supervisor has active calls (409)
- Database transaction failure (500)
- Supabase Auth deletion failure (500)

