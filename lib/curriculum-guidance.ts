/**
 * Evidence-led implementation notes for the teacher-development catalogue.
 *
 * These notes are deliberately separate from the lesson copy. The lesson IDs
 * are part of the learner-progress contract, while this layer can be refined
 * as KICD and KNEC publish new guidance without orphaning completion records.
 */

export type CurriculumSource = {
  title: string
  organisation: string
  url: string
  note: string
}

export type ImplementationGuide = {
  focus: string
  keyConcepts: string[]
  outcomes: string[]
  workflow: string[]
  scenario: {
    context: string
    teacherAction: string
    learnerEvidence: string
    assessmentDecision: string
  }
  practicalTask: {
    title: string
    instructions: string[]
    evidence: string[]
  }
  reflection: string
  sources: CurriculumSource[]
}

const becf: CurriculumSource = {
  title: 'Basic Education Curriculum Framework',
  organisation: 'Kenya Institute of Curriculum Development',
  url: 'https://kicd.ac.ke/curriculum-reform/basic-education-curriculum-framework/',
  note: 'Use the framework for the national vision, competencies, values, PCIs, levels and assessment principles.',
}

const designs: CurriculumSource = {
  title: 'Regular Curriculum Designs',
  organisation: 'Kenya Institute of Curriculum Development',
  url: 'https://kicd.ac.ke/cbc-materials/curriculum-designs/regular-curriculum-designs/',
  note: 'Select the exact grade and learning-area design before copying a strand, sub-strand or learning outcome into a plan.',
}

const grade7Designs: CurriculumSource = {
  title: 'Grade Seven Designs',
  organisation: 'Kenya Institute of Curriculum Development',
  url: 'https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-seven-designs/',
  note: 'The current Grade 7 page lists the available regular learning-area designs; it is safer than relying on a fixed, generic JSS subject list.',
}

const grade9Designs: CurriculumSource = {
  title: 'Grade Nine Designs',
  organisation: 'Kenya Institute of Curriculum Development',
  url: 'https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-nine-designs/',
  note: 'Use the current Grade 9 designs when planning transition evidence or preparing learners for Senior School decisions.',
}

const grade10Designs: CurriculumSource = {
  title: 'Grade 10 Designs',
  organisation: 'Kenya Institute of Curriculum Development',
  url: 'https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-ten/',
  note: 'The current page groups designs under Applied Sciences, Arts & Sports, Foreign Languages, Humanities, Languages, Pure Sciences, Religious Education and Technical Studies.',
}

const cba: CurriculumSource = {
  title: 'Competency-Based Assessment resources',
  organisation: 'Kenya National Examinations Council',
  url: 'https://www2.knec.ac.ke/services/cba/',
  note: 'Use KNEC assessment resources for current assessment terminology, tools and framework-specific guidance.',
}

const cbaTraining: CurriculumSource = {
  title: 'Competency-Based Assessment: Age-Based Regular Training Manual',
  organisation: 'Kenya National Examinations Council',
  url: 'https://www2.knec.ac.ke/wp-content/uploads/2023/06/CBA-Age-Based-Regular-Training-Manual.pdf',
  note: 'Useful for the practical use of observation schedules, portfolios, analytic rubrics and holistic rubrics.',
}

const kjsea: CurriculumSource = {
  title: 'KJSEA Regulations',
  organisation: 'Kenya National Examinations Council',
  url: 'https://www.knec.ac.ke/wp-content/uploads/2026/02/KJSEA-REGULATIONS.pdf',
  note: 'Use this for current KJSEA context and the national four-level reporting table; do not silently transfer national score bands to every classroom task.',
}

const cbePlacement: CurriculumSource = {
  title: 'Status of the ongoing placement of Grade Nine learners in Senior Schools',
  organisation: 'Ministry of Education, Kenya',
  url: 'https://www.education.go.ke/status-ongoing-placement-grade-nine-learners-senior-schools',
  note: 'Use for the current description of Senior School pathway selection: STEM, Social Sciences, and Arts and Sports.',
}

const teacherWellbeingSources: CurriculumSource[] = [becf, designs]

function guide(
  focus: string,
  keyConcepts: string[],
  outcomes: string[],
  workflow: string[],
  scenario: ImplementationGuide['scenario'],
  practicalTask: ImplementationGuide['practicalTask'],
  reflection: string,
  sources: CurriculumSource[] = [becf, designs],
): ImplementationGuide {
  return { focus, keyConcepts, outcomes, workflow, scenario, practicalTask, reflection, sources }
}

export const CURRICULUM_SOURCES = {
  becf,
  designs,
  grade7Designs,
  grade9Designs,
  grade10Designs,
  cba,
  cbaTraining,
  kjsea,
  cbePlacement,
}

export const MODULE_GUIDES: Record<string, ImplementationGuide> = {
  'cbc-foundations/m1': guide(
    'Translate the framework into an observable classroom design.',
    ['Competency', 'Specific learning outcome', 'Learning experience', 'Evidence of learning'],
    [
      'Distinguish a competency, a learning outcome and a topic when reading a curriculum design.',
      'Rewrite one topic-led intention as an observable learner performance.',
      'Plan one experience that requires learners to use knowledge, skills and values together.',
    ],
    [
      'Open the exact grade and learning-area design and copy the outcome verbatim into your plan.',
      'Underline the observable verb and name the knowledge, skill and value involved.',
      'Choose an authentic local situation that makes the performance necessary.',
      'Decide in advance what each learner will say, make, do or record as evidence.',
    ],
    {
      context: 'A Grade 6 class in a school near a seasonal river can recite water-cycle terms but cannot explain why the nearby water point is unreliable.',
      teacherAction: 'The teacher keeps the curriculum wording beside the lesson plan, models one explanation, then asks pairs to use the water-cycle idea to interpret a local observation and recommend one action.',
      learnerEvidence: 'Each learner produces a labelled explanation with a cause-and-effect link and gives one reason for the recommendation; the group poster is supporting evidence, not the only evidence.',
      assessmentDecision: 'The teacher sorts evidence against the outcome verb: learners who can name stages but cannot explain the link receive a short re-teaching prompt and a second, smaller example.',
    },
    {
      title: 'Outcome-to-evidence redesign',
      instructions: ['Select a real outcome from your current KICD design.', 'Write the topic, outcome verb, target competency, local situation and individual evidence.', 'Add one scaffold for learners who need support and one extension that increases independence.', 'Ask a colleague whether the evidence would prove the outcome without relying on a group product.'],
      evidence: ['A source-traceable outcome', 'One learner-facing performance task', 'A support and extension move', 'A short evidence decision rule'],
    },
    'Which part of your current plan is driven by the textbook sequence rather than the intended learner performance, and what will you change first?',
  ),
  'cbc-foundations/m2': guide(
    'Design tasks that genuinely develop the seven core competencies.',
    ['Communication and Collaboration', 'Critical Thinking and Problem Solving', 'Creativity and Imagination', 'Citizenship', 'Digital Literacy', 'Learning to Learn', 'Self-Efficacy'],
    [
      'Identify the competency demanded by a task rather than merely named in a plan.',
      'Build individual accountability into collaborative learning.',
      'Collect evidence of competency development without reducing it to a personality label.',
    ],
    [
      'Start with the content outcome and choose one or two competencies that the task requires.',
      'Add a decision, explanation, creation or reflection that makes the competency visible.',
      'Give each learner a role and an individual trace of thinking.',
      'Record the evidence using descriptive notes linked to the task criteria.',
    ],
    {
      context: 'Four learners are asked to design a fair way to share three chapatis among five people. One learner usually writes while the others watch.',
      teacherAction: 'The teacher gives roles, requires each learner to draw or explain one part, and asks another group to challenge the fairness rule before the group revises it.',
      learnerEvidence: 'Learners show a representation, explain the rule, respond to a challenge and record one change they made after feedback.',
      assessmentDecision: 'The teacher records separate evidence for reasoning, explanation and participation, then plans a short partner rehearsal for learners whose ideas were correct but not yet clearly communicated.',
    },
    {
      title: 'Competency task audit',
      instructions: ['Choose one group activity from this week.', 'Complete: “The task cannot be completed well unless learners ___.”', 'Add a structure for individual thinking and a second way to demonstrate learning.', 'Write the exact teacher observation you will record.'],
      evidence: ['A revised task brief', 'Role and accountability structure', 'One observation note per focus learner', 'A next-step teaching decision'],
    },
    'Which competency is most often written into your plans but least visible in learner work? What change to the task would make it observable?',
  ),
  'cbc-foundations/m3': guide(
    'Make the pedagogical shift practical without treating CBC as a ban on explanation.',
    ['Direct teaching', 'Guided practice', 'Independent application', 'Transfer', 'Feedback'],
    [
      'Sequence explanation, modelling, guided practice and independent application.',
      'Replace false oppositions such as “teacher-led or learner-centred” with an intentional lesson sequence.',
      'Use a new context to test whether learners can transfer the learning.',
    ],
    [
      'Give a brief explanation or model where it removes a barrier.',
      'Move the cognitive work to learners through a worked example and a partially completed example.',
      'Provide a new but related situation that cannot be solved by copying.',
      'Use evidence from the new situation to plan remediation or enrichment.',
    ],
    {
      context: 'After a clear lesson on erosion, learners can repeat the definition but cannot advise where to place a simple drain on the school compound.',
      teacherAction: 'The teacher models how to inspect slope and soil, then withdraws support as groups compare two sites and justify a recommendation.',
      learnerEvidence: 'Each learner annotates a site sketch, states the decision rule used and explains one limitation of the recommendation.',
      assessmentDecision: 'If learners name factors but do not connect them to the decision, the next lesson uses one worked example and a sentence frame before another local case.',
    },
    {
      title: 'Three-phase lesson rehearsal',
      instructions: ['Take one explanation-heavy lesson.', 'Mark the five-minute teacher model, the guided practice and the independent transfer task.', 'Add one low-resource local context and one evidence prompt.', 'Plan what you will do for learners who need another model and those ready for a changed variable.'],
      evidence: ['Revised lesson sequence', 'Transfer task', 'Differentiation decision', 'Teacher reflection after delivery'],
    },
    'Where do you currently withdraw teacher support too early, or keep it too long? Name the evidence that will tell you when to release responsibility.',
  ),

  'assessment-for-learning/m1': guide(
    'Use assessment evidence to decide what happens next in teaching.',
    ['Assessment for learning', 'Assessment as learning', 'Assessment of learning', 'Criteria', 'Performance levels'],
    [
      'Match an assessment method to the performance the learner must demonstrate.',
      'Separate evidence collection from judgement and from the next instructional decision.',
      'Explain the difference between classroom formative evidence and national assessment reporting.',
    ],
    [
      'Name the outcome and success criteria before choosing a tool.',
      'Collect evidence during performance through observation, questioning or work samples.',
      'Interpret patterns rather than relying on one mark or one group product.',
      'Give a next step and schedule another opportunity to demonstrate the learning.',
    ],
    {
      context: 'During a Grade 5 fractions task, most learners find equivalent fractions with a diagram, but several cannot explain why the two representations are equal.',
      teacherAction: 'The teacher records the specific explanation gap, pairs learners for oral rehearsal, and uses a short exit response requiring a diagram plus one sentence.',
      learnerEvidence: 'A representation, an explanation and a corrected response after feedback.',
      assessmentDecision: 'The next lesson begins with a targeted mini-lesson for the explanation gap; learners who already justify equivalence compare two different representations.',
    },
    {
      title: 'Evidence-to-action assessment cycle',
      instructions: ['Choose one current outcome.', 'Write one performance prompt and two criteria.', 'Select three evidence sources: observation, learner work and learner explanation.', 'For each likely pattern, write the next teaching action.'],
      evidence: ['Aligned prompt', 'Criteria sheet', 'Three evidence entries', 'A remediation/enrichment plan'],
    },
    'When you collect assessment evidence, how often does it change tomorrow’s instruction? What would make that link visible?',
    [becf, cba, cbaTraining],
  ),
  'assessment-for-learning/m2': guide(
    'Run formative assessment in a large class without creating an unmanageable marking burden.',
    ['Diagnostic prompt', 'Hinge question', 'Exit response', 'Observation schedule', 'Feedback loop'],
    [
      'Choose a quick check that reveals the intended thinking, not just confidence or compliance.',
      'Record a manageable sample while ensuring every learner produces evidence over time.',
      'Use the result to regroup, reteach, extend or change the next example.',
    ],
    [
      'Prepare one hinge question with plausible wrong answers.',
      'Ask every learner to respond using a low-resource method such as slate, fingers or a written slip.',
      'Sample observation across a planned rotation of learners.',
      'Close the loop by showing learners how their responses changed the next activity.',
    ],
    {
      context: 'In a 58-learner class, a whole-class “Do you understand?” gets nods, but the next independent task reveals a common misconception about place value.',
      teacherAction: 'The teacher uses a two-choice hinge question, asks every learner to show a response, and probes two contrasting explanations instead of asking for hands up.',
      learnerEvidence: 'Every learner gives a response; selected learners explain their reasoning; the teacher captures the misconception pattern.',
      assessmentDecision: 'The teacher pauses the planned sequence, models the contrast with bottle tops or place-value cards, and rechecks with a changed number.',
    },
    {
      title: 'One-minute formative check',
      instructions: ['Write the exact outcome and misconception you want to detect.', 'Create one prompt with four possible response patterns.', 'Choose a response method that all learners can use.', 'Decide what each pattern will trigger before you teach.'],
      evidence: ['Prompt and response key', 'Class pattern count', 'Two observation notes', 'Documented next step'],
    },
    'Which quick check in your classroom currently produces the least trustworthy evidence, and how could you make every learner’s thinking visible?',
    [becf, cba, cbaTraining],
  ),
  'assessment-for-learning/m3': guide(
    'Build portfolios as curated evidence of progression, not storage for everything learners produce.',
    ['Selection', 'Chronology', 'Learner voice', 'Feedback', 'Progression'],
    [
      'Select work samples that show an outcome, feedback and change over time.',
      'Teach learners to explain why a sample belongs in the portfolio.',
      'Use a portfolio conference to identify a precise next learning goal.',
    ],
    [
      'Label each sample with grade, learning area, outcome and date.',
      'Keep an early attempt, feedback and revised attempt where practical.',
      'Add the learner’s short explanation and the teacher’s evidence note.',
      'Review a small set at a regular interval and use it to plan the next task.',
    ],
    {
      context: 'A learner’s portfolio contains ten neat final drawings but no earlier attempts, criteria or learner explanation, so the teacher cannot see progression.',
      teacherAction: 'The teacher keeps one initial sample, one feedback record and one revision, then holds a two-minute learner conference using “I can now… / My next step…”.',
      learnerEvidence: 'A dated work sequence, learner explanation and revised product linked to the same criteria.',
      assessmentDecision: 'The teacher uses the gap in the sequence to plan a targeted practice task, not to infer ability from presentation quality.',
    },
    {
      title: 'Portfolio evidence curation',
      instructions: ['Choose one outcome and three samples from a learner’s work.', 'Remove anything that does not help explain progression.', 'Add one learner voice prompt and one teacher evidence note.', 'Write the next goal in the same language as the outcome.'],
      evidence: ['Curated sequence', 'Learner reflection', 'Teacher note', 'Next-goal statement'],
    },
    'Does your current portfolio help another teacher understand what the learner can do next? What label or evidence is missing?',
    [becf, cba, cbaTraining],
  ),

  'inclusive-education/m1': guide(
    'Identify barriers to participation and plan support without lowering the intended learning outcome.',
    ['Barrier', 'Participation', 'Strengths-based evidence', 'Reasonable adjustment', 'Referral and collaboration'],
    [
      'Describe a learning barrier in observable terms rather than labelling the learner.',
      'Use learner strengths and interests as entry points to the same intended learning.',
      'Choose a support that can be reviewed using evidence.',
    ],
    [
      'Observe when and where participation breaks down.',
      'Ask the learner and relevant adults what already helps.',
      'Adjust access, process or expression while keeping the outcome clear.',
      'Review the evidence and involve school support structures where needed.',
    ],
    {
      context: 'A learner contributes accurate oral answers about a science process but rarely completes long written responses within the lesson time.',
      teacherAction: 'The teacher provides a vocabulary bank, chunked writing space and an option to rehearse orally before writing, while keeping the same explanation outcome.',
      learnerEvidence: 'The learner gives the explanation orally, then produces a shorter structured written response using the agreed support.',
      assessmentDecision: 'The teacher records the evidence against the outcome, checks whether the support increases independence, and consults the school’s support process if the barrier persists.',
    },
    {
      title: 'Barrier-to-support plan',
      instructions: ['Choose an anonymised learner and one outcome.', 'Describe the observable barrier and a strength.', 'Plan one environmental, process or expression adjustment.', 'Define the evidence that would show the support is helping.'],
      evidence: ['Respectful barrier description', 'Strength-based entry point', 'Specific adjustment', 'Review date and evidence rule'],
    },
    'Which classroom routine creates an unnecessary barrier for some learners? What would you change before asking the learner to “try harder”?',
    [becf, designs],
  ),
  'inclusive-education/m2': guide(
    'Differentiate the route to learning while preserving challenge and dignity.',
    ['Representation', 'Engagement', 'Action and expression', 'Scaffolding', 'Extension'],
    [
      'Design one common outcome with more than one supported route to it.',
      'Use flexible grouping that changes with the evidence and task.',
      'Plan scaffolds that can be removed as learner independence grows.',
    ],
    [
      'Present the concept in at least two accessible ways.',
      'Offer a choice of response mode where it still measures the outcome.',
      'Use temporary groups for a named need, then regroup for practice or peer explanation.',
      'Check that support changes access, not the intellectual demand of the outcome.',
    ],
    {
      context: 'For a water-cycle explanation, some learners need a labelled sequence and sentence frame; others are ready to explain how land cover changes runoff.',
      teacherAction: 'The teacher offers the same core outcome with a visual scaffold, oral rehearsal and an extension variable. Groups are formed for the task, not as permanent ability labels.',
      learnerEvidence: 'Every learner explains the cycle; some use a scaffold and others handle the extension with independent justification.',
      assessmentDecision: 'The teacher notes which scaffold was used and whether it can be reduced next time; extension evidence informs enrichment rather than a higher “grade”.',
    },
    {
      title: 'Three-route lesson design',
      instructions: ['Select one outcome from your grade design.', 'Create a common success criterion.', 'Plan a supported route, a core route and an extension route.', 'Add the point at which you will regroup or remove support.'],
      evidence: ['Common outcome and criteria', 'Three routes', 'Grouping decision', 'Scaffold-release note'],
    },
    'When you differentiate, are you changing access or quietly reducing the thinking? What evidence will keep the task ambitious and fair?',
    [becf, designs],
  ),
  'inclusive-education/m3': guide(
    'Make the classroom environment, relationships and family partnership part of the learning design.',
    ['Predictable routines', 'Belonging', 'Participation', 'Family partnership', 'Support team'],
    [
      'Audit the physical and social environment for barriers before a lesson begins.',
      'Teach participation routines that make safety and respect observable.',
      'Communicate with families about strengths, evidence and next steps.',
    ],
    [
      'Display the task sequence and key vocabulary before activity time.',
      'Co-create a small number of teachable interaction routines.',
      'Use regular, strength-based communication rather than contacting a family only after a problem.',
      'Record agreed supports and review them with the learner and relevant school staff.',
    ],
    {
      context: 'During group work, the same confident speakers answer while a learner who needs more processing time is repeatedly interrupted.',
      teacherAction: 'The teacher adds silent think time, turn-taking roles and a written idea before discussion, then models how to invite and build on a peer contribution.',
      learnerEvidence: 'More learners contribute an idea, listen and respond using the routine; the focus learner’s contribution is captured without singling them out.',
      assessmentDecision: 'The teacher reviews participation evidence and adjusts the next group task if roles are producing compliance rather than genuine collaboration.',
    },
    {
      title: 'Inclusion walk-through',
      instructions: ['Walk through your classroom before learners arrive.', 'Record two physical, two instructional and one social barrier.', 'Choose one low-cost change and teach the routine explicitly.', 'Ask learners what helped and record the next adjustment.'],
      evidence: ['Barrier audit', 'Implemented change', 'Learner feedback', 'Follow-up observation'],
    },
    'Who is consistently less visible in your classroom evidence, and what change to the environment or routine would make participation safer?',
    [becf, designs],
  ),

  'stem-integration/m1': guide(
    'Plan integrated STEM experiences from a real problem and trace each learning-area contribution.',
    ['Problem context', 'Disciplinary contribution', 'Design constraint', 'Prototype', 'Evidence'],
    [
      'Identify a genuine problem that can be investigated with available resources.',
      'Map what each learning area contributes without inventing a cross-curricular outcome.',
      'Require learners to measure, explain, test or improve a solution.',
    ],
    [
      'Start with the specific grade learning-area outcomes.',
      'Write the shared problem and separate the evidence expected from each learning area.',
      'Set a material, time or safety constraint that makes design decisions visible.',
      'Build in test, feedback and revision before the final explanation.',
    ],
    {
      context: 'A school garden loses water between collection and use. Grade 7 learners investigate the loss instead of being given a ready-made “STEM project”.',
      teacherAction: 'The teacher sets the problem, safety boundaries and learning-area criteria, while learners measure containers, compare materials and defend a low-cost improvement.',
      learnerEvidence: 'Measurement record, test result, annotated design and oral justification of a revision.',
      assessmentDecision: 'The teacher assesses the named outcomes separately and uses the test results to decide whether learners need more measurement practice or a new design constraint.',
    },
    {
      title: 'Local problem STEM brief',
      instructions: ['Select one current outcome in Science, Mathematics, Pre-Technical Studies or another relevant learning area.', 'Write a local problem without prescribing the solution.', 'List materials, safety limits and evidence for each learning area.', 'Plan one test and one revision conference.'],
      evidence: ['Problem brief', 'Outcome map', 'Prototype or model', 'Test and revision record'],
    },
    'Are you integrating learning areas because the ideas genuinely connect, or because the label “STEM” sounds attractive? What evidence would show the connection is real?',
    [becf, designs],
  ),
  'stem-integration/m2': guide(
    'Use inquiry and engineering cycles to turn curiosity into defensible evidence.',
    ['Question', 'Prediction', 'Fair test', 'Data', 'Claim-evidence-reasoning'],
    [
      'Turn a broad topic into a testable classroom question.',
      'Control or describe variables sufficiently for learners to interpret a result.',
      'Use data to support a claim and identify a limitation.',
    ],
    [
      'Elicit a learner question and narrow it to one variable or comparison.',
      'Ask learners to predict and explain the basis of the prediction.',
      'Agree on a safe procedure and a simple recording table.',
      'Compare results, discuss anomalies and revise the explanation.',
    ],
    {
      context: 'Learners want to know which local soil holds more water, but groups plan different amounts of water and different container sizes.',
      teacherAction: 'The teacher uses the 5E sequence as a planning aid, not a script: learners engage with the problem, explain variables, test one comparison and evaluate the evidence.',
      learnerEvidence: 'A question, controlled procedure, data table, claim supported by data and one limitation.',
      assessmentDecision: 'The teacher re-teaches fair testing if learners change more than one variable; learners with sound controls extend by proposing a follow-up test.',
    },
    {
      title: 'Fair-test clinic',
      instructions: ['Take a familiar demonstration.', 'Ask what learners would change and what must stay the same.', 'Have groups critique two procedures and repair the weaker one.', 'Collect the revised procedure and evidence table.'],
      evidence: ['Testable question', 'Variable plan', 'Procedure', 'Data-supported conclusion'],
    },
    'Which part of your inquiry lessons is pre-decided by the teacher? Could learners own the question, the method, the explanation, or the next test?',
    [becf, designs],
  ),
  'stem-integration/m3': guide(
    'Run practical projects as a sequence of evidence-bearing milestones.',
    ['Driving question', 'Milestone', 'Audience', 'Iteration', 'Process rubric'],
    [
      'Write a driving question that is open enough for different solutions but bounded by the learning outcomes.',
      'Schedule planning, prototype, feedback and showcase milestones.',
      'Assess process and product with criteria learners see before they begin.',
    ],
    [
      'Name the outcome and real audience first.',
      'Create a one-page brief with roles, resources, safety and dates.',
      'Collect a proposal, prototype evidence and peer feedback before final work.',
      'Use the showcase for explanation and reflection, not just display.',
    ],
    {
      context: 'A class is asked to “make something useful from waste” and produces identical decorations with no investigation or revision.',
      teacherAction: 'The teacher replaces the vague brief with a school-specific need, a user, a material constraint and milestone questions that require testing.',
      learnerEvidence: 'Needs statement, design choice, failed or revised prototype, final product and explanation to an audience.',
      assessmentDecision: 'The teacher rewards evidence of decision-making and improvement, then uses milestone notes to support groups before the final day.',
    },
    {
      title: 'Two-week project board',
      instructions: ['Choose a local problem and one or two traceable outcomes.', 'Set four milestones and one check-in question per milestone.', 'Draft a process-and-product rubric in learner-friendly language.', 'Plan a low-cost audience and a reflection protocol.'],
      evidence: ['Project brief', 'Milestone log', 'Rubric', 'Final explanation and reflection'],
    },
    'What would learners do differently if a real person, not only the teacher, needed the project? How will you keep the audience authentic and safe?',
    [becf, designs],
  ),

  'teacher-wellbeing/m1': guide(
    'Use reflective professional practice to notice workload and classroom stressors early.',
    ['Workload audit', 'Recovery', 'Professional boundaries', 'Reflective practice'],
    ['Separate a system constraint from a personal habit.', 'Choose one small, safe change that protects planning quality and wellbeing.', 'Know when a concern needs support from a trusted professional or school structure.'],
    ['Record the demand and its frequency.', 'Identify what is within your influence.', 'Try one bounded change for a week.', 'Review the effect without turning the result into a judgement about your worth.'],
    {
      context: 'A teacher spends every preparation period rewriting materials that already meet the outcome because the plan has no stopping rule.',
      teacherAction: 'The teacher defines a minimum viable plan: outcome, evidence, activity, support and closure; a later reflection records what learners actually needed.',
      learnerEvidence: 'More predictable lesson routines and clearer feedback, rather than a learner-facing wellbeing score.',
      assessmentDecision: 'The teacher uses reflection and learner work to refine the plan; wellbeing data is private and not used to label learners or colleagues.',
    },
    {
      title: 'One-week workload experiment',
      instructions: ['List three recurring tasks and their actual purpose.', 'Keep the task that directly supports learners or required records.', 'Time-box one task and ask for support where the decision is outside your role.', 'Reflect on quality, time and learner evidence.'],
      evidence: ['Workload map', 'Bounded experiment', 'Support request or boundary script', 'Reflection'],
    },
    'Which extra task is consuming energy without improving learner evidence? What is the smallest responsible change?',
    teacherWellbeingSources,
  ),
  'teacher-wellbeing/m2': guide(
    'Build sustainable routines around real teaching constraints.',
    ['Micro-recovery', 'Transitions', 'Boundaries', 'Support network'],
    ['Select a recovery practice that fits the school day.', 'Communicate a professional boundary clearly and kindly.', 'Use peer support without exposing confidential learner information.'],
    ['Choose a predictable transition point.', 'Use a short practice that does not delay learner supervision.', 'State when and how you will respond to non-urgent requests.', 'Review what worked with a trusted colleague.'],
    {
      context: 'A teacher leaves one lesson carrying the previous class’s conflict into the next, then stays late trying to recover the plan.',
      teacherAction: 'The teacher uses a two-minute transition note: what happened, what evidence matters, what is the next safe step; unresolved issues are scheduled rather than carried all day.',
      learnerEvidence: 'More consistent openings and clearer follow-up, not disclosure of the teacher’s private stress notes.',
      assessmentDecision: 'The teacher checks whether the routine improves lesson readiness and seeks school support if the underlying issue is unsafe or beyond individual control.',
    },
    {
      title: 'Transition routine rehearsal',
      instructions: ['Pick two consecutive lessons.', 'Write the three facts you need to carry forward and the three you can park.', 'Create a 90-second transition routine.', 'Test it for five school days and review the effect.'],
      evidence: ['Routine card', 'Five-day log', 'One colleague check-in', 'Adjustment'],
    },
    'What boundary would make you more present for learners, and how can you communicate it without withdrawing care?',
    teacherWellbeingSources,
  ),
  'teacher-wellbeing/m3': guide(
    'Turn reflection into a professional improvement cycle rather than self-criticism.',
    ['Reflection', 'Evidence', 'Action research', 'Peer learning', 'Sustainable improvement'],
    ['Use learner evidence to evaluate one teaching choice.', 'Design a small change and a review question.', 'Share practice without sharing identifiable learner information.'],
    ['Describe the problem neutrally.', 'Choose one change and one evidence source.', 'Review after a short cycle.', 'Keep, adapt or stop the change based on evidence.'],
    {
      context: 'A teacher believes group work is failing, but has only a general impression and no record of who participates or what the task demands.',
      teacherAction: 'The teacher observes one group-work routine, records turns and learner products, then changes one structure before making a broader judgement.',
      learnerEvidence: 'Participation record, individual contribution and revised group product.',
      assessmentDecision: 'The teacher uses the evidence to refine grouping and accountability; the conclusion remains about the routine, not a fixed learner trait.',
    },
    {
      title: 'Small inquiry cycle',
      instructions: ['Choose one repeated classroom difficulty.', 'Write a neutral observation question.', 'Change one variable for two lessons.', 'Compare evidence and decide the next experiment.'],
      evidence: ['Inquiry question', 'Baseline note', 'Change log', 'Evidence-based decision'],
    },
    'What would you like to understand better about your classroom before trying to fix it? What evidence could answer that question?',
    teacherWellbeingSources,
  ),

  'ai-empowered-educator/m1': guide(
    'Use digital tools to organise curriculum work while keeping the teacher’s source-checking judgement in control.',
    ['Source grounding', 'Curriculum hierarchy', 'Prompt constraints', 'Verification', 'Offline contingency'],
    ['Locate the authoritative grade and learning-area design before asking a tool to draft content.', 'Require source references or mark an output as unverified.', 'Prepare a non-digital fallback for any technology-dependent activity.'],
    ['Collect the exact official source documents.', 'Ask the tool to extract, not invent, the relevant structure.', 'Check names, wording and page references against the source.', 'Edit for the actual class and document what changed.'],
    {
      context: 'A teacher receives a polished AI lesson containing a strand name that does not appear in the selected KICD design.',
      teacherAction: 'The teacher stops the copy-and-paste workflow, checks the design, removes the unsupported term and rewrites the prompt to require “not stated in the source” when evidence is absent.',
      learnerEvidence: 'A source-traceable lesson plan and a classroom task that matches the official outcome.',
      assessmentDecision: 'The teacher treats source verification as a professional checkpoint; the AI output is a draft, never the curriculum authority.',
    },
    {
      title: 'Source-grounded workflow audit',
      instructions: ['Select one real curriculum design.', 'Ask an AI tool to extract a small section with page references.', 'Check every named strand, sub-strand and outcome manually.', 'Record one correction and one prompt safeguard.'],
      evidence: ['Source link and page', 'Checked extraction', 'Correction log', 'Offline alternative'],
    },
    'Where could an apparently helpful digital workflow introduce an unverified curriculum claim? What checkpoint will stop it?',
    [becf, designs, cba],
  ),
  'ai-empowered-educator/m2': guide(
    'Use AI to prepare age-appropriate, play-based and family-linked learning without replacing teacher observation.',
    ['Play-based learning', 'Language-rich interaction', 'Observation', 'Family partnership', 'Safeguarding'],
    ['Prompt for local, age-appropriate materials and a clear learning purpose.', 'Review generated stories and activities for safety, language and cultural fit.', 'Use observation evidence to decide the next experience.'],
    ['Start from the official design and the learner context.', 'Generate more than one low-resource option.', 'Remove unsafe, inaccessible or unsupported claims.', 'Observe the learner performance and revise the next prompt or activity.'],
    {
      context: 'A PP2 activity generated online asks children to use a sharp household tool and assumes every family has the same materials.',
      teacherAction: 'The teacher rejects the unsafe version, substitutes supervised sorting and movement using classroom objects, and provides a no-cost home option that does not require a device.',
      learnerEvidence: 'Observed classification, language use or movement performance recorded on a simple checklist.',
      assessmentDecision: 'The teacher uses the checklist to plan the next play experience; the AI is not used to diagnose or label the learner.',
    },
    {
      title: 'Safe activity review',
      instructions: ['Generate one activity for an official early-years outcome.', 'Run a safety, access, language and cultural-context check.', 'Create a classroom version and a no-cost home version.', 'Write three observable indicators for your checklist.'],
      evidence: ['Reviewed activity', 'Safety/access decisions', 'Home option', 'Observation checklist'],
    },
    'What will you always check yourself before using a generated activity with young learners or sending it home?',
    [becf, designs],
  ),
  'ai-empowered-educator/m3': guide(
    'Use digital planning to support inquiry, projects and school-based evidence in Middle and Junior School.',
    ['Project brief', 'Milestones', 'Individual evidence', 'Source checking', 'Feedback'],
    ['Trace a project to actual grade outcomes.', 'Build milestone evidence so the final product is not the sole judgement.', 'Use digital tools only where they improve access, documentation or feedback.'],
    ['Copy the outcome from the current design.', 'Prompt for a local problem and a low-resource alternative.', 'Review the task for safety, inclusion and individual evidence.', 'Store dated work samples and teacher notes in a retrievable system.'],
    {
      context: 'An AI-generated project asks Grade 8 learners to make a water filter but gives no user, test criteria, safety guidance or individual evidence plan.',
      teacherAction: 'The teacher adds a school-specific water-use question, a safe materials boundary, a test table and individual reflection before approving the project brief.',
      learnerEvidence: 'Design proposal, test results, revision note and individual explanation linked to the selected outcomes.',
      assessmentDecision: 'The teacher checks milestone evidence and gives feedback before the final product; the project is not awarded a single unsupported mark.',
    },
    {
      title: 'AI-assisted project audit',
      instructions: ['Generate or select a project brief.', 'Highlight the exact outcome, user, constraint, milestone and evidence.', 'Remove any invented curriculum structure or unsafe instruction.', 'Prepare a paper-first alternative.'],
      evidence: ['Audited brief', 'Milestone tracker', 'Individual evidence plan', 'Paper-first alternative'],
    },
    'Does your digital workflow make learner thinking easier to see, or only make teacher documents faster to produce?',
    [becf, designs, grade7Designs, grade9Designs, cba],
  ),
  'ai-empowered-educator/m4': guide(
    'Keep Senior School pathway guidance current, source-based and focused on learner choice and evidence.',
    ['Pathway', 'Track', 'Subject combination', 'Interest and aspiration', 'Progression evidence'],
    ['Use current official pathway language without treating one subject combination as universal.', 'Help learners compare interests, demonstrated strengths and school options.', 'Keep pathway conversations exploratory and evidence-informed.'],
    ['Begin with current Ministry and KICD information.', 'Use Grade 9 work and learner reflection as evidence for a conversation.', 'Check the school’s actual approved offerings before advising.', 'Record questions and refer uncertain policy matters to the school’s designated guidance structure.'],
    {
      context: 'A Grade 9 learner hears that choosing one pathway guarantees a particular career and asks the teacher to confirm it from an AI-generated post.',
      teacherAction: 'The teacher uses the current official pathway categories, asks about interests and evidence from learning, and avoids promising a career outcome or inventing a placement rule.',
      learnerEvidence: 'A comparison sheet with interests, strengths, questions and verified school offerings.',
      assessmentDecision: 'The teacher checks whether the learner can justify a preference and identify what remains uncertain; the conversation is guidance, not a high-stakes prediction.',
    },
    {
      title: 'Pathway information check',
      instructions: ['Open the current Ministry and KICD pathway sources.', 'List the pathway names exactly as published.', 'Compare one learner’s interests and evidence with two available school options.', 'Mark every statement that needs confirmation from the school or current circular.'],
      evidence: ['Source-checked pathway sheet', 'Learner evidence summary', 'Questions for guidance conversation', 'Confirmation log'],
    },
    'Which part of pathway advice is a verified fact, which is a professional interpretation, and which still needs confirmation?',
    [becf, grade9Designs, grade10Designs, cbePlacement],
  ),
  'ai-empowered-educator/m5': guide(
    'Use AI to draft assessment resources only after the outcome, evidence and criteria are fixed by the teacher.',
    ['Authentic task', 'Analytic rubric', 'Feedback', 'Revision', 'Assessment evidence'],
    ['Write a performance task that requires application in a defined context.', 'Create observable criteria before generating polished wording.', 'Use feedback and revision as part of the learning evidence.'],
    ['Copy the outcome and define the evidence.', 'Draft the task and rubric with a tool if useful.', 'Check every descriptor for observable differences and age appropriateness.', 'Pilot, review learner work and revise the tool before wider use.'],
    {
      context: 'A generated rubric says a learner “shows excellent understanding” but gives no observable difference between performance levels.',
      teacherAction: 'The teacher replaces the vague descriptor with criteria about accuracy, explanation, decision-making and revision, then tests the rubric against two anonymised work samples.',
      learnerEvidence: 'The task product, explanation, feedback response and revised product.',
      assessmentDecision: 'The teacher checks whether the rubric supports consistent judgement and notes any criterion that produces the same level for every learner.',
    },
    {
      title: 'Rubric calibration exercise',
      instructions: ['Choose one outcome and authentic classroom context.', 'Draft three observable criteria.', 'Write four descriptors from below to exceeding expectations without using vague praise.', 'Test the rubric against two samples and revise one descriptor.'],
      evidence: ['Task brief', 'Criteria and descriptors', 'Two-sample calibration note', 'Revised rubric'],
    },
    'Which part of assessment design must remain your professional judgement even when a tool can produce fluent wording?',
    [becf, cba, cbaTraining, kjsea],
  ),

  'legacy/1': guide(
    'Build a common CBC vocabulary and move from topic coverage to evidence of learning.',
    ['Framework', 'Competency', 'Outcome', 'Learning experience', 'Evidence'],
    ['Read the BECF and a grade design as different levels of guidance.', 'Write one learner-facing performance outcome.', 'Choose evidence that every learner can produce.'],
    ['Locate the source.', 'Select the outcome.', 'Design the experience.', 'Plan the evidence and next step.'],
    { context: 'Learners can repeat a definition but cannot use it in a local situation.', teacherAction: 'The teacher adds an application task and models the success criteria.', learnerEvidence: 'Individual explanation or product linked to the outcome.', assessmentDecision: 'Reteach the missing action, not the whole topic.' },
    { title: 'CBC lesson audit', instructions: ['Select one lesson.', 'Underline the outcome verb.', 'Identify the task that makes it visible.', 'Add one local example and one support.'], evidence: ['Annotated plan', 'Learner task', 'Evidence rule'] },
    'What will learners do that proves learning happened?',
    [becf, designs],
  ),
  'legacy/2': guide(
    'Align classroom assessment, rubrics and records to the intended performance.',
    ['Criteria', 'Descriptor', 'Observation', 'Portfolio', 'Feedback'],
    ['Select a method that fits the outcome.', 'Write observable rubric descriptors.', 'Use evidence to plan a next step.'],
    ['Set criteria first.', 'Collect more than one evidence type over time.', 'Calibrate judgements with samples.', 'Give feedback tied to the criterion.'],
    { context: 'A written quiz shows recall but the outcome requires a practical demonstration.', teacherAction: 'The teacher adds observation and a short explanation to the evidence set.', learnerEvidence: 'Performance, explanation and reflection.', assessmentDecision: 'Use the pattern to plan practice; do not infer practical competence from recall alone.' },
    { title: 'Assessment alignment check', instructions: ['Choose a task.', 'Write its outcome and evidence.', 'Replace one vague criterion.', 'Record the next teaching action.'], evidence: ['Aligned task', 'Rubric', 'Observation note', 'Action'] },
    'Which assessment record genuinely helps you decide what to teach next?',
    [becf, cba, cbaTraining, kjsea],
  ),
  'legacy/3': guide(
    'Use formative assessment to adjust teaching during the lesson and between lessons.',
    ['Diagnostic', 'Hinge question', 'Exit response', 'Feedback', 'Regrouping'],
    ['Create one quick check tied to an outcome.', 'Interpret response patterns.', 'Choose a targeted response.'],
    ['Predict the misconception.', 'Collect all-learner responses.', 'Sort patterns.', 'Reteach, practise or extend and recheck.'],
    { context: 'Learners answer confidently but repeat the same misconception in their work.', teacherAction: 'The teacher uses a hinge question with an explanation request.', learnerEvidence: 'Response plus reasoning.', assessmentDecision: 'Change the next example based on the pattern.' },
    { title: 'Formative decision tree', instructions: ['Write an outcome.', 'Create one hinge question.', 'Define three response patterns.', 'Write the action for each.'], evidence: ['Question', 'Response key', 'Class pattern', 'Next step'] },
    'How will you show learners that their responses changed the lesson?',
    [becf, cba, cbaTraining],
  ),
  'legacy/4': guide(
    'Design inclusive participation and differentiation from the start.',
    ['Barrier', 'Access', 'Scaffold', 'Expression', 'Participation'],
    ['Describe barriers without deficit labels.', 'Offer a supported route to the same outcome.', 'Review whether support increases independence.'],
    ['Observe the barrier.', 'Use a strength as an entry point.', 'Adjust access or expression.', 'Review and fade support where appropriate.'],
    { context: 'A learner understands through demonstration but is blocked by a long written instruction.', teacherAction: 'The teacher adds a visual sequence and oral rehearsal while preserving the outcome.', learnerEvidence: 'Demonstration and structured explanation.', assessmentDecision: 'Review independence and consult support structures if the barrier persists.' },
    { title: 'Inclusion redesign', instructions: ['Select one lesson.', 'Identify one barrier.', 'Add a support and an extension.', 'Define the evidence of independence.'], evidence: ['Barrier note', 'Revised task', 'Evidence rule'] },
    'What does your classroom ask every learner to do in exactly the same way, and is that necessary for the outcome?',
    [becf, designs],
  ),
  'legacy/5': guide(
    'Integrate digital tools only when they improve access, creation, communication or evidence.',
    ['Purpose', 'Access', 'Digital safety', 'Offline fallback', 'Digital evidence'],
    ['Match a tool to an outcome.', 'Plan for unequal access and power/internet failure.', 'Teach responsible use through the task.'],
    ['Start with the outcome.', 'Choose the lowest-complexity tool that helps.', 'Give a paper or oral equivalent.', 'Assess the learning, not device ownership or typing speed.'],
    { context: 'A one-smartphone class is told to complete an online task at home, excluding learners without device access.', teacherAction: 'The teacher uses the phone for a shared model and provides a paper-first route for every learner.', learnerEvidence: 'The same concept is shown through an accessible product.', assessmentDecision: 'Do not penalise lack of device access; assess the intended outcome.' },
    { title: 'Low-resource digital lesson', instructions: ['Choose one outcome.', 'Design a one-device version.', 'Design a no-device version.', 'Add one digital-safety routine.'], evidence: ['Two lesson routes', 'Safety routine', 'Common criteria'] },
    'What should remain possible if the battery, data bundle or device fails?',
    [becf, designs],
  ),
  'legacy/6': guide(
    'Use current Grade 7–9 curriculum designs and transition information rather than a fixed generic subject list.',
    ['Junior School', 'Learning area', 'Grade design', 'KJSEA', 'Senior School pathway'],
    ['Navigate the current grade and learning-area design.', 'Explain that KJSEA is a Grade 9 national assessment and not a replacement for KCPE at Grade 6.', 'Discuss Senior School pathways using current official language and verified school offerings.'],
    ['Open the current KICD design for the grade and learning area.', 'Trace one outcome to an activity and evidence.', 'Use classroom evidence across Grade 7–9 to guide support and learner conversations.', 'Refer current placement and pathway questions to current Ministry/KNEC guidance.'],
    { context: 'A Grade 7 teacher copies a remembered JSS subject list into a plan and tells families that KJSEA is the new Grade 6 exam.', teacherAction: 'The teacher checks the current KICD Grade 7 page, uses the exact learning-area design, and explains the distinction between KPSEA at Grade 6 and KJSEA at Grade 9.', learnerEvidence: 'A source-checked learning-area map and a transition activity based on actual learner evidence.', assessmentDecision: 'Correct the information before teaching; mark uncertain policy details for confirmation instead of filling gaps from memory.' },
    { title: 'JSS source-check and transition brief', instructions: ['Open the current KICD Grade 7 and Grade 9 pages.', 'Choose one learning area and record the exact design title.', 'Write one Grade 7–9 progression question for your team.', 'Prepare a family-facing explanation that distinguishes KPSEA, KJSEA and Senior School pathway guidance, with a source link.'], evidence: ['Source log', 'Progression question', 'Family brief', 'Uncertainty list'] },
    'Which JSS statement in your staffroom is based on a current source, and which one should be checked before it reaches a learner or parent?',
    [becf, grade7Designs, grade9Designs, grade10Designs, cba, kjsea, cbePlacement],
  ),
  'legacy/7': guide(
    'Plan backwards from an exact learning outcome to practice, differentiation and evidence.',
    ['Backward design', 'Observable verb', 'Learning experience', 'Differentiation', 'Alignment'],
    ['Write an observable outcome from the current design.', 'Align activity, evidence and feedback.', 'Plan a support and extension before the lesson.'],
    ['Outcome first.', 'Evidence second.', 'Learning experience third.', 'Review and adapt from learner work.'],
    { context: 'The plan says learners will “understand soil erosion” but the assessment only asks them to copy a definition.', teacherAction: 'The teacher changes the outcome evidence to a comparison and justified recommendation.', learnerEvidence: 'Annotated site comparison and explanation.', assessmentDecision: 'Use the explanation to decide whether to reteach causes, evidence use or communication.' },
    { title: 'Backward-planning studio', instructions: ['Select one current outcome.', 'Write the evidence before the activity.', 'Add one scaffold and one extension.', 'Write a feedback sentence tied to the criterion.'], evidence: ['Outcome', 'Evidence task', 'Differentiation', 'Feedback line'] },
    'Which part of your lesson plan is most likely to drift away from the outcome, and how will you check it before teaching?',
    [becf, designs, cba],
  ),
}

export function getModuleGuide(programId: string, moduleId: string): ImplementationGuide | undefined {
  return MODULE_GUIDES[`${programId}/${moduleId}`]
}

export function getLegacyModuleGuide(moduleId: number): ImplementationGuide | undefined {
  return MODULE_GUIDES[`legacy/${moduleId}`]
}
