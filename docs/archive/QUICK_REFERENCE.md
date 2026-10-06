# Mwalimu AI - Quick Reference Card

**Print this page for quick access to common information!**

---

## 📍 Key URLs

| Page | URL | Type |
|------|-----|------|
| Landing | `/` | Public |
| Login | `/auth/login` | Public |
| Sign Up | `/auth/sign-up` | Public |
| Dashboard | `/dashboard` | Protected |
| Modules | `/dashboard/modules` | Protected |
| AI Coach | `/dashboard/ai-coach` | Protected |
| Assessment | `/dashboard/assessment` | Protected |
| Community | `/dashboard/community` | Protected |
| Resources | `/dashboard/resources` | Protected |
| Achievements | `/dashboard/achievements` | Protected |
| Settings | `/dashboard/settings` | Protected |

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
pnpm install

# Set up environment (see ENV_SETUP.md)
# Create .env.local with Supabase credentials

# Run database migrations
# Run SQL from scripts/001_create_tables.sql

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

---

## 🔑 Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/auth/callback
```

See [ENV_SETUP.md](./ENV_SETUP.md) for detailed instructions.

---

## 📚 Documentation Map

| Document | Purpose | Read Time |
|----------|---------|-----------|
| [README.md](./README.md) | Full technical overview | 10 min |
| [GETTING_STARTED.md](./GETTING_STARTED.md) | User quick start | 5 min |
| [ENV_SETUP.md](./ENV_SETUP.md) | Environment setup | 15 min |
| [SCHEMA.md](./SCHEMA.md) | Database reference | 20 min |
| [BUILD_SUMMARY.md](./BUILD_SUMMARY.md) | Build overview | 15 min |
| [DOCS_INDEX.md](./DOCS_INDEX.md) | Documentation index | 10 min |
| [ROADMAP.md](./ROADMAP.md) | Development roadmap | 15 min |

---

## 🏗️ Project Structure Essentials

```
/app                  # Next.js app routes
  /auth              # Authentication pages
  /dashboard         # Protected pages
  /api               # Backend API routes
  page.tsx           # Landing page
  layout.tsx         # Root layout

/components
  /ui                # shadcn UI components
  /dashboard-*       # Dashboard components

/lib
  /supabase          # Supabase clients
  utils.ts           # Utility functions

/scripts
  001_create_tables.sql  # Database schema
  setup-db.py            # Setup script

/public              # Static assets

middleware.ts        # Auth middleware
```

---

## 🛠️ Tech Stack Quick Reference

**Frontend**: Next.js 16 | React 19 | TypeScript | Tailwind CSS 4  
**Backend**: Supabase PostgreSQL | Vercel AI SDK | OpenAI GPT-4  
**UI**: shadcn/ui | Radix UI | Lucide Icons  
**Auth**: Supabase Auth + JWT  
**Hosting**: Vercel (recommended)

---

## 🔐 Security Checklist

- [ ] Environment variables in `.env.local` (not committed)
- [ ] Service role key never exposed in client
- [ ] RLS policies enabled on all tables
- [ ] HTTPS enforced in production
- [ ] Regular backups configured
- [ ] Access logs monitored

---

## 📊 Key API Endpoints

### Chat API
**Endpoint**: `POST /api/chat`
**Auth**: Required (JWT)
**Body**: `{ messages: UIMessage[] }`
**Response**: Streaming AI responses

---

## 🎯 Database Table Reference

| Table | Purpose | Records |
|-------|---------|---------|
| profiles | Teacher info | 1 per user |
| modules | Learning content | 6+ |
| lessons | Module lessons | 30+ |
| user_progress | Completion tracking | Dynamic |
| needs_assessments | Assessments | 1+ per user |
| chat_conversations | Chat history | Dynamic |
| community_posts | Forum posts | Dynamic |
| community_replies | Forum replies | Dynamic |
| resources | Learning materials | 10+ |
| badges | Achievement badges | 6+ |
| user_badges | Earned badges | Dynamic |

---

## 🎓 Feature Highlights

✅ **AI Chat** - Real-time GPT-4 coaching  
✅ **6 Modules** - CBC-focused learning paths  
✅ **Assessment** - Personalized needs evaluation  
✅ **Community** - Teacher forum & discussions  
✅ **Resources** - Downloadable materials  
✅ **Achievements** - Badge system  
✅ **Mobile** - Responsive design  
✅ **Secure** - RLS protected data

---

## ⚡ Common Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build           # Build for production
pnpm start           # Start production server
pnpm lint            # Run linter

# Database
# Run migrations via Supabase dashboard

# Deployment
vercel deploy        # Deploy to Vercel
```

---

## 🐛 Quick Troubleshooting

**"Connection refused"**  
→ Check SUPABASE_URL and keys in .env.local

**"RLS policy error"**  
→ Verify RLS policies exist and user is authenticated

**"Chat not working"**  
→ Check `/api/chat` exists and verify AI gateway access

**"Auth redirect fails"**  
→ Verify REDIRECT_URL matches exactly (including protocol)

**"Database tables missing"**  
→ Run migration from `/scripts/001_create_tables.sql`

See [ENV_SETUP.md](./ENV_SETUP.md#troubleshooting) for more.

---

## 📞 Support & Resources

**Docs**: [DOCS_INDEX.md](./DOCS_INDEX.md)  
**Setup**: [ENV_SETUP.md](./ENV_SETUP.md)  
**Schema**: [SCHEMA.md](./SCHEMA.md)  
**Roadmap**: [ROADMAP.md](./ROADMAP.md)  
**Email**: support@mwalimuai.com  
**Issues**: GitHub Issues

---

## 🎯 Next Steps

1. **Setup**: Follow [GETTING_STARTED.md](./GETTING_STARTED.md)
2. **Configure**: Complete [ENV_SETUP.md](./ENV_SETUP.md)
3. **Database**: Run migrations
4. **Develop**: Start building!
5. **Deploy**: Use [README.md](./README.md#deployment)

---

## 📈 Metrics to Track

- Active users
- Module completions
- Average session time
- Community engagement
- AI chat usage
- Feature adoption
- Support tickets

---

## 🎨 Design System

**Colors**:
- Primary: `oklch(0.205 0 0)`
- Secondary: `oklch(0.97 0 0)`
- Accent: `oklch(0.97 0 0)`

**Typography**:
- Font: Geist (sans-serif)
- Mono: Geist Mono

**Spacing**: Tailwind scale (p-4, gap-2, etc.)

---

## ✅ Pre-Launch Checklist

- [ ] All environment variables configured
- [ ] Database tables created with RLS
- [ ] Authentication tested
- [ ] AI chat tested
- [ ] All pages accessible
- [ ] Mobile responsive tested
- [ ] Documentation reviewed
- [ ] Security audit passed
- [ ] Deployment configured
- [ ] Monitoring set up

---

## 🚀 Deployment Checklist

- [ ] Production environment variables set
- [ ] Database backups configured
- [ ] SSL/HTTPS enabled
- [ ] Email configured (optional)
- [ ] Analytics installed
- [ ] Error tracking set up
- [ ] Monitoring alerts enabled
- [ ] Support email working
- [ ] Documentation published
- [ ] User onboarding ready

---

## 📱 Mobile Optimization

- ✅ Responsive layout
- ✅ Touch-friendly buttons
- ✅ Mobile navigation
- ✅ Optimized images
- ✅ Keyboard support
- ⏳ Native app (planned v1.2)

---

## 🔄 Regular Maintenance

**Daily**: Monitor errors and performance  
**Weekly**: Review user feedback  
**Monthly**: Database maintenance & backups  
**Quarterly**: Security audit & updates  
**Annually**: Major version planning

---

## 📚 Recommended Reading Order

1. This file (2 min)
2. [GETTING_STARTED.md](./GETTING_STARTED.md) (5 min)
3. [ENV_SETUP.md](./ENV_SETUP.md) (15 min)
4. [README.md](./README.md) (10 min)
5. [SCHEMA.md](./SCHEMA.md) (20 min)

**Total**: ~52 minutes to full understanding

---

## 🎯 Success Metrics

- User adoption: 1,000+ teachers Year 1
- Engagement: 40% weekly active users
- Retention: 60%+ after 3 months
- Satisfaction: 4.5+/5 rating
- Learning: 80% report CBC improvement

---

**Version**: 1.0.0 | **Last Updated**: April 2026 | **Status**: ✅ Production Ready

*Bookmark this page for quick reference!*
