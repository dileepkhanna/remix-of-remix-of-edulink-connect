
# Plan: Fix Certificate Request Error and Enhance Messaging System

## Issues Identified

### Issue 1: Certificate Request Error
The database has a check constraint `certificate_requests_certificate_type_check` that only allows these values:
- `bonafide`
- `transfer`
- `character`

But the frontend is sending full names like `Bonafide Certificate`, `Transfer Certificate`, etc., causing the constraint violation.

### Issue 2: Messaging System Enhancement
Current messaging is limited - parents can only message teachers in their child's class. The request is to:
1. **Parents**: Should be able to message their child's class teacher AND the principal
2. **Teachers & Principal (Admin)**: Should be able to send messages by selecting a class and then a student, to reach the parent

---

## Solution

### Part 1: Fix Certificate Types

**Database Migration:**
Update the check constraint to accept the full certificate type names used in the UI:
- `Bonafide Certificate`
- `Transfer Certificate`
- `Character Certificate`
- `Study Certificate`
- `Migration Certificate`
- `Conduct Certificate`

### Part 2: Enhance Messaging System

#### For Parents (ParentMessages.tsx + MessagingInterface.tsx):
- Modify contact loading to also include:
  - **Class Teacher** (identified via `class_teacher_id` on the `classes` table)
  - **Principal** (the admin user from `user_roles` table)
- Show role labels like "Class Teacher" and "Principal" for clarity

#### For Teachers (TeacherMessages.tsx + MessagingInterface.tsx):
- Add class and student selection filters at the top
- Teachers can pick a class, then see students in that class
- Selecting a student shows the linked parent as the recipient
- Maintain existing conversation list below

#### For Principal/Admin:
- Create new `AdminMessages.tsx` page with messaging interface
- Add "Messages" to admin sidebar
- Admin can select any class, then any student to message parents
- Admin can also view incoming messages from parents

#### MessagingInterface Updates:
- Add a new prop `currentUserRole` that now supports `'teacher' | 'parent' | 'admin'`
- For admin role, load all classes and allow selection
- Add filters UI for class/student selection when role is teacher or admin
- Keep the conversation list but add a "New Message" button with class/student picker

---

## Technical Details

### Files to Create:
1. `src/pages/admin/AdminMessages.tsx` - Admin messaging page

### Files to Modify:
1. `src/config/adminSidebar.tsx` - Add Messages menu item
2. `src/App.tsx` - Add admin messages route
3. `src/components/messaging/MessagingInterface.tsx` - Major refactor:
   - Accept `'admin'` as a role option
   - Add class/student selection for teachers and admins
   - Include principal and class teacher contacts for parents
4. `src/pages/parent/ParentCertificates.tsx` - Update certificate types to use lowercase keys

### Database Migration:
```sql
-- Drop existing constraint and add new one with all certificate types
ALTER TABLE certificate_requests 
DROP CONSTRAINT IF EXISTS certificate_requests_certificate_type_check;

ALTER TABLE certificate_requests 
ADD CONSTRAINT certificate_requests_certificate_type_check 
CHECK (certificate_type = ANY (ARRAY[
  'Bonafide Certificate',
  'Transfer Certificate', 
  'Character Certificate',
  'Study Certificate',
  'Migration Certificate',
  'Conduct Certificate'
]));
```

---

## UI Flow After Changes

### Parent Messaging:
- Open Messages page
- See contacts list with:
  - "Principal" (always available)
  - "Class Teacher - [Name]" (child's class teacher)
  - Any teachers assigned to the class
- Select contact and chat

### Teacher Messaging:
- Open Messages page
- See "New Message" button with class/student picker
- Existing conversations listed below
- Can select class then student to start new conversation with parent

### Admin/Principal Messaging:
- Open Messages page from admin sidebar
- See all incoming messages from parents
- Use class/student picker to compose new messages
- Full access to message any parent
