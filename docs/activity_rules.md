# Activity Types

Activities fall into one of two types. The type is set in `lib/activity-config.ts`
and looked up at runtime using the KPI's `pillar` + `slug` fields.

---

## cumulative

Values accumulate across quarters. YTD = sum of all quarters received.

**Example:**

| Quarter | Value | YTD  |
|---------|-------|------|
| Q1      | 120   | 120  |
| Q2      | 150   | 270  |
| Q3      | 60    | 330  |

**Use for:** total learners, certificates issued, programs delivered, robots deployed.

---

## monthly_variance

Each quarter is an independent snapshot. YTD = latest quarter's value.
Month-over-month change = current quarter − previous quarter.

**Example:**

| Quarter | Value | YTD (= latest) |
|---------|-------|----------------|
| Q1      | 250   | 250            |
| Q2      | 245   | 245            |
| Q3      | 260   | 260            |

**Use for:** active users, satisfaction scores, open projects, headcount.

---

## Adding or changing an activity type

1. Assign a `slug` to the `KpiRegistry` record (via Prisma Studio or a seed script).
   Format: lowercase English words separated by underscores, e.g. `total_students_enrolled`.

2. Add an entry to `ACTIVITY_TYPES` in `lib/activity-config.ts`:
   ```typescript
   'education.total_students_enrolled': 'cumulative',
   ```
   Key format: `"pillar_enum_lowercase.slug"`

3. Activities without a slug, or with a slug not in the config, default to `monthly_variance`.

---

## Default fallback

Unknown activities → `monthly_variance`.

This is the safe default: a snapshot value is never inflated by being summed.
If in doubt, leave the activity out of the config until the type is confirmed.
