export type Lesson = {
  id: number
  title: string
  duration: number
  type: 'video' | 'reading' | 'quiz' | 'activity'
  content: string
  completed: boolean
}

export type Module = {
  id: number
  title: string
  description: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration: number
  lessons: Lesson[]
  progress: number
  icon: string
  objectives: string[]
  prerequisites: string[]
}

export const modulesData: Module[] = [
  // ---------------------------------------------------------------------------
  // Module 1 — CBC Fundamentals
  // ---------------------------------------------------------------------------
  {
    id: 1,
    title: 'CBC Fundamentals',
    description: 'Understand the core principles and philosophy of Competency-Based Curriculum.',
    category: 'foundations',
    difficulty: 'beginner',
    duration: 45,
    progress: 0,
    icon: 'CBC',
    objectives: [
      'Understand the philosophy behind CBC',
      'Identify the seven core competencies',
      'Explain the shift from content-based to competency-based learning',
      'Describe the role of the teacher in CBC',
      'Apply CBC principles in lesson planning',
    ],
    prerequisites: [],
    lessons: [
      {
        id: 1,
        title: 'Introduction to Competency-Based Curriculum',
        duration: 10,
        type: 'video',
        completed: false,
        content: `
# Introduction to Competency-Based Curriculum

Welcome to the first lesson on CBC Fundamentals. In this lesson, we will explore what Competency-Based Curriculum means and why Kenya adopted this educational approach.

## What is CBC?

Competency-Based Curriculum (CBC) is an educational approach that focuses on what learners can demonstrate they know and can do, rather than just what they have been taught. It emphasizes:

- **Skills development** over content memorization
- **Practical application** of knowledge
- **Individual learner progress** at their own pace
- **Holistic development** of the child

## Why Kenya Adopted CBC

Kenya introduced CBC in 2017 to address several challenges in the education system:

1. **Relevance**: Making education more relevant to the needs of the 21st century
2. **Employment**: Preparing learners for the job market with practical skills
3. **Innovation**: Fostering creativity and critical thinking
4. **Inclusivity**: Catering to diverse learning needs and abilities

## Key Features of CBC

- Learner-centered approach
- Continuous assessment
- Focus on competencies rather than just grades
- Integration of values and life skills
- Parental involvement in learning

In the next lesson, we will explore the seven core competencies in detail.
        `,
      },
      {
        id: 2,
        title: 'The Seven Core Competencies',
        duration: 12,
        type: 'reading',
        completed: false,
        content: `
# The Seven Core Competencies

The CBC framework is built around seven core competencies that every learner should develop. These competencies are interconnected and should be integrated across all learning areas.

## 1. Communication and Collaboration

Learners should be able to:
- Express ideas clearly in writing and speech
- Listen actively and respectfully
- Work effectively in teams
- Use various communication tools and technologies

## 2. Critical Thinking and Problem Solving

This competency enables learners to:
- Analyze information objectively
- Evaluate different perspectives
- Make informed decisions
- Solve problems creatively

## 3. Creativity and Imagination

Learners develop:
- Original thinking
- Artistic expression
- Innovation skills
- Ability to generate new ideas

## 4. Citizenship

This involves:
- Understanding rights and responsibilities
- Participating in community activities
- Respecting diversity
- Demonstrating patriotism

## 5. Digital Literacy

Learners should be able to:
- Use digital devices responsibly
- Access and evaluate online information
- Create digital content
- Stay safe online

## 6. Learning to Learn

This meta-competency includes:
- Self-directed learning
- Time management
- Goal setting
- Reflection and self-assessment

## 7. Self-Efficacy

Learners develop:
- Confidence in their abilities
- Resilience
- Growth mindset
- Personal responsibility

## Integrating Competencies in Teaching

As a teacher, you should design activities that develop multiple competencies simultaneously. For example, a group project can develop communication, collaboration, critical thinking, and creativity all at once.
        `,
      },
      {
        id: 3,
        title: 'From Content to Competency: The Paradigm Shift',
        duration: 8,
        type: 'video',
        completed: false,
        content: `
# From Content to Competency: The Paradigm Shift

This lesson explores the fundamental shift from traditional content-based education to competency-based learning.

## The Old Paradigm: Content-Based Education

Traditional education focused on:
- **Knowledge transmission**: Teacher as the source of all knowledge
- **Memorization**: Students expected to recall facts
- **Examinations**: High-stakes tests determining success
- **Standardization**: One-size-fits-all approach
- **Subject silos**: Learning compartmentalized by subject

## The New Paradigm: Competency-Based Education

CBC shifts the focus to:
- **Knowledge application**: Using knowledge to solve real problems
- **Understanding**: Deep comprehension over surface memorization
- **Continuous assessment**: Ongoing feedback and growth
- **Differentiation**: Personalized learning paths
- **Integration**: Cross-curricular connections

## What This Means for Teachers

| Old Role | New Role |
|----------|----------|
| Lecturer | Facilitator |
| Knowledge source | Learning guide |
| Assessor | Coach |
| Disciplinarian | Mentor |
| Content expert | Learning designer |

## Practical Implications

1. **Lesson planning** should focus on what learners will be able to DO
2. **Activities** should be hands-on and application-focused
3. **Assessment** should be varied and continuous
4. **Feedback** should be constructive and growth-oriented
5. **Environment** should be safe for experimentation and failure
        `,
      },
      {
        id: 4,
        title: "The Teacher's Role in CBC",
        duration: 10,
        type: 'reading',
        completed: false,
        content: `
# The Teacher's Role in CBC

The role of the teacher in CBC is fundamentally different from traditional education. This lesson explores what it means to be a CBC teacher.

## From Sage on the Stage to Guide on the Side

In CBC, teachers transition from being the central source of knowledge to being facilitators of learning. This means:

### Facilitating Learning
- Creating enabling learning environments
- Providing resources and materials
- Guiding learners through activities
- Asking probing questions

### Differentiating Instruction
- Recognizing diverse learning needs
- Adapting activities for different learners
- Providing multiple pathways to learning
- Supporting struggling learners while challenging advanced ones

### Assessing Continuously
- Using formative assessment daily
- Providing immediate, constructive feedback
- Tracking individual learner progress
- Using assessment data to inform instruction

### Building Relationships
- Creating safe learning spaces
- Understanding each learner's background
- Involving parents in learning
- Collaborating with colleagues

## Key Skills for CBC Teachers

1. **Observation**: Watching and listening to understand learner needs
2. **Questioning**: Using questions to promote thinking
3. **Flexibility**: Adapting plans based on learner responses
4. **Creativity**: Designing engaging, relevant activities
5. **Patience**: Allowing learners to progress at their own pace
6. **Reflection**: Continuously improving practice

## Self-Assessment

Ask yourself:
- How much do I talk versus how much do my learners talk?
- Do I allow learners to make mistakes and learn from them?
- How do I accommodate different learning styles?
- Do I know each learner's strengths and challenges?
        `,
      },
      {
        id: 5,
        title: 'Knowledge Check: CBC Fundamentals',
        duration: 5,
        type: 'quiz',
        completed: false,
        content: `
# Knowledge Check: CBC Fundamentals

Test your understanding of the key concepts covered in this module.

## Quiz Questions

**Question 1:** What is the primary focus of Competency-Based Curriculum?

a) Memorizing facts and figures
b) Passing examinations
c) Developing skills and abilities learners can demonstrate
d) Following a strict syllabus

**Answer:** c) Developing skills and abilities learners can demonstrate

---

**Question 2:** How many core competencies are there in the CBC framework?

a) 5
b) 6
c) 7
d) 8

**Answer:** c) 7

---

**Question 3:** Which of the following best describes the teacher's role in CBC?

a) The main source of all knowledge
b) A facilitator and guide for learning
c) Someone who lectures all day
d) A strict disciplinarian

**Answer:** b) A facilitator and guide for learning

---

**Question 4:** Which is NOT one of the seven core competencies?

a) Communication and Collaboration
b) Test-Taking Skills
c) Digital Literacy
d) Self-Efficacy

**Answer:** b) Test-Taking Skills

---

**Question 5:** The shift from content-based to competency-based education means:

a) Less work for teachers
b) Focus on what learners can DO, not just what they know
c) Eliminating all examinations
d) Teaching only practical subjects

**Answer:** b) Focus on what learners can DO, not just what they know

## Reflection

After completing this quiz, reflect on:
- Which concepts are you most confident about?
- Which areas need more review?
- How can you apply these concepts in your classroom?
        `,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Module 2 — Competency-Based Assessment
  // ---------------------------------------------------------------------------
  {
    id: 2,
    title: 'Competency-Based Assessment',
    description: 'Learn how to design and implement effective competency-based assessments.',
    category: 'assessment',
    difficulty: 'intermediate',
    duration: 60,
    progress: 0,
    icon: 'CBA',
    objectives: [
      'Distinguish between formative and summative assessment',
      'Design rubrics for competency assessment',
      'Implement portfolio-based assessment',
      'Use observation as an assessment tool',
      'Provide constructive feedback to learners',
      'Document and report learner progress',
    ],
    prerequisites: ['CBC Fundamentals'],
    lessons: [
      {
        id: 1,
        title: 'Understanding Assessment in CBC',
        duration: 10,
        type: 'video',
        completed: false,
        content: `
# Understanding Assessment in CBC

Assessment in CBC is fundamentally different from traditional testing. This lesson introduces the key concepts of competency-based assessment.

## What is Competency-Based Assessment?

Competency-based assessment focuses on measuring what learners can DO with their knowledge, not just what they can recall. It:

- Measures application of skills
- Uses multiple methods
- Is ongoing and continuous
- Provides feedback for improvement
- Celebrates growth and progress

## Types of Assessment

### Formative Assessment
- Ongoing during learning
- Provides feedback for improvement
- Low or no stakes
- Examples: observations, questions, exit tickets

### Summative Assessment
- At the end of a learning period
- Evaluates achievement of competencies
- Higher stakes
- Examples: projects, portfolios, performances

## Key Principles

1. **Authentic**: Connected to real-world tasks
2. **Valid**: Measures what it claims to measure
3. **Reliable**: Consistent results across different contexts
4. **Fair**: Accessible to all learners
5. **Transparent**: Clear criteria known to learners
        `,
      },
      {
        id: 2,
        title: 'Designing Effective Rubrics',
        duration: 12,
        type: 'reading',
        completed: false,
        content: `
# Designing Effective Rubrics

Rubrics are essential tools for assessing competencies. This lesson teaches you how to create and use effective rubrics.

## What is a Rubric?

A rubric is a scoring guide that describes levels of performance for a task. It includes:
- Criteria: What is being assessed
- Levels: Degrees of quality
- Descriptors: What each level looks like

## Types of Rubrics

### Holistic Rubrics
- Single overall score
- Quick to use
- Good for general assessment
- Less detailed feedback

### Analytic Rubrics
- Separate scores for each criterion
- More detailed
- Better feedback
- More time-consuming

## Creating a Rubric: Step by Step

1. **Identify the competency** to be assessed
2. **Define the criteria** - what specific skills/behaviors?
3. **Determine performance levels** - typically 3-5 levels
4. **Write clear descriptors** for each level
5. **Test and refine** the rubric

## Example Rubric: Oral Presentation

| Criteria | Exceeding (4) | Meeting (3) | Approaching (2) | Beginning (1) |
|----------|---------------|-------------|-----------------|---------------|
| Content | Well-researched, comprehensive | Adequate information | Some relevant information | Limited content |
| Delivery | Confident, engaging | Clear and audible | Some hesitation | Difficult to hear |
| Organization | Logical, clear structure | Generally organized | Some structure | Disorganized |
| Visual Aids | Effective, enhances message | Supports presentation | Basic visuals | No visuals or distracting |

## Tips for Using Rubrics

- Share rubrics with learners BEFORE the task
- Use rubrics consistently
- Provide feedback using rubric language
- Involve learners in rubric creation when possible
        `,
      },
      {
        id: 3,
        title: 'Portfolio Assessment',
        duration: 10,
        type: 'video',
        completed: false,
        content: `
# Portfolio Assessment

Portfolios are powerful tools for documenting and assessing competency development over time.

## What is a Portfolio?

A portfolio is a purposeful collection of learner work that demonstrates:
- Growth over time
- Achievement of competencies
- Reflection on learning
- Best work examples

## Types of Portfolios

### Growth Portfolio
- Shows progress over time
- Includes early and later work
- Demonstrates improvement

### Showcase Portfolio
- Best work only
- Demonstrates achievement
- Often shared with others

### Process Portfolio
- Documents the learning journey
- Includes drafts and revisions
- Shows thinking and problem-solving

## What to Include

- Written work samples
- Projects and artifacts
- Photos of activities
- Self-reflections
- Peer feedback
- Teacher observations
- Certificates and awards

## Managing Portfolios

### Physical Portfolios
- Folders or binders
- Organized by subject or competency
- Regular review and update

### Digital Portfolios
- Online platforms
- Easy to share
- Multimedia elements
- Accessible anywhere

## Assessment Using Portfolios

1. Review portfolio contents regularly
2. Use rubrics for consistency
3. Include learner self-assessment
4. Document growth over time
5. Share with parents during conferences
        `,
      },
      {
        id: 4,
        title: 'Observation and Documentation',
        duration: 8,
        type: 'reading',
        completed: false,
        content: `
# Observation and Documentation

Observation is one of the most powerful assessment tools in CBC. This lesson covers effective observation techniques.

## Why Observation Matters

Observation allows teachers to:
- See competencies in action
- Assess process, not just product
- Capture authentic learning moments
- Understand individual learners
- Identify support needs

## Types of Observation

### Informal Observation
- Happens naturally during class
- Quick mental notes
- General impressions

### Formal Observation
- Planned and structured
- Specific focus
- Documented systematically

### Participant Observation
- Teacher involved in activity
- Real-time assessment
- May miss some details

### Non-participant Observation
- Teacher watches from outside
- Can see overall dynamics
- May seem less natural

## Documentation Methods

### Anecdotal Records
Brief, objective notes about specific incidents:
- Date and time
- What happened
- Who was involved
- Significance

### Checklists
Quick yes/no or present/absent indicators:
- Easy to use
- Consistent
- Limited detail

### Rating Scales
Degrees of performance:
- More nuanced than checklists
- Quick to complete
- Good for tracking progress

### Running Records
Continuous narrative of events:
- Rich detail
- Time-consuming
- Good for in-depth analysis

## Best Practices

1. Observe regularly and systematically
2. Be objective - describe, don't judge
3. Document promptly
4. Look for patterns over time
5. Use multiple methods
6. Respect learner privacy
        `,
      },
      {
        id: 5,
        title: 'Providing Constructive Feedback',
        duration: 10,
        type: 'video',
        completed: false,
        content: `
# Providing Constructive Feedback

Feedback is essential for learning. This lesson covers how to provide feedback that promotes growth.

## Why Feedback Matters

Effective feedback:
- Clarifies expectations
- Identifies strengths and areas for growth
- Motivates improvement
- Builds self-assessment skills
- Strengthens relationships

## Characteristics of Effective Feedback

### Specific
"Good work" is too vague. "Your explanation of the water cycle included all key stages with accurate descriptions" tells the learner exactly what they did well.

### Timely
- Given soon after the work
- While context is fresh
- Before moving to new topics

### Actionable
- Tells learner what to do next
- Focuses on improvement
- Within learner's control

### Balanced
- Acknowledges strengths
- Identifies growth areas
- Maintains dignity

## The SBI Model

**Situation**: Where and when
**Behavior**: What you observed
**Impact**: The effect it had

Example: "During the group activity (S), you helped your teammate understand the instructions (B), which allowed the whole group to complete the task on time (I)."

## Feedback Techniques

### Praise-Question-Suggestion
1. What did the learner do well?
2. What question could prompt reflection?
3. What specific suggestion for improvement?

### Two Stars and a Wish
- Two things done well (stars)
- One thing to improve (wish)

### Growth-Focused Language
- "Not yet" instead of "wrong"
- "Keep practicing" instead of "you can't"
- "You're improving in..." instead of "you still need work on..."

## Receiving Feedback

Teach learners to:
- Listen without defending
- Ask clarifying questions
- Reflect on the feedback
- Create an action plan
        `,
      },
      {
        id: 6,
        title: 'Assessment Practice Activity',
        duration: 10,
        type: 'activity',
        completed: false,
        content: `
# Assessment Practice Activity

Apply what you've learned by completing these practical exercises.

## Activity 1: Create a Rubric

Design a rubric for assessing "Communication and Collaboration" competency during a group project.

Your rubric should include:
- At least 3 criteria
- 4 performance levels (EE, ME, AE, BE)
- Clear descriptors for each level

## Activity 2: Observation Practice

Plan an observation session for your class:
1. What competency will you observe?
2. What documentation method will you use?
3. What specific behaviors will you look for?
4. When will you conduct the observation?

## Activity 3: Feedback Practice

Write constructive feedback for the following scenario:

A learner submitted a project on environmental conservation. The content was accurate and well-researched, but the presentation was disorganized and the learner seemed nervous during the oral presentation.

Use the SBI model or Praise-Question-Suggestion format.

## Activity 4: Portfolio Planning

Design a portfolio structure for your class:
- What items will be included?
- How often will portfolios be updated?
- How will learners select items?
- How will you assess portfolios?

## Reflection Questions

After completing these activities, reflect on:
1. Which assessment method do you feel most confident using?
2. What challenges do you anticipate in implementing these methods?
3. How will you involve learners in the assessment process?
4. What support do you need to improve your assessment practices?
        `,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Module 3 — Formative Assessment Strategies
  // ---------------------------------------------------------------------------
  {
    id: 3,
    title: 'Formative Assessment Strategies',
    description: 'Explore practical formative assessment techniques to support learning in the CBC classroom.',
    category: 'assessment',
    difficulty: 'intermediate',
    duration: 50,
    progress: 0,
    icon: 'FA',
    objectives: [
      'Understand the purpose of formative assessment within CBC\'s CBA mandate',
      'Apply five quick-check techniques in large Kenyan classrooms',
      'Design exit tickets aligned to Specific Learning Outcomes',
      'Scaffold effective self and peer assessment activities',
      'Use formative data to sort learners and plan differentiated follow-up',
    ],
    prerequisites: ['CBC Fundamentals'],
    lessons: [
      {
        id: 1,
        title: 'What is Formative Assessment?',
        duration: 10,
        type: 'video',
        completed: false,
        content: `
# What is Formative Assessment?

Formative assessment is assessment FOR learning — it happens during the learning process, not only at the end of it. KNEC describes competency-based assessment as a process of collecting and documenting what a learner knows and can do before, during and after learning, against specified competencies and criteria. In practice, the teacher uses classroom evidence to make an instructional decision and follows the current reporting and submission guidance for the relevant level.

## Formative vs Summative Assessment

The distinction matters practically. **Summative assessment** — KNEC examinations, end-of-term tests, and annual reports — tells us what a learner achieved by a particular point in time. It looks backward. **Formative assessment** looks forward: it tells you and the learner what to do next.

In classroom practice, a teacher may use descriptors such as EE, ME, AE and BE where the applicable design or school guidance calls for them. Current KJSEA reporting further divides the four broad levels into actual performance levels with national score ranges. These national reporting rules should not be copied into every classroom task; the daily purpose of formative assessment is to produce evidence and a next step.

## Why the CBA Mandate Matters

The transition to competency-based assessment asks teachers to collect richer classroom evidence alongside the national assessments and reporting processes that apply at each level. Your observations, work samples, questioning and rubric notes are useful only when they are specific, traceable to an outcome and used responsibly within the school’s current record-keeping process.

## Three Core Purposes of Formative Assessment

1. **Checking for understanding**: Did learners grasp today's concept well enough to build on it tomorrow?
2. **Identifying gaps**: Which learners are approaching expectation (AE) or below expectation (BE) on this SLO, and why?
3. **Adjusting instruction**: What do I change — right now, or in tomorrow's lesson — based on what I observed?

## Practical Reality in Kenyan Classrooms

Many Kenyan teachers manage classes of 40 to 60 learners with limited materials. Effective formative assessment in this context relies on quick, low-cost techniques that give you usable information fast. The following lessons introduce techniques specifically chosen for high-volume, low-resource settings.
        `,
      },
      {
        id: 2,
        title: 'Quick Check Techniques',
        duration: 10,
        type: 'reading',
        completed: false,
        content: `
# Quick Check Techniques

Rapid formative checks give you a real-time snapshot of the whole class without marking 50 books. Here are five techniques that work reliably in large Kenyan classrooms with minimal materials.

## 1. Traffic Light Cards

Each learner has three paper squares — green, amber, red — that can be cut from old exercise book covers and laminated. At any point in the lesson, ask learners to hold up the card that describes their understanding: green = I understand and could explain this to someone else; amber = I am not sure; red = I am lost.

In a class of 50, a quick scan tells you in five seconds whether to press on, pause to re-explain, or stop and regroup. Crucially, you can see which individual learners are holding red or amber and target them specifically.

## 2. Exit Tickets

A single question — written on a slip of paper or spoken aloud in a quick written response — given to every learner in the last three minutes of class. The question should directly test the lesson's SLO. Collect the slips as learners leave. Sort them into three piles (understood, partially understood, not understood) while learners are at break. This takes four to six minutes and gives you a clear plan for the next lesson.

## 3. Targeted Questioning

Instead of asking "Does everyone understand?", ask specific questions to specific learners. Prepare three to five questions at different levels of cognitive demand before the lesson. Direct easier questions at learners you think may be struggling (to build confidence and reveal gaps) and more analytical questions at learners who appear comfortable. Cold-calling is acceptable in CBC but should feel safe — never use it punitively.

## 4. Show-Me Boards

Mini whiteboards or the back of a notebook held up to show written answers simultaneously. Ask a question, give 30 seconds of think time, then ask everyone to show their answer at once. You see every learner's response in one glance. No materials? Ask learners to write answers large in their exercise books and hold them up.

## 5. Think-Pair-Share with a Report

Pose a question. Learners think silently for one minute, then discuss with a partner for two minutes. Ask two or three pairs to report back to the class. This gives you three data points simultaneously: the quality of individual thinking, the depth of peer discussion, and the accuracy of public reporting. It also develops Communication and Collaboration, a core competency.

## Choosing Your Technique

No single technique works best for every lesson. Use exit tickets when you want individual written evidence for your CBA records. Use traffic lights for a fast whole-class pulse check. Use targeted questioning when you suspect specific learners are struggling but do not want to disrupt flow. Vary techniques so learners stay engaged with the process.
        `,
      },
      {
        id: 3,
        title: 'Exit Tickets and Entry Slips',
        duration: 10,
        type: 'activity',
        completed: false,
        content: `
# Exit Tickets and Entry Slips

Exit tickets and entry slips are two of the highest-value formative tools available to CBC teachers because they produce written evidence that can be sorted, filed, and referenced in CBA records.

## Designing an Effective Exit Ticket

A good exit ticket has one job: reveal whether learners achieved today's Specific Learning Outcome (SLO). Before designing it, state the SLO clearly. For example: "By the end of this lesson, learners will be able to explain two ways human activity affects a river ecosystem."

A strong exit ticket for this SLO might be: "Name two ways people affect rivers, and for each one, describe what happens to the water or animals." This directly tests the SLO. A weak exit ticket asks "What did you learn today?" — too open, too easy to answer without demonstrating the competency.

## Exit Ticket Formats

- **Written response**: Best for literacy-heavy learning areas. Learner writes 1–3 sentences.
- **Diagram label**: Learner labels a blank diagram. Good for science and social studies.
- **True/False with justification**: "River pollution only happens in cities. True or False? Explain."
- **Rate your confidence (1–5) + one thing you learned**: Quick and personal; doubles as a mood check.

## Sorting Responses into CBC Performance Levels

After collecting exit tickets, sort them into three piles rather than reading each carefully:
- **EE/ME pile**: Learner demonstrated the SLO clearly and accurately.
- **AE pile**: Learner showed partial understanding — some correct elements, some errors or gaps.
- **BE pile**: Learner was unable to demonstrate the SLO — response is blank, off-topic, or significantly incorrect.

This takes four to six minutes for a class of 50. Count each pile. If more than 30% are in the AE or BE pile, your next lesson needs to revisit the concept — do not move on.

## Entry Slips

An entry slip is essentially an exit ticket used at the start of the next lesson. It re-poses the same or a related question to check whether learning consolidated overnight. Entry slips are powerful for revealing the "forgetting curve" — material that seemed understood at 3 pm but was not retained by 8 am the next morning. When entry slip data differs sharply from exit ticket data, this usually signals that instruction was too abstract or disconnected from learners' prior knowledge.

## Using Exit Ticket Data for CBA Records

Over a teaching unit, you will have a series of exit tickets for each learner. These constitute formative evidence. Select two or three representative samples per learner per term and file them as portfolio evidence. When completing the CBA report, these documents support the performance level you assign — moving your assessment from impression-based to evidence-based.
        `,
      },
      {
        id: 4,
        title: 'Self and Peer Assessment',
        duration: 10,
        type: 'reading',
        completed: false,
        content: `
# Self and Peer Assessment

Self and peer assessment are not shortcuts to reduce teacher workload — they are deliberate pedagogical strategies that build two of CBC's seven core competencies: **Learning to Learn** and **Self-Efficacy**. When learners assess their own work honestly, they develop metacognitive awareness. When they assess a classmate's work constructively, they practise critical thinking and communication.

## Why Kenyan CBC Specifically Values This

The shift from 8-4-4's rank-based assessment culture to CBC's competency development culture requires learners to become active agents in their own learning journey, not passive recipients of marks. Self-assessment is the mechanism that makes this shift real at the learner level.

## Scaffolding Self-Assessment

Learners — especially in Lower and Upper Primary — cannot self-assess accurately without scaffolding. Three structures that work well:

**1. I Can Statements**: Provide a list of "I can..." statements that match the lesson's SLOs. Learners tick those they can do confidently, mark those they are unsure about, and circle those they cannot do yet. Review the sheets and use them to group learners for the next activity.

**2. Reflective Questions**: After completing a task, ask learners to answer in writing: What did I do well? What was difficult? What would I do differently? For Lower Primary, this can be done verbally or through drawings.

**3. Self-Rating Scale**: A simple 1–4 scale tied to the CBC performance descriptors: 1 = I am still learning this (BE), 2 = I am getting there (AE), 3 = I can do this (ME), 4 = I can teach this to someone else (EE). Learners rate themselves, then you compare their self-rating to your observation. Large discrepancies (learner rates EE but you observe BE) reveal important gaps in self-awareness.

## Scaffolding Peer Assessment

Peer feedback needs explicit structure, or it defaults to "This is good" — which is useless. Provide sentence starters:

- "I think you did well on... because..."
- "One thing that could be improved is... because..."
- "A question I have after reading your work is..."

For oral presentations: give each peer assessor a simple checklist with two or three specific criteria from the rubric. This focuses attention and produces actionable feedback.

## Age-Appropriate Adaptations

- **Pre-Primary and Grade 1–2**: Use smiley face self-assessment (happy face = I understand; straight face = I am not sure; sad face = I need help). Verbal peer feedback only, guided by the teacher.
- **Grade 3–6**: Written self-assessment with sentence starters. Structured peer checklist.
- **Grade 7–9 (JSS)**: Full analytic peer rubrics. Learners can begin to justify ratings in writing.

## Handling Inaccurate Self-Assessment

Some learners will over-rate themselves (lack of awareness) and some will under-rate themselves (low confidence or perfectionism). Neither is a problem to punish — both are diagnostic data. A private, encouraging conversation that compares the learner's self-assessment to your observation is one of the most powerful developmental conversations you can have.
        `,
      },
      {
        id: 5,
        title: 'Using Data to Inform Instruction',
        duration: 10,
        type: 'video',
        completed: false,
        content: `
# Using Data to Inform Instruction

Collecting formative data is only valuable if you act on it. This lesson focuses on the practical steps between gathering evidence and changing what you do in the classroom.

## The "3 Piles" Method

After any written formative check — exit tickets, short responses, quick tasks — sort learner work into three piles before the next lesson:

- **Pile 1 (EE/ME)**: Learner demonstrated the SLO. These learners are ready to extend or apply their learning in a new context.
- **Pile 2 (AE)**: Learner partially demonstrated the SLO. They understood the concept at some level but made errors, left gaps, or applied it inconsistently.
- **Pile 3 (BE)**: Learner did not demonstrate the SLO. They need re-teaching, ideally using a different approach or example than the first attempt.

Count each pile. If Pile 3 is larger than 25% of the class, re-teach for the whole group. If it is smaller, consider a targeted small-group session while the rest of the class works on an extension or application task.

## Planning Differentiated Follow-Up

Once you have sorted learners, plan three short activity options for the following lesson:

- **Extension task** for Pile 1: Apply the concept to an unfamiliar scenario or a more complex problem.
- **Practice task** for Pile 2: Additional examples with guided support — a worked example to study, a partially-completed template, or peer pairing with a Pile 1 learner.
- **Re-teaching task** for Pile 3: A fresh, concrete explanation using different materials, manipulatives, or examples drawn from learners' own community context.

This is differentiation by response, not by fixed ability group. Learners move between piles lesson by lesson as their understanding develops.

## The 3-Minute End-of-Day Reflection Habit

Before leaving school each day, spend three minutes writing the answers to three questions in a small notebook:

1. What did my learners understand well today?
2. What do I need to revisit tomorrow or next week?
3. What do I want to try differently?

This reflection habit, practised consistently, develops professional self-awareness faster than any formal training. Over a term, your notebook becomes a record of your own instructional growth — and a source of evidence for peer coaching or performance reviews.

## Connecting Formative Data to CBA Records

When it is time to complete CBA reports, teachers who have been collecting and using formative data throughout the term can report with confidence. The performance level you assign (EE, ME, AE, BE) should be a summary of a body of evidence, not a single impression. Keep a simple class tracking sheet: learner names down one side, SLOs across the top, and a letter (E, M, A, B) in each cell updated weekly. At the end of term, the predominant pattern across each row is your CBA rating for that learner.
        `,
      },
      {
        id: 6,
        title: 'Formative Assessment Quiz',
        duration: 5,
        type: 'quiz',
        completed: false,
        content: `
# Knowledge Check: Formative Assessment Strategies

Test your understanding of formative assessment techniques and their application in CBC.

**Question 1:** What is the main purpose of formative assessment in the CBC CBA framework?

a) To assign EE/ME/AE/BE grades at the end of a term
b) To support and improve learning during instruction and inform the teacher's next steps
c) To rank learners against each other in preparation for KNEC examinations
d) To replace end-of-term summative reports

**Answer:** b) To support and improve learning during instruction and inform the teacher's next steps

---

**Question 2:** A teacher collects exit tickets and finds 35% of learners are in the "BE" pile. What is the most appropriate response?

a) File the tickets and continue with the planned next lesson
b) Assign the BE learners extra homework on the topic
c) Re-teach the concept to the whole class using a different approach, then differentiate
d) Move to the next unit because most learners understood

**Answer:** c) Re-teach the concept to the whole class using a different approach, then differentiate

---

**Question 3:** Which of the following is an effective exit ticket for the SLO "Learner can identify two causes of soil erosion"?

a) "What did you enjoy about today's lesson?"
b) "How many causes of soil erosion can you name and explain in two sentences each?"
c) "Did you find today's lesson difficult? Yes or No."
d) "Write your name and the date."

**Answer:** b) "How many causes of soil erosion can you name and explain in two sentences each?"

---

**Question 4:** Which two CBC core competencies are most directly developed by self and peer assessment activities?

a) Digital Literacy and Citizenship
b) Learning to Learn and Self-Efficacy
c) Communication and Collaboration and Creativity
d) Critical Thinking and Digital Literacy

**Answer:** b) Learning to Learn and Self-Efficacy

---

**Question 5:** The "3-pile" sorting method groups learner responses into:

a) Good, Average, Poor
b) Pass, Borderline, Fail
c) EE/ME, AE, and BE — then informs differentiated follow-up planning
d) Fast learners, middle learners, slow learners — as permanent ability groups

**Answer:** c) EE/ME, AE, and BE — then informs differentiated follow-up planning
`,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Module 4 — Inclusive Teaching Practices
  // ---------------------------------------------------------------------------
  {
    id: 4,
    title: 'Inclusive Teaching Practices',
    description: 'Strategies for supporting diverse learners in the CBC framework, grounded in Kenya\'s Education for All commitments.',
    category: 'pedagogy',
    difficulty: 'intermediate',
    duration: 55,
    progress: 0,
    icon: 'INC',
    objectives: [
      'Understand Kenya\'s inclusive education mandate under the NESP and CBC policy',
      'Identify the most common diversity challenges in Kenyan classrooms',
      'Apply UDL principles in low-resource settings',
      'Use differentiated instruction strategies for mixed-ability classes of 40–60 learners',
      'Support learners with visual or hearing impairment, EAL learners, and learners from ASAL regions',
    ],
    prerequisites: ['CBC Fundamentals'],
    lessons: [
      {
        id: 1,
        title: 'Principles of Inclusive Education',
        duration: 12,
        type: 'video',
        completed: false,
        content: `
# Principles of Inclusive Education

Inclusive education is not simply placing all learners in the same room. It is designing teaching and learning so that every learner — regardless of ability, language background, disability, gender, or socioeconomic status — can participate meaningfully and make progress.

## Kenya's Inclusive Education Mandate

Kenya's commitment to inclusive education flows from three interlocking policy frameworks:

**The Constitution of Kenya (2010)** Article 53 guarantees every child the right to free and compulsory basic education. Article 54 provides persons with disabilities the right to education in integrated institutions.

**The National Education Sector Plan (NESP 2018–2022 and successor)** explicitly targets elimination of barriers to participation and achievement, with specific focus on gender, disability, and geographic marginalisation — including ASAL regions where enrolment and retention remain significantly below national averages.

**CBC's own design philosophy** insists on learner-centred, differentiated instruction. The curriculum framework document states that "no learner should be left behind because of differences in learning pace, style, or circumstance." CBA is designed specifically so that assessment tracks individual competency development rather than ranking learners against a single standard.

## What Inclusion Looks Like in Practice

Inclusion is not about lowering standards. It is about removing barriers between a learner and the learning objective. The same SLO applies to all learners; the route to achieving it can vary. Some learners need more time, different materials, or a different mode of explanation. Inclusion means building those variations into your planning — not as afterthoughts but as intentional design choices.

## Barriers to Inclusion in Kenyan Classrooms

Understanding where barriers come from helps you address them:
- **Physical barriers**: Classrooms without ramps, learners who cannot see the board, noise levels that disadvantage learners with hearing impairment.
- **Communication barriers**: Instruction only in English or Kiswahili when some learners' home language is neither.
- **Attitudinal barriers**: Teacher or peer beliefs that some learners "cannot" achieve — often shaped by 8-4-4 ranking culture.
- **Resource barriers**: Lack of adapted materials, no sign language support, limited textbooks.
- **Geographic barriers**: Distance from school, school feeding gaps in ASAL regions that affect attendance and concentration.

Recognising these barriers is the first step to addressing them.
        `,
      },
      {
        id: 2,
        title: 'Understanding Diverse Learners',
        duration: 10,
        type: 'reading',
        completed: false,
        content: `
# Understanding Diverse Learners

Every Kenyan classroom contains a wider range of learners than 8-4-4 assessment culture acknowledged. CBC demands that you see and respond to this diversity systematically.

## The Reality of Mixed-Ability Classes

A Grade 4 class in Kenya will typically include learners who read at Grade 6 level, learners who are still working toward Grade 2 literacy skills, and everything in between. This is not a failure of the system — it is the natural result of children developing at different rates and having different opportunities outside school. Your job is not to eliminate this range but to design instruction that works across it.

## Learners with Visual Impairment

Partially sighted learners benefit from: seating close to the board, high-contrast materials (dark ink on white paper, avoid red/green combinations), enlarged text, and verbal descriptions of visual content. For the very small number of learners with severe visual impairment, contact your County Director of Education about EARC (Educational Assessment and Resource Centre) services and braille materials available through KNLS (Kenya National Library Services) and the Kenya Institute of Special Education (KISE).

## Learners with Hearing Impairment

Ensure the classroom is as quiet as possible during instruction. Seat hearing-impaired learners near the front and face the class when speaking — many learners use lip-reading without realising it. Write key vocabulary and instructions on the board in addition to speaking them. Where a learner uses sign language, the National Council for Persons with Disabilities (NCPWD) can facilitate sign language interpreter support in some counties.

## English as an Additional Language (EAL) Learners

For learners whose first language is not English or Kiswahili — particularly in border areas, refugee contexts, or ASAL pastoralist communities — comprehension breaks down at the language level, not the conceptual level. Strategies: allow learners to discuss in their home language before writing in English; use visual supports, realia, and demonstrations alongside verbal explanations; accept code-switching in class discussion; and assess conceptual understanding separately from language accuracy during CBA.

## ASAL Region Learners

Learners from Arid and Semi-Arid Lands face compounding challenges: frequent school absences due to drought, livestock migration, or family displacement; limited prior school experience; and under-resourced schools with high teacher turnover. For these learners: use community-relevant examples and contexts (pastoralism, water management, traditional ecological knowledge) to connect curriculum content to lived experience; build strong peer learning structures so that learners who miss class can catch up through peers; and avoid penalising absence in CBA records — focus on demonstrated competency when the learner is present.
        `,
      },
      {
        id: 3,
        title: 'Differentiated Instruction',
        duration: 12,
        type: 'video',
        completed: false,
        content: `
# Differentiated Instruction

Differentiated instruction means deliberately varying what you teach, how you teach it, and how you assess it in response to learner readiness, interest, and learning profile. In a CBC classroom of 50 learners, full individual differentiation is unrealistic — but group-level differentiation is both practical and powerful.

## Three Dimensions of Differentiation

**Differentiate by content**: What learners are asked to read, watch, or engage with. Advanced learners work with more complex texts or secondary sources. Learners who need more support work with simplified vocabulary, more visual materials, or manipulatives.

**Differentiate by process**: The activities through which learners make sense of the content. A mixed-ability class can all be working toward the same SLO while doing different tasks. One group sorts picture cards, another writes sentences, a third creates a labelled diagram — all demonstrating the same competency at different levels of abstraction.

**Differentiate by product**: The way learners demonstrate competency. Drawing, writing, oral explanation, building a model, performing a role-play — these are all valid demonstrations of a competency. In CBC, where the SLO specifies the competency rather than the format, you have legitimate flexibility here.

## Practical Group Differentiation in Large Classes

Divide your class into three groups based on exit ticket data — not fixed ability groups but responsive groups that change as learner readiness changes. While you work with the "approaching expectation" group directly, the other two groups work on self-directed tasks that you have prepared in advance:
- **EE/ME group**: An extension task applying the competency in a new context.
- **AE group**: The direct instruction group — you teach them using concrete examples, then release them to practise.
- **BE group (if present)**: Pair them with ME peers for guided peer support on a structured worksheet.

Rotate your direct instruction attention across groups every two to three lessons so that no group feels labelled or overlooked.

## Low-Resource Differentiation Strategies

You do not need printed worksheets for every group. Effective low-resource options:
- Write different tasks on the board in three columns, with each column corresponding to a coloured card on learner desks.
- Use the same worksheet but mark some questions as "must do" and others as "challenge" — different learners progress to different points.
- Use graduated questioning: ask the same open question, then follow up with simpler or more complex probes depending on the learner's response.
        `,
      },
      {
        id: 4,
        title: 'Universal Design for Learning in Low-Resource Settings',
        duration: 11,
        type: 'reading',
        completed: false,
        content: `
# Universal Design for Learning in Low-Resource Settings

Universal Design for Learning (UDL) is an evidence-based framework that originated in architecture — the idea that a building designed with ramps and wide doorways from the start serves everyone better than a building retrofitted with accessibility features later. Applied to education, UDL means designing lessons from the outset to be accessible to the widest range of learners, rather than adapting them after the fact for individuals.

## The Three UDL Principles

**1. Multiple Means of Representation**: Present information in more than one format. In a Kenyan classroom, this means: write key vocabulary on the board AND speak it aloud AND provide a visual (diagram, picture, realia). Do not rely solely on the textbook. Where the textbook contains abstract or culturally unfamiliar examples, supplement with local, concrete ones.

**2. Multiple Means of Action and Expression**: Allow learners to demonstrate what they know in more than one way. A learner who cannot write fluently can still demonstrate a science competency by correctly sorting materials or verbally explaining a process. A learner with fine motor difficulties can draw rather than write. The SLO specifies the competency — not the medium.

**3. Multiple Means of Engagement**: Different learners are motivated by different things. Some thrive on competition; others shut down when put under pressure. Some are highly engaged by collaborative tasks; others prefer independent work. Varying the social structure of activities (individual, pair, group, whole-class) across a week ensures you engage all learner profiles at some point.

## UDL Without Extra Resources

Many teachers assume UDL requires specialist materials. In reality, the most powerful UDL moves cost nothing:
- **Use local materials as realia**: Seeds, stones, leaves, fabric, packaging — all can represent mathematical, scientific, or social concepts.
- **Allow oral responses alongside written ones**: An oral explanation from a strong verbal learner is valid formative evidence.
- **Seat learners strategically**: Putting a visually impaired learner near the board, or pairing an EAL learner with a bilingual peer, costs nothing.
- **Build in movement**: Standing up to respond, moving to different stations, or grouping learners who share a view — kinesthetic engagement is free.

## Inclusive Classroom Environment

Physical layout matters. Where possible: arrange desks so that all learners can see the board; create clear pathways for learners who use mobility aids; use wall displays in both English and the dominant local language; and include learner work on the walls from a wide range of performance levels — not only the highest-quality work.
        `,
      },
      {
        id: 5,
        title: 'Creating an Inclusive Classroom',
        duration: 10,
        type: 'activity',
        completed: false,
        content: `
# Creating an Inclusive Classroom: Reflection and Planning Activity

This activity helps you audit your current classroom for inclusion and create a concrete action plan.

## Activity 1: Classroom Barrier Audit

Think about your current classroom and respond honestly to the following:

1. Can every learner clearly see the board? If not, what prevents this and what can you change?
2. Do you have any learners who struggle to hear clearly during instruction? What accommodations are currently in place?
3. Are there learners who speak a home language other than the language of instruction? How do you currently support their comprehension?
4. Which learners consistently end up in the "BE" pile on exit tickets? What do you know about the specific barriers they face?
5. How do you currently signal to learners that asking for help is acceptable and will not result in embarrassment?

## Activity 2: Differentiation Planning Template

Choose an upcoming lesson. Complete this planning table before you teach it:

| Group | Readiness Level | Task | Materials Needed | Teacher Support |
|-------|-----------------|------|-----------------|-----------------|
| Group 1 | EE/ME — ready to extend | [Write your extension task] | [List] | Independent with occasional check-in |
| Group 2 | AE — approaching | [Write your practice task] | [List] | Direct instruction for 10 minutes |
| Group 3 | BE — below | [Write your re-teaching task] | [List] | Peer support + teacher follow-up |

## Activity 3: One Inclusion Commitment

Write one specific, concrete change you will make to your teaching practice in the next two weeks to improve inclusion for a learner or group of learners you have been struggling to reach. Be specific: "I will seat Amina closer to the board" is more useful than "I will be more inclusive."

## Reflection

After teaching the differentiated lesson, ask yourself:
- Did each group complete their task meaningfully?
- Which group needed more support than I anticipated?
- What evidence do I have that the targeted learners made progress?
- What would I change next time?
        `,
      },
      {
        id: 6,
        title: 'Inclusive Teaching Quiz',
        duration: 5,
        type: 'quiz',
        completed: false,
        content: `
# Knowledge Check: Inclusive Teaching Practices

Test your understanding of inclusive education principles and strategies in the Kenyan CBC context.

**Question 1:** Which Kenyan policy framework explicitly commits to eliminating barriers to participation for learners in ASAL regions?

a) The CBC Curriculum Framework (2017) only
b) The Constitution of Kenya (2010) only
c) The National Education Sector Plan (NESP), which targets geographic marginalisation alongside disability and gender
d) The KNEC Assessment Framework

**Answer:** c) The National Education Sector Plan (NESP), which targets geographic marginalisation alongside disability and gender

---

**Question 2:** A Grade 5 teacher has a class of 52 learners. Three are EAL learners from a pastoralist community whose first language is Borana. What is the most practical inclusive strategy?

a) Seat them at the back so they do not slow down the rest of the class
b) Allow them to discuss concepts in Borana before writing in English, and use visual supports alongside verbal explanations
c) Refer them immediately to a special school
d) Give them easier tasks than the rest of the class so they feel successful

**Answer:** b) Allow them to discuss concepts in Borana before writing in English, and use visual supports alongside verbal explanations

---

**Question 3:** In UDL, "multiple means of action and expression" means:

a) Teaching the same concept three times in a row
b) Giving learners different exams
c) Allowing learners to demonstrate competency in more than one way (writing, drawing, speaking, building)
d) Using three different textbooks

**Answer:** c) Allowing learners to demonstrate competency in more than one way (writing, drawing, speaking, building)

---

**Question 4:** What is the key risk of using fixed ability groups in a CBC classroom?

a) It costs too much money to prepare different materials
b) It contradicts the CBC philosophy and can entrench low expectations, making "below expectation" a permanent label rather than a temporary state
c) It makes lesson planning too complicated
d) The CBC framework does not allow any grouping

**Answer:** b) It contradicts the CBC philosophy and can entrench low expectations, making "below expectation" a permanent label rather than a temporary state

---

**Question 5:** A learner with partial hearing impairment joins your Grade 3 class. Which of the following is the most immediately practical accommodation?

a) Request a full sign language interpreter before making any other changes
b) Seat the learner near the front, face the class when speaking, and write key instructions on the board alongside saying them aloud
c) Move the learner to a special unit school
d) Ask the learner to sit at the back with a peer who will repeat everything

**Answer:** b) Seat the learner near the front, face the class when speaking, and write key instructions on the board alongside saying them aloud
`,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Module 5 — Digital Integration in CBC
  // ---------------------------------------------------------------------------
  {
    id: 5,
    title: 'Digital Integration in CBC',
    description: 'Integrate technology effectively into your CBC teaching practice — practical strategies for realistic Kenyan school settings.',
    category: 'technology',
    difficulty: 'intermediate',
    duration: 60,
    progress: 0,
    icon: 'DIG',
    objectives: [
      'Understand Kenya\'s Digital Literacy Programme (DLP) and its CBC connection',
      'Select appropriate free digital tools for your available technology level',
      'Use WhatsApp and SMS effectively for parent communication and learner support',
      'Access offline resources through the Kenya Education Cloud (KEC)',
      'Design a technology-enhanced lesson that works with one smartphone and a class of 50',
    ],
    prerequisites: ['CBC Fundamentals'],
    lessons: [
      {
        id: 1,
        title: 'Technology and CBC in Kenya',
        duration: 10,
        type: 'video',
        completed: false,
        content: `
# Technology and CBC in Kenya

Digital Literacy is one of CBC's seven core competencies. Yet the reality of technology access in Kenyan schools varies enormously — from well-resourced private schools with laptop trolleys and reliable Wi-Fi, to rural public schools where the teacher's smartphone is the only connected device in the classroom. Effective digital integration in CBC means working thoughtfully within your actual context, not an imagined one.

## Kenya's Digital Literacy Programme (DLP)

The Digital Literacy Programme, launched by the Government of Kenya in 2016, aimed to equip every public primary school learner with a tablet device. Implementation has been uneven — distribution has been phased and not all schools have received or maintained their devices. However, the DLP established an important principle: digital access is a right for Kenyan learners, not a privilege, and it is the teacher's role to develop digital competencies even in low-resource settings.

## What CBC Expects of Digital Integration

The CBC curriculum framework does not require that every lesson uses technology. It requires that learners progressively develop Digital Literacy as a competency — meaning they should, over time, learn to use digital tools to access information, create content, communicate, and solve problems responsibly. This development happens through regular, purposeful encounters with technology, however modest.

## Realistic Technology Tiers in Kenyan Schools

**Tier 1 — Teacher smartphone only**: A very common situation. Your smartphone can project video via a data projector or be shared in small groups. You can photograph learner work for portfolios. WhatsApp and SMS enable parent communication and homework support.

**Tier 2 — Shared tablet or computer lab**: Scheduled access allows for structured digital literacy lessons. Focus on practical tasks: typing, internet research, creating simple documents or presentations.

**Tier 3 — Laptop trolley or 1:1 devices**: Available mainly in private schools and well-resourced public urban schools. Enables more ambitious project-based digital work.

Whatever your tier, the principles of good digital integration remain the same: technology serves the SLO, not the other way around.
        `,
      },
      {
        id: 2,
        title: 'Digital Tools for Kenyan Teachers',
        duration: 12,
        type: 'reading',
        completed: false,
        content: `
# Digital Tools for Kenyan Teachers

The best digital tool is one you will actually use, that your learners can access, and that serves your learning objectives. This lesson focuses on free, low-bandwidth, or offline tools appropriate for Kenyan school contexts.

## The Kenya Education Cloud (KEC)

The Kenya Education Cloud, developed by the Kenya Institute of Curriculum Development (KICD), is one of the most important and underused resources available to CBC teachers. It contains digitised CBC curriculum materials, lesson plans, videos, and learner resources aligned to the Kenyan curriculum — all freely accessible and many available offline once downloaded. Visit kec.kicd.ac.ke or install the KEC mobile app. In low-bandwidth environments, download resources at home or in town and use them offline in the classroom.

## WhatsApp for Education

WhatsApp is the most widely used communication platform in Kenya and requires minimal data. Practical applications:
- **Class parent group**: Share weekly learning updates, homework, and CBC explanation videos. This directly addresses the common challenge of parents not understanding CBC.
- **Teacher professional learning community**: Share lesson plans, assessment templates, and teaching tips with colleagues at your school or across schools.
- **Learner homework support** (where learners have access): Send a daily voice note with a question to stimulate reflection. Learners respond with voice notes — developing Communication and Collaboration digitally.

Use WhatsApp groups deliberately and set clear norms: school hours only, no unrelated forwarded content, and confirm receipt of important messages with a simple tick system.

## Free Offline Apps Worth Installing

- **Khan Academy Kids** (for Lower Primary): Offline mode available. Strong literacy and numeracy content aligned to competency development.
- **Google Arts and Culture** (for Upper Primary and JSS): Offline packs available. Rich visual content for Social Studies, Creative Arts, and Citizenship education.
- **Wikipedia offline via Kiwix**: Entire Wikipedia available offline in English and Kiswahili. Excellent for Upper Primary and JSS research tasks without needing internet access.
- **GeoGebra** (for mathematics, JSS): Free, offline-capable graphing and geometry tool.

## Using Your Smartphone as a Teaching Tool

A smartphone can function as:
- A document camera (photograph and display learner work using a projector)
- A timer for structured activities
- An audio recorder for capturing learner oral presentations as portfolio evidence
- A video player for CBC teaching videos from KICD's YouTube channel or downloaded KEC resources
- A calculator and measurement tool for mathematics and science

## Low-Bandwidth Strategies

If your school has internet access but it is slow or unreliable: download resources before class rather than streaming; use Google Docs offline mode for collaborative writing tasks; and avoid platforms that require continuous connectivity (live streaming, video calls) unless your bandwidth is stable.
        `,
      },
      {
        id: 3,
        title: 'Designing Technology-Enhanced Lessons',
        duration: 12,
        type: 'activity',
        completed: false,
        content: `
# Designing Technology-Enhanced Lessons

A technology-enhanced lesson is not one where technology is the centrepiece — it is one where technology makes the learning better than it would have been without it. This activity walks you through a planning process for two realistic lesson scenarios.

## The SAMR Framework (Adapted for Kenyan Contexts)

SAMR describes four levels of technology integration:

- **Substitution**: Technology replaces a non-digital tool with no functional change (writing on a tablet instead of paper). Lowest impact.
- **Augmentation**: Technology replaces a tool and adds some improvement (using a calculator to check mental arithmetic answers with immediate feedback).
- **Modification**: Technology allows significant task redesign (learners record and edit a short video explanation of a concept instead of writing an essay).
- **Redefinition**: Technology enables tasks that were previously impossible (learners video-call a farmer in a different county to ask about climate change effects on their crops).

In most Kenyan classrooms, Augmentation is a realistic and valuable target. Do not feel pressure to reach Redefinition — an Augmentation that actually happens is worth more than a Redefinition that does not.

## Lesson Design Activity 1: Tier 1 (One Smartphone)

**SLO**: Learner can describe the stages of the water cycle and explain how human activity affects it.

Your task: Design a 40-minute lesson using only your smartphone and no projector. Consider:
1. Which stages of the lesson benefit most from the smartphone? (video, photography, audio)
2. How will 50 learners access the content from one device? (small group rotation, whole-class viewing in a circle, photograph displayed on the board via cable)
3. What is the risk if the battery dies at minute 20? What is your non-digital backup?

## Lesson Design Activity 2: Tier 2 (Computer Lab, 1 Computer per 4 Learners)

**SLO**: Learner can use the internet to find two reliable sources of information on a given topic and explain why they are reliable.

Your task: Design a structured research lesson. Consider:
1. How will you teach learners to evaluate source reliability? What criteria will you give them?
2. How will you manage the class so that all groups are productively engaged?
3. What is the output — what will learners produce to demonstrate the SLO?
4. How will you assess reliability-evaluation as a competency?

## Reflection Questions

After completing your lesson designs:
- At which SAMR level does each lesson sit?
- What specific Digital Literacy competency is developed?
- What would prevent this lesson from running? What is your contingency?
        `,
      },
      {
        id: 4,
        title: 'Teaching Digital Literacy as a CBC Competency',
        duration: 13,
        type: 'video',
        completed: false,
        content: `
# Teaching Digital Literacy as a CBC Competency

Digital Literacy in CBC is not about being able to operate a device. The curriculum framework defines it as the ability to use digital technologies responsibly and effectively to access, create, evaluate, and communicate information. This lesson explores how to develop this competency progressively across the CBC levels.

## Digital Literacy Progression by CBC Level

**Pre-Primary (PP1–PP2)**: Learners are introduced to digital devices as objects in the world. They can identify a phone, tablet, or computer by name, understand that devices are tools (not toys), and begin to see that information can come from a screen as well as a book. No hands-on device use is required at this stage.

**Lower Primary (Grades 1–3)**: Learners begin supervised interaction with devices. Key competencies: turning a device on and off safely, touching and scrolling, finding a pre-set educational app, and understanding that the internet contains information. The Kenya Digital Literacy Programme tablets, where available, target this level.

**Upper Primary (Grades 4–6)**: Learners use devices more independently for learning tasks. Key competencies: typing basic text, conducting a simple internet search, distinguishing between reliable and unreliable sources, creating a simple digital document or drawing, and understanding online safety (not sharing personal information, recognising inappropriate content).

**Junior Secondary (Grades 7–9)**: Learners apply digital skills for research, creation, and communication. Key competencies: structured internet research with source evaluation, creating presentations or digital reports, using spreadsheets for data, understanding cybersecurity basics, and critically analysing digital media — including social media — for bias and misinformation.

## Teaching Online Safety in the Kenyan Context

Online safety is not a once-a-year lesson — it should be woven into every digital activity. Key messages appropriate for Upper Primary and JSS:
- Your personal information (name, school, location, photo) should never be shared online with strangers.
- If something online makes you feel uncomfortable, tell a trusted adult.
- Not everything you read online is true. Check information using two or three sources.
- M-Pesa scams and other digital fraud are real and target young people. Recognise the signs.

## Assessment of Digital Literacy

In CBA, Digital Literacy is assessed through observation and product assessment. Observe learners during device use: Can they navigate independently? Do they use devices responsibly? For product assessment: evaluate the quality and reliability of sources cited in a research task; assess the clarity and accuracy of a digitally-created presentation; review the appropriateness of a message composed and sent during a supervised communication activity.
        `,
      },
      {
        id: 5,
        title: 'Overcoming Technology Challenges',
        duration: 8,
        type: 'reading',
        completed: false,
        content: `
# Overcoming Technology Challenges in Kenyan Schools

The gap between the vision of digital integration in CBC and the daily reality of many Kenyan schools is real. This lesson addresses the most common challenges directly and practically.

## Challenge 1: Unreliable or No Internet Access

**Practical response**: Build an offline resource library. Download KEC materials, Khan Academy content packs, Wikipedia via Kiwix, and relevant YouTube videos when you have connectivity (at home, in town, or using a colleague's hotspot). Save these to a USB drive or your phone's SD card. An offline library of 10–15 well-chosen resources will serve most CBC units at your level without any internet dependency in the classroom.

## Challenge 2: Power Outages

**Practical response**: Charge devices overnight and use battery-efficient settings (reduced screen brightness, airplane mode when not using Wi-Fi). Plan digital activities for the first half of the school day when battery levels are highest. Always have a non-digital version of the lesson ready. Never design a lesson where technology is the only path to the SLO.

## Challenge 3: Learners Lack Device Access at Home

**Practical response**: Do not assume digital homework is possible. If you assign a task that requires a device, ensure it can be completed using the school's devices during free periods or lunch. For parent communication, use SMS and WhatsApp rather than assuming learners can relay messages independently — a significant number of Upper Primary and JSS learners do not have their own phones.

## Challenge 4: Teacher Confidence with Technology

**Practical response**: You do not need to be an expert. Start with one tool and master it before adding another. WhatsApp parent communication is a powerful, high-impact starting point that requires minimal technical skill. Add the KEC app next. Within one term of consistent use, your confidence will grow significantly. Find a technology-confident colleague and agree to exchange skills: you offer them something from your professional strengths in return.

## Challenge 5: Learner Misuse of Devices

**Practical response**: Establish clear device protocols from the first lesson: devices face up on the desk and are only touched when the teacher instructs; social media and games are not permitted during school hours; all device activity is visible to the teacher. Make these rules part of the lesson contract, not punitive rules — frame them as professional digital citizenship norms that learners will need in future work environments.
        `,
      },
      {
        id: 6,
        title: 'Digital Integration Practice Quiz',
        duration: 5,
        type: 'quiz',
        completed: false,
        content: `
# Knowledge Check: Digital Integration in CBC

Test your understanding of integrating technology effectively in your CBC classroom.

**Question 1:** The Kenya Education Cloud (KEC) is developed by which institution, and what is its primary value for low-bandwidth schools?

a) It is developed by Microsoft Kenya; its value is free Office software
b) It is developed by KICD; its value is CBC-aligned curriculum materials that can be downloaded and used offline
c) It is developed by the Ministry of ICT; its value is free internet access in schools
d) It is developed by Safaricom; its value is M-Pesa integration for school fees

**Answer:** b) It is developed by KICD; its value is CBC-aligned curriculum materials that can be downloaded and used offline

---

**Question 2:** A teacher has one smartphone and no projector. Which is the most effective way to use it to develop Digital Literacy as a CBC competency for 50 Upper Primary learners?

a) Keep the phone on the teacher's desk and only use it for the teacher's personal planning
b) Rotate small groups of 5 learners to view a short educational video while the rest work on a related written task, then debrief as a class
c) Put the phone away — technology integration is not possible without a projector
d) Let learners take turns using the phone freely during free time

**Answer:** b) Rotate small groups of 5 learners to view a short educational video while the rest work on a related written task, then debrief as a class

---

**Question 3:** In the SAMR model, which level best describes a learner creating a short recorded oral explanation of a concept instead of writing an essay?

a) Substitution — it replaces writing with no added value
b) Augmentation — it adds voice but is essentially the same task
c) Modification — it significantly redesigns the task, adding audio dimension and self-monitoring
d) Redefinition — it was completely impossible before

**Answer:** c) Modification — it significantly redesigns the task, adding audio dimension and self-monitoring

---

**Question 4:** Which Digital Literacy competency is most directly developed when Grade 6 learners evaluate the reliability of two internet sources on the same topic?

a) Typing speed and accuracy
b) Critical evaluation of digital information — distinguishing reliable from unreliable sources
c) Device maintenance and care
d) Online communication etiquette

**Answer:** b) Critical evaluation of digital information — distinguishing reliable from unreliable sources

---

**Question 5:** A power outage occurs 15 minutes into a technology-enhanced lesson. What does good lesson planning require?

a) Cancel the lesson and send learners to the library
b) A non-digital backup version of the lesson that can be delivered without devices
c) Reschedule the technology component to a different day and do nothing today
d) Ask learners to use their personal phones instead

**Answer:** b) A non-digital backup version of the lesson that can be delivered without devices
`,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Module 6 — Junior Secondary CBC (Grades 7–9)
  // ---------------------------------------------------------------------------
  {
    id: 6,
    title: 'Junior Secondary CBC',
    description: 'Navigate the current Grade 7–9 Junior School curriculum designs, classroom assessment and the transition conversation towards Senior School.',
    category: 'curriculum',
    difficulty: 'intermediate',
    duration: 55,
    progress: 0,
    icon: 'JSS',
    objectives: [
      'Use the current KICD Grade 7–9 learning-area designs instead of a fixed generic subject list',
      'Explain the purpose of Pre-Vocational and Technical Education in JSS',
      'Design learner-centred activities for JSS integrated topics',
      'Use classroom evidence and current KNEC guidance when planning assessment',
      'Navigate the transition from Upper Primary to Junior Secondary',
    ],
    prerequisites: ['CBC Fundamentals'],
    lessons: [
      {
        id: 1,
        title: 'Junior Secondary: Overview and Structure',
        duration: 12,
        type: 'video',
        completed: false,
        content: `
# Junior Secondary: Overview and Structure

Junior Secondary School (JSS) represents the fourth level of Kenya's CBC pathway, spanning Grades 7, 8, and 9. The first JSS cohort entered Grade 7 in January 2023, having completed six years of CBC primary education. This transition marked one of the most significant structural changes in Kenyan education in decades — and created immediate challenges for teachers, many of whom were trained under the 8-4-4 system.

## Why JSS Was Created

Under the former 8-4-4 structure, the transition from primary to secondary school was strongly associated with the KCPE (Kenya Certificate of Primary Education) examination and Form 1 placement. Junior School is part of the competency-based structure described in the BECF, with a broad programme before Senior School pathway decisions. JSS is intended to:

- Extend the learner-centred, competency-based approach from primary school into the early secondary years
- Introduce vocational and pre-technical education before learners specialise in Senior Secondary
- Support a more continuous learning journey than the former KCPE-to-Form 1 transition
- Ensure learners experience a broad curriculum before choosing a Senior Secondary pathway

## The CBC Pathway Position of JSS

JSS sits between Upper Primary (Grades 4–6) and Senior Secondary (Grades 10–12). It is:
- **Not equivalent to Forms 1–3** in the old 8-4-4 system, despite occurring at similar ages
- **A continuation of CBC**, not the beginning of a new educational philosophy
- **Bridge and exploration**: learners consolidate primary competencies and begin exploring vocational and technical interests that will inform their Senior Secondary pathway choice

## Administrative Context for Teachers

Teachers working in Junior School need to plan from the current grade and learning-area designs, not from a renamed Form 1–3 syllabus. Use this module as a practice aid and verify any implementation, staffing or assessment question against current KICD, Ministry of Education and KNEC communication.
        `,
      },
      {
        id: 2,
        title: 'Reading the Current Junior School Designs',
        duration: 11,
        type: 'reading',
        completed: false,
        content: `
# Reading the Current Junior School Designs

Junior School covers Grades 7, 8 and 9. Do not use a remembered list of subjects as a substitute for the current design. KICD publishes separate grade pages and learning-area designs; the current Grade 7 and Grade 9 pages list learning-area designs including Agriculture, languages, Creative Arts, Religious Education, Integrated Science, Mathematics, Pre-Technical Studies and Social Studies, with additional language options. The exact learning areas available to a learner depend on the current official design and the school programme.

## A source-first planning routine

1. Open the KICD page for the grade you teach and the specific learning-area design.
2. Record the exact Learning Area, Strand, Sub-Strand and Specific Learning Outcome (SLO) wording you will use.
3. Read the suggested learning experiences, key inquiry questions, values, Pertinent and Contemporary Issues (PCIs), resources and suggested assessment in that design.
4. Adapt the experience to your learners and resources without changing the official outcome or inventing a strand.

## What integration means in practice

Integration does not mean merging every subject into one lesson or assigning a project without traceable outcomes. It means identifying a genuine connection and keeping the evidence for each learning area visible. For a school-water investigation, for example, Integrated Science might supply an observation and explanation, Mathematics might supply measurement and representation, and Social Studies might supply a community-use perspective. Each teacher still checks the relevant design and assesses the outcome they selected.

## A useful teacher record

| Field | What to record |
| --- | --- |
| Source | KICD grade, learning area and page or section |
| Intended learning | Exact SLO and observable verb |
| Experience | What learners will investigate, make, explain or decide |
| Evidence | Individual work, observation, explanation or performance |
| Response | Reteach, practise, extend or refer for support |

>> KEY: The KICD website is the starting point for the current design. If a staffroom list, textbook or AI response conflicts with it, pause and verify against the applicable official document before teaching or advising a parent.

>> TRY: Open the design for one learning area you teach. Build the five-field record above for one SLO, then ask a colleague to check that your activity and evidence still match the wording.
        `,
      },
      {
        id: 3,
        title: 'Pre-Vocational and Technical Education in JSS',
        duration: 11,
        type: 'video',
        completed: false,
        content: `
# Pre-Vocational and Technical Education in JSS

Pre-Technical Studies is one of the practical learning areas listed on the current Junior School curriculum-design pages. Implementation still requires teachers to read the applicable grade design carefully and plan safe, achievable experiences with the materials and space actually available.

## Purpose and Philosophy

The BECF places practical learning, competencies and pathways within the wider curriculum reform. This does not mean that a teacher should invent a fixed vocational sequence or promise a career outcome. Use the current Pre-Technical Studies design for the grade, and keep the purpose of each practical activity visible through its learning outcome and evidence.

## How to plan practical work safely

Do not treat the following as an official list of strands. Treat them as planning questions and verify the exact content in the current design:

- What material, tool or process does the selected outcome require learners to identify, use, explain or evaluate?
- What can be demonstrated safely with the school’s actual resources, and what needs a teacher demonstration or a non-tool alternative?
- How will every learner contribute evidence, including learners who cannot access the same physical task?
- What are the stop conditions, supervision arrangements and non-digital or low-resource fallback?

For each practical lesson, prepare a short risk check, a teacher demonstration, a learner task, an observation criterion and a clean-up routine. If a required resource is unavailable, change the experience while preserving the intended outcome, or record the limitation for discussion with the school.
        `,
      },
      {
        id: 4,
        title: 'JSS Assessment and Project Work',
        duration: 11,
        type: 'reading',
        completed: false,
        content: `
# JSS Assessment and Project Work

Assessment in Junior School should be planned from the applicable KICD learning-area design and current KNEC guidance. A project is one possible source of evidence, not a substitute for choosing a method that matches the intended performance.

## The JSS Assessment Framework

Teachers collect evidence against the specific learning outcomes for each learning area. Use observation, questioning, practical performance, work samples, oral explanation, portfolios and other tools identified in the relevant guidance. Describe performance with observable criteria and document the instructional response; do not present a classroom rubric as a national KNEC score table unless the applicable KNEC document requires that format.

At the end of Grade 9, KNEC administers the Kenya Junior School Education Assessment (KJSEA). KJSEA is distinct from the Kenya Primary School Education Assessment (KPSEA) at Grade 6 and from the former KCPE. Current KNEC regulations report KJSEA performance through four broad levels with two actual performance levels within each. Consult the current regulations and circulars for national assessment details.

## The Role of Project Work in JSS CBA

Projects can provide useful evidence in practical and inquiry-based learning when they are explicitly linked to selected outcomes. They can show sustained effort, practical skill, collaboration and revision, but a project should not be treated as automatically better than observation, questioning, a work sample or another suitable method.

## Planning Effective JSS Projects

A strong JSS project has four elements:

**1. Clear SLO alignment**: Every project should be traceable to one or more SLOs. Before designing the project, identify which SLOs it will assess and write the rubric before learners begin.

**2. Authentic context**: A Grade 8 investigation into improving a school garden can create a meaningful context when it is linked to outcomes in the relevant design. The context is useful because it gives learners a reason to measure, explain, test or recommend — not because every project is automatically better than written work.

**3. Staged milestones**: Break the project into checkpoints — plan, draft/prototype, review, final product. Assess at each stage. This prevents the "all-nighter before submission" pattern that produces low-quality work.

**4. Learner reflection**: Invite a short written or oral reflection on what went well, what was difficult, and what the learner would do differently. Treat it as evidence only when it is linked to a selected outcome or competency criterion.

## Recording Project Evidence

Use an analytic rubric with criteria specific to the selected outcome. Keep the brief, milestone evidence, observation notes, learner product and feedback together so another teacher can understand the judgement. Follow the school’s current record-keeping and KNEC submission instructions; do not assume that one project score determines a learner’s reported performance.
        `,
      },
      {
        id: 5,
        title: 'Supporting the Grade 7 Transition',
        duration: 10,
        type: 'activity',
        completed: false,
        content: `
# Supporting the Grade 7 Transition

The transition from Upper Primary (Grade 6) to Junior School (Grade 7) can bring a new environment, new teachers, a wider curriculum and higher expectations of independence. The first term is an opportunity to learn what support learners need as they adjust to new routines.

## What Makes the CBC Transition Different

The former KCPE-to-Form 1 transition created a clear institutional break. In the competency-based structure, teachers should use available transition information alongside a fresh, low-stakes diagnostic task. Do not assume that a record or a new assessment tells the whole story about a learner.

## Activities for Supporting Transition

**Activity 1: Transition Diagnostic Assessment**

In the first two weeks of Grade 7, conduct a diagnostic assessment to establish where each learner is on the key competencies for your learning area. Do not assume that Grade 6 CBA records accurately reflect current readiness — learners may have made progress, regressed, or been assessed inconsistently. A short, low-stakes diagnostic task (not a graded test) gives you fresh evidence on which to base your differentiation planning.

**Activity 2: Classroom Norms Co-Construction**

In JSS, learners are old enough to participate in establishing classroom norms. In the first lesson, discuss: What does a good JSS classroom look like, sound like, and feel like? What are our responsibilities to each other? Record the agreed norms and post them on the wall. Revisit them after two weeks to reflect on how well the class is living up to them. This directly develops the Citizenship core competency.

**Activity 3: Parent Orientation on JSS**

Parents may have questions about Junior School, KJSEA, classroom assessment and progression. Prepare a short, source-linked summary of the JSS structure, what your learning area covers, how evidence is gathered and how families can support learning at home. Mark any current placement or assessment detail that needs confirmation from the school or an official circular.

## Reflection Questions for Teachers

After the first month of Grade 7:
- Which learners appear to be struggling with the transition socially or academically?
- What specific support can you put in place in the next two weeks?
- What information from Grade 6 CBA records (if available) has proved useful, and what gaps exist?
        `,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Module 7 — CBC Lesson Planning Mastery
  // ---------------------------------------------------------------------------
  {
    id: 7,
    title: 'CBC Lesson Planning Mastery',
    description: 'Master backwards design for CBC: from Specific Learning Outcomes to engaging activities and rubric-aligned assessment.',
    category: 'pedagogy',
    difficulty: 'beginner',
    duration: 50,
    progress: 0,
    icon: 'LP',
    objectives: [
      'Apply backwards design to write CBC lesson plans',
      'Write clear, observable Specific Learning Outcomes (SLOs)',
      'Design activities that build the 7 core competencies',
      'Include meaningful differentiation in every lesson plan',
      'Create aligned assessment tasks for each SLO',
    ],
    prerequisites: ['CBC Fundamentals'],
    lessons: [
      {
        id: 1,
        title: 'Backwards Design: Start with the End in Mind',
        duration: 11,
        type: 'video',
        completed: false,
        content: `
# Backwards Design: Start with the End in Mind

Backwards design is the planning approach that underpins CBC lesson planning. The name describes its logic: instead of starting with what you will teach (content) and ending with a test, you start with what learners need to be able to do at the end (the competency), and work backwards to design the activities that will get them there.

## Why Backwards Design Matters for CBC

Under 8-4-4, most Kenyan teachers were trained to plan lessons by moving through the textbook chapter by chapter — content first, assessment last. CBC's shift to competency-based education requires a different planning logic. If the goal is not "complete chapter 4" but "learner can explain the relationship between rainfall patterns and vegetation zones in Kenya," then you need to plan from that goal, not from the chapter structure.

## The Three Stages of Backwards Design

**Stage 1: Identify desired results**
What should learners know, understand, and be able to do by the end of this lesson? This is your Specific Learning Outcome (SLO). It should be observable, measurable, and achievable within one lesson period.

**Stage 2: Determine acceptable evidence**
How will you know learners have achieved the SLO? What will you observe, collect, or ask them to produce? This is your assessment task. Design it before you design the activities — otherwise activities often fail to actually generate evidence of the SLO.

**Stage 3: Plan learning experiences and instruction**
Now plan the activities that will prepare learners to succeed on the assessment task. Every activity in the lesson should contribute to learners being able to demonstrate the SLO. If an activity does not contribute, cut it.

## A Common Planning Mistake to Avoid

The most frequent backwards design error is writing the SLO after planning the activities — essentially a "forwards design" disguised as backwards design. The test: if you covered up your SLO and showed your lesson plan to a colleague, would they be able to write the SLO accurately from the activities alone? If yes, your design is coherent. If no, your activities may not be aligned to your intended outcome.

## Backwards Design in the Context of CBC Curriculum Documents

The CBC curriculum design documents for each learning area provide Strand, Sub-Strand, and Specific Learning Outcome (SLO) frameworks. Your lesson plan should trace upward from the SLO to the Sub-Strand and Strand, demonstrating that your lesson sits within the broader curriculum sequence. KICD's scheme of work templates provide this structure — use them as your planning scaffold, not as a bureaucratic form to complete after teaching.
        `,
      },
      {
        id: 2,
        title: 'Writing Effective Specific Learning Outcomes',
        duration: 10,
        type: 'reading',
        completed: false,
        content: `
# Writing Effective Specific Learning Outcomes

A Specific Learning Outcome (SLO) is the foundation of a CBC lesson plan. A well-written SLO describes precisely what a learner will be able to do at the end of the lesson — not what the teacher will cover, not what the lesson is about, but what the learner will demonstrate.

## The Anatomy of a Strong SLO

A strong SLO has three elements:

**1. A measurable action verb**: The verb describes an observable behaviour. Use Bloom's Taxonomy as your guide. Avoid verbs like "know," "understand," or "appreciate" — these are not observable. Use verbs like "explain," "identify," "demonstrate," "construct," "compare," "evaluate," "design," or "apply."

**2. The specific content or concept**: What exactly are learners acting on? Be specific. "The water cycle" is too broad. "The role of evaporation and condensation in the water cycle" is precise enough to plan a single lesson around.

**3. The context or condition (where applicable)**: In what situation or with what constraints will learners demonstrate the competency? "Given a map of Kenya's rainfall zones, learner can identify three climate regions and explain one characteristic of each" is more useful for planning and assessment than "Learner can identify climate regions."

## Examples: Weak vs Strong SLOs

| Weak SLO | Strong SLO |
|----------|------------|
| Learner will know about fractions. | Learner can add two fractions with different denominators and show their working. |
| Learner will understand plant needs. | Learner can explain how light, water, and soil nutrients each support plant growth, using a diagram. |
| Learner will learn about Kenya's history. | Learner can describe two causes of the 2007–8 post-election violence and explain one long-term consequence. |
| Learner will appreciate teamwork. | Learner can demonstrate active listening by accurately summarising a partner's viewpoint before responding. |

## SLOs and Core Competencies

Every lesson SLO addresses a learning area competency, but many SLOs can be written to simultaneously address a broader CBC core competency. "Learner can present a group research finding to the class, making eye contact and responding to one question" addresses both the Social Studies SLO on research skills and the Communication and Collaboration core competency. Identify which core competency your SLO touches and make it explicit in your lesson plan — this helps you design activities that develop more than one dimension of the learner.

## How Many SLOs per Lesson?

One to two SLOs per lesson is the norm. More than two SLOs in a 40-minute period usually means either the SLOs are too broad or the lesson will be rushed. If you find yourself writing three or four SLOs, consider whether this should be split into two lessons or whether some SLOs should be moved to a preceding or following lesson.
        `,
      },
      {
        id: 3,
        title: 'Designing Activities That Build Core Competencies',
        duration: 10,
        type: 'activity',
        completed: false,
        content: `
# Designing Activities That Build Core Competencies

CBC activities should do more than deliver content — they should actively develop the seven core competencies. This does not mean every activity must address all seven simultaneously, but your weekly lesson sequence should touch multiple competencies in different lessons.

## Mapping Activities to Core Competencies

Use this planning prompt before designing each major activity: which core competency does this activity primarily develop, and how?

| Core Competency | Activity Types That Develop It |
|-----------------|-------------------------------|
| Communication and Collaboration | Group presentations, debate, collaborative writing, think-pair-share, peer teaching |
| Critical Thinking and Problem Solving | Case studies, open-ended investigations, Socratic questioning, data analysis tasks |
| Creativity and Imagination | Project design, creative writing, making/building, performance, visual art tasks |
| Citizenship | Community research, civic action projects, ethical dilemmas, current events analysis |
| Digital Literacy | Internet research tasks, creating digital content, evaluating online sources |
| Learning to Learn | Metacognitive reflection, self-assessment, study skill tasks, goal-setting activities |
| Self-Efficacy | Graduated challenge tasks, celebrating effort over outcome, "not yet" feedback culture |

## Activity Design Activity: Competency-Mapping Exercise

Take one lesson you have recently taught. For each main activity in that lesson, identify:
1. Which core competency did the activity develop?
2. How specifically did learners practise that competency? (What did they do?)
3. Was the competency explicitly named and discussed with learners, or was it implicit?

Most teachers find that their activities cluster around Communication and Collaboration and Critical Thinking, with Citizenship, Digital Literacy, and Learning to Learn receiving less attention. This awareness is the first step to designing more deliberately.

## Designing a Competency-Building Activity from Scratch

Choose a topic from your current unit. Write one SLO. Then design an activity using this structure:

- **Opening hook** (3–5 minutes): A question, image, or short stimulus that connects the topic to learners' experience.
- **Main task** (20–25 minutes): A collaborative or independent activity that directly practises the SLO. Specify: what learners produce, in what grouping, using what resources.
- **Sharing and sense-making** (5–8 minutes): Pairs or groups share key findings; teacher draws out key ideas through questioning.
- **Exit check** (3–5 minutes): A quick formative check tied directly to the SLO.

Total: approximately 35–43 minutes. Adjust for your school's lesson period length.
        `,
      },
      {
        id: 4,
        title: 'Differentiation in Lesson Planning',
        duration: 10,
        type: 'reading',
        completed: false,
        content: `
# Differentiation in Lesson Planning

Differentiation is most effective when it is planned before the lesson, not improvised during it. This lesson shows you how to build differentiation into your CBC lesson plan as a structural feature, not an afterthought.

## The Three-Level Task Design

The most practical differentiation strategy for large Kenyan classrooms is three-level task design: within the same lesson, you prepare one core task and two variations — an accessible version for learners who need more support, and an extension version for learners who are ready to go further. All three versions address the same SLO. The difference is in complexity, abstraction, and the level of scaffolding provided.

**Accessible version**: More structure, clearer instructions, visual supports, fewer variables. Example for a writing task: provide a sentence frame ("_________ happens because _________, which means _________") and a word bank.

**Core version**: The standard task as written in the curriculum design document. Clear instructions, age-appropriate complexity, no additional scaffolding.

**Extension version**: Greater complexity, more open-endedness, connection to a related concept not yet taught. Example: "Now apply this principle to a situation we have not discussed in class. What would happen if...?"

## Planning Differentiation Without Extra Preparation Time

Preparing three complete sets of materials for every lesson is not realistic. Use these low-preparation differentiation strategies instead:

- **Question tiering**: Prepare your questioning sequence in advance so that you ask accessible questions to learners who need confidence-building and more analytical questions to learners who are ready. This requires planning but no extra materials.
- **Graduated task sheets**: One task sheet with three levels marked: "must complete," "should complete," and "challenge." All learners work through in order; they stop at different points depending on pace and readiness.
- **Partner assignment**: Pair EE/ME learners with AE learners for peer support tasks. This scaffolds the AE learner and deepens the EE/ME learner's understanding through teaching.

## Writing Differentiation Into the Lesson Plan Format

The KICD lesson plan format includes a differentiation field. Do not leave it blank or fill it with a generic phrase like "weaker learners will be given extra help." Instead, specify:
- What specific accommodation or variation you will use
- Which learners (by group, not individual name) will receive it
- What additional materials or support are required

Example: "Learners in the approaching-expectation group will use the sentence frame handout and work with a partner. Learners in the exceeding-expectation group will complete the extension question on the board after the core task."
        `,
      },
      {
        id: 5,
        title: 'Assessment Alignment in Lesson Planning',
        duration: 9,
        type: 'reading',
        completed: false,
        content: `
# Assessment Alignment in Lesson Planning

Assessment alignment means that your assessment task directly and specifically measures the SLO you identified at the start of your lesson plan. Misalignment — where the SLO says one thing but the assessment measures something else — is one of the most common and consequential lesson planning errors in CBC.

## The Alignment Test

For every lesson plan, apply this three-part alignment test:

**1. SLO-Activity alignment**: Do your lesson activities give learners sufficient practice to be able to demonstrate the SLO? If learners have never been asked to explain something verbally, but your exit ticket requires a verbal explanation, there is a process-product misalignment.

**2. SLO-Assessment alignment**: Does your assessment task require learners to demonstrate exactly what the SLO describes? If your SLO says "learner can identify two causes of deforestation" but your exit ticket asks "what is deforestation?", you are assessing a lower-order skill than the SLO requires.

**3. Assessment-Feedback alignment**: Does your feedback to learners reference the SLO language? When you return marked work or provide verbal feedback, use the language of the SLO: "You have identified two causes — that meets today's SLO. For extension, can you explain why each cause leads to the effect it does?"

## Creating Aligned Assessment Tasks

Work backwards from the SLO to write the assessment task:

| SLO Verb | Aligned Assessment Task Type |
|----------|-----------------------------|
| Identify | Labelling, matching, selecting from a list |
| Explain | Short written or verbal explanation (1–3 sentences) |
| Compare | Comparison chart, Venn diagram, comparative paragraph |
| Construct / Design | Physical or drawn product, step-by-step plan |
| Evaluate | Justified written opinion, oral argument, recommendation with reasoning |
| Apply | Performance task in a new context, problem-solving scenario |

## Aligning CBA Records to Lesson Assessments

Each exit ticket, task, or observation note you collect during lessons is potential CBA evidence. When you design an exit ticket, note which SLO it assesses and file it accordingly. At the end of the term, your CBA record for each learner should be a mosaic of evidence — observations, exit tickets, work samples, and project scores — all traceable to specific SLOs. This makes your CBA reporting reliable, defensible, and genuinely informative for learners, parents, and the next teacher who receives this learner.
        `,
      },
    ],
  },

]

export function getModuleById(id: number): Module | undefined {
  return modulesData.find((m) => m.id === id)
}

export function getModulesByCategory(category: string): Module[] {
  if (category === 'all') return modulesData
  return modulesData.filter((m) => m.category === category)
}
