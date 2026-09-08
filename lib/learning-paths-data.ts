import { AI_MODULES, type ToolSection as AiModuleSection, type AiModule } from './ai-toolkit-data'

export type Track = 'core' | 'stem' | 'languages' | 'humanities' | 'leadership' | 'wellbeing'

export interface Lesson {
  id: string
  title: string
  duration: string
  videoTitle: string
  videoPoints: string[]
  reading: string
  reflectionPrompt: string
  reflectionPlaceholder: string
}

export interface LearningModule {
  id: string
  title: string
  description: string
  lessons: Lesson[]
}

export interface AssessmentQuestion {
  id: string
  question: string
  options: [string, string, string, string]
  correct: 0 | 1 | 2 | 3
  explanation: string
}

export interface Assignment {
  title: string
  context: string
  task: string
  hints: string[]
  rubric: string[]
}

export interface Program {
  id: string
  title: string
  shortTitle: string
  tagline: string
  description: string
  track: Track
  kicdAlignment: string
  hours: number
  lessons: number
  accent: 'primary' | 'accent'
  available: boolean
  launchingSoon?: boolean
  modules: LearningModule[]
  preAssessment: AssessmentQuestion[]
  postAssessment: AssessmentQuestion[]
  assignment: Assignment
  certificate: { subtitle: string; skills: string[] }
}

/* ── Program 1: CBC Foundations ────────────────────────────── */
const cbcFoundations: Program = {
  id: 'cbc-foundations',
  title: 'CBC Foundations',
  shortTitle: 'CBC Foundations',
  tagline: 'Understand CBC from the ground up',
  description: 'Master the core principles of Kenya\'s Competency-Based Curriculum. This program covers the CBC framework, curriculum design, and how to translate policy into everyday classroom practice.',
  track: 'core',
  kicdAlignment: 'BECF and current KICD curriculum designs',
  hours: 5,
  lessons: 9,
  accent: 'primary',
  available: true,
  modules: [
    {
      id: 'm1',
      title: 'The CBC Framework',
      description: 'Understand what CBC is, why it was introduced, and its guiding philosophy.',
      lessons: [
        {
          id: 'l1',
          title: 'What is CBC and Why It Matters',
          duration: '15 min',
          videoTitle: 'Introduction to the Competency-Based Curriculum',
          videoPoints: [
            'How the BECF describes Kenya’s curriculum reform',
            'The difference between a curriculum framework and a grade design',
            'How knowledge, skills, values and attitudes appear in classroom evidence',
            'How to move from a topic list to an observable learner performance',
          ],
          reading: `## Two learners, one question

Wanjiru can recite the stages of the water cycle without pausing for breath. Baraka cannot recite them as fluently, but when the school's rain tank ran dry in February, he explained to his classmates why the county was seeding clouds, and what that had to do with evaporation. Under an examination that asks "List the stages of the water cycle," Wanjiru wins. Under almost any real situation either child will ever face, Baraka is the one who has learned.

The Basic Education Curriculum Framework (BECF) describes the reform vision as an **engaged, empowered and ethical citizen**. A competency is not a softer alternative to knowledge. It is **knowledge, skills, values and attitudes working together in a real situation**. Baraka knows the water cycle; what makes the evidence stronger is that he connects the knowledge to an explanation and a decision.

## Why the reform happened

The reform is described in the BECF as a move towards nurturing every learner’s potential. The framework sets out a national vision, mission, values, core competencies, curriculum structure, learning outcomes, learning experiences and assessment principles. The grade and learning-area curriculum designs then translate that framework into specific outcomes, suggested experiences, inquiry questions, values, Pertinent and Contemporary Issues (PCIs), resources and assessment ideas.

That distinction matters for a teacher: the framework explains the architecture; the current design for your grade and learning area is the document you use to select the exact outcome and sequence.

The structural change from 8-4-4 toward a competency-based structure (with early years, middle school, and senior school pathways) is the visible part. The invisible part is the one that lives or dies in your classroom: the shift in what counts as evidence of learning.

| Question the old system asked | Question CBC asks |
| --- | --- |
| What does this child know? | What can this child *do* with what they know? |
| Did we cover the syllabus? | Did the learners develop the outcome? |
| Who ranked highest? | What does each learner need next? |

>> KEY: CBC is not a new set of topics to cover. It is a new definition of success. Content still matters deeply, but content is now the raw material of competence, not the finish line.

## What changes in your Tuesday

Be suspicious of any description of CBC that stays abstract. Concretely, a competency-focused teacher does three things differently: they state outcomes as observable actions, they give learners genuine work that requires thinking (not just remembering), and they treat assessment as information rather than judgement. Everything else in this program builds on those three habits.

A common misconception is that CBC means projects, posters, and group seating, and that direct teaching is now forbidden. Wrong on both counts. A brilliant five-minute explanation is still brilliant teaching. The test is what happens *after* the explanation: do learners then use the idea to reason, make, decide, or explain, or do they copy it down and wait for the next one?

>> THINK: Imagine national examinations were abolished tomorrow. Which parts of your current teaching would you keep because they genuinely build capability, and which parts exist only because an exam is watching? Be honest. That second list is where CBC is inviting you to change.

>> TRY: In your next lesson, replace one "recall" question with a "use it" question. Instead of "What are the stages of the water cycle?" ask "Our school tank ran dry in February. Use the water cycle to explain why, and tell me one thing the school could do about it." Notice who comes alive.`,
          reflectionPrompt: 'Identify the single most exam-shaped habit in your current teaching, something you do mainly because an examination is watching. What would you replace it with if capability, not marks, were the only measure? Be specific about the lesson where you will try the replacement.',
          reflectionPlaceholder: 'My most exam-shaped habit is...\nIf capability were the only measure, I would instead...\nI will try this in my lesson on...',
        },
        {
          id: 'l2',
          title: 'The 7 Core Competencies',
          duration: '20 min',
          videoTitle: 'Breaking Down CBC\'s Core Competencies',
          videoPoints: [
            'Communication and Collaboration in the classroom',
            'Critical Thinking and Problem Solving activities',
            'Creativity and Imagination across subjects',
            'Citizenship, Digital Literacy, Learning to Learn, Self-Efficacy',
          ],
          reading: `## Seven competencies, one design problem

CBC names seven core competencies every Kenyan learner must develop: **Communication and Collaboration, Critical Thinking and Problem Solving, Creativity and Imagination, Citizenship, Digital Literacy, Learning to Learn, and Self-Efficacy**. The list is easy to memorise, and that is exactly the trap. A competency listed on the chalkboard is decoration. A competency *demanded by the task* is development. The difference between the two is the entire craft of CBC teaching.

Here is the uncomfortable rule that follows: **a task develops a competency only if the task cannot be completed without it**. Group seating does not develop collaboration if one learner can do all the work. A "creative" poster does not develop creativity if every group copies the same diagram from the textbook. Before you credit a lesson with a competency, ask: could a learner finish this task without ever using that competency? If yes, the lesson is not developing it.

## What each one looks like when it is real

- **Communication and Collaboration**: a learner explains their method to a partner who must then use it; success depends on the explanation actually working.
- **Critical Thinking and Problem Solving**: learners meet a situation where the method is *not* given and must choose, test, and justify an approach.
- **Creativity and Imagination**: the task has more than one right answer, and learners must generate options before selecting one.
- **Citizenship**: learners weigh a real local issue, the school water point, the market's plastic waste, and connect their subject knowledge to a community decision.
- **Digital Literacy**: where devices exist, learners use them to create or find and *evaluate* information, not just to consume. Where they do not, learners can still learn to question sources.
- **Learning to Learn**: learners are asked how they got an answer, what confused them, and what they would do differently, and the teacher treats those answers as seriously as the content.
- **Self-Efficacy**: tasks are pitched so that effort visibly pays off; learners experience earned success, not rescued success.

>> CASE: A Grade 5 teacher in Kisumu taught fractions with one change. Instead of demonstrating equivalence on the board, she gave each group a different chapati-sharing problem with a deliberate twist: the shares could not come out even. Groups had to decide what "fair" meant, defend their split to another group, and write one sentence on what made the problem hard. One task: critical thinking (choosing a method), communication (defending it), self-efficacy (productive struggle that resolved). No competency was written on the board. All three happened.

## The competency audit

Take any lesson plan you have taught this term and run this three-question audit:

1. Which competency does the *main activity* actually force learners to use?
2. At what moment in the lesson would I have *seen* it happening?
3. If I cannot answer the first two, what one change to the task would create that moment?

This audit is more valuable than any list. Teachers who run it weekly report that their plans change in a consistent direction: fewer activities, each demanding more.

>> THINK: Which of the seven competencies do you, as a professional adult, use least in your own working week? Teachers tend to under-design for the competencies they are least comfortable exercising themselves. Sit with that for a moment before you plan next week.

>> TRY: Run the three-question audit on tomorrow's lesson plan. If question 1 has no honest answer, change one task, not the whole plan, so that finishing it requires explaining, choosing, or creating.`,
          reflectionPrompt: 'Run the competency audit on a lesson you taught this week: which competency did the main activity genuinely force learners to use, and at what moment could you have seen it? If the honest answer is "none", redesign that one activity and describe the new version.',
          reflectionPlaceholder: 'Lesson: ...\nThe main activity forced learners to... (or honestly, it did not because...)\nThe moment I could see it: ...\nMy redesign: ...',
        },
        {
          id: 'l3',
          title: 'CBC vs 8-4-4: Key Differences',
          duration: '15 min',
          videoTitle: 'Comparing 8-4-4 and CBC: A Teacher\'s Perspective',
          videoPoints: [
            'Assessment: exams vs continuous competency evaluation',
            'Content coverage vs depth of understanding',
            'Teacher role: instructor vs facilitator',
            'The learner: passive recipient vs active constructor',
          ],
          reading: `## The comparison that actually matters

Most CBC training compares the two systems with a table, so let us start with one, then go one level deeper than the table can.

| Dimension | 8-4-4 | CBC |
| --- | --- | --- |
| Purpose of assessment | Rank learners after learning | Inform teaching during learning |
| Curriculum unit | Subjects with syllabi to cover | Strands and sub-strands with outcomes to develop |
| Evidence of success | Examination score | Demonstrated performance against criteria |
| Teacher's centre of gravity | Transmitting content | Designing and guiding experiences |
| Learner's role | Receive, retain, reproduce | Explore, apply, explain, create |

The deepest row is the first. In 8-4-4, assessment happened *after* learning and its product was a rank. In CBC, assessment happens *during* learning and its product is a decision: what does this learner need next? Educational researchers call this **assessment for learning**, and decades of evidence (most famously Black and Wiliam's research synthesis) show it produces some of the largest learning gains of any classroom intervention, especially for the lowest-attaining learners. You will spend a whole program on this later. For now, hold the distinction.

## What does NOT change

This lesson must also correct an overcorrection. CBC does **not** mean:

- **Content stops mattering.** You cannot think critically about fractions without knowing fractions. Competence is built *on* knowledge; a curriculum that abandons knowledge produces confident incompetence.
- **Direct teaching is banned.** Clear explanation, modelling, and worked examples remain essential tools. What changes is what follows them.
- **Rigour drops.** Explaining *why* an answer is right is harder than producing the answer. Done honestly, CBC raises the cognitive bar; it does not lower it.

## The ritual trap

Here is the failure mode to watch for in your own school: classrooms that perform CBC's *rituals*, learners in groups, manila paper on walls, "learner-centred" written in the scheme of work, while the *thinking* remains exactly as it was. Five learners around one desk copying one answer is 8-4-4 with the furniture rearranged. The question that cuts through every ritual is always the same: **who is doing the cognitive work?** If the answer is "the teacher" or "one learner per group", the reform has not reached that classroom yet, whatever the seating says.

>> KEY: CBC is a change in pedagogy, not a change in furniture. A teacher lecturing brilliantly and then making every learner apply the idea is more CBC than a silent groupwork lesson where no one had to think.

>> THINK: Recall one groupwork lesson you have taught or observed that produced no real thinking. What exactly went wrong, the task, the group structure, the accountability? Naming the mechanism is the first step to never repeating it.

>> TRY: Next groupwork lesson, add one line to the instructions: "Anyone in your group may be asked to explain the answer." Then actually pick the quiet ones. Watch how the group's behaviour changes when explanation can land on anyone.`,
          reflectionPrompt: 'Where in your own teaching do you see CBC rituals without CBC thinking, in your classroom, honestly, or in your school? Choose one ritual and describe how you would put the cognitive work back into it.',
          reflectionPlaceholder: 'The ritual I see most is...\nThe thinking that is missing: ...\nTo fix it I would...',
        },
      ],
    },
    {
      id: 'm2',
      title: 'Curriculum Planning in CBC',
      description: 'Learn to read and use the CBC curriculum design tools effectively.',
      lessons: [
        {
          id: 'l1',
          title: 'Strands, Sub-Strands and SLOs',
          duration: '20 min',
          videoTitle: 'Reading and Using CBC Curriculum Design Documents',
          videoPoints: [
            'How Strands organise a learning area',
            'Sub-strands as focused learning topics',
            'Writing and unpacking Specific Learning Outcomes',
            'Using the curriculum design document in lesson planning',
          ],
          reading: `## The curriculum design is a map, not a cage

Open any KICD curriculum design and you will find the same anatomy: an **essence statement** explaining why the learning area exists, **strands** (the broad organising themes), **sub-strands** (focused topics within each strand), **specific learning outcomes** (SLOs) for each sub-strand, **suggested learning experiences**, **key inquiry questions**, and links to core competencies, values, and pertinent and contemporary issues (PCIs). Most teachers read only the SLO column. The teachers who plan best read two more: the *key inquiry questions*, which hand you ready-made lesson hooks, and the *essence statement*, which tells you what the whole learning area is for, the test you should hold every lesson against.

In English, for example, "Reading" is a strand, "Reading Comprehension" a sub-strand, and an SLO under it might read: *"By the end of the sub-strand, the learner should be able to make inferences from a text read."*

## Unpacking an SLO

An SLO has three working parts, and unpacking them is a precise skill:

1. **The verb**, what the learner will *do*. This is the assessable heart. "Make inferences" demands different teaching than "identify" or "recall".
2. **The content**, what the verb operates on: a text, a number pattern, a map, a seed.
3. **The implied evidence**, what you would accept as proof. If the verb is "make inferences", the evidence must be a learner producing an inference you never taught them. A learner repeating an inference you modelled is evidence of memory, not of the outcome.

The verb deserves real attention because verbs sit at different cognitive depths. "Identify" and "list" sit low: necessary, but easy. "Explain", "compare", and "classify" sit in the middle: they require understanding. "Design", "justify", and "evaluate" sit high: they require judgement. A week of lessons whose outcomes are all low-verb is a week where nobody had to think hard. KICD's designs deliberately mix the levels; your schemes of work should preserve that mix rather than flattening everything to "identify".

### Beware the unassessable outcome

Some outcome statements feel virtuous but cannot be observed: *"appreciate the importance of fractions", "be aware of pollution"*. What does appreciation look like? How would awareness fail? If you cannot describe what evidence would show the outcome was met, and what its *absence* would look like, the outcome cannot steer a lesson. Translate it: "appreciate fractions" might become *"use fractions to solve a sharing problem and explain why the answer is fair"*. Now you can teach toward it and assess it.

>> CASE: A Grade 4 science teacher in Nyeri unpacked the SLO "classify materials according to whether they are transparent, translucent or opaque." Verb: classify, so learners must *sort and justify*, not recite definitions. Content: real materials, so she collected polythene, a glass bottle, exercise book paper, and a kiondo. Evidence: each learner places one material and says *because*. Her assessment took four minutes at the end of the lesson and told her exactly which six learners confused translucent with transparent, and that is next lesson's starter sorted.

>> KEY: The SLO is a contract with yourself: the verb tells you what learners must do, and what learners must do tells you what evidence to collect. If your activity and your evidence do not match the verb, the lesson drifts, however pleasant it feels.

>> TRY: Take one outcome from this week's scheme of work and write its three parts in the margin: verb, content, evidence-I-will-accept. If the verb is "know" or "appreciate", translate it into something a learner can visibly do.`,
          reflectionPrompt: 'Take one vague or unassessable outcome you have worked with ("appreciate...", "be aware of...", "understand..."). Translate it into an observable SLO, then state exactly what evidence you would accept that a learner has met it, and what its absence would look like.',
          reflectionPlaceholder: 'Original outcome: ...\nTranslated SLO: By the end of the lesson, learners should be able to...\nEvidence I would accept: ...\nWhat absence would look like: ...',
        },
        {
          id: 'l2',
          title: 'Designing Learner-Centred Activities',
          duration: '25 min',
          videoTitle: 'From Teacher-Centred to Learner-Centred: Practical Steps',
          videoPoints: [
            'The WHERETO framework for activity design',
            'Hands-on learning with local materials',
            'Collaborative learning structures',
            'Moving from lecture to guided discovery',
          ],
          reading: `## The question that defines learner-centredness

Forget the seating plan. A lesson is learner-centred when one question has the right answer: **who is doing the thinking?** A silent class watching a masterful explanation is teacher-centred. The same class, two minutes later, using that explanation to attack a problem the teacher has *not* solved for them, is learner-centred. The label belongs to moments, not lessons, and your job as a designer is to engineer more of those moments.

This reframing matters because the common alternative, "learner-centred means the teacher talks less", produces bad lessons. The teacher's expertise does not shrink in CBC; it relocates. It moves out of the performance and into two places: **the design of the task** and **the quality of the questions** asked while learners work.

## Designing for productive struggle

The engine of learning is what researchers call *productive struggle*: a task hard enough that learners must genuinely think, structured enough that the struggle leads somewhere. Three design principles create it:

1. **Attempt before explanation.** Pose the problem *first*. Let learners try, fail, and form questions, then explain. An explanation that answers a question learners already have lands ten times harder than one that answers a question nobody asked.
2. **Low floor, high ceiling.** Every learner can start (the floor is low); the task can stretch as far as your strongest learner can go (the ceiling is high). "Find as many ways as you can to make 24" beats "What is 4 by 6?" because both the struggling and the swift have somewhere to go.
3. **Built-in accountability.** Structure tasks so no learner can hide: think-pair-share where either partner may report, group roles that rotate, mini-whiteboards where every learner answers at once.

## The questions you ask while they work

Learner-centred teaching is mostly a questioning discipline:

- **Wait.** After asking, count three full seconds before taking an answer. Research on wait time shows answers get longer, more learners volunteer, and reasoning improves, for free.
- **Cold-call warmly.** "Hands up" hands the lesson to the same five learners every day. Choose who answers; keep the tone safe; make "I am not sure yet, come back to me" an acceptable first response and then actually come back.
- **Probe rather than confirm.** The most valuable follow-up questions are: *How do you know? Would that still work if...? Can you say that another way? Does anyone disagree?* Notice that none of these reveal whether the answer was right, which keeps everyone thinking.

>> CASE: A Standard 6 teacher in Machakos taught grammar rules by stating them, until she inverted one lesson. She gave pairs a short text and one instruction: "Find the pattern in how these five sentences begin, and write the rule yourselves." Pairs argued, tested, rewrote. Her rule, revealed at the end, confirmed what most had already constructed. Same content, same 35 minutes. The difference: thirty children built a rule instead of receiving one, and three weeks later most could still apply it.

>> THINK: In your last lesson, estimate honestly: how many minutes did *learners* spend thinking hard, not listening, not copying, thinking? If the number embarrasses you slightly, you are exactly where most good teachers start.

>> TRY: Invert one explanation this week. Pose the problem first, give pairs four minutes of attempt, collect two different approaches on the board, *then* explain. Notice how the explanation changes when it responds to their attempts.`,
          reflectionPrompt: 'Plan the inversion: choose a topic you normally open by explaining, and script the problem you will pose first, the two or three probing questions you will ask while pairs work, and how you will use their attempts in your explanation.',
          reflectionPlaceholder: 'Topic: ...\nThe problem I will pose first: ...\nProbing questions I will ask: 1. ... 2. ...\nHow I will fold their attempts into my explanation: ...',
        },
        {
          id: 'l3',
          title: 'CBC Learning Materials and Resources',
          duration: '15 min',
          videoTitle: 'Making CBC Resources Work for You',
          videoPoints: [
            'KICD-approved textbooks and supplementary materials',
            'Low-cost and locally sourced learning materials',
            'Digital resources for CBC teaching',
            'Creating your own classroom materials',
          ],
          reading: `## One test for every resource

Before this lesson gives you a single list of materials, take its only rule: **a resource is good if it makes learners think, and decorative if it does not**. A projector showing a diagram learners passively watch is decoration. A handful of beans that forces a learner to physically confront why 3 groups of 4 make 12 is technology, in the truest sense. Apply this test ruthlessly and most resource decisions make themselves.

## The textbook: servant, not master

KICD-approved textbooks are written to support the curriculum designs, not to replace them. The design document, not the textbook, defines the outcomes. Practically, this means you plan from the SLO and *then* ask what the textbook offers, rather than letting chapter order become your scheme of work. A textbook exercise is a resource like any other: sometimes the best available, sometimes beaten by three bottle tops and a good question. Teachers who let the textbook drive report "covering" more and their learners retaining less; the book sets a pace no actual class of children has ever matched.

## The free laboratory outside your window

The school compound, the market, the home: these are not backup options for under-resourced schools. They are often *better* than commercial materials, because competence means using knowledge in the real world, and they are the real world:

- **The compound**: ecosystems, measurement (perimeter of the flag area, no rulers, learners must improvise units), soil types, water drainage, data collection (count and classify vehicles passing the gate).
- **The community**: a parent who keeps bees, a fundi who uses geometry daily without naming it, a grandmother who knows the medicinal plants the science book lists abstractly. One guest with real expertise beats a week of secondhand description.
- **Improvised materials**: bottle tops for place value, sticks for angle work, flour-paste for models. Treat improvisation as a design discipline, not a hardship: the question is never "what can I find?" but "what does this *outcome* need learners to manipulate?"

## Digital, with honesty

Where devices and connectivity exist, the Kenya Education Cloud, recorded experiments, and simulations genuinely extend what you can show. Two honest cautions. First, a video can create the *feeling* of understanding without the substance; always follow viewing with a task that proves the idea transferred ("now explain it to your partner with the diagram hidden"). Second, the pedagogy shift in CBC requires no electricity whatsoever. A school with no devices and strong questioning is implementing CBC. A smart screen showing learners content they passively consume is not.

>> KEY: Resources do not have a hierarchy of prestige, textbook above beans, screen above compound. They have a hierarchy of *thinking demanded*. Choose whatever makes the cognitive work unavoidable.

>> THINK: What expertise walks past your school gate every single day, in parents, traders, artisans, elders, that your learners' textbooks describe secondhand? Why has the school never asked it in?

>> TRY: For one lesson this week, plan the resource *after* writing the SLO, asking only: "What must learners handle, see, or visit for this outcome to become real?" If the honest answer is "nothing, they need a hard question", that is also a resource decision, and a good one.`,
          reflectionPrompt: 'Audit one upcoming lesson with the thinking test: what resource does the outcome genuinely need, what would merely decorate, and is there a person, place, or object within walking distance that beats what the textbook offers? Plan exactly how learners will use it, not just see it.',
          reflectionPlaceholder: 'Lesson and SLO: ...\nWhat the outcome genuinely needs: ...\nWhat would be mere decoration: ...\nMy local resource and how learners will USE it: ...',
        },
      ],
    },
    {
      id: 'm3',
      title: 'CBC in Practice',
      description: 'Put CBC theory into action: planning, record-keeping, and parent engagement.',
      lessons: [
        {
          id: 'l1',
          title: 'Planning Your First CBC Lesson',
          duration: '20 min',
          videoTitle: 'A Step-by-Step CBC Lesson Plan Walkthrough',
          videoPoints: [
            'The CBC lesson plan format used in Kenya',
            'Introduction hooks and prior knowledge activation',
            'Activity sequencing for depth',
            'Planning for differentiation from the start',
          ],
          reading: `## Plan the ending first

Most lesson plans are written forwards: pick a topic, choose activities, and hope assessment fits at the end. Strong CBC plans are written **backwards**, a discipline known internationally as backward design (Wiggins and McTighe), and it has exactly three steps, in this order:

1. **Outcome.** What will learners be able to do? (Your SLO, verb and all.)
2. **Evidence.** What will I accept as proof, from *every* learner, not just volunteers? Decide this *before* thinking about activities.
3. **Experiences.** Now, and only now, design activities, chosen because they manufacture that evidence.

The order is the whole trick. Teachers who choose activities first end up with engaging lessons that prove nothing; the activity was chosen for its energy, not its evidence. Teachers who choose evidence first find activities almost design themselves.

## The shape of the lesson

The familiar Kenyan plan structure, introduction, development, conclusion, holds, but each part earns its place:

| Phase | Its real job | The trap to avoid |
| --- | --- | --- |
| Introduction (5-8 min) | Activate what learners already know and make them *want* the answer. The curriculum design's key inquiry questions are ready-made hooks. | "Last week we did X, today we will do Y", informs, but awakens nothing. |
| Development (20-25 min) | Learners work toward the outcome, attempt, instruction, application. Differentiation is *planned here*, not improvised. | The teacher performs while learners watch; the bell decides when thinking ends. |
| Conclusion (5-7 min) | Collect the evidence you specified in step 2, from everyone. | "Any questions? Good." Silence is not data. |

Two refinements separate adequate plans from strong ones. First, **plan for the learner who finishes in four minutes and the one who needs fourteen** before the lesson, an extension question for the first, a scaffold (a hint card, a worked first step, a peer pairing) for the second. Improvised differentiation is usually just "help the slow ones while the fast ones get bored". Second, **share success criteria**: tell learners, in their language, what a good answer will include. Better still, show a strong and a weak example and let them tell you the difference. Learners who know what success looks like start managing their own progress, which is the competency Learning to Learn, arriving by design.

>> CASE: A Grade 6 mathematics teacher in Embu planned a lesson on area of irregular shapes backwards. Evidence decided first: "each learner estimates the area of our staffroom's L-shaped floor and defends the estimate in one sentence." Only then did she pick activities: grid-paper practice, then the actual corridor with string and chalk. Her old plan for this topic had learners colouring rectangles. Same SLO on paper; an entirely different lesson, because the evidence was chosen first.

>> KEY: A lesson plan is a hypothesis: "if learners do these things, they will be able to demonstrate this outcome." The conclusion of the lesson is where you test the hypothesis. If you never collect the evidence, you are not planning, you are scheduling.

>> TRY: Write tomorrow's plan in reverse order on a single page: outcome at the top, evidence in the middle, activities last. Many teachers report this one structural change does more for their planning than any template ever did.`,
          reflectionPrompt: 'Design one lesson fully backwards and write it here: the SLO, the evidence you will collect from every learner (not volunteers), your planned extension for the fast finisher, and your planned scaffold for the learner who struggles.',
          reflectionPlaceholder: 'SLO: By the end, learners will be able to...\nEvidence from EVERY learner: ...\nExtension for the fast finisher: ...\nScaffold for the struggling learner: ...\nMain activity (chosen last): ...',
        },
        {
          id: 'l2',
          title: 'CBC Record Keeping',
          duration: '20 min',
          videoTitle: 'Keeping CBC Records Without Being Overwhelmed',
          videoPoints: [
            'What records CBC requires and why',
            'Practical anecdotal note-taking during lessons',
            'Cumulative records and portfolios',
            'Efficient record-keeping systems',
          ],
          reading: `## Records that serve teaching, not inspection

Be honest about why most records get written: because someone might check. Records written for inspection are dead paper, complete, neat, and never consulted. CBC record keeping has a different test: **a record is good if it changes a future teaching decision**. A note that tells you which six learners cannot yet regroup in subtraction changes Monday's starter. A page of ticks tells you nothing you will ever act on. Write for the first purpose and inspection takes care of itself.

## What is actually worth recording

CBC performance is described against four levels: **Exceeds expectations, Meets expectations, Approaches expectations, Below expectations**. The levels only mean something when they are anchored to a specific outcome, "Meets expectations *at making inferences from a text*", never as a general grade for a child. Three kinds of record carry almost all the value:

1. **Progress against specific outcomes.** A simple class grid, learners down the side, the term's key SLOs across the top, filled with the four levels (or initials: E, M, A, B). Ten seconds per learner per outcome, and at a glance you can see both a child's profile and an outcome the whole class missed.
2. **Anecdotal notes, for significant moments only.** Do not narrate every lesson. Record the surprising: the quiet learner who gave the best justification this term, the persistent misconception, the leap. Two sentences with a date. These notes write your end-of-term comments and your parent conversations for you.
3. **Portfolio evidence, learner-curated.** A portfolio is not a folder of everything; it is a small set of *chosen* work that shows growth. Make learners choose what enters it and require one sentence: "I chose this because...". The choosing is itself assessment, learners judging their own work against criteria, and it transfers part of the record-keeping burden to its rightful owners.

## The sustainability system

The collapse pattern is always the same: a beautiful system in week one, abandoned by week five. Sustainable systems are built on sampling, not coverage:

- **Five learners a day.** Deliberately observe five (a rotating list), not all forty. Every child gets focused attention roughly weekly, which is more than "watch everyone" ever truly delivers.
- **Three minutes, same time, every day.** Update the grid immediately after the last lesson, while memory is fresh. Daily three-minute habits survive; Saturday backlogs do not.
- **Shorthand without guilt.** E/M/A/B plus an occasional word. The record's value is in its pattern over weeks, not the prose of any entry.

>> CASE: A Grade 3 teacher in Bungoma kept one A4 grid per learning area and a sticky-note pad in her pocket. During group work she wrote at most three notes a day, only surprises. At week's end, transferring notes took ten minutes. When a parent asked in October why their son's reading level had been moved, she answered with five dated observations spanning two terms. The parent stopped doubting the system; so, she admits, did she.

>> THINK: Find one record you have kept this term. Has it changed a single teaching decision? If yes, you already know what good looks like, make more of that. If no, what would you have needed to record instead for it to have mattered?

>> TRY: Rule one class-grid this weekend: learners down the side, this term's five most important SLOs across the top. Fill it from memory tonight, gaps included. The gaps are the point: they show you which learners you have no evidence about at all.`,
          reflectionPrompt: 'Look at your current records with the one test that matters: which record last changed a teaching decision you made, and which records exist only because someone might check? Describe the smallest sustainable system (sampling, shorthand, fixed time) you could actually keep for the rest of the term.',
          reflectionPlaceholder: 'A record that genuinely changed my teaching: ...\nRecords I keep only for inspection: ...\nMy smallest sustainable system: each day I will... taking no more than... minutes',
        },
        {
          id: 'l3',
          title: 'Building CBC Partnerships with Parents',
          duration: '15 min',
          videoTitle: 'Communicating CBC to Parents: Practical Guidance',
          videoPoints: [
            'Why parents struggle to understand CBC',
            'Simple explanations that resonate with parents',
            'Engaging parents as learning partners at home',
            'Handling resistance and concerns positively',
          ],
          reading: `## Start from respect, not correction

When a parent complains that their child's exercise book is too empty, hear what they are actually saying: *I care about this child's future, and the only dashboard I have ever known for it is bookwork and marks.* That parent passed through 8-4-4. Their definition of a good education was earned honestly. Treating their concern as ignorance to be corrected loses them; treating it as love that needs a better dashboard wins them. Every technique in this lesson rests on that reframe.

It helps to remember that CBC policy itself names **parental empowerment and engagement** as a pillar of the curriculum, parents are designed into this reform, not bolted on. The teacher who communicates well is implementing the curriculum, not doing public relations.

## Replace the old dashboard, concretely

Telling parents "CBC develops competencies" replaces something concrete with something abstract, and abstractions lose to full exercise books every time. Replace concrete with concrete:

- **Show the work itself.** Once a term, run a fifteen-minute portfolio conversation: the child walks the parent through three pieces they chose, explaining what improved between piece one and piece three. A parent who has watched their own child *explain their growth* never asks about empty exercise books again. The child does the convincing; you only host.
- **Send evidence, not adjectives.** "Amina is doing well" reassures for a day. "This week Amina measured the shamba plot and converted the units herself, ask her to pace out your kitchen tonight" gives the parent something to *see* and a part to *play*.
- **Give them their role back.** Many parents fear CBC means expensive materials and projects they cannot support. Tell them the truth: the most powerful home contribution is conversation. "Ask your child to teach you what they learned, the explaining is the revision." A parent who cannot read English can still do this in any language, and it is worth more than bought manila paper.

## When resistance stays

Some scepticism survives all of this, often arriving as: *"All this is fine, but will my child pass?"* Do not dodge it; the question deserves a straight answer. Assessment in this system includes school-based assessments feeding national records, and the deeper preparation for any examination is the ability to read an unfamiliar question, reason about it, and explain an answer, which is precisely what competency-based teaching practises daily. A child who can apply knowledge to a new situation is exam-ready *and* life-ready; a child who can only recall is, at best, half of one.

| Instead of saying | Say |
| --- | --- |
| "CBC develops 21st-century competencies." | "Your daughter is learning to use what she knows, ask her to show you tonight." |
| "We no longer focus on exams." | "She is practising the exact skill exams reward: facing a new problem and reasoning through it." |
| "Group work builds collaboration." | "She had to explain her method until her partner could use it, that is how you prove you really know something." |

>> THINK: Picture your most sceptical parent, the specific face. What evidence would convince *you*, in their seat, with their history? Now ask honestly: has your classroom produced that evidence yet, and has it ever travelled home?

>> TRY: This week, send home three sentences about one specific learner: what they can now do, one concrete example, and one thing to try at home together. Count the cost (four minutes) against the return when that parent next meets you.`,
          reflectionPrompt: 'Script your answer to the hardest honest question a parent can ask you: "All these activities are fine, but will my child pass the examination?" Write what you would actually say, in the language you would say it in, with one piece of evidence from your own classroom.',
          reflectionPlaceholder: 'My answer, word for word: ...\nThe evidence from my classroom I would point to: ...',
        },
      ],
    },
  ],
  preAssessment: [
    { id: 'q1', question: 'Ms. Achieng explains photosynthesis clearly, learners copy a summary, and on Friday every learner scores well on a recall quiz. What can she safely conclude?', options: ['Learners have developed the competency', 'Learners can recall the content; whether they can use it is still unknown', 'The lesson was learner-centred', 'The class is ready for the next strand'], correct: 1, explanation: 'Recall is real but limited evidence. A competency is knowledge, skills and values applied in a situation, and Friday\'s quiz never asked learners to apply anything. This distinction is the heart of the whole program.' },
    { id: 'q2', question: 'Which of the following is a competency, rather than a piece of content?', options: ['The stages of the water cycle', 'The parts of a flowering plant', 'Using evidence to justify a conclusion', 'The counties of Kenya'], correct: 2, explanation: 'The first, second and fourth are things to know. "Using evidence to justify a conclusion" is something a learner does with what they know, in any subject, for life. Competencies are capabilities, not topics.' },
    { id: 'q3', question: 'Which of these learning outcomes could you actually assess at the end of a lesson?', options: ['Learners will appreciate the importance of fractions', 'Learners will be aware of water conservation', 'Learners will understand soil erosion', 'Learners will compare two soil samples and explain which erodes faster'], correct: 3, explanation: 'Only the fourth describes something observable. "Appreciate", "be aware" and "understand" cannot be seen or measured, you would never know whether the outcome was met. Assessable outcomes use action verbs with visible evidence.' },
    { id: 'q4', question: 'A teacher puts learners in groups of five. One learner writes while four watch. What is this lesson missing?', options: ['More time for the activity', 'Bigger groups', 'Individual accountability, so every learner must think', 'A worksheet for each group'], correct: 2, explanation: 'Group seating is not group learning. Without structures that make every learner responsible for thinking (roles, anyone-can-be-asked reporting, individual products), groupwork is 8-4-4 with rearranged furniture.' },
    { id: 'q5', question: 'A teacher wants to develop critical thinking. Which task demands it?', options: ['Copy the definition of erosion into your book', 'Label the diagram exactly as shown on the board', 'Recite the seven core competencies', 'Decide which of two shamba sites floods less, and defend your choice'], correct: 3, explanation: 'Critical thinking only develops when a task requires choosing, weighing and justifying. The other three tasks can be completed perfectly without a single decision. A task develops a competency only if it cannot be done without it.' },
    { id: 'q6', question: 'Honestly, what is the main reason most classroom assessment happens in Kenyan schools today?', options: ['To decide what each learner needs next', 'To produce marks for ranking and reporting', 'To help learners see their own progress', 'To test whether the teaching method worked'], correct: 1, explanation: 'There is no shame in this answer, it describes the system most of us trained in. CBC asks assessment to do the other three jobs as well. Noticing the gap between current practice and that goal is exactly what this program is for.' },
  ],
  postAssessment: [
    { id: 'q1', question: 'A Grade 5 SLO reads: "classify materials by whether they conduct heat." Which evidence shows the outcome was met?', options: ['Learners recite the definition of a conductor', 'Learners copy a sorted table from the board', 'Each learner sorts real objects and says why each goes where it goes', 'Learners watch the teacher demonstrate sorting'], correct: 2, explanation: 'The verb is "classify", so the evidence must be the learner classifying, with justification showing it was not guesswork. Reciting, copying and watching are evidence of memory and attention, not of the outcome.' },
    { id: 'q2', question: 'You are planning backwards. You have written the SLO. What do you decide next?', options: ['Which textbook pages to use', 'The introduction hook', 'What evidence you will accept from every learner that the SLO was met', 'How to arrange the groups'], correct: 2, explanation: 'Backward design is outcome, then evidence, then activities. Deciding evidence second is the discipline that stops you choosing activities for their energy rather than their proof.' },
    { id: 'q3', question: 'A parent says: "All these activities are fine, but will my child pass the exam?" Your strongest honest answer is:', options: ['"Exams no longer matter under CBC."', '"Reasoning through unfamiliar problems is the core exam skill, and we practise it daily. Let me show you her portfolio."', '"That is KNEC\'s responsibility, not the school\'s."', '"We will add more revision worksheets next term."'], correct: 1, explanation: 'It answers the real fear, with evidence, without dismissing exams or abandoning the pedagogy. A child who can face an unfamiliar question and reason is exam-ready and life-ready; recall alone is neither.' },
    { id: 'q4', question: 'Your lesson went exactly as planned, but a week later learners cannot apply the idea to a slightly new problem. The most likely cause is:', options: ['The learners did not revise at home', 'Your activities only ever asked for recall, so transfer was never practised', 'The topic needs to be retaught more slowly', 'The class needs more discipline'], correct: 1, explanation: 'Transfer must be rehearsed, not hoped for. If no task in the lesson required applying the idea in a new situation, the first time learners ever tried was your follow-up, a design gap, not a learner failure.' },
    { id: 'q5', question: 'Which record would best help you decide what to teach Monday morning?', options: ['A neat register of marks out of ten for last week', 'A grid showing each learner\'s level (E/M/A/B) against the specific outcome "adds fractions with unlike denominators"', 'A file of all learners\' work since January', 'Last term\'s position-in-class ranking'], correct: 1, explanation: 'A record earns its keep by changing a teaching decision. The criterion-referenced grid tells you exactly who needs what next on a named outcome; marks, piles and rankings describe the past without directing the future.' },
    { id: 'q6', question: 'Two lessons on the same SLO: in lesson A the teacher explains brilliantly and learners take excellent notes. In lesson B the teacher explains briefly, then learners use the idea on a new problem and defend their answers in pairs. Which is more CBC-aligned, and why?', options: ['A, because clear explanation shows strong teaching', 'B, because the learners did the thinking and produced evidence of the outcome', 'A, because notes help revision for assessment', 'Neither, because CBC requires group projects'], correct: 1, explanation: 'The question is never "did the teacher perform well?" but "who did the cognitive work, and what evidence exists?" Lesson B made every learner think and produced assessable evidence. Note that B still includes explanation, CBC relocates teacher expertise, it does not delete it.' },
  ],
  assignment: {
    title: 'Redesign One Real Lesson',
    context: 'Theory proves itself in a redesign. Choose one lesson you have actually taught this term, one that you now see was content-focused, and rebuild it using the tools from this program: backward design, an assessable SLO, a task that forces a competency, and planned evidence from every learner.',
    task: 'Write a before-and-after redesign (350–550 words): (1) BEFORE: the lesson as you originally taught it, what learners did, and what evidence of learning you actually collected. Be honest. (2) AFTER: the redesigned lesson, the assessable SLO with its verb, the evidence you will accept from every learner, the main task and the competency it cannot be completed without, and your planned scaffold and extension. (3) THE BET: in two or three sentences, state what you predict will be visibly different in learners\' behaviour, and how you will know if you were wrong.',
    hints: [
      'Choose a lesson that genuinely went flat, redesigning your best lesson teaches you little',
      'Write the evidence before the activities; if you wrote activities first, start that section again',
      'Name the moment in the lesson where you would SEE the competency happening',
      'If you can teach the redesign before submitting, even better: replace your prediction with what actually happened',
    ],
    rubric: [
      'The BEFORE is honest about what evidence was (and was not) collected',
      'The SLO uses an observable verb and the stated evidence matches it',
      'The main task cannot be completed without the named competency',
      'Differentiation is planned (a named scaffold and a named extension), not improvised',
      'The prediction is specific enough that it could be proven wrong',
    ],
  },
  certificate: {
    subtitle: 'CBC Foundations Program',
    skills: ['CBC Framework & Philosophy', 'Curriculum Design (Strands, SLOs)', 'Learner-Centred Lesson Planning', 'CBC Assessment Principles', 'Parent Communication for CBC'],
  },
}

/* ── Program 2: Assessment for Learning ───────────────────── */
const assessmentForLearning: Program = {
  id: 'assessment-for-learning',
  title: 'Assessment for Learning',
  shortTitle: 'Assessment',
  tagline: 'Move from testing to teaching through assessment',
  description: 'Master CBC\'s competency-based assessment system. From designing rubrics and tracking performance levels to portfolio assessment and parent reporting, this program transforms how you understand what your learners know and can do.',
  track: 'core',
  kicdAlignment: 'BECF and current KNEC CBA resources',
  hours: 6,
  lessons: 9,
  accent: 'accent',
  available: true,
  modules: [
    {
      id: 'm1',
      title: 'Understanding CBC Assessment',
      description: 'The philosophy and framework of competency-based assessment.',
      lessons: [
        {
          id: 'l1',
          title: 'What is Competency-Based Assessment?',
          duration: '20 min',
          videoTitle: 'Rethinking Assessment: From Exams to Evidence',
          videoPoints: [
            'Why traditional testing doesn\'t fit CBC',
            'Evidence of learning vs. memory recall',
            'Continuous vs. periodic assessment',
            'How assessment drives instruction',
          ],
          reading: `Competency-Based Assessment (CBA) focuses on gathering evidence that a learner can perform a skill, apply a concept, or demonstrate a value — not just recall a fact. Assessment becomes ongoing and embedded in daily activities rather than concentrated in periodic exams. A learner\'s ability to explain their reasoning aloud is evidence; a group presentation is evidence; a written reflection is evidence.\n\nThe shift from summative to formative assessment is at the heart of CBA. Formative assessment happens during learning — it tells you where the learner is now and what they need next. Summative assessment (like term reports) still exists in CBC, but it is supported by the rich formative data you collect throughout the term. Together, they give a comprehensive picture of each learner.`,
          reflectionPrompt: 'In a typical week, what proportion of your assessment is formative (during learning) vs. summative (at the end)? What would you want it to be?',
          reflectionPlaceholder: 'Currently: roughly __% formative, __% summative\nIdeal: ...\nTo get there I would need to...',
        },
        {
          id: 'l2',
          title: 'The Four Performance Levels',
          duration: '15 min',
          videoTitle: 'Exceeds, Meets, Approaching, Below: Using Performance Levels',
          videoPoints: [
            'What each performance level means in practice',
            'How to observe and record performance levels',
            'Avoiding grade inflation and deflation',
            'Communicating levels to learners and parents',
          ],
          reading: `KNEC assessment resources use four broad performance levels in competency-based assessment: Exceeds Expectation (EE), Meets Expectation (ME), Approaches Expectation (AE), and Below Expectation (BE). In current KJSEA reporting, each broad level is further divided into two actual performance levels (EE1/EE2, ME1/ME2, AE1/AE2 and BE1/BE2) with score ranges. Do not copy those national score bands into a classroom rubric unless the applicable KNEC guidance says to do so.\n\nFor daily classroom assessment, describe what the learner can demonstrate against the specific learning outcome and its criteria. EE indicates performance beyond the stated outcome; ME indicates the outcome is demonstrated; AE indicates partial or supported demonstration; BE indicates that the learner has not yet demonstrated the expected performance. The level is useful only when it leads to a teaching response: extend, practise, scaffold or reteach.`,
          reflectionPrompt: 'For a recent lesson, describe one learner at each of the four performance levels and what evidence led you to that judgement.',
          reflectionPlaceholder: 'EE: [Learner description] Evidence: ...\nME: ...\nAE: ...\nBE: ...',
        },
        {
          id: 'l3',
          title: 'Designing Assessment Rubrics',
          duration: '25 min',
          videoTitle: 'Building Rubrics That Work in CBC Classrooms',
          videoPoints: [
            'Criteria-based vs. holistic rubrics',
            'Writing clear, observable criteria',
            'Aligning rubrics to SLOs and competencies',
            'Using rubrics for self-assessment',
          ],
          reading: `A rubric is a scoring guide that describes levels of quality for a given task. In CBC, rubrics are tied to SLOs: the criteria describe what "Exceeds," "Meets," "Approaching," and "Below" look like for that specific outcome. Well-written criteria are observable — they describe what the teacher will see or hear, not abstract qualities.\n\nFor example, a rubric for "oral communication" might describe EE as: "Speaks clearly, uses topic vocabulary correctly, and responds to questions with elaboration." ME: "Speaks clearly and uses most vocabulary correctly." AE: "Communicates the main idea but struggles with vocabulary or clarity." BE: "Has difficulty communicating the idea clearly." Share rubrics with learners before the task — it becomes a learning tool, not just a marking tool.`,
          reflectionPrompt: 'Choose one upcoming assessment task and write a simple 2-criterion rubric with all four performance levels.',
          reflectionPlaceholder: 'Task: ...\nCriterion 1: ...\nEE: ... ME: ... AE: ... BE: ...\nCriterion 2: ...',
        },
      ],
    },
    {
      id: 'm2',
      title: 'Formative Assessment Strategies',
      description: 'Practical techniques for assessing during learning, not just at the end.',
      lessons: [
        {
          id: 'l1',
          title: 'Quick Formative Techniques',
          duration: '20 min',
          videoTitle: '10 Formative Assessment Strategies for CBC Classrooms',
          videoPoints: [
            'Exit tickets: what they are and how to use them',
            'Traffic lights and thumbs — quick whole-class checks',
            'Targeted questioning techniques',
            'Mini whiteboards and show-of-hands variations',
          ],
          reading: `Formative assessment doesn\'t require elaborate preparation. The most effective techniques are simple and can be embedded in any lesson. Exit tickets — a brief written response to one question at the end of class — give you immediate data on understanding. The question should be tied directly to the lesson\'s SLO: "Write one thing that confused you about today\'s topic" or "Solve this problem and explain your reasoning."\n\nTargeted questioning is another powerful tool. Instead of asking "Does everyone understand?", ask specific, observable questions: "Who can show me an example of..." or "Explain to your partner why..." These techniques reveal actual understanding rather than superficial compliance. When you spot a pattern in responses — three learners all making the same error — you have actionable data to inform the next lesson.`,
          reflectionPrompt: 'Choose one formative technique from this lesson. How will you use it in your next class? What question will you ask?',
          reflectionPlaceholder: 'Technique: ...\nMy question: ...\nWhat I will do with the information: ...',
        },
        {
          id: 'l2',
          title: 'Peer and Self-Assessment',
          duration: '20 min',
          videoTitle: 'Getting Learners to Assess Themselves and Each Other',
          videoPoints: [
            'Why self-assessment builds metacognition',
            'Structured peer feedback protocols',
            'Two Stars and a Wish method',
            'Building a culture of constructive feedback',
          ],
          reading: `When learners assess their own work and each other\'s, they develop metacognition — the ability to think about their own thinking. CBC explicitly values self-efficacy and learning to learn, and self/peer assessment is one of the most direct ways to build both. Learners who can identify gaps in their own understanding become independent learners.\n\nTo make peer assessment work, teach the protocol explicitly. "Two Stars and a Wish" is a simple, effective structure: identify two things the work does well and one thing that could be improved. Model it yourself first, then practice with low-stakes content. Always pair peer assessment with a clear rubric so feedback is based on criteria, not personal opinion. The goal is a classroom culture where constructive feedback is normal, valued, and growth-oriented.`,
          reflectionPrompt: 'How comfortable are your learners with giving and receiving feedback? What one step would you take to build a more feedback-positive classroom culture?',
          reflectionPlaceholder: 'Currently, my learners...\nOne step I would take: ...\nI would start by...',
        },
        {
          id: 'l3',
          title: 'Anecdotal Records and Observation',
          duration: '20 min',
          videoTitle: 'The Art of Observing Learners: What to Look For and How to Record',
          videoPoints: [
            'What constitutes valid observation evidence',
            'Efficient recording systems during class',
            'Observation focus rotation across learners',
            'Using observations to plan interventions',
          ],
          reading: `Observation is one of the most authentic forms of assessment — you see exactly what a learner can do in a real learning context. Anecdotal records are brief written notes capturing what a learner said or did during an activity. Unlike formal assessments, they capture unexpected moments of growth as well as areas of concern.\n\nPractical approaches: carry a clipboard with a class list and simple codes (✓ met, ~ approaching, – below); focus on 4–5 learners per lesson so you give full attention rather than shallow notes on everyone; note specific, observable behaviours ("correctly identified the main idea without prompting") rather than vague impressions ("did well"). Over a term, these records build into a detailed developmental portrait of every learner.`,
          reflectionPrompt: 'Design a simple observation recording system you could realistically use during a lesson. What would it look like? How would you use the data?',
          reflectionPlaceholder: 'My system: ...\nWhat I would record: ...\nHow I would use the data the next day: ...',
        },
      ],
    },
    {
      id: 'm3',
      title: 'Portfolio Assessment',
      description: 'Build and use learner portfolios as powerful evidence of growth.',
      lessons: [
        {
          id: 'l1',
          title: 'Building a Learner Portfolio',
          duration: '20 min',
          videoTitle: 'What Goes in a CBC Portfolio and Why',
          videoPoints: [
            'Portfolio purpose: showcase growth, not perfection',
            'What to include: work samples, reflections, observations',
            'Physical vs. digital portfolios in Kenyan schools',
            'Managing portfolios with large classes',
          ],
          reading: `A portfolio is a curated collection of evidence showing a learner\'s growth over time. Unlike a test, it captures the process of learning — drafts, revisions, self-assessments, and finished products. In CBC, portfolios are a core assessment tool because they provide rich, multidimensional evidence of competency development that a single assessment cannot.\n\nFor practical implementation, a simple physical portfolio can be a manila folder or exercise book for each learner. Include: 2–3 work samples per term (chosen by the learner), teacher observation notes, learner self-assessment records, and one "best piece" with a written explanation. Label clearly and store systematically. The portfolio belongs to the learner — their ownership of it is itself an expression of the Learning to Learn competency.`,
          reflectionPrompt: 'What evidence of learning do you currently collect? How could you organise it into a portfolio system for your class?',
          reflectionPlaceholder: 'Currently I collect...\nA portfolio for my class would include...\nI would manage it by...',
        },
        {
          id: 'l2',
          title: 'Learner Ownership of Portfolio',
          duration: '15 min',
          videoTitle: 'Giving Learners Agency in Their Own Assessment',
          videoPoints: [
            'Why learner choice in portfolio selection matters',
            'Guided reflection prompts for young learners',
            'Portfolio conferences: learner-led conversations',
            'Celebrating growth visibly in the classroom',
          ],
          reading: `The most distinctive feature of portfolio assessment is that learners choose and explain their own work. This is not passive collection — it is active, reflective curation. When a learner selects a piece to include and writes "I chose this because..." they are practising the Self-Efficacy and Learning to Learn competencies at the same time.\n\nEven young learners can engage in portfolio reflection with scaffolding. Prompts like "I am proud of this because..." or "This was hard for me, and I solved it by..." build the habit of self-reflection from early grades. Over time, learners develop a meta-awareness of their own learning journey — they can see their growth in ways that a grade on a page cannot show.`,
          reflectionPrompt: 'Write a simple reflection prompt you could use with your grade level to help learners explain why they chose a piece of work for their portfolio.',
          reflectionPlaceholder: 'My reflection prompt: ...\nI chose this piece because...\nWhat this shows about my learning is...',
        },
        {
          id: 'l3',
          title: 'Portfolios and Parent Engagement',
          duration: '20 min',
          videoTitle: 'Portfolio Sharing: Connecting Home and School Through Evidence',
          videoPoints: [
            'Portfolio sharing events and parent conversations',
            'Using portfolios during parent-teacher conferences',
            'Preparing learners to present their portfolios',
            'Addressing parental questions about performance levels',
          ],
          reading: `Portfolios transform parent-teacher conversations. Instead of the teacher reporting on the learner, the learner presents their own evidence of growth. This shifts the dynamic from the teacher judging the learner to the learner taking ownership of their progress. Parents see real work, hear their child explain it, and gain understanding of competency-based growth.\n\nTo make portfolio sharing events successful: prepare learners with a 2-minute presentation structure ("This is my best work because... I grew in this area by... My next goal is..."); invite parents to ask questions of the learner, not just the teacher; use the rubric to explain performance levels in parent-friendly language. When parents understand that "Approaching Expectations" means "actively developing, with teacher support" rather than "failing," resistance to CBC assessment decreases significantly.`,
          reflectionPrompt: 'Plan a 30-minute portfolio sharing event for your class. What would the schedule be? How would you prepare your learners?',
          reflectionPlaceholder: 'Schedule: ...\nHow I would prepare learners (2 weeks before): ...\nWhat I would say to parents about performance levels: ...',
        },
      ],
    },
  ],
  preAssessment: [
    { id: 'q1', question: 'In CBC, assessment is primarily:', options: ['Summative — a final exam at the end of term', 'Formative — ongoing during learning', 'Competitive — comparing learners to each other', 'Selective — identifying the top performers'], correct: 1, explanation: 'CBC assessment is primarily formative — it happens during learning and informs teaching decisions.' },
    { id: 'q2', question: 'Which is a performance level in CBC?', options: ['Pass/Fail', 'A, B, C, D', 'Meets Expectations', 'Good, Average, Poor'], correct: 2, explanation: 'CBC uses four levels: Exceeds Expectations (EE), Meets Expectations (ME), Approaching Expectations (AE), Below Expectations (BE).' },
    { id: 'q3', question: 'A rubric is best described as:', options: ['A test paper', 'A scoring guide with criteria and performance levels', 'A lesson plan template', 'A class register'], correct: 1, explanation: 'A rubric describes levels of quality for a task, tied to clear, observable criteria.' },
    { id: 'q4', question: 'What is the purpose of a learner portfolio?', options: ['To store completed exercise books', 'To provide evidence of growth over time', 'To rank learners in the class', 'To replace term examinations'], correct: 1, explanation: 'Portfolios curate evidence of a learner\'s growth over time — not just final products but the process of learning.' },
    { id: 'q5', question: 'Peer assessment is primarily valuable because:', options: ['It saves teacher marking time', 'It develops metacognition and feedback skills', 'It makes learners competitive', 'It replaces teacher assessment'], correct: 1, explanation: 'Peer assessment develops metacognition (thinking about thinking) and builds constructive feedback skills — key CBC competencies.' },
    { id: 'q6', question: 'An exit ticket is:', options: ['A permission slip to leave class', 'A brief end-of-lesson assessment', 'A homework assignment', 'A quiz at the start of class'], correct: 1, explanation: 'An exit ticket is a brief written response at lesson\'s end, tied to the SLO — it gives immediate formative data.' },
  ],
  postAssessment: [
    { id: 'q1', question: 'In CBC, assessment is primarily:', options: ['Summative', 'Formative', 'Competitive', 'Selective'], correct: 1, explanation: 'CBC assessment is formative — ongoing and developmental.' },
    { id: 'q2', question: '"EE" in CBC performance levels stands for:', options: ['Excellent and Exceptional', 'Exceeds Expectations', 'Equal to Expected', 'Evidence of Excellence'], correct: 1, explanation: 'EE = Exceeds Expectations — the learner has gone beyond the stated SLO.' },
    { id: 'q3', question: 'Backwards design in assessment means:', options: ['Marking from the last question first', 'Designing the assessment before planning activities', 'Starting with the lowest-level learners', 'Using the textbook to set questions'], correct: 1, explanation: 'Backwards design: start with what you want learners to achieve, then design activities and assessments to get there.' },
    { id: 'q4', question: 'Which is NOT typically included in a CBC learner portfolio?', options: ['Work samples chosen by the learner', 'Learner self-reflections', 'The teacher\'s annual salary', 'Observation notes from the teacher'], correct: 2, explanation: 'Portfolios include learner work, reflections, and teacher observations — not administrative information.' },
    { id: 'q5', question: 'The "Two Stars and a Wish" technique is used for:', options: ['Lesson planning', 'Peer assessment', 'Classroom rules', 'Parent communication'], correct: 1, explanation: 'Two Stars and a Wish is a structured peer feedback protocol: two strengths + one area for improvement.' },
    { id: 'q6', question: 'Anecdotal records are:', options: ['Fictional stories about learners', 'Brief observational notes during activities', 'End-of-year reports', 'Examination mark sheets'], correct: 1, explanation: 'Anecdotal records are brief, specific notes of what a learner said or did during an activity.' },
  ],
  assignment: {
    title: 'Formative Assessment Plan',
    context: 'You are planning a two-week unit of work for your class. Apply what you have learned about formative assessment to design a complete assessment plan for this unit.',
    task: 'Design a formative assessment plan for a 2-week unit you are currently teaching. Include: (1) Two formative assessment techniques you will use and how, (2) A simple rubric with 2 criteria for one key task, (3) How you will involve learners in self or peer assessment, (4) How you will use the data to adjust your teaching.',
    hints: [
      'Choose formative techniques that fit naturally into your daily lessons — don\'t add extra admin',
      'Write rubric criteria that describe observable behaviour, not vague qualities',
      'Plan the self-assessment activity before the lesson — it works best when structured',
    ],
    rubric: [
      'Formative techniques are specific and connected to SLOs',
      'Rubric criteria are observable and clearly differentiated across levels',
      'Learner involvement in assessment is genuinely competency-building',
      'Data use plan shows how teaching will respond to learner evidence',
    ],
  },
  certificate: {
    subtitle: 'Assessment for Learning Program',
    skills: ['Competency-Based Assessment Design', 'Assessment Rubrics', 'Formative Assessment Strategies', 'Portfolio Assessment', 'Learner-Led Self-Assessment', 'Parent Reporting in CBC'],
  },
}

/* ── Program 3: Inclusive Education ───────────────────────── */
const inclusiveEducation: Program = {
  id: 'inclusive-education',
  title: 'Inclusive Education',
  shortTitle: 'Inclusive Ed',
  tagline: 'Every learner belongs, every learner succeeds',
  description: 'Build an inclusive classroom that meets every learner where they are. This program covers differentiation strategies, Universal Design for Learning, and practical approaches grounded in CBC\'s every-learner-succeeds philosophy.',
  track: 'core',
  kicdAlignment: 'BECF and inclusive education guidance',
  hours: 5,
  lessons: 9,
  accent: 'primary',
  available: true,
  modules: [
    {
      id: 'm1',
      title: 'Every Learner Counts',
      description: 'Understand the foundations of inclusive education in the CBC context.',
      lessons: [
        {
          id: 'l1', title: 'The Inclusive Education Mandate', duration: '15 min',
          videoTitle: 'Kenya\'s Commitment to Inclusive Education',
          videoPoints: ['Kenya\'s Special Needs Education policy', 'CBC\'s universal design philosophy', 'Rights-based approach to education', 'What inclusion looks like in a Kenyan primary school'],
          reading: `Kenya\'s educational policy, aligned with the UN Convention on the Rights of Persons with Disabilities, commits to inclusive education — every child learning in their local school, supported appropriately. CBC was designed with this in mind: the curriculum\'s flexibility in activities, assessment, and pace is intended to accommodate a wide range of learners.\n\nInclusion does not mean ignoring difference — it means actively planning for it. A truly inclusive classroom is one where every learner\'s needs are anticipated in the lesson design, not addressed after the fact as a problem to be solved. This requires a shift in mindset: diversity is the norm, and good teaching accounts for it from the start.`,
          reflectionPrompt: 'Identify one learner in your class who has a specific learning barrier. How does your current lesson design account for their needs?',
          reflectionPlaceholder: 'The learner I\'m thinking of...\nTheir barrier is...\nCurrently my lessons address this by...\nWhat could be improved: ...',
        },
        {
          id: 'l2', title: 'Understanding Learning Barriers', duration: '20 min',
          videoTitle: 'Types of Learning Barriers in Kenyan Classrooms',
          videoPoints: ['Physical and sensory barriers', 'Cognitive and learning differences', 'Language and communication barriers', 'Social-emotional and environmental barriers'],
          reading: `Learning barriers are any factor that prevents a learner from fully participating in and benefiting from education. They include physical barriers (mobility or sensory impairment), cognitive barriers (intellectual disability, learning differences like dyslexia), language barriers (English or Kiswahili is not the home language), and social-emotional barriers (trauma, poverty, family instability).\n\nIdentifying barriers requires observation and relationship-building. A learner who appears disengaged may be struggling with language comprehension, not ability. A learner who is slow to write may have a fine motor challenge, not a cognitive one. Before labelling a learner, ask: "What is the barrier between this learner and the learning?" Then ask: "What can I change in my teaching to reduce that barrier?"`,
          reflectionPrompt: 'Choose one barrier type and describe a specific, practical accommodation you could make in tomorrow\'s lesson.',
          reflectionPlaceholder: 'Barrier type: ...\nAccommodation I would make: ...\nThis would help because...',
        },
        {
          id: 'l3', title: 'CBC\'s Every-Learner Philosophy', duration: '15 min',
          videoTitle: 'How CBC Was Designed With Inclusion in Mind',
          videoPoints: ['Flexible pacing built into the curriculum', 'Multiple means of demonstrating competency', 'The role of continuous assessment in identifying needs early', 'Moving from deficit to strengths-based thinking'],
          reading: `CBC explicitly rejects the idea that education is for some learners and not others. The curriculum is designed with flexible pathways: learners can demonstrate competency through writing, speaking, drawing, making, or performing. This flexibility is intentional — it recognises that intelligence and capability take many forms.\n\nThe shift from deficit thinking ("this learner can\'t") to strengths thinking ("this learner can, when supported appropriately") is one of the most important professional shifts a teacher can make. Every learner has strengths. An effective inclusive teacher identifies those strengths and uses them as entry points for learning. A learner who struggles with reading may excel in oral explanation, practical demonstration, or artistic representation.`,
          reflectionPrompt: 'Think of a learner you find challenging. List three strengths they demonstrate — not academic strengths necessarily, but any strengths. How could you use these as learning entry points?',
          reflectionPlaceholder: 'Learner: ...\nStrength 1: ... How to use it: ...\nStrength 2: ...\nStrength 3: ...',
        },
      ],
    },
    {
      id: 'm2',
      title: 'Differentiation in Practice',
      description: 'Practical strategies for meeting diverse learner needs in one classroom.',
      lessons: [
        {
          id: 'l1', title: 'Differentiated Content and Process', duration: '25 min',
          videoTitle: 'Practical Differentiation in a Large CBC Classroom',
          videoPoints: ['Differentiating by readiness, interest, and learning profile', 'Tiered activities for the same SLO', 'Flexible grouping strategies', 'How to plan differentiation without doubling your workload'],
          reading: `Differentiation means adjusting the content (what learners learn), process (how they learn it), or product (how they demonstrate learning) based on learner readiness, interest, or learning profile. In a CBC classroom, the SLO is the same for all learners — what changes is the pathway to get there.\n\nA practical example: if the SLO is "explain the water cycle," some learners might meet it by drawing and labelling a diagram; others by writing a paragraph; advanced learners by creating an explanation for younger learners. The content (water cycle) and outcome (explanation) are the same — the complexity and modality differ. Tiered activities like these can be prepared in advance and offered to learners based on your observation data.`,
          reflectionPrompt: 'Design tiered activities for an upcoming lesson. What does the task look like for learners who are below, at, and above the expected level?',
          reflectionPlaceholder: 'SLO: ...\nBelow level: ...\nAt level: ...\nAbove level: ...',
        },
        {
          id: 'l2', title: 'Universal Design for Learning (UDL)', duration: '20 min',
          videoTitle: 'UDL Basics: Designing for All Learners from the Start',
          videoPoints: ['The three UDL principles: representation, action & expression, engagement', 'Multiple means of presenting information', 'Giving learners choices in how they show learning', 'Building flexibility into lesson design proactively'],
          reading: `Universal Design for Learning (UDL) is an approach to curriculum design that proactively plans for learner diversity rather than retrofitting accommodations after the fact. UDL is built on three principles: provide multiple means of Representation (how information is presented), Action and Expression (how learners demonstrate learning), and Engagement (how learners are motivated and interested).\n\nA UDL-informed lesson might present information through spoken explanation, a visual diagram, AND a physical demonstration — removing barriers for visual, auditory, and kinaesthetic learners simultaneously. Learners might choose to demonstrate their understanding in writing, through a drawing, or via oral explanation. These choices are built into the lesson design, so no single learner feels singled out as needing "extra help."`,
          reflectionPrompt: 'Apply one UDL principle to an upcoming lesson. What multiple means of representation, expression, or engagement will you include?',
          reflectionPlaceholder: 'UDL principle I\'m applying: ...\nIn practice, I will offer: ...\nThis will help learners who...',
        },
        {
          id: 'l3', title: 'Grouping Strategies', duration: '20 min',
          videoTitle: 'Strategic Grouping for Inclusive Learning',
          videoPoints: ['Mixed-ability vs. similar-ability grouping: when to use each', 'Interest-based and learning profile grouping', 'Cooperative learning structures (Jigsaw, Think-Pair-Share)', 'Managing groups with a large, diverse class'],
          reading: `How you group learners has a profound effect on inclusion. Mixed-ability groups allow stronger learners to consolidate their understanding through explanation (the best way to learn is to teach), while providing peer models and support for struggling learners. However, always pairing the same learners creates dependency rather than growth — vary grouping frequently.\n\nCooperative learning structures like Jigsaw (each group member becomes an expert on one part and teaches the others) are particularly powerful for inclusion: every member has a valued role, and the task requires everyone\'s contribution. Think-Pair-Share gives all learners thinking time before speaking, which helps learners who process slowly or are less confident in whole-class discussions. Rotate your grouping strategies to serve different learner needs at different times.`,
          reflectionPrompt: 'Reflect on your current grouping practices. Are the same learners always grouped together? How could you vary your grouping this term to better serve all learners?',
          reflectionPlaceholder: 'Currently I group by...\nA different grouping I will try: ...\nThis will benefit learners who...',
        },
      ],
    },
    {
      id: 'm3',
      title: 'The Inclusive Classroom in Practice',
      description: 'Environment, wellbeing, and stakeholder collaboration for every learner.',
      lessons: [
        {
          id: 'l1', title: 'Adapting the Learning Environment', duration: '15 min',
          videoTitle: 'Low-Cost, High-Impact Classroom Environment Adaptations',
          videoPoints: ['Physical arrangement for diverse learning needs', 'Visual supports and word walls', 'Sensory considerations in classroom setup', 'Making materials accessible on a limited budget'],
          reading: `The physical environment of a classroom communicates whether all learners are expected and welcome. Flexible seating arrangements (allowing some learners to sit at the front, or near the teacher), clear visual routines displayed on the wall, and materials at accessible heights all reduce barriers without singling out individual learners.\n\nLow-cost adaptations with high impact: write key vocabulary on the board before the lesson begins; number steps in a task clearly; provide simple visual timers for learners who struggle with transitions; allow learners who need movement to stand or work at a standing surface. Many adaptations that help learners with specific needs also benefit the entire class.`,
          reflectionPrompt: 'Walk through your classroom mentally. Name two environmental changes you could make this week that would benefit your most challenged learners.',
          reflectionPlaceholder: 'Change 1: ...\nWhy this will help: ...\nChange 2: ...',
        },
        {
          id: 'l2', title: 'Social-Emotional Wellbeing in Inclusive Classrooms', duration: '20 min',
          videoTitle: 'Safety, Belonging, and Emotional Regulation in CBC',
          videoPoints: ['Why emotional safety enables learning', 'CBC\'s wellbeing strand', 'Simple regulation strategies for the classroom', 'Addressing bullying and building community'],
          reading: `A learner cannot learn if they don\'t feel safe. Social-emotional wellbeing is not separate from academic learning in CBC — it is a prerequisite for it. The CBC Self-Efficacy and Citizenship competencies require that learners feel valued, heard, and capable. Creating this environment is one of a teacher\'s most fundamental responsibilities.\n\nPractical actions: begin each Monday with a brief class circle where learners share one word about how they\'re feeling; establish clear, consistent classroom routines that reduce anxiety for learners who need predictability; use "emotion vocabulary" explicitly — name feelings without judgement; address bullying directly and model the kind of community you want to build. These practices benefit all learners, but they are essential for learners with social-emotional needs.`,
          reflectionPrompt: 'Describe one practice you already use to support learner wellbeing. Then describe one new practice from this lesson you want to try.',
          reflectionPlaceholder: 'What I already do: ...\nNew practice I want to try: ...\nI will start on: [date]',
        },
        {
          id: 'l3', title: 'Collaborating with Parents and Support Staff', duration: '20 min',
          videoTitle: 'Building Your Inclusion Team: Parents, SEN Teachers, and More',
          videoPoints: ['Parents as essential partners in inclusion', 'Working with special needs education teachers', 'Referral processes for learners with significant needs', 'Keeping communication consistent and strength-based'],
          reading: `No teacher works alone in an inclusive classroom. Parents know their children better than anyone — their home language, their strengths, their fears, what calms them. Establishing a relationship of trust with parents of learners with additional needs is foundational. Regular, brief updates (not just when problems arise) build that trust.\n\nWhere a special needs education (SNE) teacher or resource centre is available, collaborate actively. The SNE teacher can suggest specific accommodations, model strategies in your classroom, and help develop individualised education plans. For learners with significant needs that exceed classroom accommodation, use your school\'s referral process — but document carefully and communicate transparently with parents throughout. Inclusion works best as a team effort.`,
          reflectionPrompt: 'Identify one learner who needs additional support. Who else should be involved in their support team (parent, SNE teacher, school counsellor)? What is your first step?',
          reflectionPlaceholder: 'Learner: ...\nSupport team members: ...\nMy first step: ...\nTimeline: ...',
        },
      ],
    },
  ],
  preAssessment: [
    { id: 'q1', question: 'Inclusive education means:', options: ['Separate schools for learners with disabilities', 'All learners learning together with appropriate support', 'Only teaching the highest-performing learners', 'Ignoring learning differences'], correct: 1, explanation: 'Inclusive education means all learners, regardless of ability, learning together in their local school with appropriate support.' },
    { id: 'q2', question: 'Differentiation in CBC means:', options: ['Teaching different content to different learners', 'Adjusting pathways to the same SLO based on learner needs', 'Separating learners by ability permanently', 'Giving easier work to struggling learners'], correct: 1, explanation: 'Differentiation adjusts the pathway (content, process, or product) while keeping the SLO the same for all.' },
    { id: 'q3', question: 'UDL stands for:', options: ['Universal Design for Learning', 'Unified Development of Literacy', 'Updated Digital Learning', 'Underprivileged Development in Learning'], correct: 0, explanation: 'UDL = Universal Design for Learning — designing lessons proactively to accommodate all learners from the start.' },
    { id: 'q4', question: 'A learning barrier is:', options: ['A low exam score', 'Any factor preventing full participation in learning', 'A learner who misbehaves', 'Homework not submitted'], correct: 1, explanation: 'A learning barrier is any factor — physical, cognitive, language, social-emotional — that prevents full participation.' },
    { id: 'q5', question: 'Mixed-ability grouping primarily benefits:', options: ['Only the weakest learners', 'Only the strongest learners', 'All learners through peer modelling and explanation', 'Nobody — ability grouping is always better'], correct: 2, explanation: 'Mixed-ability groups benefit everyone: stronger learners consolidate through teaching, weaker learners gain peer models.' },
    { id: 'q6', question: 'Strengths-based thinking means:', options: ['Ignoring learning difficulties', 'Finding entry points through what a learner CAN do', 'Only praising learners', 'Avoiding assessment'], correct: 1, explanation: 'Strengths-based: start from what a learner can do and use those strengths as entry points into new learning.' },
  ],
  postAssessment: [
    { id: 'q1', question: 'Inclusive education means:', options: ['Separate schools for special needs', 'All learners learning together with support', 'Teaching only gifted learners', 'Using the same approach for everyone'], correct: 1, explanation: 'Inclusion = all learners, appropriate support, local school.' },
    { id: 'q2', question: 'In UDL, "multiple means of expression" refers to:', options: ['Different languages in the curriculum', 'Allowing learners to show learning in different ways', 'Multiple textbooks', 'Oral and written exams'], correct: 1, explanation: 'Multiple means of expression: learners can write, speak, draw, make — different modalities for demonstrating competency.' },
    { id: 'q3', question: 'The Jigsaw grouping strategy:', options: ['Groups learners by ability', 'Has each member become an expert who teaches others', 'Is for one learner working alone', 'Involves competitive ranking'], correct: 1, explanation: 'Jigsaw: each group member studies one piece and teaches the rest — every member has a valued expert role.' },
    { id: 'q4', question: 'Think-Pair-Share mainly helps learners who:', options: ['Are very confident speakers', 'Process information slowly or are less confident in whole-class settings', 'Always finish early', 'Need no support'], correct: 1, explanation: 'Think-Pair-Share gives processing time before speaking, helping slower processors and less confident learners participate.' },
    { id: 'q5', question: 'Why does social-emotional wellbeing matter for learning?', options: ['It doesn\'t — academic work is what matters', 'A learner who doesn\'t feel safe cannot learn effectively', 'It only matters for early years', 'Wellbeing is the family\'s responsibility'], correct: 1, explanation: 'Emotional safety is a prerequisite for learning — a learner who feels unsafe or unwelcome cannot access academic content.' },
    { id: 'q6', question: 'When should you involve a parent in supporting a learner with additional needs?', options: ['Only when the learner has a formal diagnosis', 'Only when serious problems arise', 'Regularly, with strength-based communication from the start', 'Never — it\'s a school matter'], correct: 2, explanation: 'Regular, strength-based communication builds trust and partnership — don\'t wait for problems.' },
  ],
  assignment: {
    title: 'Differentiation in My Classroom',
    context: 'You know your learners. Now apply inclusive education principles to a real classroom challenge.',
    task: 'Describe one learner in your class (anonymised) who faces a learning barrier. Write a differentiation plan that includes: (1) Description of the barrier and the learner\'s strengths, (2) Two differentiation strategies you will implement, (3) How you will involve the learner\'s parent/guardian, (4) How you will know whether the strategies are working.',
    hints: ['Use a pseudonym — focus on the barrier and strategies, not the learner\'s identity', 'Strategies should be realistic for your class size and resources', 'Your success indicators should be observable behaviour, not exam scores'],
    rubric: ['Clear, respectful description of barrier and strengths', 'Differentiation strategies are specific and realistic', 'Parent involvement plan is practical and relationship-based', 'Success indicators are observable and measurable'],
  },
  certificate: { subtitle: 'Inclusive Education Program', skills: ['Inclusive Education Principles', 'Identifying Learning Barriers', 'Differentiation Strategies', 'Universal Design for Learning', 'Strengths-Based Teaching', 'Parent & Stakeholder Collaboration'] },
}

/* ── Program 4: STEM Integration ──────────────────────────── */
const stemIntegration: Program = {
  id: 'stem-integration',
  title: 'STEM Integration',
  shortTitle: 'STEM',
  tagline: 'Science, Technology, Engineering and Mathematics in CBC',
  description: 'Bring STEM education to life in your competency-based classroom. This program covers inquiry-based learning, the 5E model, cross-curricular STEM links, and practical project-based learning with low-cost materials.',
  track: 'stem',
  kicdAlignment: 'KICD learning-design principles for STEM practice',
  hours: 6,
  lessons: 9,
  accent: 'accent',
  available: true,
  modules: [
    {
      id: 'm1',
      title: 'STEM in the CBC Context',
      description: 'Understand STEM education and how it maps onto Kenya\'s CBC framework.',
      lessons: [
        {
          id: 'l1', title: 'What is STEM Education?', duration: '15 min',
          videoTitle: 'STEM Education in Africa: Context and Opportunity',
          videoPoints: ['STEM as integrated, not just separate subjects', 'How current KICD designs create opportunities for inquiry and application', 'Designing low-resource investigations safely', 'What STEM looks like in a Kenyan classroom'],
          reading: `STEM education — Science, Technology, Engineering, and Mathematics — is more than teaching these subjects separately. It is an integrated approach where learners apply concepts from multiple disciplines to investigate or solve a real problem. In a STEM lesson, a learner might apply mathematics to measure, science to hypothesise, engineering to design, and technology to represent or communicate — all in service of a selected learning outcome.\n\nThe curriculum connection must be made from the current KICD design for the grade and learning area. Start with the exact outcome, then identify the inquiry, measurement, design or explanation that will produce evidence. Do not label a lesson STEM simply because it uses a device or a practical material.`,
          reflectionPrompt: 'Identify one topic you currently teach in Science or Mathematics. How could it be approached as a STEM challenge rather than a traditional lesson?',
          reflectionPlaceholder: 'Topic: ...\nAs a STEM challenge, learners could: ...\nThis would connect to these subjects: ...',
        },
        {
          id: 'l2', title: 'STEM in the CBC Curriculum', duration: '20 min',
          videoTitle: 'Mapping STEM to CBC Strands and Learning Areas',
          videoPoints: ['Science & Technology strands with STEM potential', 'Mathematics as the language of STEM', 'Pre-Technical Studies and engineering thinking', 'Creative Arts and design thinking connections'],
          reading: `STEM threads through multiple CBC learning areas. Science & Technology develops the scientific method, hypothesis testing, and technological thinking. Mathematics provides the quantitative tools for all STEM fields. Pre-Technical Studies (Upper Primary) introduces engineering design and making. Even Creative Arts contributes design thinking — the iterative process of designing, building, testing, and improving.\n\nThe CBC Science & Technology strand structure explicitly includes inquiry: learners are expected to investigate, design, make, and evaluate. This maps directly to STEM pedagogy. When planning STEM-integrated lessons, look for natural connections: a lesson on fractions becomes a cooking measurement challenge; a lesson on ecosystems becomes a water quality investigation; a lesson on structures becomes a bridge-building challenge.`,
          reflectionPrompt: 'Look at your timetable for this week. Identify two natural connections between different learning areas that could become a STEM lesson.',
          reflectionPlaceholder: 'Connection 1: [Subject A] + [Subject B] → STEM challenge: ...\nConnection 2: ...',
        },
        {
          id: 'l3', title: 'Cross-Curricular STEM Links', duration: '25 min',
          videoTitle: 'Breaking Down Subject Silos: Cross-Curricular STEM Planning',
          videoPoints: ['What cross-curricular planning looks like in practice', 'Coordinating with colleagues across subjects', 'Learner benefit of integrated approaches', 'Time and curriculum management for STEM integration'],
          reading: `Cross-curricular STEM happens when two or more subjects share a learning experience. This requires coordination — ideally, the class teacher plans explicitly for connections, but even informal links are valuable. When learners see that fractions show up in music (rhythm), in cooking (recipes), and in construction (measurements), they understand that mathematics is not a school subject — it is a way of describing the world.\n\nEffective cross-curricular STEM in CBC doesn\'t require abandoning the curriculum plan. It requires intentional noticing: as you plan a science investigation, ask "what mathematics is embedded here?" As you teach a geography lesson, ask "what engineering or technology concepts connect?" Small, regular cross-curricular links are more powerful than occasional "STEM days" because they build persistent habits of integrated thinking.`,
          reflectionPrompt: 'Plan one "curriculum link moment" for this week: identify a concept in one subject that you will deliberately connect to another subject. How will you make the connection explicit for learners?',
          reflectionPlaceholder: 'Primary subject: ...\nConnected subject: ...\nConcept: ...\nHow I\'ll make it explicit: ...',
        },
      ],
    },
    {
      id: 'm2',
      title: 'Inquiry-Based Learning',
      description: 'The 5E model and practical inquiry approaches for CBC STEM teaching.',
      lessons: [
        {
          id: 'l1', title: 'The 5E Inquiry Model', duration: '25 min',
          videoTitle: 'The 5E Model in Action: A CBC Science Lesson',
          videoPoints: ['Engage: hooking learners with a question or phenomenon', 'Explore: structured hands-on investigation', 'Explain: connecting experience to concepts', 'Elaborate: applying to new contexts', 'Evaluate: formative and summative assessment'],
          reading: `The 5E instructional model — Engage, Explore, Explain, Elaborate, Evaluate — is a research-based framework for inquiry teaching that aligns perfectly with CBC\'s competency approach. Unlike traditional lessons that begin with the teacher explaining and end with learners practising, the 5E begins with a question or phenomenon that hooks learners, then guides them through progressive stages of discovery.\n\nIn the Engage phase, you spark curiosity: "Why does ice melt faster in the sun?" In Explore, learners investigate hands-on. In Explain, you connect their observations to the scientific concept. In Elaborate, they apply the concept to a new situation. Evaluate is embedded throughout — in the quality of their questions, their investigation methods, and their explanations. The 5E ensures learners construct understanding rather than passively receive it.`,
          reflectionPrompt: 'Choose an upcoming science or mathematics topic. Design a brief 5E outline for a lesson on it.',
          reflectionPlaceholder: 'Topic: ...\nEngage (hook): ...\nExplore (activity): ...\nExplain (key concept to draw out): ...\nElaborate (application): ...\nEvaluate (how you\'ll check understanding): ...',
        },
        {
          id: 'l2', title: 'Designing STEM Investigations', duration: '30 min',
          videoTitle: 'From Question to Conclusion: Running a STEM Investigation',
          videoPoints: ['Forming investigable questions from learner curiosity', 'Fair test design in primary science', 'Data collection and recording methods', 'Drawing evidence-based conclusions'],
          reading: `A STEM investigation begins with a question that can be tested: "Which material absorbs water best?" "Does the height of a ramp affect how far a car travels?" Good investigation questions are specific, testable, and connected to the learner\'s world. Teaching learners to form their own investigable questions is itself a critical thinking competency.\n\nFair test design — changing one variable at a time while keeping all others the same — is the foundational scientific method. Teach it through analogy: "If we change the ramp height AND the car weight at the same time, how will we know which change made the difference?" Simple data recording tables (variable, measurement, repeat measurements) teach both scientific rigour and mathematical recording. Always return to the original question: "What does our evidence tell us?"`,
          reflectionPrompt: 'Design a simple fair-test investigation your class could do with materials found in or around your school.',
          reflectionPlaceholder: 'Question: Does... affect...?\nWhat we will change (variable): ...\nWhat we will keep the same: ...\nWhat we will measure: ...\nMaterials needed: ...',
        },
        {
          id: 'l3', title: 'Low-Cost STEM Materials', duration: '20 min',
          videoTitle: 'STEM with Zero Budget: Resources in Your Community',
          videoPoints: ['Everyday materials for science investigations', 'Community resources as STEM learning contexts', 'Making STEM kits from local materials', 'Sustainability and reuse in STEM education'],
          reading: `One of the most persistent myths about STEM education is that it requires expensive equipment. In reality, some of the most powerful STEM investigations use materials found at home or in the school compound. Bottle tops for counting and sorting, soil and water for filtration experiments, local plants for biology investigations, cardboard and straws for engineering challenges — the resources are around you.\n\nA "STEM kit" for your classroom can be assembled from: paper, cardboard, scissors, tape, string, rubber bands, bottle tops, paper clips, and water. These materials support dozens of investigations across multiple grades. Equally valuable is the community itself: invite a local farmer to discuss soil science; take learners to a construction site (safely, with permission) to study engineering; observe weather patterns in the school compound over weeks.`,
          reflectionPrompt: 'List 5 materials you could collect from your school or community this week to build a basic STEM kit for your class.',
          reflectionPlaceholder: '1. ...\n2. ...\n3. ...\n4. ...\n5. ...\nPossible investigations using these: ...',
        },
      ],
    },
    {
      id: 'm3',
      title: 'STEM Projects',
      description: 'Design, run, and celebrate project-based STEM learning in your classroom.',
      lessons: [
        {
          id: 'l1', title: 'Project-Based Learning Basics', duration: '20 min',
          videoTitle: 'PBL in Primary Schools: What It Is and Why It Works',
          videoPoints: ['What makes a learning experience a genuine "project"', 'The driving question in PBL', 'Learner voice and choice in project design', 'Managing PBL with large classes'],
          reading: `Project-Based Learning (PBL) is an extended inquiry where learners investigate and respond to a complex, real-world question or problem. Unlike a traditional assignment, a PBL project unfolds over days or weeks, involves multiple disciplines, and results in a public product — something shared with an audience beyond the classroom.\n\nThe "driving question" is central to PBL: it should be open-ended, genuinely interesting, and connected to learners\' lives. "How can we reduce waste in our school?" or "What makes bridges strong?" invite sustained inquiry. Learner voice and choice — deciding on their own investigation approach, team structure, and final product — builds the CBC competencies of Critical Thinking, Creativity, and Self-Efficacy simultaneously.`,
          reflectionPrompt: 'Write a driving question for a 2-week STEM project appropriate for your grade level. What real-world problem or question would genuinely engage your learners?',
          reflectionPlaceholder: 'Driving question: How can we...? / What makes...?\nWhy this is relevant to my learners: ...\nSubjects this connects to: ...',
        },
        {
          id: 'l2', title: 'Running a Classroom STEM Project', duration: '30 min',
          videoTitle: 'Managing a STEM Project from Start to Finish',
          videoPoints: ['Planning the project arc across days/weeks', 'Daily STEM session structure', 'Managing noise, movement, and materials', 'Check-in points to keep groups on track'],
          reading: `Running a multi-week STEM project requires clear structure. Plan the project arc: Day 1, introduce the driving question and form teams; Days 2–3, research and plan; Days 4–7, design and build; Days 8–9, test and revise; Day 10, present and reflect. Within this arc, each daily STEM session follows a mini-structure: brief check-in (5 min), work time (30 min), debrief (5 min).\n\nManagement challenges are real in large classes: noise, access to materials, uneven team contributions. Strategies that help: assign roles within each group (materials manager, recorder, timekeeper, presenter); create clear material stations rather than distributing everything at once; use a visual project tracker on the wall so groups can see their progress. Expect iteration — the best STEM learning happens when initial designs fail and learners persevere.`,
          reflectionPrompt: 'Map out a 5-day mini STEM project for your class. What happens each day? What is the driving question? What will learners produce?',
          reflectionPlaceholder: 'Driving question: ...\nDay 1: ...\nDay 2: ...\nDay 3: ...\nDay 4: ...\nDay 5 (presentation): ...',
        },
        {
          id: 'l3', title: 'Showcasing and Celebrating Learner Work', duration: '15 min',
          videoTitle: 'STEM Fairs and Exhibitions: Making Learning Public',
          videoPoints: ['The value of an authentic audience', 'Organising a simple classroom STEM showcase', 'Linking projects to a local problem without inventing curriculum requirements', 'Assessing process, explanation and revision'],
          reading: `When learners share a STEM project with an audience — another class, families or a school community group — they must explain their decisions and respond to questions. That creates useful evidence of communication and reasoning. An audience is a design choice, not a claim that every project must become a competition.\n\nA simple showcase can work: each group displays a prototype or model, posts the selected outcome and criteria, explains one test, and records one question from a visitor. Keep the task linked to the current learning-area design and use a safe, accessible format for learners who cannot present in the same way.`,
          reflectionPrompt: 'How could you create a public audience for a learner STEM project this term? Who could you invite? How would you prepare learners to present?',
          reflectionPlaceholder: 'Audience: ...\nFormat: ...\nPreparation: ...\nDate I could do this: ...',
        },
      ],
    },
  ],
  preAssessment: [
    { id: 'q1', question: 'STEM education is best described as:', options: ['Teaching science, technology, engineering, and maths separately', 'An integrated approach connecting multiple disciplines to solve real problems', 'Only for secondary schools', 'A replacement for the CBC Science curriculum'], correct: 1, explanation: 'STEM is integrated — learners apply concepts from multiple disciplines to real problems.' },
    { id: 'q2', question: 'The 5E model stands for:', options: ['Explain, Explore, Experiment, Evaluate, Extend', 'Engage, Explore, Explain, Elaborate, Evaluate', 'Enable, Explore, Examine, Evaluate, Extend', 'Enquire, Explore, Explain, Examine, Evaluate'], correct: 1, explanation: '5E = Engage, Explore, Explain, Elaborate, Evaluate — a research-based inquiry teaching framework.' },
    { id: 'q3', question: 'A "fair test" in science means:', options: ['A test that all learners find easy', 'Changing one variable at a time while keeping others the same', 'Testing learners fairly without bias', 'A test that is graded fairly'], correct: 1, explanation: 'A fair test changes only one variable (independent variable) while controlling all others, making results valid.' },
    { id: 'q4', question: 'The "driving question" in PBL should be:', options: ['Closed — with one correct answer', 'Open-ended and connected to real-world problems', 'From the textbook', 'Decided only by the teacher'], correct: 1, explanation: 'A PBL driving question is open-ended, genuinely interesting, and connected to learners\' real world.' },
    { id: 'q5', question: 'Running a STEM project requires expensive equipment:', options: ['True — STEM needs labs and technology', 'False — many powerful investigations use everyday materials', 'Only partly — some technology is always required', 'Depends on the school budget'], correct: 1, explanation: 'False — bottle tops, cardboard, water, soil, and local materials support many powerful STEM investigations.' },
  ],
  postAssessment: [
    { id: 'q1', question: 'STEM integration in CBC connects best with which competencies?', options: ['Only digital literacy', 'Critical Thinking, Problem Solving, and Creativity', 'Only self-efficacy', 'Only communication'], correct: 1, explanation: 'STEM naturally develops Critical Thinking, Problem Solving, and Creativity — all core CBC competencies.' },
    { id: 'q2', question: 'In the 5E model, the "Explore" phase is:', options: ['The teacher explaining the concept', 'Learners investigating hands-on before the explanation', 'Learners taking a test', 'The homework phase'], correct: 1, explanation: 'Explore: learners investigate hands-on BEFORE the teacher explains — they discover before they are told.' },
    { id: 'q3', question: 'Cross-curricular STEM links are best built through:', options: ['Weekly STEM days only', 'Intentional noticing of connections across daily lessons', 'Separate STEM teachers', 'After-school clubs only'], correct: 1, explanation: 'Regular, intentional noticing of cross-subject connections is more effective than occasional special events.' },
    { id: 'q4', question: 'Learner voice and choice in PBL develops which CBC competency?', options: ['Digital Literacy only', 'Self-Efficacy, Critical Thinking, and Creativity', 'Citizenship only', 'Communication only'], correct: 1, explanation: 'When learners make choices about their investigation and product, they develop Self-Efficacy, Critical Thinking, and Creativity simultaneously.' },
    { id: 'q5', question: 'A public audience for STEM projects increases:', options: ['Test anxiety', 'Motivation, communication skills, and work quality', 'Competition between learners', 'Teacher workload only'], correct: 1, explanation: 'An authentic audience gives purpose to the work, increasing motivation, quality, and communication development.' },
    { id: 'q6', question: 'What should happen when a learner\'s STEM design fails?', options: ['Restart with a different topic', 'Treat failure as a learning opportunity and iterate', 'Give the learner the correct answer', 'Stop the project'], correct: 1, explanation: 'Failure and iteration are central to STEM learning — persevering through failure develops Self-Efficacy and genuine engineering thinking.' },
  ],
  assignment: {
    title: '2-Week STEM Project Plan',
    context: 'You have learned the principles of inquiry-based and project-based STEM learning. Now design a project you will actually run with your class.',
    task: 'Design a complete 2-week STEM project plan including: (1) A driving question connected to your community/environment, (2) Day-by-day outline (10 days), (3) Materials list using mostly locally available items, (4) How you will assess learning (not just the final product), (5) How you will share/celebrate the work with an audience.',
    hints: ['Choose a driving question that genuinely connects to your learners\' lives', 'Plan for failure — build in revision time', 'Assessment should happen throughout the project, not only at the end'],
    rubric: ['Driving question is open-ended, engaging, and community-connected', 'Day-by-day plan shows clear progression through inquiry stages', 'Materials are realistic and low-cost', 'Assessment plan is ongoing and competency-based', 'Celebration/showcase plan is achievable'],
  },
  certificate: { subtitle: 'STEM Integration Program', skills: ['STEM Education Principles', 'The 5E Inquiry Model', 'Fair Test Investigation Design', 'Cross-Curricular STEM Planning', 'Project-Based Learning', 'Low-Cost STEM Resources'] },
}

/* ── Coming-Soon Programs ──────────────────────────────────── */
const languageTeaching: Program = {
  id: 'language-teaching',
  title: 'Language Teaching in CBC',
  shortTitle: 'Languages',
  tagline: 'English & Kiswahili pedagogy in the CBC context',
  description: 'Effective strategies for teaching English and Kiswahili as both subjects and languages of instruction in the CBC era. Covers literacy development, multilingual classrooms, and reading competency.',
  track: 'languages',
  kicdAlignment: 'Current KICD language curriculum designs',
  hours: 5,
  lessons: 9,
  accent: 'primary',
  available: false,
  launchingSoon: true,
  modules: [],
  preAssessment: [],
  postAssessment: [],
  assignment: { title: '', context: '', task: '', hints: [], rubric: [] },
  certificate: { subtitle: 'Language Teaching Program', skills: [] },
}

const schoolLeadership: Program = {
  id: 'school-leadership',
  title: 'School Leadership & Management',
  shortTitle: 'Leadership',
  tagline: 'Lead CBC implementation from the front office',
  description: 'Professional development for school heads and deputy heads. Covers change management, instructional leadership, staff coaching, and performance management in a competency-based education context.',
  track: 'leadership',
  kicdAlignment: 'School leadership practice — source review pending',
  hours: 8,
  lessons: 12,
  accent: 'accent',
  available: false,
  launchingSoon: true,
  modules: [],
  preAssessment: [],
  postAssessment: [],
  assignment: { title: '', context: '', task: '', hints: [], rubric: [] },
  certificate: { subtitle: 'School Leadership Program', skills: [] },
}

const humanitiesTrack: Program = {
  id: 'humanities-integration',
  title: 'Humanities & Social Studies',
  shortTitle: 'Humanities',
  tagline: 'History, geography, citizenship in the CBC context',
  description: 'Teaching Social Studies, Religious Education, and Creative Arts with CBC competency-based approaches. Covers inquiry learning in the humanities and connecting to learners\' lived experiences.',
  track: 'humanities',
  kicdAlignment: 'Current KICD humanities and social-studies designs',
  hours: 5,
  lessons: 9,
  accent: 'primary',
  available: false,
  launchingSoon: true,
  modules: [],
  preAssessment: [],
  postAssessment: [],
  assignment: { title: '', context: '', task: '', hints: [], rubric: [] },
  certificate: { subtitle: 'Humanities Program', skills: [] },
}

/* ── Program 8: Teacher Wellbeing & Resilience ─────────────── */
const teacherWellbeing: Program = {
  id: 'teacher-wellbeing',
  title: 'Teacher Wellbeing & Resilience',
  shortTitle: 'Wellbeing',
  tagline: 'Sustain your passion for teaching',
  description: 'Build evidence-based habits to manage stress, prevent burnout, and sustain a fulfilling teaching career. Practical strategies designed for the realities of Kenyan CBC classrooms.',
  track: 'wellbeing',
  kicdAlignment: 'Professional practice and teacher wellbeing',
  hours: 4,
  lessons: 9,
  accent: 'accent',
  available: true,
  modules: [
    {
      id: 'm1',
      title: 'Understanding Your Stress',
      description: 'Recognise burnout signals early and understand what drives them in the Kenyan teaching context.',
      lessons: [
        {
          id: 'l1',
          title: 'Recognising Teacher Burnout Early',
          duration: '12 min',
          videoTitle: 'The Warning Signs Teachers Miss',
          videoPoints: [
            'Burnout versus normal tiredness — how to tell the difference',
            'The three dimensions: exhaustion, cynicism, reduced efficacy',
            'Why teachers are particularly vulnerable to chronic stress',
            'Common early signals that are easy to dismiss',
          ],
          reading: `Teacher burnout is not a personal failure — it is a predictable response to sustained, unmanaged demands. Understanding the signs early gives you the power to respond before your health and love for teaching suffer.

**The Three Phases of Burnout**

Burnout rarely arrives overnight. Phase one is enthusiasm erosion — lessons that used to energise you feel flat. Phase two is disillusionment — persistent cynicism about learners, colleagues, or the system. Phase three is depletion — emotional numbness and a sense that nothing you do matters.

**Early Warning Signs**

The most commonly missed signals: dreading Monday from Saturday afternoon; feeling resentful when a learner asks a question you've answered hundreds of times; increasing difficulty separating from work thoughts during personal time; physical symptoms like disrupted sleep, frequent illness, or persistent headaches.

**Why Teaching in Kenya Is Particularly Demanding**

CBC implementation has added substantial new complexity to an already demanding role. Teachers are expected to be curriculum designers, counsellors, assessors, and administrators simultaneously — often with inadequate training, large class sizes, and limited resources. Recognising these systemic pressures is not complaining; it is accurate accounting of your professional reality.`,
          reflectionPrompt: 'Where are you on the burnout spectrum right now?',
          reflectionPlaceholder: 'Be honest with yourself. Rate your energy, enthusiasm, and sense of purpose on a scale of 1–10. What signals have you been ignoring?',
        },
        {
          id: 'l2',
          title: 'The Science of Stress in Education',
          duration: '14 min',
          videoTitle: 'What Chronic Stress Does to a Teacher\'s Brain',
          videoPoints: [
            'The cortisol-performance curve: optimal stress vs. chronic overload',
            'How sustained stress erodes patience and empathy',
            'Why willpower alone does not fix teacher stress',
            'The biological case for rest as a professional tool',
          ],
          reading: `Understanding the biology of stress helps teachers make sense of their responses under pressure — and why recovery is not laziness but a professional necessity.

**The Stress Response**

When you perceive a threat — an angry parent, a collapsing lesson, 60 noisy learners — your body releases cortisol and adrenaline. Heart rate rises, focus narrows, and non-urgent systems (immune response, empathic processing) are temporarily suppressed. This is helpful for short-term challenges.

The problem begins when this response is chronically activated. In a demanding teaching environment, your nervous system may rarely fully return to baseline. Over weeks and months, elevated cortisol levels reduce patience and impulse control, suppress the immune system, and decrease creative thinking — exactly the capacities that make great teaching possible.

**Recovery Is a Professional Requirement**

Many teachers feel guilty about rest, especially during CBC workload peaks. But recovery is not the opposite of productivity — it is the precondition for it. A teacher operating at 60% on a rested brain is more effective than one at 100% on an exhausted one. Sleep, brief physical activity, social connection, and time without professional responsibility are biological inputs that make sustained teaching possible.`,
          reflectionPrompt: 'What does genuine recovery actually look like in your current week?',
          reflectionPlaceholder: 'When do you truly switch off from work? What gets in the way? What one change this week could create even 30 minutes of genuine rest?',
        },
        {
          id: 'l3',
          title: 'Kenya-Specific Teaching Pressures',
          duration: '13 min',
          videoTitle: 'The Unique Demands of CBC Teaching in Kenya',
          videoPoints: [
            'Class sizes and resource constraints as systemic stressors, not personal failures',
            'The emotional weight of the CBC transition — feeling watched and judged',
            'Community expectations and the "super-teacher" image',
            'Financial pressures specific to the Kenyan teaching workforce',
          ],
          reading: `Kenyan teachers face stressors that international wellbeing research rarely addresses. Applying generic wellness advice to a Kenyan classroom context often fails. This lesson addresses the specific landscape honestly.

**The CBC Transition Burden**

Teachers are learning a new framework while teaching it, with inadequate training, limited resources, and without seeing the full curriculum picture for their learners. This ambiguity creates chronic low-level anxiety that is easy to internalise as personal incompetence. It is a systems challenge being absorbed by individual teachers.

**Class Size Realities**

A class of 50+ learners requires individualised CBC assessment for every child. The emotional labour of maintaining positive, attentive relationships with 50 individuals — tracking their competencies, family situations, and wellbeing — is enormous. Acknowledging this is not complaining; it is accurate accounting of your work.

**Community Expectations**

In many Kenyan communities, teachers are expected to be available at all times. While this trust is meaningful, it extends professional responsibility into all areas of personal life. Communicating clearly and kindly about your availability is a professional skill, not rudeness.

**Financial Stress**

TSC salary delays, school-level financial expectations, and the cost of maintaining classroom resources from personal funds add material stress that affects wellbeing. These are systemic issues that deserve collective solutions — and individual acknowledgement.`,
          reflectionPrompt: 'Which systemic pressure affects you most? What is one thing within your control?',
          reflectionPlaceholder: 'Separate what you can influence from what you cannot. What one small shift in the controllable part could make a meaningful difference this term?',
        },
      ],
    },
    {
      id: 'm2',
      title: 'Practical Resilience Tools',
      description: 'Evidence-based, low-cost strategies you can start using this week.',
      lessons: [
        {
          id: 'l1',
          title: 'Micro-Recovery During the School Day',
          duration: '12 min',
          videoTitle: 'Small Habits That Restore Energy Without Extra Time',
          videoPoints: [
            'The 2-minute transition ritual between lessons',
            'Box breathing — a 90-second nervous system reset',
            'Strategic use of preparation periods for actual recovery',
            'The "shutdown complete" end-of-day practice',
          ],
          reading: `Wellbeing doesn't require a retreat. Daily micro-recovery practices can meaningfully reduce cumulative stress within the constraints of a full teaching timetable.

**The Transition Ritual**

Between lessons, your brain is still processing the previous class while preparing for the next. Without a reset, stress accumulates through the day. A simple 2-minute transition ritual — stepping outside briefly, taking 5 deep breaths, naming one thing that went well in the last lesson — breaks this accumulation.

**Box Breathing**

When you notice rising tension, box breathing activates the parasympathetic nervous system within 90 seconds. Inhale for 4 counts. Hold for 4. Exhale for 4. Hold for 4. Repeat 3–4 times. This is evidence-based, invisible to others, and requires nothing except 90 seconds of intention.

**Preparation Periods**

Research consistently shows that preparation periods used entirely for marking leave teachers more depleted, not less. Splitting prep time — 70% task-focused, 30% deliberately resting your thinking — produces better quality work and more sustainable energy across the day.

**The Shutdown Practice**

At the end of the working day, review your task list, update your plan for tomorrow, and say (or think) "shutdown complete." This signals to your brain that professional processing is done for the day — reducing the intrusive work thoughts that occupy personal time and fragment recovery.`,
          reflectionPrompt: 'Which micro-recovery practice could you realistically start tomorrow?',
          reflectionPlaceholder: 'Be specific. What time of day? What would it look like in your actual school context? What might get in the way, and how would you handle that?',
        },
        {
          id: 'l2',
          title: 'Setting Boundaries Without Guilt',
          duration: '15 min',
          videoTitle: 'Professional Limits as a Teaching Competency',
          videoPoints: [
            'Why boundaries protect learners as much as teachers',
            'Scripts for common boundary situations in Kenyan schools',
            'Communicating limits to parents, colleagues, and administration',
            'The difference between caring and absorbing',
          ],
          reading: `The most common reason teachers give for not setting limits is guilt — a feeling that a "real" teacher would always say yes. This lesson reframes boundaries as professional stewardship, not selfishness.

**Boundaries Protect Learners**

A teacher who never sets limits gradually becomes depleted. A depleted teacher has less patience, creativity, and emotional presence available for the class. Setting appropriate limits on your availability is, ultimately, a professional act of care for your learners.

**Common Situations and Responses**

*Parent messages after 8pm:* "Thank you for reaching out. I'll respond during school hours tomorrow."

*Unplanned extra duties:* "I want to do this well — could you tell me which current responsibility this replaces, or should we discuss with the head teacher?"

*Colleagues expecting unlimited support:* "I have 20 minutes now — is that enough? If we need longer, can we find a time that works for both of us?"

None of these responses are unkind. They are honest and they protect your capacity to teach.

**Caring Versus Absorbing**

There is a difference between caring about a learner's situation and taking on their distress as your own. You can hold compassion for a struggling family without personally solving their problems. This distinction — clearly understood — is the foundation of sustainable teaching.`,
          reflectionPrompt: 'Where in your professional life do you feel you have no boundaries? What is the cost?',
          reflectionPlaceholder: 'Name one boundary you have been needing to set. What is stopping you? Write the exact words you would use.',
        },
        {
          id: 'l3',
          title: 'Actually Resting During Holidays',
          duration: '13 min',
          videoTitle: 'Why Teachers Don\'t Feel Rested After Holidays (and How to Fix It)',
          videoPoints: [
            'Physical, cognitive, and emotional rest — three distinct needs',
            'Why marking during holidays prevents real recovery',
            'Planning the first and last weeks of term sustainably',
            'Social connection as a non-negotiable recovery tool',
          ],
          reading: `Most Kenyan teachers end a school holiday still feeling tired. This is because rest without intention rarely produces recovery. Understanding the types of rest — and planning deliberately for each — transforms holidays from administrative gaps into genuine restoration.

**Three Types of Rest**

*Physical rest* is sleep and reduced physical demand. Seven to eight hours of sleep per night consistently produces measurable improvements in mood, patience, and cognitive function within 5–7 days.

*Cognitive rest* is time without professional thinking. Checking curriculum resources, planning lessons, and reading education circulars all use the same mental resources as teaching. True cognitive rest requires at least 4–5 consecutive days with no professional reading or planning.

*Emotional rest* is time without being the person who is needed. For teachers who are also community resources, this can be the rarest form of rest. It requires deliberately communicating reduced availability and spending time in relationships where you receive care rather than only giving it.

**The First and Last Weeks of Term**

The first week back is often the most draining. Deliberately planning gentler activities — review and reconnection rather than new content — preserves energy for the rest of term. Similarly, planning the final week as reduced-load protects quality to the very last day and creates psychological closure.`,
          reflectionPrompt: 'Did you feel genuinely restored at the start of the last term? What was missing?',
          reflectionPlaceholder: 'Honestly describe your last holiday. Which type of rest was missing? What would you plan differently next time?',
        },
      ],
    },
    {
      id: 'm3',
      title: 'Sustaining a Teaching Career',
      description: 'Build long-term systems and habits that keep you engaged and effective for years.',
      lessons: [
        {
          id: 'l1',
          title: 'Building Your Teacher Support Network',
          duration: '12 min',
          videoTitle: 'Why Peer Support Is a Professional Necessity',
          videoPoints: [
            'The evidence for peer support on teacher retention and wellbeing',
            'Starting wellbeing conversations in your staffroom',
            'Formal and informal support structures in Kenyan schools',
            'Digital communities for Kenyan CBC teachers',
          ],
          reading: `Teacher isolation — working in professional silos without peer support — is one of the strongest predictors of early career exit. Building deliberate connections with colleagues is not a soft addition to PD; it is a career sustainability strategy.

**What Effective Peer Support Looks Like**

It often begins with two colleagues who agree to a weekly 15-minute check-in — not about logistics, but about how they are actually managing. "What worked this week? What are you struggling with?" — asked and answered honestly between trusted colleagues — does more for sustained wellbeing than many formal training events.

**Starting the Conversation**

Many teachers feel uncomfortable initiating wellbeing conversations, especially where professional stoicism is valued. A simple entry: "I've been finding [specific challenge] really hard this term. Have you had anything similar?" This invitation is almost universally met with relief rather than discomfort.

**Building on What Exists**

Most schools have informal peer relationships that can be intentionally deepened. The lunch break that could include one honest conversation. The staff group chat used for logistics that could also hold a weekly reflection question. The colleague who already checks on you — who could you offer that to in return?

These small, consistent investments in professional relationships are among the most evidence-based and lowest-cost interventions for teacher wellbeing available.`,
          reflectionPrompt: 'Who is in your professional support system? Are they aware of it?',
          reflectionPlaceholder: 'Name 1–2 colleagues who support you. What makes those relationships different? Is there someone you could offer that kind of intentional support to?',
        },
        {
          id: 'l2',
          title: 'Managing CBC Workload Sustainably',
          duration: '15 min',
          videoTitle: 'Working Smarter with CBC Planning and Assessment',
          videoPoints: [
            'The minimum viable lesson plan — what CBC actually requires vs. what teachers add',
            'Batching assessment to reduce daily cognitive load',
            'Using learners in the assessment process (as CBC intends)',
            'Identifying tasks that don\'t serve learners and declining them',
          ],
          reading: `CBC was designed to improve learning outcomes, not to maximise teacher administrative burden. Many teachers have accumulated workload that exceeds what KICD actually requires. This lesson helps identify and reduce that excess.

**The Minimum Viable Lesson Plan**

A CBC lesson plan needs: a clear learning outcome, an engaging activity, a formative check. It does not need to be a multi-page document for every lesson. Scheme of work and classroom lesson notes are different things — many teachers merge them unnecessarily due to anxiety or unclear school requirements.

Identify what your school actually requires versus what you are producing from habit. The gap is often significant and reducible.

**Batching Assessment**

Spreading assessment recording throughout the week means your brain never fully exits assessment mode. Designating two focused windows per week for all recording reduces both the total time and the cognitive residue. Involving learners in self-assessment and peer assessment is both pedagogically sound (CBC explicitly requires learner agency) and practically lightening.

**Strategic Prioritisation**

Not every request requires a yes. Developing clarity about what directly serves your learners — and politely declining what doesn't — is a professional skill that accumulates into significant workload reduction over a term. This is not laziness; it is professional stewardship.`,
          reflectionPrompt: 'Where is your workload higher than CBC actually requires? What could you simplify?',
          reflectionPlaceholder: 'List 3 tasks that take significant time. Which are KICD requirements? Which are school habits or personal anxiety? What would happen if you reduced them?',
        },
        {
          id: 'l3',
          title: 'Renewing Your Joy for Teaching',
          duration: '14 min',
          videoTitle: 'Reconnecting with Why You Chose This Work',
          videoPoints: [
            'The research on purpose as the strongest buffer against burnout',
            'Identifying your personal teaching "why"',
            'Designing small moments of joy into everyday practice',
            'Long-term career planning that honours your wellbeing',
          ],
          reading: `The teachers who sustain 20–30-year careers and look back with satisfaction are not those who experienced no difficulty. They are those who maintained access to their reasons for choosing teaching, even during the hardest periods.

**Purpose as a Buffer Against Burnout**

Research on occupational wellbeing consistently finds that sense of purpose is the strongest predictor of sustained engagement in demanding careers. Purpose doesn't mean feeling inspired every day — it means having a clear enough answer to "why am I doing this?" to navigate the days when the answer feels distant.

**Finding Your Teaching Why**

Reflect: When was the last time you felt genuinely effective as a teacher? What was happening? Who was involved? What specifically did you do? These answers point toward your professional values — the anchor you return to during difficult periods.

Common teaching "whys" among Kenyan teachers: seeing a first-generation learner access opportunities their parents couldn't. Watching a struggling child grasp something after weeks of patience. Building something in a community that will outlast your own presence there.

**Designing Joy Into Practice**

Joy in teaching is not something that happens to you — it is something you design. One topic per term that genuinely excites you. One lesson per week that you would be happy to have observed, not because it is perfect but because it is authentically yours. One learner per class who responds most visibly to what you offer.

These small designs, compounded across a career, create a teaching life that sustains itself.`,
          reflectionPrompt: 'What is your teaching why? When did you last feel clearly connected to it?',
          reflectionPlaceholder: 'Write it down — your actual reason for teaching, not what sounds good but what gets you up on the hard days. When did you last feel that clearly?',
        },
      ],
    },
  ],
  preAssessment: [
    { id: 'wb-pre-1', question: 'Which of these is a recognised early warning sign of teacher burnout?', options: ['Feeling more energised than usual', 'Reduced enthusiasm for lessons that previously engaged you', 'Wanting to improve lesson quality', 'Spending more time preparing'], correct: 1, explanation: 'Erosion of enthusiasm for previously engaging work is one of the earliest and most reliable burnout signals.' },
    { id: 'wb-pre-2', question: 'In CBC implementation, teacher stress is best understood as:', options: ['A personal weakness to overcome', 'Inevitable and unchangeable', 'A predictable response to systemic demands that can be managed', 'Proof that the teacher needs more training'], correct: 2, explanation: 'Burnout is a systemic, predictable response — not a personal failing. This framing is essential for genuine recovery.' },
    { id: 'wb-pre-3', question: 'Which activity provides the most effective cognitive rest?', options: ['Marking books in a different room', 'Reading CBC curriculum resources', 'Planning next term\'s lessons', 'Spending time completely away from professional tasks'], correct: 3, explanation: 'Cognitive rest requires complete disengagement from professional thinking — not just a change of location.' },
    { id: 'wb-pre-4', question: 'Setting professional limits (boundaries) primarily benefits:', options: ['Only the teacher\'s personal life', 'Only school administration', 'Both the teacher and their learners', 'Only parents'], correct: 2, explanation: 'A teacher with sustainable limits has more emotional presence, patience, and creativity available for learners.' },
    { id: 'wb-pre-5', question: 'The most evidence-based approach to managing CBC workload is:', options: ['Working longer hours to stay ahead', 'Identifying minimum viable requirements and reducing unnecessary additions', 'Delegating all marking to learners', 'Ignoring KICD assessment requirements'], correct: 1, explanation: 'Many teachers add workload beyond KICD requirements through anxiety or habit. Identifying the minimum viable approach reduces load without compromising standards.' },
    { id: 'wb-pre-6', question: 'Teacher peer support networks are most valuable because they:', options: ['Replace formal professional development', 'Provide emotional validation from colleagues who share the same context', 'Reduce class sizes', 'Guarantee salary increases'], correct: 1, explanation: 'Peer support from colleagues who understand the same pressures is one of the most effective and accessible wellbeing interventions available.' },
  ],
  postAssessment: [
    { id: 'wb-post-1', question: 'Box breathing works as a stress-reduction technique because it:', options: ['Distracts attention from the stressor', 'Activates the parasympathetic nervous system within 90 seconds', 'Increases cortisol levels temporarily', 'Requires 10+ minutes to be effective'], correct: 1, explanation: 'Controlled breathing directly activates the parasympathetic (rest-and-digest) nervous system, reducing the stress response rapidly.' },
    { id: 'wb-post-2', question: 'The "shutdown complete" practice helps teachers by:', options: ['Allowing them to work later in the evening', 'Signalling to the brain that professional processing is done for the day', 'Improving lesson planning quality', 'Reducing the need for sleep'], correct: 1, explanation: 'A deliberate end-of-day ritual creates psychological closure, reducing the intrusive work thoughts that fragment personal recovery time.' },
    { id: 'wb-post-3', question: 'When CBC workload exceeds what KICD requires, this is most often caused by:', options: ['Learner misbehaviour', 'Anxiety, habit, and unclear school requirements', 'TSC regulations', 'Parental demands'], correct: 1, explanation: 'Teachers frequently add documentation and planning work beyond KICD minimums due to anxiety or unclear guidance — reducing this excess is both practical and professionally sound.' },
    { id: 'wb-post-4', question: 'Emotional rest is best defined as:', options: ['Sleeping for more than 8 hours', 'Time without being the person who is needed', 'A holiday abroad', 'Avoiding all professional reading'], correct: 1, explanation: 'Emotional rest requires time in relationships and spaces where you receive care rather than giving it — especially important for teachers who are community resources.' },
    { id: 'wb-post-5', question: 'Your personal teaching "why" is most useful when:', options: ['Writing a job application', 'Navigating difficult periods by reconnecting with your professional purpose', 'Impressing inspectors', 'Completing TSC forms'], correct: 1, explanation: 'Purpose is the strongest buffer against burnout — not because it eliminates difficulty, but because it provides a clear reason to navigate through it.' },
    { id: 'wb-post-6', question: 'The most sustainable way to build peer support in a school is:', options: ['Formal weekly staff meetings', 'Small, consistent, honest check-ins with 1–2 trusted colleagues', 'Anonymous feedback boxes', 'Performance appraisals'], correct: 1, explanation: 'Sustained peer support grows from small, regular, honest exchanges between trusted colleagues — not from formal structures.' },
  ],
  assignment: {
    title: 'My Wellbeing Action Plan',
    context: 'You have explored the science of teaching stress and practical resilience strategies. Now it\'s time to create a personalised wellbeing plan for your specific context.',
    task: 'Write a 300–500 word Wellbeing Action Plan that: (1) honestly names your 2 biggest stress contributors this term, (2) identifies one micro-recovery practice you will commit to and how it fits your timetable, (3) describes one professional boundary you will set and the exact words you will use, and (4) states your teaching "why" in 2–3 sentences.',
    hints: [
      'Be honest about your actual situation — generic plans don\'t get implemented',
      'For the boundary, write the specific words, not just the intention',
      'Your "why" should be personal, not what sounds good on paper',
      'Consider what would make this plan easy to revisit in 4 weeks',
    ],
    rubric: [
      'Specific and honest identification of personal stressors',
      'Realistic micro-recovery practice with implementation detail',
      'Concrete boundary with specific language',
      'Authentic teaching purpose statement',
    ],
  },
  certificate: {
    subtitle: 'Teacher Wellbeing & Resilience Program',
    skills: [
      'Burnout recognition and early intervention',
      'Evidence-based stress management techniques',
      'Professional boundary-setting',
      'Sustainable CBC workload management',
      'Peer support and resilience building',
    ],
  },
}

/* ── Program 9: The AI-Empowered Educator ──────────────────────
   Built from the cleaned course content in lib/ai-toolkit-data.ts so the
   walkthroughs and copy-ready prompts live in one canonical place. Each of
   the 5 course modules becomes a LearningModule; each tool walkthrough
   becomes a lesson whose reading embeds the explanation, a "Think deeper"
   tip, and the copyable prompt template. */

// Per-lesson metadata (key points + reflection), in module/section order.
const AI_LESSON_META: { keyPoints: string[]; reflectionPrompt: string; reflectionPlaceholder: string }[] = [
  // M1
  {
    keyPoints: ['Map Google Classroom to the KICD hierarchy: Learning Area → Strand → Sub-Strand', 'One class per Learning Area, Topics for Strands', 'A naming convention that mirrors KNEC\'s CBA records'],
    reflectionPrompt: 'Sketch the Google Classroom structure for ONE grade you teach: which Learning Areas become classes, and which Strands become Topics? Where does your current setup differ?',
    reflectionPlaceholder: 'Grade: ...\nClasses (Learning Areas): ...\nTopics (Strands) for one class: ...\nWhat I would change from my current setup: ...',
  },
  {
    keyPoints: ['NotebookLM only answers from sources you upload, so it cannot hallucinate curriculum', 'Upload official KICD PDFs, not web summaries', 'Test grounding by asking for a specific Strand\'s Learning Outcomes'],
    reflectionPrompt: 'Which curriculum question do you most often get wrong or have to look up? Write the exact NotebookLM prompt you would use to ground that answer in your KICD document.',
    reflectionPlaceholder: 'A curriculum fact I am unsure of: ...\nThe document I would upload: ...\nMy grounding prompt: ...',
  },
  {
    keyPoints: ['A CBC lesson plan needs SLOs, Key Inquiry Question, organisation of learning, and assessment', 'Gemini produces a full plan only when the prompt carries the KICD fields', 'Hyper-local context (county, resources) produces usable plans'],
    reflectionPrompt: 'Run the lesson plan prompt for a real lesson next week, then critique the output: what did Gemini get right, and what did you have to change to make it truly classroom-ready?',
    reflectionPlaceholder: 'Lesson: ...\nWhat Gemini got right: ...\nWhat I had to edit: ...\nWhy the edit mattered: ...',
  },
  // M2
  {
    keyPoints: ['AI at Early Years serves the teacher, not the learner', 'Name the local environment in every prompt for usable activities', 'Generate bilingual (English + Kiswahili) materials in seconds'],
    reflectionPrompt: 'Generate one outdoor Environmental Activities game with the prompt, then judge it honestly: is it safe, doable with your class size, and truly using local materials? What would you adapt?',
    reflectionPlaceholder: 'Topic: ...\nThe game Gemini produced: ...\nMy safety / class-size / materials adaptations: ...',
  },
  {
    keyPoints: ['CBC builds parental engagement into assessment, especially at PP and Lower Primary', 'Home Learning Missions turn parents into evidence collectors', 'Keep posts short, simple, and bilingual for smartphone access'],
    reflectionPrompt: 'Most of your parents read this on a basic smartphone. Draft (or generate) one Home Learning Mission and check: could a parent with Form 4 education follow it without you explaining?',
    reflectionPlaceholder: 'The mission: ...\nWhere a parent might get confused: ...\nHow I simplified it: ...',
  },
  {
    keyPoints: ['Upload the KICD PP design + BECF to create a queryable curriculum expert', 'Ask for milestones, activities, and observation checklists', 'Add your county\'s support materials for local examples'],
    reflectionPrompt: 'What curriculum support do you most lack at your school? Write the three NotebookLM queries that would give you the fastest help, and predict what each would return.',
    reflectionPlaceholder: 'Support I lack: ...\nQuery 1: ... (expected answer: ...)\nQuery 2: ...\nQuery 3: ...',
  },
  // M3
  {
    keyPoints: ['PBL is where CBC\'s integrated learning becomes real', 'NotebookLM finds genuine cross-subject connections a single lesson book would miss', 'Anchor projects in real Kenyan community challenges'],
    reflectionPrompt: 'Pick a real challenge in your community (water, waste, food, road safety). Which three Learning Areas could a project on it genuinely connect, and what would learners produce for a real audience?',
    reflectionPlaceholder: 'Community challenge: ...\nThree Learning Areas it connects: ...\nThe tangible output learners would make: ...\nThe real audience: ...',
  },
  {
    keyPoints: ['Assess the thinking journey, not just the final product', 'A learner who failed, adjusted, and improved shows higher Critical Thinking than a lucky first try', 'Gemini writes a 5-dimension process rubric in minutes'],
    reflectionPrompt: 'Take a practical task you assess. Rewrite one rubric criterion so it rewards how a learner handled failure (testing, adjusting) rather than only whether the final product worked. What changes about who scores well?',
    reflectionPlaceholder: 'The task and criterion: ...\nOld (product-focused) wording: ...\nNew (process-focused) wording: ...\nWho now scores well that did not before: ...',
  },
  {
    keyPoints: ['The cba.knec.ac.ke portal is the record of truth; Classroom is your workspace', 'A private SBA-records class organises tools, rubrics, and scores by term', 'Gemini generates support / standard / extension SBA tasks for a mixed-ability class'],
    reflectionPrompt: 'How do you currently track SBAs, and where does it break down at report time? Describe the private SBA-records Classroom (Topics, what you post) you would set up to make an SQA inspection take 20 minutes.',
    reflectionPlaceholder: 'My current SBA tracking: ...\nWhere it breaks down: ...\nMy SBA-records Classroom structure: ...',
  },
  // M4
  {
    keyPoints: ['Gemini acts as a subject-specialist colleague for STEM teachers working alone', 'Specify language, IDE, and version to get practical CS output', 'Build problem scenarios from Kenyan industrial and agricultural contexts'],
    reflectionPrompt: 'Generate the debugging exercise for a topic you teach, then verify every bug: does the code actually contain four bugs of escalating subtlety, and is the marking guide fair? What did you correct?',
    reflectionPlaceholder: 'Topic: ...\nDid the four bugs hold up? ...\nWhat I corrected in the output: ...',
  },
  {
    keyPoints: ['Use the applicable Senior School learning-area design for any CSL task', 'A source-grounded notebook can organise local documents and learner questions', 'Upload real local documents and verify every curriculum-specific claim'],
    reflectionPrompt: 'Identify one local document (a chief\'s report, committee minutes, facility data) you could upload for a CSL project. What authentic research question could learners investigate from it?',
    reflectionPlaceholder: 'Local document: ...\nThe CSL project theme: ...\nThe learner research question: ...',
  },
  {
    keyPoints: ['Performance and creative work need portfolio assessment, not written tests', 'Classroom + Drive captures video, photo, and reflection evidence', 'Weekly logs build a longitudinal portfolio over three years'],
    reflectionPrompt: 'For your Arts or Sports subject, what three evidence types would best show a learner\'s growth over a term, and how would you structure the Classroom assignments to collect them without overwhelming yourself?',
    reflectionPlaceholder: 'Subject: ...\nThree evidence types: ...\nMy Classroom assignment structure: ...',
  },
  // M5
  {
    keyPoints: ['CBA asks what learners can demonstrate with what they know', 'Strong performance tasks have a defined context, evidence and criteria', 'Use EE1 to BE2 only where the applicable current KNEC framework requires those national sub-levels'],
    reflectionPrompt: 'Generate one performance task, then test it against the three qualities (authentic context, audience beyond you, a tangible product). Which quality is weakest, and how would you strengthen it?',
    reflectionPlaceholder: 'The task: ...\nAuthentic context? ...\nAudience beyond me? ...\nA product? ...\nThe weakest quality and my fix: ...',
  },
  {
    keyPoints: ['Rubrics + private comments + Gemini make feedback personal at scale', 'A Return & Resubmit policy enacts CBC\'s mastery philosophy', 'Frame feedback in competencies, not just right/wrong'],
    reflectionPrompt: 'Rewrite a piece of feedback you recently gave so it speaks in CBC competency language and names one specific next step. How does the competency framing change what the learner hears?',
    reflectionPlaceholder: 'My original feedback: ...\nRewritten in competency language: ...\nWhat changes for the learner: ...',
  },
  {
    keyPoints: ['Your best assessments are professional assets worth banking', 'NotebookLM generates variations and audits alignment', 'A shared school bank compounds in value over time'],
    reflectionPrompt: 'Run the KNEC alignment audit on one assessment you already use. What did it flag, and is the critique fair? What is one change you will actually make as a result?',
    reflectionPlaceholder: 'The assessment I audited: ...\nWhat the audit flagged: ...\nIs the critique fair? ...\nThe change I will make: ...',
  },
]

// Assemble one lesson's reading from a course section: the module-opening
// Kenyan story (first lesson only), the section's scenario as a callout, the
// explanation, an optional comparison table and feedback comment bank, the
// pedagogical tip, the copyable prompt, and the module's low-resource
// framework (last lesson only).
function aiReadingFor(s: AiModuleSection, mod: AiModule, isFirst: boolean, isLast: boolean): string {
  const parts: string[] = []

  if (isFirst) parts.push('## In a Kenyan classroom', '', mod.context, '')

  parts.push(`>> CASE: ${s.scenario}`, '', s.content, '')

  if (s.comparison) {
    parts.push(
      '### The shift in one example',
      '',
      '| 8-4-4 rote question | CBC performance task |',
      '| --- | --- |',
      `| ${s.comparison.traditional} | ${s.comparison.performance} |`,
      '',
      `**Competency developed:** ${s.comparison.competency}`,
      '',
    )
  }

  parts.push(`>> THINK: ${s.tip}`, '')

  if (s.commentBank) {
    parts.push(
      '### Ready-to-paste feedback templates',
      'Save these in your Google Classroom Comment Bank, then add one personalised line on top for each learner.',
      '',
    )
    for (const c of s.commentBank) {
      parts.push(`**${c.code}**`, '', '```', c.text, '```', '')
    }
  }

  parts.push(
    `### Prompt template: ${s.promptTitle}`,
    `Open ${s.tool}, paste the prompt below, and replace every [bracketed] field with your own classroom details before running it. Always review the output before using it with learners.`,
    '',
    '```',
    s.prompt,
    '```',
  )

  if (isLast && mod.lowResource) {
    parts.push('', `## ${mod.lowResource.title}`, '')
    for (const sc of mod.lowResource.scenarios) {
      parts.push(`### ${sc.label}`, ...sc.steps.map((st, i) => `${i + 1}. ${st}`), '')
    }
  }

  return parts.join('\n')
}

const aiEmpoweredEducator: Program = {
  id: 'ai-empowered-educator',
  title: 'The AI-Empowered Educator',
  shortTitle: 'AI for CBC',
  tagline: 'Master Gemini, NotebookLM & Google Classroom for CBC',
  description: 'A practical, tool-specific course on using Google\'s AI tools to support teaching from Pre-Primary to Senior School. Learn to ground drafts in the current KICD and KNEC documents, verify curriculum details, and adapt resources for real classrooms with copy-ready prompt templates.',
  track: 'core',
  kicdAlignment: 'Responsible digital practice with source verification',
  hours: AI_MODULES.reduce((s, m) => s + m.hours, 0),
  lessons: AI_MODULES.reduce((s, m) => s + m.sections.length, 0),
  accent: 'accent',
  available: true,
  modules: AI_MODULES.map((m, mi) => ({
    id: `m${mi + 1}`,
    title: m.title,
    description: m.tagline,
    lessons: m.sections.map((s, si) => {
      const meta = AI_LESSON_META[AI_MODULES.slice(0, mi).reduce((a, x) => a + x.sections.length, 0) + si]
      const pathwayLabel = s.pathway ? s.pathway.replace(/\s*Pathway$/, '') : ''
      return {
        id: `l${si + 1}`,
        title: pathwayLabel ? `${pathwayLabel}: ${s.title}` : s.title,
        duration: '30 min',
        videoTitle: `${s.tool}: ${s.title}`,
        videoPoints: meta.keyPoints,
        reading: aiReadingFor(s, m, si === 0, si === m.sections.length - 1),
        reflectionPrompt: meta.reflectionPrompt,
        reflectionPlaceholder: meta.reflectionPlaceholder,
      }
    }),
  })),
  preAssessment: [
    { id: 'q1', question: 'A teacher asks Gemini (with no documents attached) for the Grade 6 Integrated Science Learning Outcomes and pastes the answer straight into a scheme of work. What is the main risk?', options: ['Gemini is too slow for this', 'Gemini may produce plausible but incorrect curriculum details (hallucination)', 'Gemini cannot write in English', 'The answer will be too short'], correct: 1, explanation: 'Ungrounded AI can generate confident, wrong curriculum information. The course\'s core safeguard is grounding curriculum work in NotebookLM with the official KICD documents as the only sources.' },
    { id: 'q2', question: 'Which Google tool is, by design, unable to draw on information outside the files you upload, making it the most reliable for KICD curriculum work?', options: ['Gemini', 'Google Classroom', 'NotebookLM', 'Google Search'], correct: 2, explanation: 'NotebookLM answers only from your uploaded sources. That property is exactly what prevents curriculum hallucination.' },
    { id: 'q3', question: 'Which list names the four broad performance levels used in current KNEC competency-based assessment resources?', options: ['A, B, C, D', 'EE, ME, AE, BE', 'Distinction, Credit, Pass, Fail', '1, 2, 3, 4'], correct: 1, explanation: 'The broad levels are Exceeds Expectation (EE), Meets Expectation (ME), Approaches Expectation (AE), and Below Expectation (BE). Current KJSEA regulations further show actual levels within those broad levels; use those national details only where applicable.' },
    { id: 'q4', question: 'In this course\'s philosophy, what is the teacher\'s role relative to any AI output?', options: ['Trust it and deliver it directly to save time', 'Review and edit every output before it reaches learners', 'Only use AI for marking, never for planning', 'Avoid AI entirely in CBC'], correct: 1, explanation: 'AI serves the teacher; it never replaces professional judgement. Every prompt, activity, and rubric must be reviewed and edited before reaching learners.' },
    { id: 'q5', question: 'To align Google Classroom with CBC rather than 8-4-4 thinking, you should organise it around:', options: ['One class for the whole grade, Topics for subjects', 'Learning Areas as classes, Strands as Topics', 'One class per term', 'Topics named after textbook chapters'], correct: 1, explanation: 'Mapping the platform to KICD\'s hierarchy (Learning Area, Strand, Sub-Strand) makes your Gradebook directly mappable to KNEC\'s CBA records.' },
    { id: 'q6', question: 'Honestly, how confident are you right now using Gemini, NotebookLM, or Google Classroom to prepare CBC materials?', options: ['Very confident, I use them weekly', 'Somewhat, I have tried one of them', 'Rarely, I have heard of them but not used them for teaching', 'Not at all'], correct: 3, explanation: 'There is no wrong answer here. This question simply marks your starting point so you can see how far you have come by the post-assessment.' },
  ],
  postAssessment: [
    { id: 'q1', question: 'You need a Grade 4 rubric that is faithful to the official KICD outcomes. What is the most reliable workflow?', options: ['Ask Gemini with no documents and trust it', 'Ground the outcomes in NotebookLM from the uploaded KICD design, then refine the rubric wording with Gemini', 'Search the web and copy the first result', 'Write it from memory'], correct: 1, explanation: 'Use NotebookLM for fidelity to the source document, then Gemini for fluent rubric language. Tool choice follows the job: grounding vs generation.' },
    { id: 'q2', question: 'A colleague says "CBC means we stop using direct explanation and only do group projects." Based on this course, the best response is:', options: ['Correct, lecturing is banned in CBC', 'AI and CBC both still value clear teaching; what matters is that learners then DO something with it and produce evidence', 'CBC has no place for assessment', 'Only Senior School uses projects'], correct: 1, explanation: 'The tools reduce admin so teachers can focus on application and evidence. Explanation still matters; the shift is to what learners do with it.' },
    { id: 'q3', question: 'Which prompt detail will most improve a Gemini Computer Science debugging exercise for your school?', options: ['Asking for "good code"', 'Specifying the exact language, IDE, and version (e.g. Python 3.x in IDLE, offline)', 'Requesting the longest possible answer', 'Telling it the learners are clever'], correct: 1, explanation: 'Precise environment specification transforms the output from theoretical to something that actually runs on your school\'s machines.' },
    { id: 'q4', question: 'A performance task asks learners to "answer 20 recall questions about soil." Why does this fall short of CBA?', options: ['It is too long', 'It tests recall, not application to a real context with a product and audience', 'It uses the wrong font', 'Soil is not in the curriculum'], correct: 1, explanation: 'CBA asks what learners can DO with knowledge. Strong tasks have an authentic context, an audience beyond the teacher, and a tangible product.' },
    { id: 'q5', question: 'Why is the eight-point scale (EE1 to BE2) harder to design well than a simple "harder questions = higher mark" approach?', options: ['It is not harder, just longer', 'Each level must describe genuinely different observable performance, not just more difficulty', 'It requires a computer', 'KNEC does not allow it'], correct: 1, explanation: 'Distinguishing EE from ME means describing different qualities of performance against criteria, which is the new assessment literacy the course builds.' },
    { id: 'q6', question: 'Two teachers use Gemini for feedback. Teacher A writes "Wrong, redo it." Teacher B writes "Your problem identification was strong; revisit how you applied the formula in step 3 and show the working." Which is more CBC-aligned and why?', options: ['A, because it is shorter', 'B, because it is competency-framed, specific, and gives an actionable next step that builds Self-Efficacy', 'Neither, feedback should be a percentage', 'A, because it ranks the learner'], correct: 1, explanation: 'Competency-framed, specific, encouragement-first feedback with a clear next step builds Self-Efficacy and Learning to Learn, exactly what the course models.' },
  ],
  assignment: {
    title: 'Build and Ship One Real AI-Assisted CBC Resource',
    context: 'You have seen 15 walkthroughs and copied many prompts. Now produce one genuine, classroom-ready artifact using these tools, and reflect on the human judgement it required.',
    task: 'Choose ONE: (a) a lesson-plan draft grounded in the applicable KICD design, (b) an observable rubric for a performance task, or (c) a Home Learning Mission with a parent observation guide. Generate a first version with the relevant prompt, then EDIT it for your real class. Submit (350-550 words): (1) which artifact and tool you chose and why; (2) the prompt you used, including your local context; (3) the three most important edits you made to the AI\'s output and why each was necessary; (4) one limitation of the AI you noticed that a teacher must always watch for.',
    hints: [
      'Pick the artifact you will actually use this week, not a hypothetical one',
      'Ground anything curriculum-specific in NotebookLM, do not trust ungrounded recall',
      'Your edits are the assignment: they show your professional judgement, describe them precisely',
      'Be specific about the limitation, "it was generic" is weaker than "it invented a Sub-Strand that is not in the Grade 5 design"',
    ],
    rubric: [
      'Produces a genuine, classroom-ready artifact (not just a description)',
      'Shows the actual prompt with real local context filled in',
      'Names at least three specific, well-justified edits to the AI output',
      'Identifies a concrete AI limitation a teacher must guard against',
      'Reflects the course principle that AI serves, never replaces, professional judgement',
    ],
  },
  certificate: {
    subtitle: 'The AI-Empowered Educator Program',
    skills: ['Grounding AI drafts in KICD documents', 'Lesson planning with source verification', 'Evidence-based assessment design', 'Google Classroom workflows', 'Responsible, teacher-led AI practice'],
  },
}

export const PROGRAMS: Program[] = [
  cbcFoundations,
  assessmentForLearning,
  inclusiveEducation,
  aiEmpoweredEducator,
  stemIntegration,
  teacherWellbeing,
  languageTeaching,
  schoolLeadership,
  humanitiesTrack,
]

export const TRACKS: { id: Track; label: string; count: number }[] = [
  { id: 'core',      label: 'Core CBC',  count: 4 },
  { id: 'stem',      label: 'STEM',      count: 1 },
  { id: 'wellbeing', label: 'Wellbeing', count: 1 },
  { id: 'languages', label: 'Languages', count: 1 },
  { id: 'humanities',label: 'Humanities',count: 1 },
  { id: 'leadership',label: 'Leadership',count: 1 },
]

export function getProgramById(id: string): Program | undefined {
  return PROGRAMS.find(p => p.id === id)
}

export function getLessonById(program: Program, moduleId: string, lessonId: string) {
  const mod = program.modules.find(m => m.id === moduleId)
  if (!mod) return null
  const lesson = mod.lessons.find(l => l.id === lessonId)
  if (!lesson) return null
  return { module: mod, lesson }
}

export function getNextLesson(program: Program, moduleId: string, lessonId: string): { moduleId: string; lessonId: string } | null {
  for (let mi = 0; mi < program.modules.length; mi++) {
    const mod = program.modules[mi]
    if (mod.id !== moduleId) continue
    const li = mod.lessons.findIndex(l => l.id === lessonId)
    if (li < mod.lessons.length - 1) return { moduleId: mod.id, lessonId: mod.lessons[li + 1].id }
    if (mi < program.modules.length - 1) {
      const nextMod = program.modules[mi + 1]
      return { moduleId: nextMod.id, lessonId: nextMod.lessons[0].id }
    }
    return null
  }
  return null
}

export function getPrevLesson(program: Program, moduleId: string, lessonId: string): { moduleId: string; lessonId: string } | null {
  for (let mi = 0; mi < program.modules.length; mi++) {
    const mod = program.modules[mi]
    if (mod.id !== moduleId) continue
    const li = mod.lessons.findIndex(l => l.id === lessonId)
    if (li > 0) return { moduleId: mod.id, lessonId: mod.lessons[li - 1].id }
    if (mi > 0) {
      const prevMod = program.modules[mi - 1]
      return { moduleId: prevMod.id, lessonId: prevMod.lessons[prevMod.lessons.length - 1].id }
    }
    return null
  }
  return null
}

export function getTotalLessons(program: Program): number {
  return program.modules.reduce((sum, m) => sum + m.lessons.length, 0)
}
