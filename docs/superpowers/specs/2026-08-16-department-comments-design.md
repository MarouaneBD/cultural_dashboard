# Department Analysis Comments — Design Spec

**Date:** 2026-08-16
**Status:** Approved — ready for implementation

---

## Problem

The smart analysis (InsightsPanel) on department pages is read-only. ADMIN and EDITOR users need a way to annotate the analysis with context, observations, or action items that persist and are visible to all users.

---

## Scope

Comments appear **only** on department detail pages, in a thread section directly below `InsightsPanel`. One thread per department (pillar). Not per-insight-card, not on the home dashboard.

---

## Data Model

New Prisma model added to `prisma/schema.prisma`:

```prisma
model Comment {
  id        String   @id @default(cuid())
  pillarId  String                         // matches PillarId union: "islamic_education" | "holy_quran" | "teacher_sponsorship" | "university_sponsorship"
  text      String
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

`User` model gains a `comments Comment[]` back-relation.

No foreign key to `KpiRegistry` or any insight — comments are department-level only.

---

## API Routes

All under `app/api/comments/`.

| Method | Path | Minimum role | Action |
|--------|------|-------------|--------|
| `GET` | `/api/comments?pillarId=X` | Any authenticated | List all comments for a department, newest-last |
| `POST` | `/api/comments` | ADMIN or EDITOR | Create a comment |
| `PATCH` | `/api/comments/[id]` | Author OR ADMIN | Edit comment text |
| `DELETE` | `/api/comments/[id]` | Author OR ADMIN | Delete a comment |

**GET response shape:**
```typescript
{
  id: string
  text: string
  createdAt: string   // ISO 8601
  updatedAt: string
  author: { id: string; username: string; name: string | null }
}[]
```

**Server-side auth rules (enforced in every handler):**
- `GET`: session required; any role allowed
- `POST`: session role must be `ADMIN` or `EDITOR` — return 403 otherwise
- `PATCH` / `DELETE`: session user must be the comment author (`authorId === session.user.id`) OR role is `ADMIN` — return 403 otherwise

All handlers follow the existing pattern: `const session = await auth()` → role check → Prisma call → JSON response.

---

## Components

### `CommentThread.tsx` — `components/department/CommentThread.tsx`

Props:
```typescript
interface Props {
  pillarId: PillarId
  accentColor: string
}
```

Responsibilities:
- Fetches comments via React Query: `queryKey: ['comments', pillarId]` → `GET /api/comments?pillarId={pillarId}`
- Renders the header row: label "تعليقات التحليل" on the right; "أضف تعليقاً" button on the left (hidden for VIEWER)
- Renders `CommentItem` for each comment
- Renders `CommentComposer` in create mode when the add button is clicked
- Empty state (no comments): single muted line `لا توجد تعليقات بعد` — no button or box for VIEWERs

### `CommentItem` — inline sub-component inside `CommentThread.tsx`

Renders one comment:
- Right: avatar (initials in a small circle using `accentColor` tint) + author username + comment text
- Left: relative timestamp (e.g. `منذ 3 أيام`) + "تعديل" / "حذف" action buttons (shown only to author or ADMIN)
- Clicking "تعديل" replaces the text with a pre-filled `CommentComposer` in edit mode
- Clicking "حذف" calls `DELETE /api/comments/[id]` and invalidates the query

### `CommentComposer.tsx` — `components/department/CommentComposer.tsx`

Props:
```typescript
interface Props {
  pillarId: PillarId
  mode: 'create' | 'edit'
  commentId?: string       // required when mode === 'edit'
  initialText?: string     // pre-filled when editing
  onDone: () => void       // collapses the composer on submit or cancel
}
```

Responsibilities:
- RTL `<textarea>` with 500-character max, auto-resize
- "إرسال" button (disabled while submitting) + "إلغاء" button
- `create` mode: `POST /api/comments` with `{ pillarId, text }`
- `edit` mode: `PATCH /api/comments/[id]` with `{ text }`
- On success: invalidates `['comments', pillarId]` → calls `onDone()`
- On error: inline Arabic error message below the textarea

---

## Integration

`DepartmentDashboard.tsx` renders `<CommentThread>` after `<InsightsPanel>`, separated by the existing `<div className="border-t">` divider pattern:

```tsx
{/* ── Insights ── */}
<InsightsPanel insights={insights} />

{/* ── Comments ── */}
<div className="border-t" style={{ borderColor: 'var(--border)' }} />
<CommentThread pillarId={pillarId} accentColor={color} />
```

---

## Role Visibility Summary

| UI element | VIEWER | EDITOR | ADMIN |
|-----------|--------|--------|-------|
| See comment thread | ✓ | ✓ | ✓ |
| "أضف تعليقاً" button | — | ✓ | ✓ |
| Edit own comment | — | ✓ | ✓ |
| Delete own comment | — | ✓ | ✓ |
| Delete any comment | — | — | ✓ |

---

## Out of Scope

- Comments on the home dashboard (ExecutiveSummary)
- Per-insight-card comments
- Comment reactions or threading (replies)
- Real-time updates (polling or WebSocket) — React Query's default stale time is sufficient
- Rich text / markdown in comments — plain text only
