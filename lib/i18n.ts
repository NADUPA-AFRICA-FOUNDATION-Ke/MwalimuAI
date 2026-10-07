export type Lang = 'en' | 'sw'

const translations = {
  en: {
    // Nav
    'nav.dashboard':   'Dashboard',
    'nav.learning':    'Learning Paths',
    'nav.modules':     'Learning Modules',
    'nav.assessment':  'Needs Assessment',
    'nav.aiCoach':     'AI Coach',
    'nav.tools':       'Teacher Tools',
    'nav.journal':     'My Journal',
    'nav.community':   'Community',
    'nav.resources':   'Resources',
    'nav.achievements':'Achievements',
    'nav.progress':    'My Progress',
    'nav.settings':    'Settings',
    'nav.support':     'Help & support',
    'nav.school':      'My school',
    'nav.record':      'My record',
    // Short labels for the phone tab bar (must fit on one line at 12px)
    'nav.tabHome':     'Home',
    'nav.tabLearn':    'Learn',
    'nav.tabCoach':    'Coach',
    'nav.tabTools':    'Tools',
    'nav.tabCommunity':'Community',

    // Header
    'header.logout':   'Logout',
    'header.langToggle': 'Kiswahili',

    // Dashboard welcome
    'dash.welcomeBack':   'Welcome back',
    'dash.readyToContinue': 'Ready to continue learning?',
    'dash.pickUp':  'Pick up where you left off or explore new CBC teaching strategies with your AI coach.',
    'dash.aiCoach': 'AI Coach',
    'dash.browseModules': 'Browse Modules',

    // Dashboard stats
    'dash.modulesCompleted': 'Modules Completed',
    'dash.ofModules': 'of {n} modules',
    'dash.aiSessions': 'AI Chat Sessions',
    'dash.thisWeek': 'this week',
    'dash.communityPosts': 'Community Posts',
    'dash.contributions': 'contributions',
    'dash.badgesEarned': 'Badges Earned',
    'dash.achievements': 'achievements',

    // Dashboard sections
    'dash.continueLearning': 'Continue Learning',
    'dash.viewAll': 'View all',
    'dash.quickActions': 'Quick Actions',
    'dash.inProgress': 'In Progress',
    'dash.recommended': 'Recommended',
    'dash.getInstantHelp': 'Get instant help',
    'dash.personalise': 'Personalise path',
    'dash.joinDiscussions': 'Join discussions',
    'dash.viewBadges': 'View badges',
    'dash.streakTitle': '7-Day Learning Streak',
    'dash.streakSub': "Keep it up! You're on a roll.",
    'dash.viewAll2': 'View All',

    // Tools hub
    'tools.heading': 'Save Time. Teach Better.',
    'tools.subheading': 'Four AI-powered tools built specifically for CBC teachers in Kenya. Each tool is grounded in KICD standards and designed to reduce admin time so you can focus on your learners.',
    'tools.disclaimer': 'All tools use AI — always review outputs before using them with learners or parents.',

    // Onboarding
    'onboard.step1Title': 'Welcome to Mwalimu AI',
    'onboard.step1Sub': "Let's personalise your experience. This takes about a minute.",
    'onboard.name': 'Your Name',
    'onboard.namePlaceholder': 'e.g. Jane Muthoni',
    'onboard.school': 'School Name',
    'onboard.schoolPlaceholder': 'e.g. Nairobi Primary School',
    'onboard.county': 'County',
    'onboard.step2Title': 'Your Teaching Context',
    'onboard.subjects': 'Subjects You Teach',
    'onboard.grades': 'Grades You Teach',
    'onboard.step3Title': 'Your CBC Experience',
    'onboard.cbcLevel': 'How familiar are you with CBC?',
    'onboard.beginner': 'Beginner — still learning the basics',
    'onboard.intermediate': 'Intermediate — implementing but have questions',
    'onboard.advanced': 'Advanced — confident, want to deepen expertise',
    'onboard.next': 'Next',
    'onboard.back': 'Back',
    'onboard.finish': "Let's Go!",
    'onboard.skip': 'Skip for now',

    // Progress
    'progress.title': 'My Progress',
    'progress.sub': 'Set professional development goals and track your milestones.',
    'progress.addGoal': 'Add Goal',
    'progress.noGoals': 'No goals yet',
    'progress.noGoalsSub': 'Add your first professional development goal to start tracking your progress.',
    'progress.goalTitle': 'Goal Title',
    'progress.goalTitlePlaceholder': 'e.g. Master CBC formative assessment',
    'progress.category': 'Category',
    'progress.milestone': 'Milestone',
    'progress.milestonePlaceholder': 'e.g. Complete assessment module',
    'progress.addMilestone': 'Add milestone',
    'progress.save': 'Save Goal',
    'progress.cancel': 'Cancel',
    'progress.delete': 'Delete goal',
    'progress.complete': 'completed',
    'progress.categories': {
      assessment: 'Assessment',
      pedagogy: 'Pedagogy',
      digital: 'Digital Skills',
      community: 'Community',
      wellbeing: 'Wellbeing',
      other: 'Other',
    },

    // Common
    'common.backTo': 'Back to',
    'common.copy': 'Copy',
    'common.copied': 'Copied!',
    'common.regenerate': 'Regenerate',
    'common.generate': 'Generate',
    'common.generating': 'Generating…',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
  },

  sw: {
    // Nav
    'nav.dashboard':   'Dashibodi',
    'nav.learning':    'Njia za Kujifunza',
    'nav.modules':     'Moduli za Kujifunza',
    'nav.assessment':  'Tathmini ya Mahitaji',
    'nav.aiCoach':     'Kocha wa AI',
    'nav.tools':       'Zana za Mwalimu',
    'nav.journal':     'Jarida Langu',
    'nav.community':   'Jamii',
    'nav.resources':   'Rasilimali',
    'nav.achievements':'Mafanikio',
    'nav.progress':    'Maendeleo Yangu',
    'nav.settings':    'Mipangilio',
    'nav.support':     'Msaada',
    'nav.school':      'Shule yangu',
    'nav.record':      'Rekodi yangu',
    'nav.tabHome':     'Nyumbani',
    'nav.tabLearn':    'Jifunze',
    'nav.tabCoach':    'Kocha',
    'nav.tabTools':    'Zana',
    'nav.tabCommunity':'Jamii',

    // Header
    'header.logout':   'Toka',
    'header.langToggle': 'English',

    // Dashboard welcome
    'dash.welcomeBack':   'Karibu tena',
    'dash.readyToContinue': 'Uko tayari kuendelea kujifunza?',
    'dash.pickUp':  'Endelea ulipoacha au gundua mikakati mipya ya kufundisha CBC na kocha wako wa AI.',
    'dash.aiCoach': 'Kocha wa AI',
    'dash.browseModules': 'Vinjari Moduli',

    // Dashboard stats
    'dash.modulesCompleted': 'Moduli Zilizokamilika',
    'dash.ofModules': 'kati ya moduli {n}',
    'dash.aiSessions': 'Mazungumzo ya AI',
    'dash.thisWeek': 'wiki hii',
    'dash.communityPosts': 'Machapisho ya Jamii',
    'dash.contributions': 'michango',
    'dash.badgesEarned': 'Beji Zilizopatikana',
    'dash.achievements': 'mafanikio',

    // Dashboard sections
    'dash.continueLearning': 'Endelea Kujifunza',
    'dash.viewAll': 'Ona zote',
    'dash.quickActions': 'Vitendo vya Haraka',
    'dash.inProgress': 'Inaendelea',
    'dash.recommended': 'Inayopendekezwa',
    'dash.getInstantHelp': 'Pata msaada haraka',
    'dash.personalise': 'Binafsisha njia',
    'dash.joinDiscussions': 'Jiunge na majadiliano',
    'dash.viewBadges': 'Tazama beji',
    'dash.streakTitle': 'Mfululizo wa Siku 7',
    'dash.streakSub': 'Endelea hivyo! Uko vizuri sana.',
    'dash.viewAll2': 'Ona Zote',

    // Tools hub
    'tools.heading': 'Okoa Muda. Fundisha Vizuri.',
    'tools.subheading': 'Zana nne zinazotumia AI, zilizoundwa hasa kwa walimu wa CBC nchini Kenya. Kila zana imejengwa kwa viwango vya KICD ili kupunguza muda wa utawala.',
    'tools.disclaimer': 'Zana zote zinatumia AI — daima kagua matokeo kabla ya kuyatumia na wanafunzi au wazazi.',

    // Onboarding
    'onboard.step1Title': 'Karibu Mwalimu AI',
    'onboard.step1Sub': 'Hebu tubinafsishe uzoefu wako. Itachukua dakika moja.',
    'onboard.name': 'Jina Lako',
    'onboard.namePlaceholder': 'mfano: Jane Muthoni',
    'onboard.school': 'Jina la Shule',
    'onboard.schoolPlaceholder': 'mfano: Shule ya Msingi ya Nairobi',
    'onboard.county': 'Kaunti',
    'onboard.step2Title': 'Muktadha Wako wa Kufundisha',
    'onboard.subjects': 'Masomo Unayofundisha',
    'onboard.grades': 'Madarasa Unayofundisha',
    'onboard.step3Title': 'Uzoefu Wako wa CBC',
    'onboard.cbcLevel': 'Una ujuzi gani na CBC?',
    'onboard.beginner': 'Mwanzo — bado ninajifunza misingi',
    'onboard.intermediate': 'Kati — ninatekeleza lakini nina maswali',
    'onboard.advanced': 'Juu — nina imani, nataka kuimarisha ujuzi',
    'onboard.next': 'Endelea',
    'onboard.back': 'Rudi',
    'onboard.finish': 'Tuanze!',
    'onboard.skip': 'Ruka kwa sasa',

    // Progress
    'progress.title': 'Maendeleo Yangu',
    'progress.sub': 'Weka malengo ya maendeleo ya kitaaluma na ufuatilie hatua zako.',
    'progress.addGoal': 'Ongeza Lengo',
    'progress.noGoals': 'Hakuna malengo bado',
    'progress.noGoalsSub': 'Ongeza lengo lako la kwanza la maendeleo ya kitaaluma ili kuanza kufuatilia maendeleo yako.',
    'progress.goalTitle': 'Kichwa cha Lengo',
    'progress.goalTitlePlaceholder': 'mfano: Bora tathmini ya CBC',
    'progress.category': 'Kategoria',
    'progress.milestone': 'Hatua',
    'progress.milestonePlaceholder': 'mfano: Kamilisha moduli ya tathmini',
    'progress.addMilestone': 'Ongeza hatua',
    'progress.save': 'Hifadhi Lengo',
    'progress.cancel': 'Ghairi',
    'progress.delete': 'Futa lengo',
    'progress.complete': 'imekamilika',
    'progress.categories': {
      assessment: 'Tathmini',
      pedagogy: 'Pedagojia',
      digital: 'Ujuzi wa Kidijitali',
      community: 'Jamii',
      wellbeing: 'Ustawi',
      other: 'Nyingine',
    },

    // Common
    'common.backTo': 'Rudi kwenye',
    'common.copy': 'Nakili',
    'common.copied': 'Imenakiliwa!',
    'common.regenerate': 'Tengeneza tena',
    'common.generate': 'Tengeneza',
    'common.generating': 'Inatengeneza…',
    'common.save': 'Hifadhi',
    'common.cancel': 'Ghairi',
  },
} as const

type EN = typeof translations.en
type SW = typeof translations.sw

export type TranslationKey = keyof EN

export function getT(lang: Lang) {
  const dict = lang === 'sw' ? translations.sw : translations.en
  return function t(key: TranslationKey, vars?: Record<string, string | number>): string {
    const val = (dict as Record<string, unknown>)[key]
    if (typeof val !== 'string') return key
    if (!vars) return val
    return Object.entries(vars).reduce(
      (s, [k, v]) => s.replace(`{${k}}`, String(v)),
      val
    )
  }
}

// Typed access for nested objects (categories)
export function getCategories(lang: Lang) {
  return lang === 'sw' ? translations.sw['progress.categories'] : translations.en['progress.categories']
}
