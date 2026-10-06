// SERVER-ONLY answer key for the bundled curriculum's quizzes. Import it only from convex/ code: it must never reach
// the browser bundle (a test checks this). The learner app gets questions and options only; marking happens on the server.
export const ANSWER_KEY: Record<string, Partial<Record<'pre' | 'post', { id: string; correct: 0 | 1 | 2 | 3; explanation: string }[]>>> = {
  'cbc-foundations': {
    pre: [
      { id: 'q1', correct: 1, explanation: 'Recall is real but limited evidence. A competency is knowledge, skills and values applied in a situation, and Friday\'s quiz never asked learners to apply anything. This distinction is the heart of the whole program.' },
      { id: 'q2', correct: 2, explanation: 'The first, second and fourth are things to know. "Using evidence to justify a conclusion" is something a learner does with what they know, in any subject, for life. Competencies are capabilities, not topics.' },
      { id: 'q3', correct: 3, explanation: 'Only the fourth describes something observable. "Appreciate", "be aware" and "understand" cannot be seen or measured, you would never know whether the outcome was met. Assessable outcomes use action verbs with visible evidence.' },
      { id: 'q4', correct: 2, explanation: 'Group seating is not group learning. Without structures that make every learner responsible for thinking (roles, anyone-can-be-asked reporting, individual products), groupwork is 8-4-4 with rearranged furniture.' },
      { id: 'q5', correct: 3, explanation: 'Critical thinking only develops when a task requires choosing, weighing and justifying. The other three tasks can be completed perfectly without a single decision. A task develops a competency only if it cannot be done without it.' },
      { id: 'q6', correct: 1, explanation: 'There is no shame in this answer, it describes the system most of us trained in. CBC asks assessment to do the other three jobs as well. Noticing the gap between current practice and that goal is exactly what this program is for.' },
    ],
    post: [
      { id: 'q1', correct: 2, explanation: 'The verb is "classify", so the evidence must be the learner classifying, with justification showing it was not guesswork. Reciting, copying and watching are evidence of memory and attention, not of the outcome.' },
      { id: 'q2', correct: 2, explanation: 'Backward design is outcome, then evidence, then activities. Deciding evidence second is the discipline that stops you choosing activities for their energy rather than their proof.' },
      { id: 'q3', correct: 1, explanation: 'It answers the real fear, with evidence, without dismissing exams or abandoning the pedagogy. A child who can face an unfamiliar question and reason is exam-ready and life-ready; recall alone is neither.' },
      { id: 'q4', correct: 1, explanation: 'Transfer must be rehearsed, not hoped for. If no task in the lesson required applying the idea in a new situation, the first time learners ever tried was your follow-up, a design gap, not a learner failure.' },
      { id: 'q5', correct: 1, explanation: 'A record earns its keep by changing a teaching decision. The criterion-referenced grid tells you exactly who needs what next on a named outcome; marks, piles and rankings describe the past without directing the future.' },
      { id: 'q6', correct: 1, explanation: 'The question is never "did the teacher perform well?" but "who did the cognitive work, and what evidence exists?" Lesson B made every learner think and produced assessable evidence. Note that B still includes explanation, CBC relocates teacher expertise, it does not delete it.' },
    ],
  },
  'assessment-for-learning': {
    pre: [
      { id: 'q1', correct: 1, explanation: 'CBC assessment is primarily formative — it happens during learning and informs teaching decisions.' },
      { id: 'q2', correct: 2, explanation: 'CBC uses four levels: Exceeds Expectations (EE), Meets Expectations (ME), Approaching Expectations (AE), Below Expectations (BE).' },
      { id: 'q3', correct: 1, explanation: 'A rubric describes levels of quality for a task, tied to clear, observable criteria.' },
      { id: 'q4', correct: 1, explanation: 'Portfolios curate evidence of a learner\'s growth over time — not just final products but the process of learning.' },
      { id: 'q5', correct: 1, explanation: 'Peer assessment develops metacognition (thinking about thinking) and builds constructive feedback skills — key CBC competencies.' },
      { id: 'q6', correct: 1, explanation: 'An exit ticket is a brief written response at lesson\'s end, tied to the SLO — it gives immediate formative data.' },
    ],
    post: [
      { id: 'q1', correct: 1, explanation: 'CBC assessment is formative — ongoing and developmental.' },
      { id: 'q2', correct: 1, explanation: 'EE = Exceeds Expectations — the learner has gone beyond the stated SLO.' },
      { id: 'q3', correct: 1, explanation: 'Backwards design: start with what you want learners to achieve, then design activities and assessments to get there.' },
      { id: 'q4', correct: 2, explanation: 'Portfolios include learner work, reflections, and teacher observations — not administrative information.' },
      { id: 'q5', correct: 1, explanation: 'Two Stars and a Wish is a structured peer feedback protocol: two strengths + one area for improvement.' },
      { id: 'q6', correct: 1, explanation: 'Anecdotal records are brief, specific notes of what a learner said or did during an activity.' },
    ],
  },
  'inclusive-education': {
    pre: [
      { id: 'q1', correct: 1, explanation: 'Inclusive education means all learners, regardless of ability, learning together in their local school with appropriate support.' },
      { id: 'q2', correct: 1, explanation: 'Differentiation adjusts the pathway (content, process, or product) while keeping the SLO the same for all.' },
      { id: 'q3', correct: 0, explanation: 'UDL = Universal Design for Learning — designing lessons proactively to accommodate all learners from the start.' },
      { id: 'q4', correct: 1, explanation: 'A learning barrier is any factor — physical, cognitive, language, social-emotional — that prevents full participation.' },
      { id: 'q5', correct: 2, explanation: 'Mixed-ability groups benefit everyone: stronger learners consolidate through teaching, weaker learners gain peer models.' },
      { id: 'q6', correct: 1, explanation: 'Strengths-based: start from what a learner can do and use those strengths as entry points into new learning.' },
    ],
    post: [
      { id: 'q1', correct: 1, explanation: 'Inclusion = all learners, appropriate support, local school.' },
      { id: 'q2', correct: 1, explanation: 'Multiple means of expression: learners can write, speak, draw, make — different modalities for demonstrating competency.' },
      { id: 'q3', correct: 1, explanation: 'Jigsaw: each group member studies one piece and teaches the rest — every member has a valued expert role.' },
      { id: 'q4', correct: 1, explanation: 'Think-Pair-Share gives processing time before speaking, helping slower processors and less confident learners participate.' },
      { id: 'q5', correct: 1, explanation: 'Emotional safety is a prerequisite for learning — a learner who feels unsafe or unwelcome cannot access academic content.' },
      { id: 'q6', correct: 2, explanation: 'Regular, strength-based communication builds trust and partnership — don\'t wait for problems.' },
    ],
  },
  'stem-integration': {
    pre: [
      { id: 'q1', correct: 1, explanation: 'STEM is integrated — learners apply concepts from multiple disciplines to real problems.' },
      { id: 'q2', correct: 1, explanation: '5E = Engage, Explore, Explain, Elaborate, Evaluate — a research-based inquiry teaching framework.' },
      { id: 'q3', correct: 1, explanation: 'A fair test changes only one variable (independent variable) while controlling all others, making results valid.' },
      { id: 'q4', correct: 1, explanation: 'A PBL driving question is open-ended, genuinely interesting, and connected to learners\' real world.' },
      { id: 'q5', correct: 1, explanation: 'False — bottle tops, cardboard, water, soil, and local materials support many powerful STEM investigations.' },
    ],
    post: [
      { id: 'q1', correct: 1, explanation: 'STEM naturally develops Critical Thinking, Problem Solving, and Creativity — all core CBC competencies.' },
      { id: 'q2', correct: 1, explanation: 'Explore: learners investigate hands-on BEFORE the teacher explains — they discover before they are told.' },
      { id: 'q3', correct: 1, explanation: 'Regular, intentional noticing of cross-subject connections is more effective than occasional special events.' },
      { id: 'q4', correct: 1, explanation: 'When learners make choices about their investigation and product, they develop Self-Efficacy, Critical Thinking, and Creativity simultaneously.' },
      { id: 'q5', correct: 1, explanation: 'An authentic audience gives purpose to the work, increasing motivation, quality, and communication development.' },
      { id: 'q6', correct: 1, explanation: 'Failure and iteration are central to STEM learning — persevering through failure develops Self-Efficacy and genuine engineering thinking.' },
    ],
  },
  'ai-empowered-educator': {
    pre: [
      { id: 'q1', correct: 1, explanation: 'Ungrounded AI can generate confident, wrong curriculum information. The course\'s core safeguard is grounding curriculum work in NotebookLM with the official KICD documents as the only sources.' },
      { id: 'q2', correct: 2, explanation: 'NotebookLM answers only from your uploaded sources. That property is exactly what prevents curriculum hallucination.' },
      { id: 'q3', correct: 1, explanation: 'The broad levels are Exceeds Expectation (EE), Meets Expectation (ME), Approaches Expectation (AE), and Below Expectation (BE). Current KJSEA regulations further show actual levels within those broad levels; use those national details only where applicable.' },
      { id: 'q4', correct: 1, explanation: 'AI serves the teacher; it never replaces professional judgement. Every prompt, activity, and rubric must be reviewed and edited before reaching learners.' },
      { id: 'q5', correct: 1, explanation: 'Mapping the platform to KICD\'s hierarchy (Learning Area, Strand, Sub-Strand) makes your Gradebook directly mappable to KNEC\'s CBA records.' },
      { id: 'q6', correct: 3, explanation: 'There is no wrong answer here. This question simply marks your starting point so you can see how far you have come by the post-assessment.' },
    ],
    post: [
      { id: 'q1', correct: 1, explanation: 'Use NotebookLM for fidelity to the source document, then Gemini for fluent rubric language. Tool choice follows the job: grounding vs generation.' },
      { id: 'q2', correct: 1, explanation: 'The tools reduce admin so teachers can focus on application and evidence. Explanation still matters; the shift is to what learners do with it.' },
      { id: 'q3', correct: 1, explanation: 'Precise environment specification transforms the output from theoretical to something that actually runs on your school\'s machines.' },
      { id: 'q4', correct: 1, explanation: 'CBA asks what learners can DO with knowledge. Strong tasks have an authentic context, an audience beyond the teacher, and a tangible product.' },
      { id: 'q5', correct: 1, explanation: 'Distinguishing EE from ME means describing different qualities of performance against criteria, which is the new assessment literacy the course builds.' },
      { id: 'q6', correct: 1, explanation: 'Competency-framed, specific, encouragement-first feedback with a clear next step builds Self-Efficacy and Learning to Learn, exactly what the course models.' },
    ],
  },
  'teacher-wellbeing': {
    pre: [
      { id: 'wb-pre-1', correct: 1, explanation: 'Erosion of enthusiasm for previously engaging work is one of the earliest and most reliable burnout signals.' },
      { id: 'wb-pre-2', correct: 2, explanation: 'Burnout is a systemic, predictable response — not a personal failing. This framing is essential for genuine recovery.' },
      { id: 'wb-pre-3', correct: 3, explanation: 'Cognitive rest requires complete disengagement from professional thinking — not just a change of location.' },
      { id: 'wb-pre-4', correct: 2, explanation: 'A teacher with sustainable limits has more emotional presence, patience, and creativity available for learners.' },
      { id: 'wb-pre-5', correct: 1, explanation: 'Many teachers add workload beyond KICD requirements through anxiety or habit. Identifying the minimum viable approach reduces load without compromising standards.' },
      { id: 'wb-pre-6', correct: 1, explanation: 'Peer support from colleagues who understand the same pressures is one of the most effective and accessible wellbeing interventions available.' },
    ],
    post: [
      { id: 'wb-post-1', correct: 1, explanation: 'Controlled breathing directly activates the parasympathetic (rest-and-digest) nervous system, reducing the stress response rapidly.' },
      { id: 'wb-post-2', correct: 1, explanation: 'A deliberate end-of-day ritual creates psychological closure, reducing the intrusive work thoughts that fragment personal recovery time.' },
      { id: 'wb-post-3', correct: 1, explanation: 'Teachers frequently add documentation and planning work beyond KICD minimums due to anxiety or unclear guidance — reducing this excess is both practical and professionally sound.' },
      { id: 'wb-post-4', correct: 1, explanation: 'Emotional rest requires time in relationships and spaces where you receive care rather than giving it — especially important for teachers who are community resources.' },
      { id: 'wb-post-5', correct: 1, explanation: 'Purpose is the strongest buffer against burnout — not because it eliminates difficulty, but because it provides a clear reason to navigate through it.' },
      { id: 'wb-post-6', correct: 1, explanation: 'Sustained peer support grows from small, regular, honest exchanges between trusted colleagues — not from formal structures.' },
    ],
  },
}
