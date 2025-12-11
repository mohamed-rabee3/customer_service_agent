# Code Review Task - Security & Structure

## Quick Review Checklist

### 1. Folder Structure
- [ ] Matches `docs/05_folder_structure.md`
- [ ] No test files outside documented structure

### 2. Supabase RLS & Policies
- [ ] RLS enabled on all tables
- [ ] Policies block anonymous users
- [ ] Service key bypasses RLS correctly

**SQL Check:**
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
```

### 3. Security (JWT & Auth)
- [ ] `/auth/me` requires valid JWT token
- [ ] Missing/invalid tokens return 401
- [ ] Valid token returns correct user data with role

**Break Tests:**
- Missing token → 401
- Invalid token → 401
- Expired token → 401

### 4. Endpoint Functionality
- [ ] `/auth/me` returns: `id`, `email`, `role`, `profile`
- [ ] Admin gets `AdminProfile`, Supervisor gets `SupervisorProfile`

## Tests to Run

```bash
pytest backend/tests/integration/test_db/test_supabase_setup.py -v
pytest backend/tests/integration/test_db/test_rls_anon_block.py -v
pytest backend/tests/integration/test_db/test_auth_me_live.py -v
```

## Files to Review

- `backend/app/core/security.py` - JWT validation
- `backend/app/api/v1/endpoints/auth.py` - `/auth/me` endpoint
- `db/001_enable_rls.sql` - RLS setup
- `db/002_create_rls_policies.sql` - RLS policies

## Success Criteria

✅ RLS blocks anonymous users  
✅ JWT authentication works  
✅ `/auth/me` returns correct data  
✅ No security vulnerabilities  

---

**Focus:** Main security checks only, not exhaustive testing.
