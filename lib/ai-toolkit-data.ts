// "The AI-Empowered Educator" (v3): a guided course on using Gemini,
// NotebookLM, and Google Classroom for CBC delivery, written for low-resource
// Kenyan classrooms. Content source for the Learning Path program of the same
// name (see lib/learning-paths-data.ts). Blueprints and tables that were ASCII
// art in the source are expressed here as markdown so the lesson renderer
// styles them responsively.

export type ToolName = 'Gemini' | 'NotebookLM' | 'Google Classroom'

export interface CompetencyDef { code: string; name: string }

export const AI_COMPETENCIES: CompetencyDef[] = [
  { code: 'CC',  name: 'Communication & Collaboration' },
  { code: 'CT',  name: 'Critical Thinking & Problem-Solving' },
  { code: 'CI',  name: 'Creativity & Imagination' },
  { code: 'DL',  name: 'Digital Literacy' },
  { code: 'L2L', name: 'Learning to Learn' },
  { code: 'SE',  name: 'Self-Efficacy' },
  { code: 'CZ',  name: 'Citizenship' },
]

export interface CommentTemplate { code: string; text: string }

export interface ToolSection {
  tool: ToolName
  pathway?: string
  title: string
  scenario: string                 // a real Kenyan classroom moment
  content: string                  // explanation; markdown (headings, lists, tables)
  comparison?: { traditional: string; performance: string; competency: string }
  commentBank?: CommentTemplate[]  // ready-to-paste feedback templates
  tip: string
  promptTitle: string
  prompt: string
}

export interface LowResourceScenario { label: string; steps: string[] }

export interface AiModule {
  id: string
  number: string
  title: string
  tagline: string
  duration: string
  hours: number
  level: string
  tag: string
  icon: 'layers' | 'sprout' | 'boxes' | 'compass' | 'clipboard'
  accent: string
  competencies: string[]
  context: string                  // module-opening Kenyan classroom story
  overview: string
  outcomes: string[]
  sections: ToolSection[]
  lowResource?: { title: string; scenarios: LowResourceScenario[] }
  deliverable: { title: string; items: string[] }
}

export const AI_MODULES: AiModule[] = [
  /* ── Module 1 ─────────────────────────────────────────────── */
  {
    id: 'M1',
    number: '01',
    title: 'Foundational Workflow Integration',
    tagline: 'From 8-4-4 habits to CBC architecture: rebuilding your digital classroom from the ground up',
    duration: '3 Hours',
    hours: 3,
    level: 'All Levels',
    tag: 'Foundation',
    icon: 'layers',
    accent: '#0c9a7b',
    competencies: ['DL', 'L2L', 'CC'],
    context: 'Picture a Monday morning in Nakuru. Madam Wanjiku has 58 Grade 7 learners, one textbook for every three of them, and spotty internet on her phone. She spent Sunday evening using Gemini to generate a 3-week Pre-Technical Education unit, downloaded it offline, and wrote the key instructions on the chalkboard. That is the reality this module is designed for.\n\nThe goal of Module 1 is not to turn every Kenyan teacher into a tech wizard. It is to rebuild the mental model, from "subjects and homework" to "Learning Areas, Strands, and competency evidence". Once that shift happens, every other tool clicks into place.',
    overview: 'This module establishes the three-pillar digital ecosystem every CBC teacher needs, whether their school has fibre internet or one shared smartphone. You will leave with a live Google Classroom mapped to KICD\'s Learning Area structure, a NotebookLM notebook grounded only in your KICD documents (the hallucination firewall), and a Gemini-powered lesson plan template you can reuse every week of the year.',
    outcomes: [
      'Rebuild Google Classroom\'s architecture to reflect CBC\'s Learning Area, Strand, Sub-Strand hierarchy rather than the 8-4-4 textbook-chapter model.',
      'Create a NotebookLM "KICD Vault" that prevents AI hallucination by grounding every output in uploaded Kenyan curriculum documents.',
      'Generate a reusable lesson-plan draft with fields found in many KICD curriculum designs, then verify every curriculum-specific detail against the current design before use.',
      'Apply the "Batch and Cache" strategy for teachers with intermittent connectivity, so a low-data day never disrupts your workflow.',
    ],
    sections: [
      {
        tool: 'Google Classroom',
        title: 'Re-Architecting Classroom Around CBC Learning Areas',
        scenario: 'Mwalimu Ochieng teaches Grade 7 at a public school in Kisumu sub-county. His Google Classroom has one class called "Grade 7" with assignments titled "Homework 1" and "Homework 2". When his Head Teacher asked him to show CBA evidence during the SQA visit, he spent two panicked hours searching his own Classroom. Here is the fix.',
        content: 'The default Google Classroom structure (Class, Assignment, Topic) quietly reproduces 8-4-4 thinking. To align it to CBC you map the platform to KICD\'s hierarchy: Learning Area, Strand, Sub-Strand, Learning Outcome.\n\n## Google Classroom blueprint\nCopy this structure for every Learning Area.\n\n**Stream**\n- Weekly learning highlights, posted every Friday\n- Parent home-learning missions, posted every Monday\n- SBA submission reminders, posted 48 hours before each deadline\n\n**Classwork**\n- A "Core Competencies Portfolio" topic: your running cross-cutting evidence tracker\n- Strand 1 (for example, Foundations of Technical Literacy): KICD notes as a Material, a weekly CBA-aligned formative task, and the SBA KNEC tool upload\n- Strand 2 (for example, Materials Science): a project-upload assignment\n- Strand 3 (for example, Structure and Forces): a peer-review group-work evidence task\n\n**People**\n- Add parents as Guardians, not as Students',
        tip: 'Use a consistent convention such as [Grade]-[Sub-Strand Code]-[Term]-[Week]-[Type], but copy the actual code and wording from the current design. For example, "Gr7-[verified-code]-T2-W3-SBA" makes classroom evidence easier to retrieve; it does not replace the school or KNEC record-keeping process.',
        promptTitle: 'Google Classroom CBC Setup Generator',
        prompt: `Role: You are a Senior KICD Curriculum Specialist helping a Kenyan teacher re-architect their Google Classroom from scratch.

My teaching context:
- School type: [Public Primary / Faith-Based Junior Secondary / etc.]
- County and sub-county: [e.g., Murang'a County, Kangema Sub-County]
- Grade(s) I teach: [e.g., Grade 7 and Grade 8]
- Learning Areas I am responsible for: [e.g., Pre-Technical Education, Agriculture & Nutrition]
- My internet situation: [e.g., Safaricom data bundle, reliable mornings only]
- Class size: [e.g., 62 learners]

Generate for me:
1. A complete list of Google Classroom classes I should create, mapped to KICD Learning Areas (not 8-4-4 subjects).
2. For each class: the Topics I should create, mapped to Strands from the KICD curriculum design.
3. A naming convention for assignments that would satisfy a KNEC SQA audit.
4. A bilingual (English + Kiswahili) welcome Stream post explaining Google Classroom to parents, written for a guardian with a Standard 7 education who uses a basic Android phone.
5. A "Batch and Cache" download checklist for a teacher who can only access the internet reliably on Friday afternoons at a cyber cafe in town.

Ground every suggestion in the KICD curriculum design for my specific Learning Areas.`,
      },
      {
        tool: 'NotebookLM',
        title: 'Building Your KICD Vault: The Hallucination Firewall',
        scenario: 'A teacher in Eldoret asks Gemini to write a Grade 5 Mathematics lesson on fractions. Drawing on its global training, Gemini produces a lesson referencing American Common Core standards, with examples in dollars and Fahrenheit. NotebookLM eliminates this risk: it is physically incapable of using any information beyond what you upload.',
        content: 'NotebookLM only answers from the sources you give it. That single property makes it the most reliable AI tool for curriculum work, because it cannot drift to a foreign curriculum or invent a Sub-Strand.\n\n## KICD Vault setup protocol\nRun this once per term; it takes about 30 minutes. Name the notebook "KICD Vault, [Grade], Term [X], [Year]", then upload in this order:\n\n1. KICD Curriculum Design PDF (free from kicd.ac.ke, one per Learning Area)\n2. KNEC School-Based Assessment guidelines (from cba.knec.ac.ke)\n3. Your term Scheme of Work (so the AI follows your own sequence)\n4. Approved KICD textbook chapters (scan or photograph the relevant pages, upload as PDF)\n5. Your county\'s Curriculum Support Materials (from the Sub-County Education Office, often more contextualised than the national documents)\n\n## Verify the grounding\nAfter uploading, run three tests:\n- "List all Learning Outcomes for Strand 2 of this curriculum." It should cite exact page numbers.\n- "What does this curriculum say about assessment for learners with special needs?" It should find the section, or say honestly that none exists.\n- "Summarise what this curriculum says about mother-tongue integration." If it is in your upload, it will surface it accurately.',
        tip: 'Many KICD PDFs are scanned documents with imperfect text recognition. If NotebookLM seems to miss content, upload the PDF as individual page images instead. And always add your county\'s support materials: NotebookLM synthesises the national and county guidance at once, giving you a hyper-local accuracy no general AI can match.',
        promptTitle: 'NotebookLM Initialization Sequence',
        prompt: `Paste these prompts in order after uploading your KICD documents.

STEP 1, ANCHOR THE CONTEXT:
"You are my private CBC curriculum specialist. You must use only the documents I have uploaded: the KICD Curriculum Designs, KNEC guidelines, and Scheme of Work. Never reference any external curriculum framework. If I ask something not covered in my documents, say 'This is not addressed in your uploaded KICD documents' and stop there."

STEP 2, BUILD THE STRAND MAP:
"Create a structured table of all Strands and Sub-Strands in this curriculum. For each Sub-Strand include: the specific Learning Outcome(s), the recommended number of lessons, and the assessment type KNEC specifies for that Sub-Strand."

STEP 3, SURFACE CROSS-CUTTING THEMES:
"Identify three Sub-Strands in [Learning Area 1] that naturally connect to Sub-Strands in [Learning Area 2]. For each: state the exact Learning Outcomes from both documents, and suggest one integrated activity a teacher in a rural Kenyan school with no equipment budget could facilitate."

STEP 4, GENERATE A QUICK REFERENCE CARD:
"Create a one-page Quick Reference Card for Term [X] Week [Y]. Include: the Sub-Strand I should be teaching, its Learning Outcomes, the Key Inquiry Question to anchor lessons around, recommended KNEC assessment tools, and two common learner misconceptions to watch for."

STEP 5, AUDIO OVERVIEW FOR YOUR COMMUTE:
Click the Studio panel, then Audio Overview. This generates a podcast-style summary of your KICD documents. Download the MP3 and listen on the matatu so you arrive prepared.`,
      },
      {
        tool: 'Gemini',
        title: 'The CBC Weekly Lesson Plan Engine',
        scenario: 'Madam Akinyi in Kisii teaches four Learning Areas across three grades. She used to spend her entire Sunday writing lesson plans. After learning this prompt template, her Sunday prep dropped to 45 minutes. The secret is not just using Gemini, it is giving Gemini the specific KICD fields it needs to produce a plan that passes an SQA inspection.',
        content: 'Many KICD curriculum designs provide fields such as Learning Outcomes, Key Inquiry Questions, Core Competencies, Values, Pertinent and Contemporary Issues, organisation of learning, resources and suggested assessment. Use the current design for the exact learning area and grade; a tool can draft the structure, but it cannot make an unverified plan official. Generic prompts produce generic plans, so the template below carries the planning questions for you.',
        tip: 'Add your school\'s actual constraints to every prompt. "No electricity, 58 learners, only hand tools available, near a seasonal river" transforms Gemini\'s output from theoretical to something you can teach on Monday morning. Specific Kenyan context produces usable lessons.',
        promptTitle: 'KICD-Aligned CBC Lesson Plan Generator',
        prompt: `Role: You are a Senior Instructional Designer certified by KICD, specialising in Kenya's Competency-Based Curriculum, with deep knowledge of low-resource Kenyan schools.

TEACHING CONTEXT:
School type: [Public primary / Faith-based junior secondary / etc.]
County and environment: [e.g., Kwale County, coastal rural, near the Indian Ocean]
Grade: [e.g., Grade 7]
Learning Area: [e.g., Pre-Technical Education]
Strand: [e.g., Foundations of Technical Literacy]
Sub-Strand: [e.g., Safety in the Working Environment]
Specific Learning Outcome: [Paste directly from your KICD document]
Duration: 3 lessons of 40 minutes
Class size: [e.g., 54 learners]
Available resources: [e.g., Only hand tools, no electricity; the compound has old tyres, sisal rope, corrugated iron scraps]

Generate the lesson plan under exactly these KICD headers:
1. LEARNING OUTCOMES (specific, measurable, achievable, realistic, time-bound)
2. KEY INQUIRY QUESTIONS, two questions to anchor learner curiosity
3. CORE COMPETENCIES TARGETED: which of the 7 CBC competencies this lesson develops, and one sentence each on how it shows up in the activities
4. VALUES AND CROSS-CUTTING ISSUES (e.g., Responsibility, Unity, Environmental Stewardship; CCIs such as Gender, Inclusion, Safety)
5. LESSON-BY-LESSON BREAKDOWN:
   Lesson 1: Introduction and local hazard identification (Kenyan context only)
   Lesson 2: Improvised PPE creation using available local materials
   Lesson 3: Formative group presentation and peer assessment
   For each: Introduction (hook), Development, Conclusion, Transition
6. LEARNING RESOURCES: only materials findable on a Kenyan school compound or in the community, with a zero-budget alternative for every item
7. ASSESSMENT RUBRIC: mapped to KNEC's four levels (EE / ME / AE / BE), with observable descriptors, and a paper-based version for schools without devices
8. HOME-LEARNING LINK: one activity families can do with zero-cost household items, in plain language for parents with primary-school education`,
      },
    ],
    lowResource: {
      title: 'Teaching this with few resources',
      scenarios: [
        {
          label: 'Zero internet, one smartphone',
          steps: [
            'Friday evening at a trading centre: open Gemini on your phone, paste the lesson-plan prompt, and save four weeks of plans to the Notes app, offline.',
            'Saturday: transfer the lesson content to your exercise book. On Monday, copy the key instructions onto the blackboard.',
            'Download the NotebookLM Audio Overview as an MP3 to a 4GB memory card and listen on the motorbike ride to school.',
            'Assessment is a physical portfolio box, one labelled envelope per learner, with KNEC levels recorded on a printed tally sheet.',
          ],
        },
        {
          label: 'Unconnected computer lab, 8 old PCs',
          steps: [
            'Load a flash drive at a cyber cafe on your weekly trip: AI-generated lesson guides as .txt files, KICD reference summaries, and assignment instruction sheets.',
            'Sneakernet delivery: copy the content onto all 8 PCs at once; learners rotate through in groups of six or seven.',
            'Peer assessment happens on teacher-printed rubric sheets.',
            'At term\'s end, photograph learner work samples and upload the batch at the cyber cafe to Google Drive.',
          ],
        },
      ],
    },
    deliverable: {
      title: 'Module 1 Deliverable: Your CBC Digital Classroom Blueprint',
      items: [
        'A reviewed digital classroom structure with classes and Topics mapped to the current learning-area design, plus a consistent naming convention for assignments.',
        'A NotebookLM "KICD Vault" with this term\'s Curriculum Designs uploaded, the three verification tests passed, and an Audio Overview downloaded to your device.',
        'One complete Gemini-generated weekly lesson plan, reviewed, edited, and marked "KICD-Verified", ready to deliver on Monday.',
        'A personal "Batch and Cache" schedule: the specific days and times you will download content, and a naming convention for offline storage.',
      ],
    },
  },

  /* ── Module 2 ─────────────────────────────────────────────── */
  {
    id: 'M2',
    number: '02',
    title: 'Early Years & Lower Primary',
    tagline: 'PP1 to Grade 3: play is the curriculum, AI is your backstage crew',
    duration: '4 Hours',
    hours: 4,
    level: 'PP1 - Grade 3',
    tag: 'Early Years',
    icon: 'sprout',
    accent: '#d97706',
    competencies: ['CC', 'CI', 'SE', 'CZ'],
    context: 'Sit with Madam Atieno in her PP2 classroom in Migori. There are 47 four-year-olds on worn floor mats, two broken crayons between five learners, and a dog wandering in from the compound. By 8am she has improvised a counting song using bottle tops, told a story about Atieno the clever mongoose who sorts objects by colour, and run a psychomotor activity using soil from the school garden.\n\nShe does not need Gemini to teach. She needs it to free up the two hours she spent on Sunday designing all of that, so she can rest, or visit a learner whose family has stopped sending them to school. AI in Early Years is entirely a teacher tool. It never touches learners; it is the invisible engine behind the visible magic.',
    overview: 'Early Years and Lower Primary CBC rests on four pillars: language-rich environments, play-based experiential learning, psychomotor development, and family-school partnership. This module puts AI to work on all four, generating culturally rooted stories, outdoor activity guides using local materials, plain-language parent engagement templates in Swahili and English, and observation checklists aligned to KICD developmental milestones.',
    outcomes: [
      'Generate play-based storytelling scripts featuring Kenyan characters (Omwamba, Atieno, Wangeci) that embed mathematical and language Sub-Strand outcomes.',
      'Design zero-budget outdoor experiential activity guides for Environmental Activities using materials in any Kenyan school compound.',
      'Deploy a bilingual parent engagement system via Google Classroom that collects photographic CBA portfolio evidence from home.',
      'Build a NotebookLM notebook from KICD Pre-Primary and Lower Primary designs to instantly generate developmental milestone checklists.',
    ],
    sections: [
      {
        tool: 'Gemini',
        title: 'Localized Storytelling, Songs & Outdoor Activities',
        scenario: 'The KICD PP curriculum requires language learning embedded in cultural context, but most story resources online feature Western characters in Western settings. Gemini can instantly produce a story about Wangeci and her grandmother sorting maize in Nyeri, or Omwamba the fisherman\'s son learning to count nets on Lake Victoria, stories that feel like home.',
        content: 'Your job with Gemini here is curator and cultural editor. It supplies generative breadth, dozens of story variants, bilingual songs, and activity sequences in minutes; you supply the local truth and the pedagogical judgement. The more specific the Kenyan setting in your prompt, the more your learners see themselves, and the more they learn.',
        tip: 'Always name the exact geography, community, or culture in your prompt. "A story set in a Kikuyu homestead in Kirinyaga County" produces fundamentally different output than "a story set in Africa". The more local, the more the learner sees themselves; the more they see themselves, the more they learn.',
        promptTitle: 'Early Years CBC Story & Activity Generator',
        prompt: `Role: You are an Early Years Education Specialist with deep knowledge of Kenya's CBC, Kenyan cultures, and low-resource classrooms. You write with warmth, local authenticity, and pedagogical precision.

ACTIVITY PARAMETERS:
Learning Area: Environmental Activities
Strand: Our Environment
Sub-Strand: Soil (identifying sand, clay, and loam through sensory exploration)
Grade: Grade 2
Class size: 45+ learners
Location: [e.g., A public school in Homa Bay County, near Lake Victoria, red laterite soil, fishing community]
Budget: Zero. Everything must come from the school compound or immediate surroundings.
Duration: 40 minutes outdoors

Generate the following, in this structure:

1. STORY-DRIVEN HOOK (2 minutes)
A 3-paragraph opening narrative featuring a Kenyan child with a local name. It must introduce the concept of soil types, use the local geography (lake, fishing, seasonal crops), and end with a question that launches the activity. Write it in English with a Kiswahili translation of the final hook question.

2. THE OUTDOOR GAME, "Mchanga Safari"
Step-by-step mechanics for 45+ learners, using ONLY: old tins or plastic bottles, water from a jerrycan, soil from the compound, banana leaves for surfaces. Specify how to divide 45 learners into groups using locally meaningful roles. Include exactly 3 psychomotor actions (touching, moulding, observing water absorption). Write it simply enough that a pupil monitor could help facilitate.

3. DIRECT REFLECTION PROMPTS (5 minutes)
6 questions progressing from observation to connection to creativity:
Q1-2 (Recall): What did you see, feel, smell?
Q3-4 (Connection): Where in your home or compound might you find this type of soil?
Q5-6 (Creativity): What could your family make or grow using this soil?

4. PARENTAL ENGAGEMENT TASK
One home follow-up using zero-cost household materials, in plain English and Kiswahili, suitable for a parent with Standard 7 education. Specify what evidence to collect, how to photograph or describe it, and which Google Classroom assignment to upload it to.

5. TEACHER OBSERVATION GUIDE (CBA)
What the teacher watches for to assign KNEC levels:
EE: [specific observable behaviour]
ME: [specific observable behaviour]
AE: [specific observable behaviour]
BE: [specific observable behaviour, plus one intervention suggestion]`,
      },
      {
        tool: 'Google Classroom',
        title: 'Parents as Co-Assessors: The CBA Evidence Loop',
        scenario: 'CBC is the first Kenyan curriculum to formally place parents inside the assessment process. But many parents in Murang\'a or Mandera have never heard of Google Classroom. This section gives you a ready-to-deploy parent system that works on a basic WhatsApp-capable Android phone, the device most Kenyan parents carry.',
        content: 'At PP and Lower Primary, parents and guardians are the primary evidence collectors outside school. Guardian Summary emails and Stream posts create a structured, low-cost channel for this. Keep every post short, in plain language, and bilingual. The template below is ready to paste into your Stream and adapt.',
        tip: 'Run a 20-minute "Google Classroom for Parents" session at your next Parent-Teacher Meeting. Show them how to open the Guardian email, click the assignment link, photograph the work, and upload it. Most parents already do more complex things on M-PESA; this is easier.',
        promptTitle: 'Parent Home-Learning Mission (Stream post template)',
        prompt: `Copy, customise, and paste this directly into your Google Classroom Stream.

HOME-LEARNING MISSION: WEEK [X], TERM [X]
LEARNING AREA: [e.g., Art and Craft / Mathematical Activities]
SUB-STRAND: [e.g., Patterns and Shapes]

Habari Wazazi na Walezi,

This week your learner is exploring [TOPIC] at school.

TASK FOR HOME (10-15 minutes, any evening this week):
1. Help your learner find [e.g., 3 different leaves, or bottle caps / vifuniko] in or around your house.
2. Ask them to arrange them in a repeating pattern (for example: Leaf, Cap, Leaf, Cap).
3. Ask them to EXPLAIN the pattern to you. This builds their Communication skill.

HOW TO SHARE WITH US:
Option A (easiest): Take a photo of the pattern and WhatsApp it to [Teacher Phone Number]. We will upload it for you.
Option B: Open the Google Classroom app, tap this assignment, press "Add Attachment", and upload your photo.

Why it matters: a dated, consent-aware photo can support a learner portfolio when it is linked to an outcome and stored through the school’s approved process. A photo by itself is not official evidence.

Deadline: [Day, Date] before school begins.

Asante sana.
[Teacher Name], [School Name]`,
      },
      {
        tool: 'NotebookLM',
        title: 'Your Always-Available ECE Curriculum Specialist',
        scenario: 'Most ECE teachers in Kenya work where the only specialist support is a termly visit from a Sub-County Quality Assurance Officer. NotebookLM does not replace that officer, but at 9pm on a Thursday when you wonder what psychomotor milestones a PP2 learner should show, it gives you an accurate answer grounded in the actual KICD document, not a guess.',
        content: 'Upload the KICD Pre-Primary and Lower Primary Curriculum Designs and the Basic Education Curriculum Framework, and you have a queryable expert that never leaves your school. Ask it for milestones, suggested activities, intervention guidance, and ready-made observation records, all grounded in your documents.',
        tip: 'Upload your county\'s Early Childhood Development and Education (ECDE) implementation guidelines alongside the national documents. County guidance often contains locally adapted examples, using indigenous games, local foods, and familiar animals, that make your activities far more relevant.',
        promptTitle: 'NotebookLM Early Years Query Bank',
        prompt: `After uploading the KICD Pre-Primary and Lower Primary Curriculum Designs:

QUERY 1, MILESTONE MAPPING:
"List all developmental milestones for Psychomotor Development that a PP2 learner should demonstrate by the end of Term 2 of this curriculum. Format as a teacher observation checklist table with columns: Milestone | Date First Observed | EE | ME | AE | BE | Teacher Notes."

QUERY 2, MOTHER-TONGUE INTEGRATION:
"What does this curriculum say about the role of mother tongue and home language in Early Years literacy development? Give me specific guidance I can use when planning Language Activities lessons."

QUERY 3, INTERVENTION GUIDANCE:
"For a Grade 1 learner who cannot yet grip a pencil correctly, what does this KICD document recommend? Suggest three zero-cost physical activities using materials available in a Kenyan school compound."

QUERY 4, GENERATE AN OBSERVATION RECORD:
"Create a one-page end-of-term Developmental Progress Record for a PP2 learner based on the milestones in this document. Format it so a teacher can complete it in 10 minutes per learner, with checkboxes and one narrative comment box."

QUERY 5, AUDIO OVERVIEW FOR YOUR COMMUTE:
Click Studio, then Audio Overview, and select the "Brief" format. Suggested topic: "Key developmental expectations for PP1 and PP2 across all Strands." Download the MP3 and listen on public transport.`,
      },
    ],
    lowResource: {
      title: 'Teaching this with few resources',
      scenarios: [
        {
          label: 'Zero budget, maximum creativity',
          steps: [
            'Every activity here uses only soil, water, leaves, stones, old tins, plastic bottles, banana fibres, and chalk on the ground. Nothing requires electricity or purchase.',
            'If Google Classroom is inaccessible, parent communication runs on WhatsApp broadcast lists: forward the parent mission template, and parents reply with voice notes or photos.',
            'Portfolio evidence is physical: a cardboard box divided with old newspaper into labelled sections, one per learner, holding work samples or photos printed monthly at the cyber cafe.',
            'Audio Overviews are pre-downloaded as MP3s on the teacher\'s phone, listened to during planning time on the walk to the staffroom.',
          ],
        },
      ],
    },
    deliverable: {
      title: 'Module 2 Deliverable: The Early Years AI Toolkit',
      items: [
        'Three Gemini-generated outdoor activity guides (Environmental, Language, and Mathematical Activities), all zero-budget and set in your specific Kenyan context.',
        'A full term (10-week) Home Learning Mission pack, bilingual, with plain-language parent observation guides, ready to post to the Stream.',
        'A NotebookLM notebook with KICD PP and Grade 1-3 documents uploaded, a Milestone Observation Checklist generated, and an Audio Overview downloaded.',
        'A live Google Classroom "Parent Hub" topic with Guardian Email Summaries enabled and the Week 1 mission posted.',
      ],
    },
  },

  /* ── Module 3 ─────────────────────────────────────────────── */
  {
    id: 'M3',
    number: '03',
    title: 'Middle & Junior School',
    tagline: 'Grades 4-9: SBAs, talent identification, and projects that solve real Kenyan problems',
    duration: '5 Hours',
    hours: 5,
    level: 'Grade 4 - Grade 9',
    tag: 'Middle & Junior',
    icon: 'boxes',
    accent: '#7c3aed',
    competencies: ['CT', 'CI', 'CC', 'DL', 'L2L'],
    context: 'In a school near a seasonal river, the Agriculture teacher and the Pre-Technical Studies teacher have not discussed how their selected outcomes could connect. Learners study soil in one lesson and materials in another, but do not yet use the ideas together.\n\nA source-grounded workflow can help the teachers compare the current designs, then they decide whether a local project is a genuine connection. Grade 8 learners might investigate a low-cost garden or storage problem using materials available at school, provided the selected outcomes, safety limits and evidence are clear.',
    overview: 'Grades 4 to 9 require careful alignment between the current KICD designs, classroom evidence and any KNEC school-based or national assessment process that applies. Junior School culminates in the Kenya Junior School Education Assessment at Grade 9. This module builds an AI-assisted project and evidence-management workflow while keeping the official source and the teacher’s judgement in control.',
    outcomes: [
      'Use a source-grounded workflow to compare selected KICD Curriculum Designs and identify a genuine project connection across learning areas.',
      'Build a multi-disciplinary project matrix with a local problem, selected outcomes, constraints, milestones and evidence.',
      'Build observable rubrics focused on the critical-thinking process as well as the final product, then check the wording against the applicable KNEC and KICD guidance before use.',
      'Organise the applicable school-based assessment cycle digitally, from source checking and tool handling to evidence collection and a documented school-approved record process.',
    ],
    sections: [
      {
        tool: 'NotebookLM',
        title: 'The Cross-Curriculum PBL Generator',
        scenario: 'Mwalimu Kamau wants Grade 7 learners to build something real, something that solves a problem their community actually has. He uploads the KICD designs for Agriculture & Nutrition, Pre-Technical Education, and Integrated Science to NotebookLM and asks it to find the overlaps. Within minutes he has the "Smart Kitchen Garden System": soil science from Agriculture, vertical structure design from Pre-Tech, and plant growth conditions from Science. Three teachers, one project, twelve competencies.',
        content: 'A source-grounded tool can help compare documents from different learning areas, but the teacher must verify every proposed connection against the current KICD designs. Anchor each project in a real problem, define the selected outcomes and keep each learning area’s evidence visible.\n\n## A multi-disciplinary PBL matrix\nUse this as a planning template rather than an official curriculum map:\n\n| Learning areas | Local problem | Observable evidence | Values or PCI to verify |\n| --- | --- | --- | --- |\n| [Learning area 1] + [Learning area 2] | [Problem learners can investigate] | [What each learner will make, explain, measure or decide] | [Select from the applicable design] |\n| [Learning area 1] + [Learning area 3] | [Problem and user] | [Product, explanation and revision record] | [Select from the applicable design] |\n| [Learning area 2] + [Learning area 3] | [Problem and constraint] | [Data, recommendation and reflection] | [Select from the applicable design] |',
        tip: 'The best Kenyan PBL projects are built around real community problems: water scarcity in Kitui, soil erosion in Murang\'a, food preservation without electricity in Kilifi, plastic waste in Kisumu. When the project addresses a problem the learners\' families face, you never have to chase any learner to finish it.',
        promptTitle: 'NotebookLM Cross-Curriculum PBL Generator',
        prompt: `Upload the KICD Curriculum Designs for Agriculture & Nutrition, Pre-Technical Education, and one more Learning Area.

STEP 1, FIND THE OVERLAPS:
"Analyse all uploaded curriculum documents at once. Identify three Sub-Strands across different Learning Areas that share a genuine conceptual connection, not superficial topic similarity but deep links where mastering one Sub-Strand directly supports another. For each: state the exact Learning Outcome from each document, and explain in two sentences why these concepts reinforce each other."

STEP 2, DESIGN THE KENYAN PROJECT:
"Design a 3-week Project-Based Learning unit for Grade [7/8] based on the strongest connection you found. It must:
- Address Learning Outcomes from at least 3 Learning Areas (cite the specific KICD outcomes)
- Solve a real problem people in [COUNTY] actually face
- Produce a tangible output a community member could use
- Be achievable with ZERO electricity, ZERO learner internet, and ZERO materials budget
- Use specific Kenyan names and places throughout
- Specify weekly milestones for checkpoint assessment"

STEP 3, GENERATE THE INTEGRATED ASSESSMENT MATRIX:
"Create an integrated assessment matrix. For each Learning Area, write rubric descriptors at all four KNEC levels (EE / ME / AE / BE). Each descriptor must describe observable learner BEHAVIOUR, what the teacher SEES the learner DO, not abstract qualities like 'good understanding'."`,
      },
      {
        tool: 'Gemini',
        title: 'The Critical Thinking Rubric for Practical Projects',
        scenario: 'The traditional Kenyan marking scheme rewards the learner who writes the most, not the one who thinks most creatively. CBC\'s performance rubrics flip this, assessing the quality of reasoning, the resourcefulness of problem-solving, and the depth of reflection. Writing those rubrics from scratch takes hours; Gemini produces them in three minutes.',
        content: 'Frame rubric criteria around process, not product. "How did the learner handle failure when the model leaked?" is more CBC than "Is the model waterproof?". The learner who iterated five times and eventually solved it demonstrates higher Critical Thinking than the one whose first attempt worked by luck. Write your rubrics to capture the thinking journey, then deploy them in Google Classroom\'s native rubric tool.',
        tip: 'Assess the thinking journey, not just the artefact. A learner who tested, failed, adjusted, and improved shows more Critical Thinking than one who got lucky on the first try. Build that into every rubric criterion.',
        promptTitle: 'KNEC-Aligned Critical Thinking Rubric (Practical Project)',
        prompt: `Role: You are a Senior Assessment Officer at KNEC specialising in School-Based Assessments for Junior School, familiar with rural school realities.

PROJECT DETAILS:
Title: "Constructing an Improvised Zero-Energy Cool Chamber (ZECC) for Preserving Local Vegetables"
Grade: Grade 8
Learning Areas: Agriculture & Nutrition + Integrated Science + Pre-Technical Education
Core Competency Focus: Critical Thinking and Problem-Solving
Context: Rural school, no electricity; local vegetables include sukuma wiki, tomatoes, mangoes

Generate a 4-tier rubric measuring Critical Thinking across these 5 dimensions:
1. Problem Identification and Resourcefulness (analysing the challenge, using local waste materials)
2. Technical Execution and Adaptability (handling failures: a leaking seal, unstable walls)
3. Data Interpretation (measuring and comparing internal vs external temperatures with improvised tools)
4. Peer Collaboration and Knowledge Transfer (contributing to group problem-solving, explaining reasoning)
5. Reflective Self-Assessment (quality of reflection on what worked, what failed, what to change)

FORMAT: a Markdown table with columns: Dimension | EE | ME | AE | BE.

After the table, add:
- A GOOGLE CLASSROOM FEEDBACK WORKFLOW describing how a teacher uses this rubric in the native rubric tool.
- 3 pre-written Comment Bank entries for the most common situations at each level.
- The "Return and Resubmit" policy for learners who score AE or BE.`,
      },
      {
        tool: 'Google Classroom',
        title: 'Managing the Full SBA Cycle Digitally',
        scenario: 'When the KNEC inspector arrives at Madam Ndegwa\'s Junior School in Nyeri, she opens Google Classroom on her phone and goes straight to "SBA Records, Grade 8, Term 2". Every KNEC tool download is there, every marked rubric, every learner score in the Gradebook. The inspection takes 20 minutes instead of three hours of frantic paper-sorting.',
        content: 'KNEC develops and uploads assessment tools; teachers download, administer, mark, and upload results to the KNEC portal. Google Classroom is not the system of record, it is the management layer that organises the workflow: a private class with Topics for each SBA cycle, the downloaded tools and marked rubrics filed by term, and a Gradebook you export to Sheets for KNEC upload.\n\nThe prompt below is for the related task of generating differentiated SBA tasks for a mixed-ability class.',
        tip: 'The cba.knec.ac.ke portal is your official system of record; Google Classroom is your professional workspace. Think of it like your land title (the portal) versus your farm plan (Classroom): you manage the farm through the plan, but the title proves ownership. Keep both.',
        promptTitle: 'Gemini SBA Differentiated Assessment Generator',
        prompt: `Role: CBC Senior School assessment specialist.

I have a Grade [6/7/8/9] class of [X] learners at very different performance levels. Generate three differentiated versions of a formative assessment task for:
Learning Area: [e.g., Business Studies]
Sub-Strand: [e.g., Sources of Business Finance]
Context: learners in [County], most from families running small jua kali businesses or market stalls.

VERSION 1, SUPPORT LEVEL (AE-targeting, scaffolded):
- Structured task with sentence starters, a visual prompt, and a local example
- Kenyan context: a mama mboga at Gikomba market
- Completion time: 20 minutes; state the observable AE indicator

VERSION 2, STANDARD LEVEL (ME-targeting, no scaffolding):
- Full demonstration of the Specific Learning Outcome
- Kenyan context: a jua kali artisan in Kamukunji taking their first mobile-money loan
- Completion time: 25 minutes; state the observable ME indicator

VERSION 3, EXTENSION LEVEL (EE-targeting, cross-strand):
- Application in an unfamiliar context requiring connection to a prior Sub-Strand
- Kenyan context: a youth cooperative in Eldoret applying for a bank loan to buy a maize-milling machine
- Completion time: 35 minutes; state the observable EE indicator plus an extension challenge

For each version: list zero-cost materials, estimated marking time, and one oral questioning prompt to probe understanding.`,
      },
    ],
    lowResource: {
      title: 'Teaching this with few resources',
      scenarios: [
        {
          label: 'The ZECC project: zero budget, maximum thinking',
          steps: [
            'Construction materials are entirely free: two clay pots (borrowed from families), wet river sand from the compound, charcoal ash, and banana leaves for insulation. Total cost: zero shillings.',
            'Assessment is analog: print the rubric (one A4 sheet per group) on the school\'s stencil duplicator; learners annotate their own rubric during the reflection lesson.',
            'Temperature measurement uses one glass thermometer shared between groups in rotation, with data recorded in exercise books as hand-drawn tables.',
            'The community audience is the motivation: learners present their ZECC to parents at a Friday assembly, evaluated by a community elder, far more compelling than a teacher\'s grade.',
          ],
        },
      ],
    },
    deliverable: {
      title: 'Module 3 Deliverable: The SBA-Ready Digital Classroom',
      items: [
        'One complete 3-week project unit grounded in the selected KICD designs, covering connected learning areas with a source-checked evidence matrix, adapted to your county and school.',
        'A 5-dimension Critical Thinking rubric deployed in Google Classroom\'s native rubric tool, with a 3-entry Comment Bank saved for SBA feedback.',
        'Three differentiated formative tasks (support / standard / extension) for one Sub-Strand, all in specifically Kenyan business or community contexts.',
        'A private SBA Management Classroom with Term 1 and Term 2 cycles organised as Topics, and a documented Gradebook export procedure.',
      ],
    },
  },

  /* ── Module 4 ─────────────────────────────────────────────── */
  {
    id: 'M4',
    number: '04',
    title: 'Senior School Pathways',
    tagline: 'Grades 10-12: Kenya\'s first CBC cohort needs pathway teachers who are ready',
    duration: '6 Hours',
    hours: 6,
    level: 'Grade 10 - Grade 12',
    tag: 'Senior School',
    icon: 'compass',
    accent: '#2563eb',
    competencies: ['CT', 'CI', 'DL', 'L2L', 'CC', 'CZ'],
    context: 'January 2026. Kenya\'s first CBC cohort walks through the gates of Senior School. These learners are entering a system that, for the first time in Kenyan history, is designed around their individual talents rather than a single exam score.\n\nTheir teachers are navigating three pathways at once: debugging Python for the Applied Tech track, synthesising county development plans for Community Service Learning, and building longitudinal dance portfolios for Performing Arts. No teacher was trained for all of this, but every teacher has Gemini, NotebookLM, and Google Classroom, and this module shows exactly how to use each for a specific pathway.',
    overview: 'Senior School pathway work needs current source checking. The Ministry of Education identifies three pathways — STEM, Social Sciences, and Arts and Sports — while current KICD Grade 10 designs are organised into areas including Applied Sciences, Arts & Sports, Humanities, Languages, Pure Sciences, Religious Education and Technical Studies. This module helps teachers prepare source-checked, pathway-specific resources without turning a subject combination into a guaranteed career outcome.',
    outcomes: [
      'STEM: design Kenyan-contextualised debugging exercises, modelling tasks, and applied-science investigation protocols with Gemini.',
      'Social Sciences: build a source-checked notebook from the applicable KICD design and relevant local documents to support authentic case studies.',
      'Arts & Sports: configure Google Classroom as a longitudinal portfolio hub tracking performance, design evolution, and sports-science logs over three years.',
      'All pathways: use the 5-step NotebookLM study-guide workflow to turn dense pathway guidelines into learner-facing resources.',
    ],
    sections: [
      {
        tool: 'Gemini',
        pathway: 'STEM Pathway',
        title: 'Complex Problem-Solving, Code Debugging & Applied Science',
        scenario: 'Mwalimu Kariuki teaches Computer Science at a Technical School in Thika: 34 Grade 10 learners, 8 working desktops, a spotty connection, and no programming environment with a debugger. What he has is Gemini on his phone, and he uses it to generate debugging exercises where the Kenyan context is the content: a mobile-money system, a maize inventory app, a school-fee tracker.',
        content: 'For STEM teachers working without specialist colleagues, Gemini behaves like a capable subject-specialist peer: worked examples, code debugging, lab-report design, and real-world problem scenarios drawn from Kenyan industry and agriculture. The single most important habit is precision about your environment.',
        tip: 'For Computer Science, always specify the exact environment: "Python 3.10 in IDLE, Windows 7, offline, no colour syntax highlighting" produces practical exercises, while "Python" assumes VS Code and Stack Overflow. Say whether learners type code or copy it from the board; it changes the whole exercise design.',
        promptTitle: 'STEM: CS Debugging Exercise + Applied Science Investigation',
        prompt: `SUBJECT: Computer Science / Applied Sciences
GRADE: Grade 10 / 11 / 12
TOPIC: [e.g., Lists and Loops in Python / Soil Mechanics]
ENVIRONMENT: [e.g., Python 3.x in IDLE, 8 computers shared between 34 learners, offline]

PART A, COMPUTER SCIENCE DEBUGGING EXERCISE:
Real-world Kenyan context: a Grade 10 learner in Thika is writing a Python program to track daily maize prices at Marikiti Market. It should (1) accept 5 daily prices, (2) calculate the average, (3) identify the week's highest and lowest price.

Write BUGGY CODE for this exact scenario with 4 deliberately introduced errors:
- Bug 1 (syntax, visible to beginners)
- Bug 2 (logic, requires algorithmic understanding)
- Bug 3 (runtime, only appears with specific price inputs)
- Bug 4 (off-by-one / edge case, requires advanced reasoning)

LEARNER TASK:
- Identify each bug with line numbers and explain in plain English what it does wrong
- Write the corrected code
- Predict the output for three test inputs that exercise each edge case
- Extension: flag any single day's price more than 20% above the weekly average (a real market-manipulation concern)

MARKING GUIDE: a rubric at EE / ME / AE / BE for debugging accuracy, quality of explanation, and extension relevance.

PART B, APPLIED SCIENCES INVESTIGATION:
"Design a real-world investigation for Grade 11 Applied Sciences on [topic] in a Kenyan context. It must collect measurable data, apply a mathematical model, evaluate sources of error, and propose an improvement relevant to a Kenyan community need. All equipment must be improvised from local materials."`,
      },
      {
        tool: 'NotebookLM',
        pathway: 'Social Sciences Pathway',
        title: 'CSL Policy Synthesiser: From Government Documents to Student Research',
        scenario: 'Madam Wanjiru teaches Community Service Learning at a Girls\' Senior School in Kirinyaga. Her Grade 11 learners must do a CSL project on land use and food security. Instead of sending them to Google (where they find Wikipedia and American research), she builds a NotebookLM notebook from the Kirinyaga County Integrated Development Plan, the Vision 2030 Agriculture chapter, and the KICD CSL design. Every answer is grounded in actual Kenyan policy, and cites the exact page.',
        content: 'For a Community Service Learning task, begin with the applicable Grade 10 design and the school’s current programme. A source-grounded tool can help organise varied documents, local data and learner questions into a study resource, but it cannot decide whether a proposed activity is an official requirement. Upload the relevant design and local documents, ask for page references, and verify the final task, safety arrangements and evidence yourself.',
        tip: 'For any CSL project, upload your school\'s and county\'s real documents: the CIDP, the chief\'s reports, committee minutes, facility data. NotebookLM synthesising genuine local data is the authentic research process CBC intends, far better than generic web sources.',
        promptTitle: 'NotebookLM Social Sciences CSL Study-Guide Workflow',
        prompt: `Upload: the KICD Senior School CSL Curriculum Design, the relevant Kenya Vision 2030 chapter, your County Integrated Development Plan (CIDP), and local newspaper articles on the CSL theme.

STEP 1, INITIALIZE (anchor to Kenya only):
"You are the Senior Research Coach for our CSL track at [SCHOOL] in [COUNTY]. Use ONLY the uploaded CIDP, Vision 2030, and KICD curriculum design. Never reference external sources. If I ask about something not in these documents, say so clearly."

STEP 2, LOCAL OPPORTUNITY MAPPING:
"From the uploaded CIDP for [County], identify the top 3 community development challenges that connect to Sub-Strands in the KICD Senior School CSL design. For each: cite the CIDP page, cite the KICD Learning Outcome, and explain in two sentences why it is a genuine research opportunity for Grade 11 learners."

STEP 3, GENERATE THE LEARNER BRIEFING:
"Create a 2-page Research Briefing for Grade 11 learners on [e.g., 'Youth Unemployment and Agricultural Mechanisation in [County]']. Include: background from the CIDP, 3 focused research questions learners can investigate in their own communities, types of community informants to interview, and ethical guidelines for community research."

STEP 4, CSL PROJECT FRAMEWORK:
"Design a 6-week CSL framework that results in a tangible community contribution, not just a report. It must involve a community partner, produce something the community can use, and connect at least two Learning Areas. Specify weekly milestones, assessment checkpoints, and evidence-portfolio requirements."

STEP 5, DEPLOY TO GOOGLE CLASSROOM:
"Format the briefing and framework as a Google Classroom Material post under the Topic 'Community Service Learning, Term [X] Project'. Write the student-facing instructions and pin it to the top of the CSL Classwork section."`,
      },
      {
        tool: 'Google Classroom',
        pathway: 'Arts & Sports Pathway',
        title: 'Building a Longitudinal Digital Portfolio',
        scenario: 'For a learner in the Performing Arts track in Mombasa, every term is a portfolio entry: a video of their drumming, a scan of their choreography notes, a reflection on what changed between their Grade 10 and Grade 11 renditions of the same piece. Google Classroom becomes the three-year artistic journal that proves competency development over time, far more meaningful than any single exam.',
        content: 'Performance, creative production and physical development may require evidence beyond a written response. A portfolio can organise dated work samples, process notes, teacher observations, peer feedback and learner reflection when the applicable design and school process call for them. Use the school-approved storage and consent process; a digital submission history is not automatically a KNEC record.',
        tip: 'For Sports Science, create a recurring weekly assignment, "Week [X] Sports Performance Log", where learners submit a Doc with four entries: training activity, duration, a measurable metric (distance, repetitions, time), and a one-paragraph reflection. Over 36 months this becomes irrefutable longitudinal evidence, the kind university programmes and coaches actually want.',
        promptTitle: 'Gemini Arts & Sports Portfolio Rubric Generator',
        prompt: `PATHWAY: Arts & Sports
TRACK: [Performing Arts / Visual Arts / Sports & Recreation]
SUBJECT: [e.g., Theatre & Film / Fine Arts / Sports Science]
GRADE: [10, 11, or 12]
PORTFOLIO ENTRY TYPE: [e.g., Term 2 Original Screenplay / Visual Art Series / 6-Week Athletics Training Log]

PART A, TEACHER ASSESSMENT RUBRIC (5 criteria x 4 KNEC levels):
- Performing Arts criteria: Technique; Expression & Authenticity; Creative Interpretation; Ensemble Collaboration; Critical Reflection
- Visual Arts criteria: Concept Development; Technical Execution; Material Innovation (local or repurposed materials); Cultural Context & Relevance; Portfolio Presentation
- Sports Science criteria: Performance Metrics & Progression; Training Consistency; Tactical & Scientific Understanding; Teamwork & Leadership; Reflection Quality
For each criterion at each level (EE / ME / AE / BE), write 2 specific, observable descriptors a non-specialist teacher (a deputy covering the class) could use fairly.

PART B, LEARNER SELF-ASSESSMENT: reframe all criteria in first-person ("I demonstrated...").
PART C, PEER ASSESSMENT: reframe all criteria for one learner to fairly assess a classmate.
PART D, EVIDENCE TYPES: specify exactly 3 evidence types the learner submits with this entry, including at least one that needs no technology.
PART E, LONGITUDINAL TRACKER: design a recurring Google Classroom assignment structure that builds a complete portfolio over Grades 10-12.`,
      },
    ],
    lowResource: {
      title: 'Teaching this with few resources',
      scenarios: [
        {
          label: 'Senior School without fibre internet',
          steps: [
            'STEM: generate debugging exercises offline at the cyber cafe, copy them to a flash drive as .txt files, and load them on the school PCs; learners debug on paper first, then type corrections.',
            'Social Sciences: run NotebookLM on your phone during an internet window, download the learner Briefing as a PDF, photocopy it on the stencil duplicator, and send learners to the chief\'s office and county lands office for authentic primary research.',
            'Arts & Sports: record portfolio videos on one school phone to a shared 64GB flash drive, review weekly, and upload the best entries to Drive during a single cyber-cafe session per term.',
            'Across pathways, the teacher is the "Data Champion": download AI content weekly, distribute by flash drive, collect learner work physically, and upload batch evidence once a fortnight.',
          ],
        },
      ],
    },
    deliverable: {
      title: 'Module 4 Deliverable: The Pathway-Specific Toolkit',
      items: [
        'STEM: one complete CS debugging exercise and one Applied Sciences investigation, both in authentic Kenyan contexts, with KNEC rubrics.',
        'Social Sciences: a NotebookLM notebook with CIDP, Vision 2030, and KICD CSL documents loaded, a 2-page Learner Research Briefing, and a 6-week CSL framework posted to Classroom.',
        'Arts & Sports: a Google Classroom with portfolio assignment types for all three terms of Grade 10, rubrics deployed (teacher, self, peer), and a 3-year portfolio structure mapped.',
        'A personal pathway-comparison note: what AI does exceptionally well per pathway, where it needs heavy editing, and what ethical guardrails you apply.',
      ],
    },
  },

  /* ── Module 5 ─────────────────────────────────────────────── */
  {
    id: 'M5',
    number: '05',
    title: 'Revolutionising Competency-Based Assessment',
    tagline: 'From "Define soil erosion" to "Save the farm in Murang\'a": the CBA shift in practice',
    duration: '4 Hours',
    hours: 4,
    level: 'All Levels',
    tag: 'CBA Mastery',
    icon: 'clipboard',
    accent: '#0c9a7b',
    competencies: ['CT', 'DL', 'L2L', 'SE', 'CC'],
    context: 'A Grade 9 class is studying soil and runoff. The teacher wants more than a definition-recall exercise, but also wants to avoid pretending that every learner has the same home experience or that one project proves competence. The class therefore investigates a school-site problem, uses a source-checked outcome, and explains its evidence to an agreed audience.\n\nThe task is intentionally bounded: the teacher sets safety rules, materials and criteria; learners choose and test a design; each learner keeps an individual evidence trail. This module is about designing those moments carefully and sustainably.',
    overview: 'KNEC resources describe four broad performance levels — EE, ME, AE and BE — and current KJSEA regulations show two actual performance levels within each broad level for national reporting. This module focuses on the teacher’s design work: selecting the outcome, defining evidence, writing observable criteria, and using feedback and revision. Use national KNEC formats only where the applicable current guidance requires them.',
    outcomes: [
      'Design multi-dimensional performance tasks grounded in real Kenyan community scenarios, with authentic audiences, real constraints, and tangible outputs.',
      'Draft observable rubric descriptors using the four broad performance levels, and use EE1 to BE2 only when the applicable KNEC national framework explicitly requires those sub-levels.',
      'Implement Google Classroom\'s rubric tool, Comment Bank, and "Return and Resubmit" workflow for personalised feedback at scale without burning out.',
      'Build a NotebookLM "CBA Assessment Bank" that compounds in value as more assessments are added, enabling school-wide collaborative development.',
    ],
    sections: [
      {
        tool: 'Gemini',
        title: 'The Performance Task Matrix: Kenyan Contexts Only',
        scenario: 'At a school in Siaya, Grade 9 learners receive this task: "A local market is suffering waterborne-illness outbreaks from contaminated water points. Design a working water-filtration model from sand, charcoal, and cloth, and write a public-health advisory poster in Dholuo and English that a market trader can understand." The traditional test asked them to define filtration. The performance task asks them to save lives.',
        content: 'The shift in CBA is from "what does the learner know?" to "what can the learner do with what they know?" Every excellent performance task has three features. If your task lacks any one, ask Gemini to add it.\n\n- **An authentic Kenyan context:** a real problem a real community faces, with real local materials and language.\n- **A real audience:** peers, parents, community elders, market traders, not just the teacher.\n- **A tangible output:** a model, a poster, a plan, a pitch, a garden; something that exists after the lesson.',
        comparison: {
          traditional: 'Define what soil erosion is and list three types of erosion found in Kenya.',
          performance: 'You are an agricultural consultant called to a farm in hilly Murang\'a County. The farmer is losing crops to rainwater runoff. Design a soil-conservation plan using local materials, justify your layout from slope data, and pitch your solution to the farmer\'s family in two minutes.',
          competency: 'Critical Thinking & Problem-Solving + Communication & Collaboration',
        },
        tip: 'Audit every performance task against the three features: authentic Kenyan context, a real audience beyond the teacher, and a tangible product. If one is missing, the task is still a dressed-up exam question. Ask Gemini to add the missing feature explicitly.',
        promptTitle: 'Multi-Dimensional Performance Task + Full 8-Level KNEC Rubric',
        prompt: `Role: Principal Evaluation Specialist for KNEC and CBC framework architect, familiar with rural and peri-urban Kenyan realities.

TASK SPECIFICATIONS:
Grade: [e.g., Grade 9]
Learning Area: [e.g., Core Science / Health Education]
Sub-Strand: [e.g., Water Safety and Community Health]
Core Competencies: Critical Thinking AND Communication (dual focus)
Context: [e.g., a community market in Siaya near Lake Victoria with waterborne-illness outbreaks]

GENERATE:
1. LEARNER CHALLENGE SHEET (for the learner, clear, no jargon):
   - Opening scenario (max 150 words, Kenyan setting, named characters)
   - What the learner must produce (e.g., a working filtration model + a bilingual public-health poster)
   - Constraints (materials only from compound or household, zero cost)
   - Audience (who sees, uses, or evaluates the output beyond the teacher)
   - Success criteria in learner-friendly language

2. TEACHER RUBRIC (5 criteria x 8 KNEC sub-levels). For EACH criterion, write observable descriptors at all eight:
   EE1 (8): outstanding, innovative, community-changing
   EE2 (7): excellent, comprehensive, well-articulated
   ME1 (6): fully meets the standard
   ME2 (5): meets the standard with minor gaps
   AE1 (4): approaching, needs guidance on one aspect
   AE2 (3): approaching, gaps on several aspects
   BE1 (2): minimal relevant evidence, needs reteaching
   BE2 (1): very limited or no evidence
   Suggested criteria: scientific accuracy; resourcefulness (zero-cost local materials); quality of public communication; evidence of iterative improvement; depth of self-reflection.

3. ANALOG ASSESSMENT OPTION: how a teacher with zero devices administers and marks this same task using paper, chalk, and observation.`,
      },
      {
        tool: 'Google Classroom',
        title: 'The Personalised Feedback System: At Scale, Without Burning Out',
        scenario: 'Mwalimu Ndegwa marks 52 Grade 8 projects every fortnight. Writing unique feedback for each takes her until midnight on Saturday; writing nothing leaves learners unable to improve. Google Classroom\'s Comment Bank is the bridge: high-quality, specific feedback saved as codes, clicked into any submission in seconds, with one personalised line added at the top.',
        content: 'Build a Comment Bank of strong, reusable feedback, then personalise the first line for each learner. Always open with what the learner did correctly, even at BE: the Self-Efficacy competency is built or broken in that first sentence. Frame every gap as a next step, never a failure, and pair it with the "Return and Resubmit" policy so AE and BE work can be revised once.',
        commentBank: [
          { code: '[CRITICAL_THINKING_LOW]', text: 'You have correctly identified the problem, but your solution relies on buying materials from town. One of our CBC goals is resourcefulness: walk around your school compound. How could you use old tins, banana fibres, or sisal instead of plastic tubing? Bring your revised design to me before our next lesson and we will look at it together.' },
          { code: '[COMMUNICATION_MEETS]', text: 'Your explanation of the scientific process is clear and well-structured, and you listened well to your group during the presentation. To reach Exceeding Expectations, try using a local proverb or analogy, something a community elder in your village would understand, to explain your key finding. That is the Communication competency at its highest.' },
          { code: '[TECHNICAL_APPROACHING]', text: 'Your model stands, which is real progress. But it is leaking at the sides, so the filtration is not working yet. Think back to our lesson on soil plasticity: which soil would make a better sealant, sandy, loam, or clay? Test the clay option at home, photograph the result, and upload your revision here. You have one week.' },
          { code: '[REFLECTION_EXCEEDING]', text: 'Your self-reflection shows exactly the metacognition CBC is built to develop. You did not just say what went wrong, you explained why and proposed a testable alternative. This is Meeting and Exceeding Expectations in the Learning to Learn competency. Well done, Omwamba.' },
        ],
        tip: 'Always begin a Comment Bank entry with what the learner did correctly, even at BE level. Self-Efficacy is made or broken in that first sentence. A learner who reads "You have identified the problem correctly" before hearing the fix is far more likely to resubmit than one who reads "Your solution is wrong."',
        promptTitle: 'Gemini Three-Version Personalised Feedback Generator',
        prompt: `CONTEXT:
Grade: [e.g., Grade 8]
Learning Area: [e.g., Agriculture & Nutrition]
Assessment Task: [e.g., ZECC construction project]
Learner's KNEC Level: [e.g., AE1, Approaching Expectations]
Strengths observed: [e.g., clearly identified the preservation problem; resourcefully used clay pots]
Gaps observed: [e.g., inconsistent temperature measurements; no written reflection on what failed]
Learner context (optional): [e.g., first-generation learner, strong practically but weaker in writing, Dholuo is first language]

Generate THREE targeted feedback versions:

VERSION 1, GOOGLE CLASSROOM COMMENT (max 60 words): encouragement first, one specific strength, one precise next step, the exact revision required, and the deadline.

VERSION 2, DETAILED RUBRIC COMMENT (max 150 words): reference specific rubric criteria by name; explain in observable terms what AE1 looks like versus what ME1 requires; give 2-3 specific low-cost actions before resubmission; end with encouragement framed around Learning to Learn.

VERSION 3, GUARDIAN WHATSAPP MESSAGE (max 80 words): plain language, no jargon, optional Kiswahili; explain what the learner is working on and one 10-minute family support activity; frame in competency language, never percentages; include the upload instruction.`,
      },
      {
        tool: 'NotebookLM',
        title: 'The CBA Assessment Bank: Compounding Professional Value',
        scenario: 'Every excellent assessment you design is a professional asset. If it lives only in your WhatsApp "Saved Messages", it dies with your next phone upgrade. NotebookLM turns your best assessments into a queryable bank that grows in value every term and can be shared with your whole teaching cluster through one notebook link.',
        content: 'Upload your strongest assessment tasks, your rubrics, and the KNEC CBAF guidelines, then ask NotebookLM to audit alignment, generate parallel variants, and surface gaps. Built as a shared school resource, where five teachers each add two quality assessments per term, the bank holds 40 assessments by year-end, and every teacher benefits from every other teacher\'s expertise. This is the collaborative professional learning community CBC was designed to produce.',
        tip: 'Make this a school-wide shared NotebookLM notebook. Five teachers across four grades, each contributing two quality assessments per term, gives 40 assessments by year-end. The bank compounds: everyone benefits from everyone\'s best work, which is exactly the professional learning community model CBC intends.',
        promptTitle: 'NotebookLM CBA Assessment Quality Audit',
        prompt: `Upload your existing assessment tasks, rubrics, and the KNEC CBAF guidelines.

AUDIT 1, KNEC ALIGNMENT:
"Review my uploaded assessment for [Subject, Grade] against the KNEC CBAF requirements in my guidelines. List (a) 3 strengths, (b) 2 specific gaps or misalignments, (c) 1 concrete improvement. Cite the KNEC document page for each gap."

AUDIT 2, KENYA CONTEXT CHECK:
"Review the Kenyan authenticity of my performance task. Is the scenario one learners in [County] would recognise? Is the language free of Western idioms? Are the required materials genuinely available in rural Kenya? Suggest 3 specific changes to make it more locally relevant."

AUDIT 3, COMPETENCY COVERAGE:
"Which of CBC's 7 competencies does my assessment genuinely require the learner to demonstrate, not just mention? For each missing competency, suggest one element I could add without making the task longer."

AUDIT 4, DIFFERENTIATION CHECK:
"Does my assessment provide genuine entry points at BE, AE, ME, and EE? If a learner at BE cannot engage meaningfully, that is a design flaw, not a reflection of ability. Suggest one modification that creates a BE-accessible entry point without lowering the EE ceiling."

AUDIT 5, GENERATE A PARALLEL ASSESSMENT:
"Using the same design principles, challenge level, Kenyan-context approach, and competency focus, generate a completely parallel assessment for a different Sub-Strand in the same Learning Area. No shared questions, scenarios, or materials, but the same philosophy."

AUDIO OVERVIEW: Click Studio, Audio Overview, "Brief". Topic: "Key principles of high-quality CBC performance task design based on KNEC guidelines." Listen before your next staff development session.`,
      },
    ],
    lowResource: {
      title: 'Teaching this with few resources',
      scenarios: [
        {
          label: 'The analog CBA system: full assessment without devices',
          steps: [
            'Write the performance task on the chalkboard (Key Inquiry Question plus challenge brief); learners copy it into exercise books and all physical work happens in the compound.',
            'Print one A4 rubric per group on the stencil duplicator; tick boxes and write a 2-sentence comment during or right after observation, about 8 minutes per group.',
            'Keep an analog Comment Bank: write your five most common feedback phrases on a laminated card, then write the code (e.g. "CT-LOW") plus one personalised sentence. Fast, consistent, human.',
            'File physical artefacts (clay models, drawings, plans) in labelled envelopes; photograph the best three per learner per term at the cyber cafe in one batch upload.',
            'Hold the principle close: a learner designing a working soil filter from a broken clay pot and river sand shows more Critical Thinking than one downloading a ready-made design over broadband. Treat constraint as an asset for spotting genuine innovation.',
          ],
        },
      ],
    },
    deliverable: {
      title: 'Module 5 Deliverable: The CBA Mastery Portfolio',
      items: [
        'Three complete performance tasks (Lower Primary, Upper Primary/Junior School, Senior School), each with an observable rubric and a note explaining which current source must be checked before use.',
        'A Google Classroom with native rubrics on live assignments, a 10-entry Comment Bank saved, and at least 5 demonstrated feedback examples including the "Return and Resubmit" workflow.',
        'A NotebookLM "CBA Assessment Bank" with at least 10 uploaded tasks and a completed 5-audit review for at least 3 of them.',
        'A personal AI-ethics reflection (about 500 words): which CBC value does AI-assisted assessment strengthen, what risks must the teacher guard against, and what is the teacher\'s irreplaceable role in an AI-powered CBA system.',
      ],
    },
  },
]

export function getAiModuleById(id: string): AiModule | undefined {
  return AI_MODULES.find(m => m.id === id)
}
