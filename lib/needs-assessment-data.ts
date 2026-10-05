// The built-in needs assessment. Staff can edit a copy of this in the admin console (Content > Needs assessment);
// the learner app uses the published copy when one exists and falls back to this.

export type QuestionType = 'scale' | 'radio' | 'multiple' | 'knowledge'

type BaseQuestion = {
  id: string
  question: string
  subtext?: string
  sectionIndex: number
}

type ScaleQuestion = BaseQuestion & { type: 'scale'; min?: number; max?: number; minLabel: string; maxLabel: string }
type RadioQuestion = BaseQuestion & { type: 'radio'; options: string[] }
type MultipleQuestion = BaseQuestion & { type: 'multiple'; options: string[]; maxSelect?: number }
type KnowledgeQuestion = BaseQuestion & {
  type: 'knowledge'
  options: string[]
  correctIndex: number
  explanation: string
}

export type Question = ScaleQuestion | RadioQuestion | MultipleQuestion | KnowledgeQuestion

export const NEEDS_SECTIONS = [
  { index: 0, title: 'Your Teaching Context', description: 'Help us understand who you are as a teacher so we can tailor your experience.' },
  { index: 1, title: 'CBC Knowledge Check', description: 'A quick diagnostic to see where your CBC understanding is strong and where there are gaps. All answers are for learning — there is no penalty.' },
  { index: 2, title: 'Assessment Practice', description: 'Tell us about your current Classroom-Based Assessment (CBA) practices and challenges.' },
  { index: 3, title: 'Teaching Practice', description: 'Reflect honestly on how you currently plan and deliver lessons.' },
  { index: 4, title: 'Goals and Support', description: 'Your answers here shape the learning path and tools we recommend to you.' },
]

export const NEEDS_QUESTIONS: Question[] = [
  // ---- Section 1: Teaching Context ----------------------------------------
  {
    id: 'teaching_level',
    sectionIndex: 0,
    type: 'radio',
    question: 'Which level(s) do you currently teach?',
    options: [
      'Pre-Primary (PP1 and PP2)',
      'Lower Primary (Grades 1–3)',
      'Upper Primary (Grades 4–6)',
      'Junior Secondary (Grades 7–9)',
      'Multiple levels',
    ],
  },
  {
    id: 'cbc_experience',
    sectionIndex: 0,
    type: 'radio',
    question: 'How many years have you been teaching under the CBC framework?',
    options: [
      'Less than 1 year',
      '1–2 years',
      '3–4 years',
      '5 or more years',
    ],
  },
  {
    id: 'school_context',
    sectionIndex: 0,
    type: 'radio',
    question: 'Which best describes your school environment?',
    options: [
      'Public school — urban',
      'Public school — peri-urban or rural',
      'ASAL region (Arid and Semi-Arid Lands)',
      'Private or faith-based school',
    ],
  },

  // ---- Section 2: CBC Knowledge Check -------------------------------------
  {
    id: 'cbc_structure',
    sectionIndex: 1,
    type: 'knowledge',
    question: 'The current CBC pathway (as of 2023) includes which five levels?',
    options: [
      'Pre-Primary, Primary, Secondary',
      'PP, Lower Primary, Upper Primary, Senior Secondary',
      'PP, Lower Primary, Upper Primary, Junior Secondary, Senior Secondary',
      'Pre-Primary, Junior School, Senior School',
    ],
    correctIndex: 2,
    explanation:
      'The CBC pathway has 5 levels: Pre-Primary (2 years), Lower Primary (Grades 1–3), Upper Primary (Grades 4–6), Junior Secondary (Grades 7–9, introduced 2023), and Senior Secondary (Grades 10–12).',
  },
  {
    id: 'core_competencies',
    sectionIndex: 1,
    type: 'knowledge',
    question: 'Which of the following is NOT one of CBC\'s seven core competencies?',
    options: [
      'Communication and Collaboration',
      'Numeracy and Literacy',
      'Digital Literacy',
      'Self-Efficacy',
    ],
    correctIndex: 1,
    explanation:
      'Numeracy and Literacy are integrated across learning areas but are not listed as one of the 7 core competencies. The 7 are: Communication and Collaboration, Critical Thinking and Problem Solving, Creativity and Imagination, Citizenship, Digital Literacy, Learning to Learn, and Self-Efficacy.',
  },
  {
    id: 'cba_meaning',
    sectionIndex: 1,
    type: 'knowledge',
    question: 'In the CBC context, CBA stands for:',
    options: [
      'Curriculum-Based Assessment',
      'Classroom-Based Assessment',
      'Competency-Based Assessment',
      'Continuous Basic Assessment',
    ],
    correctIndex: 1,
    explanation:
      'CBA stands for Classroom-Based Assessment — the ongoing formative assessment conducted by teachers in their own classrooms, as distinguished from external KNEC examinations.',
  },
  {
    id: 'performance_scale',
    sectionIndex: 1,
    type: 'knowledge',
    question: 'The CBC learner performance scale uses which categories?',
    options: [
      'Grade A to E (as in 8-4-4)',
      'Pass / Fail only',
      'Exceeds Expectation (EE), Meets Expectation (ME), Approaches Expectation (AE), Below Expectation (BE)',
      'Advanced, Proficient, Basic, Below Basic',
    ],
    correctIndex: 2,
    explanation:
      'CBC uses 4 performance levels: EE (Exceeds Expectation), ME (Meets Expectation), AE (Approaches Expectation), and BE (Below Expectation). These replace percentage marks and focus on competency achievement, not ranking.',
  },

  // ---- Section 3: Assessment Practice -------------------------------------
  {
    id: 'cba_confidence',
    sectionIndex: 2,
    type: 'scale',
    question:
      'How confident are you in conducting and recording Classroom-Based Assessment (CBA) using rubrics, anecdotal records, and portfolios?',
    subtext: '1 = not at all confident   5 = very confident',
    minLabel: 'Not at all confident',
    maxLabel: 'Very confident',
  },
  {
    id: 'assessment_tools',
    sectionIndex: 2,
    type: 'multiple',
    question: 'Which CBC assessment tools do you currently use regularly? (Select all that apply)',
    options: [
      'Observation notes and anecdotal records',
      'Rubrics aligned to EE / ME / AE / BE levels',
      'Checklists or rating scales',
      'Portfolio of learner work samples',
      'Peer assessment activities',
      'Self-assessment by learners',
      'I have not yet implemented CBC assessment tools',
    ],
  },
  {
    id: 'assessment_challenge',
    sectionIndex: 2,
    type: 'radio',
    question: 'What is your greatest challenge with CBC assessment?',
    options: [
      'Not enough time to assess all learners meaningfully',
      'Unsure what to look for when assessing competencies',
      'Record-keeping and reporting workload is overwhelming',
      'I lack ready-made rubrics and templates',
      'Difficulty calibrating what EE / ME / AE / BE looks like in practice',
    ],
  },

  // ---- Section 4: Teaching Practice ---------------------------------------
  {
    id: 'lesson_planning',
    sectionIndex: 3,
    type: 'scale',
    question:
      'How confident are you designing CBC lesson plans using backwards design — starting from the Specific Learning Outcome (SLO) and planning activities to achieve it?',
    subtext: '1 = not at all confident   5 = very confident',
    minLabel: 'Not at all confident',
    maxLabel: 'Very confident',
  },
  {
    id: 'differentiation',
    sectionIndex: 3,
    type: 'radio',
    question: 'In a lesson with mixed-ability learners, how do you typically differentiate?',
    options: [
      'I use the same activities for all learners',
      'I adjust task complexity for different learners',
      'I group learners and give different tasks to each group',
      'I use differentiated worksheets and materials prepared in advance',
      'I am still developing my differentiation skills',
    ],
  },
  {
    id: 'learner_activity_time',
    sectionIndex: 3,
    type: 'radio',
    question:
      'In a typical lesson, approximately how much time do learners spend actively doing — not listening to or watching you teach?',
    options: [
      'Less than 20% of lesson time',
      '20–40% of lesson time',
      '40–60% of lesson time',
      '60–80% of lesson time',
      'More than 80% of lesson time',
    ],
  },

  // ---- Section 5: Goals and Support ---------------------------------------
  {
    id: 'cbc_challenges',
    sectionIndex: 4,
    type: 'multiple',
    question: 'Which CBC implementation challenges are most pressing for you right now? (Select all that apply)',
    options: [
      'Understanding the curriculum design documents and SLOs',
      'Managing large class sizes in a learner-centred approach',
      'Limited teaching and learning materials',
      'Parents who do not understand or support CBC',
      'Record-keeping and reporting workload',
      'Junior Secondary curriculum (new from 2023)',
      'Lack of in-service training and coaching support',
      'Integrating technology into CBC teaching',
    ],
  },
  {
    id: 'development_goals',
    sectionIndex: 4,
    type: 'multiple',
    question: 'What would you most like to improve through this professional development? (Select up to 3)',
    maxSelect: 3,
    options: [
      'Deepening my CBC philosophy and structural knowledge',
      'Designing effective learner-centred activities',
      'Conducting and recording CBA accurately',
      'Differentiating instruction for diverse learners',
      'CBC lesson planning using backwards design',
      'Communicating CBC to parents effectively',
      'Junior Secondary subject and curriculum knowledge',
      'Integrating technology in CBC teaching',
    ],
  },
]

/** Which learning paths the built-in answers point to (first two matches win, then the fallback fills the gap). */
export const NEEDS_RULES: { programId: string; when: { questionId: string; answers: string[] }[] }[] = [
  {
    programId: 'assessment-for-learning',
    when: [
      { questionId: 'development_goals', answers: ['Conducting and recording CBA accurately'] },
      { questionId: 'cbc_challenges', answers: ['Record-keeping and reporting workload', 'Lack of in-service training and coaching support'] },
    ],
  },
  {
    programId: 'cbc-foundations',
    when: [
      { questionId: 'development_goals', answers: ['CBC lesson planning using backwards design', 'Deepening my CBC philosophy and structural knowledge', 'Designing effective learner-centred activities', 'Junior Secondary subject and curriculum knowledge'] },
      { questionId: 'cbc_challenges', answers: ['Junior Secondary curriculum (new from 2023)'] },
    ],
  },
  {
    programId: 'inclusive-education',
    when: [
      { questionId: 'development_goals', answers: ['Differentiating instruction for diverse learners'] },
      { questionId: 'cbc_challenges', answers: ['Managing large class sizes in a learner-centred approach'] },
    ],
  },
  {
    programId: 'ai-empowered-educator',
    when: [
      { questionId: 'development_goals', answers: ['Integrating technology in CBC teaching'] },
      { questionId: 'cbc_challenges', answers: ['Integrating technology into CBC teaching'] },
    ],
  },
]
export const NEEDS_FALLBACK = ['cbc-foundations', 'assessment-for-learning']
