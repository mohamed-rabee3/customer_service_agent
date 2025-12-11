# Endpoint Assignment Overview
## Classification by Role and Difficulty

This folder contains endpoint assignments for each backend developer, classified by role and difficulty level.

---

## 📋 Assignment Files

- **`moaz_endpoints.md`** - Moaz (Entity Owner: Mutations + Dashboard) - 8 endpoints
- **`yasmine_endpoints.md`** - Yasmine (Data Queen: Archives + Admin + Complex Queries) - 8 endpoints
- **`sundus_endpoints.md`** - Sundus (Admin & Control: Dangerous Actions + Tools) - 8 endpoints

---

## 🚫 Excluded Endpoints (AI Team Only)

These endpoints are **NOT** assigned to backend developers because they require direct LiveKit/AI integration:

1. **`POST /interactions`** - Requires LiveKit JWT token generation and WebRTC room creation
2. **`POST /agents/{agent_id}/whisper`** - Requires LiveKit Data Channel communication
3. **`GET /realtime/agent/{agent_id}/metrics`** (SSE) - Real-time streaming from AI processing
4. **`GET /realtime/supervisor/notifications`** (SSE) - Real-time streaming for agent alerts

**Note:** `/auth/me` endpoint is already implemented and not assigned.

---

## 📊 Workload Distribution

| Developer   | Total Endpoints | Logic-Heavy       | Simple | Complexity |
|-------------|-----------------|-------------------|--------|------------|
| **Moaz**    | 8               | 4 (2 HARD)        | 4      | High       |
| **Yasmine** | 8               | 4 (1 THE HARDEST) | 4      | High       |
| **Sundus**  | 8               | 4 (1 DANGEROUS)   | 4      | Medium-High|

### Difficulty Breakdown

**Very High / THE HARDEST:**
- `GET /archives` - Dynamic multi-filter query (Yasmine)

**High / HARD:**
- `POST /agents` - Max 3 agents validation (Moaz)
- `GET /supervisors/me/dashboard` - Complex joins (Moaz)

**DANGEROUS:**
- `DELETE /supervisors/{supervisor_id}` - Cascade delete (Sundus)

**Medium:**
- `PUT /agents/{agent_id}` - Status check (Moaz)
- `DELETE /agents/{agent_id}` - Status check (Moaz)
- `GET /admin/dashboard` - Count + leaderboard (Yasmine)
- `GET /interactions/{interaction_id}` - Multi-table joins (Yasmine)
- `GET /archives/{interaction_id}` - Multi-table joins (Yasmine)
- `POST /supervisors` - Duplicate check (Sundus)
- `PUT /supervisors/{supervisor_id}` - Duplicate check (Sundus)
- `POST /tools/permissions/{permission_id}/respond` - Validate + update (Sundus)

**Simple:**
- All other GET endpoints (simple queries)
- Simple PATCH updates (tags, status)

---

## ✅ Assignment Status

**All endpoints from OpenAPI spec are assigned** (excluding AI team endpoints and `/auth/me`).

- **Total endpoints in OpenAPI spec:** 20 (excluding AI team endpoints)
- **Assigned to backend team:** 20 endpoints
- **Excluded (AI team):** 4 endpoints
- **Already implemented:** 1 endpoint (`GET /auth/me`)

**Verification:**
- ✅ No duplicate assignments
- ✅ All endpoints covered
- ✅ Balanced workload (8, 8, 8)

---

## ⚠️ File Sharing Strategy

Some files are shared between developers. Clear separation of responsibilities prevents conflicts:

### `app/api/v1/endpoints/supervisors.py`
- **Moaz:** `GET /supervisors/{supervisor_id}` (detail), `GET /supervisors/me/dashboard`
- **Yasmine:** `GET /supervisors` (list)
- **Sundus:** `POST /supervisors`, `PUT /supervisors/{supervisor_id}`, `DELETE /supervisors/{supervisor_id}`, `GET /supervisors` (list)

**Note:** Both Yasmine and Sundus have `GET /supervisors` (list). This is a simple endpoint - coordinate to avoid duplication.

**Coordination:**
- Use different function names: `get_supervisors_list()`, `get_supervisor_detail()`, `create_supervisor()`, etc.
- Minimal overlap - different HTTP methods
- Services/Repositories: Shared but different methods

### `app/api/v1/endpoints/archives.py`
- **Yasmine:** `GET /archives`, `GET /archives/{interaction_id}` (queries)
- **Sundus:** `PATCH /archives/{interaction_id}` (update)

**Coordination:**
- Clear separation: GET vs PATCH
- No conflicts

### `app/api/v1/endpoints/agents.py`
- **Moaz:** All agent endpoints (exclusive)

**No sharing - Moaz exclusive**

### Shared Services and Repositories

- `supervisor_service.py` - Shared (all three developers, different methods)
- `supervisor_repository.py` - Shared (all three developers, different methods)
- `archive_service.py` - Shared (Yasmine: GET methods, Sundus: PATCH method)
- `archive_repository.py` - Shared (Yasmine: GET methods, Sundus: PATCH method)

**Coordination:**
- Use different method names
- Document which methods belong to which developer
- No conflicts expected (different operations)

---

## 📝 Implementation Guidelines

### General Rules

1. **Authentication:** All endpoints require `get_current_user` dependency
2. **Authorization:** Verify ownership/role for each operation
3. **Error Handling:** Return appropriate HTTP status codes
4. **Validation:** Use Pydantic models for request/response validation
5. **Security:** Never trust client input, always validate and sanitize
6. **Logging:** Log important operations for audit trail

### Security Best Practices

- ✅ Always authenticate users
- ✅ Verify authorization (ownership or role)
- ✅ Validate all input data
- ✅ Use parameterized queries (Supabase handles this)
- ✅ Rate limit mutation endpoints
- ✅ Log dangerous operations (DELETE, etc.)
- ✅ Don't leak sensitive information in error messages

### Code Structure

Follow the existing patterns:
- **Endpoints:** `app/api/v1/endpoints/*.py`
- **Services:** `app/services/*.py`
- **Repositories:** `app/repositories/*.py`
- **Schemas:** `app/api/v1/schemas/*.py`

### Testing

- Write unit tests for business logic
- Write integration tests for endpoints
- Test security (authentication, authorization)
- Test error cases
- Test edge cases (empty results, pagination, etc.)

---

## 🔍 Quick Reference

### Moaz's Endpoints
- Agent mutations (POST, PUT, DELETE)
- Agent queries (GET detail, GET status)
- Supervisor dashboard (GET /supervisors/me/dashboard)
- Supervisor queries (GET list, GET detail)

### Yasmine's Endpoints
- Archive queries (GET /archives - THE HARDEST, GET /archives/{id})
- Admin dashboard (GET /admin/dashboard)
- Interaction queries (GET /interactions, GET /interactions/{id})
- Analytics queries (GET /analytics/supervisor/{id}, GET /analytics/agent/{id})
- Interaction update (PATCH /interactions/{id})

### Sundus's Endpoints
- Supervisor mutations (POST, PUT, DELETE /supervisors/{id} - DANGEROUS)
- Supervisor list (GET /supervisors)
- Tool permissions (GET, POST /tools/permissions/*)
- Admin analytics (GET /admin/analytics)
- Archive update (PATCH /archives/{id})

---

## 📚 Additional Resources

- **OpenAPI Specification:** `docs/04_openapi_spec.yaml`
- **Database Schema:** `db/database.sql`
- **Base Repository:** `app/repositories/base.py`
- **Security Module:** `app/core/security.py`
- **Config:** `app/core/config.py`

---

## 🎯 Next Steps

1. Review individual assignment files for detailed endpoint specifications
2. Review security notes and implementation guidelines
3. Begin implementation following the file structure
4. Coordinate with team members on shared files
5. Test thoroughly before submitting

---

## ⚠️ Important Notes

- **File Conflicts:** Some files are shared - coordinate with team members
- **Security:** Pay special attention to security notes in each assignment file
- **Performance:** Optimize queries, especially for complex endpoints
- **Testing:** Test all endpoints thoroughly, especially dangerous operations
- **Documentation:** Document any deviations from the specification

---

**Last Updated:** Based on difficulty classification from endpoint analysis
**Status:** ✅ All endpoints assigned, balanced workload, file conflicts documented

