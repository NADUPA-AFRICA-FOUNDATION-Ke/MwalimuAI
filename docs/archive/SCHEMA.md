# Database Schema Reference

## Overview
Mwalimu AI uses Supabase PostgreSQL with Row Level Security (RLS) policies to ensure data privacy and security.

## Tables

### 1. profiles
User teacher profiles with metadata.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  school_name TEXT,
  county TEXT,
  sub_county TEXT,
  tsc_number TEXT,
  phone_number TEXT,
  subjects TEXT[],
  grade_levels TEXT[],
  years_of_experience INTEGER,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies**:
- SELECT: Users can view their own profile
- INSERT: Users can create their own profile
- UPDATE: Users can edit their own profile
- DELETE: Users can delete their own profile

---

### 2. modules
Learning modules/courses.

```sql
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  difficulty_level TEXT NOT NULL,
  estimated_duration INTEGER,
  content_type TEXT NOT NULL,
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Categories**: `cbc_fundamentals`, `assessment_strategies`, `pedagogy`, `technology_integration`, `inclusion`  
**Difficulty**: `beginner`, `intermediate`, `advanced`  
**Content Type**: `video`, `text`, `interactive`, `quiz`

**RLS Policies**:
- SELECT: Everyone can view published modules
- INSERT/UPDATE/DELETE: Admin only

---

### 3. lessons
Individual lessons within modules.

```sql
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  order_index INTEGER,
  duration_minutes INTEGER,
  video_url TEXT,
  quiz_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies**:
- SELECT: Everyone can view lessons for published modules
- INSERT/UPDATE/DELETE: Admin only

---

### 4. user_progress
Progress tracking for modules and lessons.

```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  completion_percentage INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  quiz_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies**:
- Users can only view/edit their own progress records

---

### 5. needs_assessments
Needs assessment survey responses.

```sql
CREATE TABLE needs_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cbc_familiarity INTEGER CHECK (cbc_familiarity >= 1 AND cbc_familiarity <= 5),
  competency_assessment_confidence INTEGER CHECK (competency_assessment_confidence >= 1 AND competency_assessment_confidence <= 5),
  formative_assessment_skills INTEGER CHECK (formative_assessment_skills >= 1 AND formative_assessment_skills <= 5),
  integration_challenges TEXT[],
  preferred_learning_style TEXT,
  time_available_weekly INTEGER,
  priority_areas TEXT[],
  additional_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies**:
- Users can only view/edit their own assessments

---

### 6. chat_conversations
AI coach chat conversation history.

```sql
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  messages JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Message Format**:
```json
{
  "role": "user|assistant",
  "content": "message text",
  "timestamp": "2026-04-21T00:00:00Z"
}
```

**RLS Policies**:
- Users can only view/edit their own conversations

---

### 7. community_posts
Forum discussion posts.

```sql
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Categories**: `assessment`, `implementation`, `technology`, `inclusion`, `workload`, `resources`

**RLS Policies**:
- SELECT: Everyone can view posts
- INSERT: Authenticated users can create posts
- UPDATE/DELETE: Users can edit/delete their own posts

---

### 8. community_replies
Replies to forum posts.

```sql
CREATE TABLE community_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  is_helpful BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policies**:
- SELECT: Everyone can view replies
- INSERT: Authenticated users can create replies
- UPDATE/DELETE: Users can edit/delete their own replies

---

### 9. resources
Learning resources and materials.

```sql
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL,
  file_url TEXT,
  file_size_mb DECIMAL,
  duration_minutes INTEGER,
  tags TEXT[],
  category TEXT,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Resource Types**: `pdf`, `video`, `template`, `guide`, `toolkit`  
**Categories**: `assessment`, `implementation`, `pedagogy`, `technology`

**RLS Policies**:
- SELECT: Everyone can view resources
- INSERT/UPDATE/DELETE: Admin only

---

### 10. badges
Available achievement badges.

```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  color TEXT,
  requirement_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Example Badges**:
- CBC Explorer
- Assessment Master
- Community Contributor
- Quick Learner
- Curriculum Expert
- Inclusive Educator

---

### 11. user_badges
User earned badges.

```sql
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);
```

**RLS Policies**:
- Users can only view badges they've earned
- Admin creates badge assignments

---

## Indexes

For performance optimization:

```sql
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_module_id ON user_progress(module_id);
CREATE INDEX idx_chat_user_id ON chat_conversations(user_id);
CREATE INDEX idx_community_posts_category ON community_posts(category);
CREATE INDEX idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
```

---

## Row Level Security (RLS) Overview

All tables have RLS enabled. Security policies ensure:

1. **User Isolation**: Users can only access their own data
2. **Admin Access**: Admin role can access all data
3. **Public Content**: Modules, resources, and posts are readable by all
4. **Data Protection**: Sensitive fields protected from unauthorized access

### Example Policy

```sql
-- Users can only see their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
```

---

## Common Queries

### Get User Profile with Progress
```sql
SELECT 
  p.full_name, 
  p.school_name,
  COUNT(up.id) as total_modules_started,
  SUM(CASE WHEN up.completed_at IS NOT NULL THEN 1 ELSE 0 END) as modules_completed
FROM profiles p
LEFT JOIN user_progress up ON p.id = up.user_id
WHERE p.id = auth.uid()
GROUP BY p.id;
```

### Get Latest Community Posts
```sql
SELECT id, title, user_id, category, likes_count, created_at
FROM community_posts
ORDER BY created_at DESC
LIMIT 10;
```

### Get User's Earned Badges
```sql
SELECT b.name, b.description, ub.earned_at
FROM user_badges ub
JOIN badges b ON ub.badge_id = b.id
WHERE ub.user_id = auth.uid()
ORDER BY ub.earned_at DESC;
```

---

## Data Relationships

```
auth.users (Supabase)
    ↓
profiles (1:1)
    ├── user_progress → modules, lessons
    ├── needs_assessments
    ├── chat_conversations
    ├── community_posts → community_replies
    └── user_badges → badges
```

---

## Maintenance

### Backup Strategy
- Daily automatic backups via Supabase
- Manual backup before major changes
- Point-in-time recovery available

### Monitoring
- Monitor RLS policy performance
- Track query performance
- Monitor storage usage
- Review access logs

### Data Retention
- User data: Retained until deletion
- Chat history: Indefinite (or per policy)
- Activity logs: 90 days (configurable)

---

## Migrations

Database migrations are stored in `/scripts/`:
- `001_create_tables.sql` - Initial schema

To add new migrations:
1. Create `002_add_new_feature.sql`
2. Run via Supabase SQL editor
3. Document changes in migration file

---

## Support

For database issues:
- Check RLS policies aren't too restrictive
- Verify indexes are created
- Monitor query performance
- Review Supabase documentation
- Contact support@mwalimuai.com

---

**Last Updated**: April 2026
**Version**: 1.0.0
