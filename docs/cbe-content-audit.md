# CBC/CBE learning content audit

Research snapshot: 8 September 2026

This audit covers the two learning catalogues currently present in the product:

- The active learning-path catalogue in `lib/learning-paths-data.ts` and `lib/ai-toolkit-data.ts`: 6 available programs, 20 modules and 60 lessons, plus 3 explicitly marked coming-soon programs with no lessons.
- The legacy catalogue in `lib/modules-data.ts`: 7 modules and 39 lessons, still reachable through `/dashboard/modules` and therefore retained and reviewed.

Existing lesson and progress identifiers were preserved. The new implementation guides are keyed by the existing program/module IDs so they can be improved without invalidating learner progress.

## Research basis

The revised content uses these authoritative starting points:

| Source | Use in the product |
| --- | --- |
| [KICD Basic Education Curriculum Framework](https://kicd.ac.ke/curriculum-reform/basic-education-curriculum-framework/) | National vision, mission, curriculum architecture, competencies, values, PCIs and assessment principles. |
| [KICD regular curriculum designs](https://kicd.ac.ke/cbc-materials/curriculum-designs/regular-curriculum-designs/) | Direct teachers to the current grade and learning-area design for the exact outcome, learning experience, inquiry question, resources and assessment detail. |
| [KICD Grade Seven designs](https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-seven-designs/) | Current Junior School learning-area reference; prevents the product from presenting a fixed, generic “12 learning areas” list. |
| [KICD Grade Nine designs](https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-nine-designs/) | Transition and Grade 9 source-checking. |
| [KICD Grade Ten designs](https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-ten/) | Current Senior School design groupings, including Applied Sciences, Arts & Sports, Humanities, Languages, Pure Sciences, Religious Education and Technical Studies. |
| [KNEC Competency-Based Assessment resources](https://www2.knec.ac.ke/services/cba/) | Assessment terminology and the need to select tools that match the intended performance. |
| [KNEC age-based regular CBA training manual](https://www2.knec.ac.ke/wp-content/uploads/2023/06/CBA-Age-Based-Regular-Training-Manual.pdf) | Practical use of observation schedules, portfolios and analytic or holistic rubrics. |
| [KNEC KJSEA Regulations](https://www.knec.ac.ke/wp-content/uploads/2026/02/KJSEA-REGULATIONS.pdf) | Current Grade 9 KJSEA context and distinction between the four broad reporting levels and the national actual performance levels. |
| [Ministry of Education: Grade Nine placement status](https://www.education.go.ke/status-ongoing-placement-grade-nine-learners-senior-schools) | Current Senior School pathway terminology: STEM, Social Sciences, and Arts and Sports. |

## Corrections made

### Terminology and curriculum structure

- Replaced unsupported programme labels such as “KICD CBC PD Level 1”, “KICD CBC PD Level 2”, “CEMASTEA-aligned framework”, “KEMI Leadership Development Framework” and “TSC Teacher PD” with descriptions of the actual product scope or direct source links.
- Rewrote the legacy Junior School lesson that claimed there were 12 prescribed learning areas. The lesson now directs teachers to the current grade and learning-area design and explains why a remembered list should not be copied into a plan.
- Corrected `CPE` to `KCPE` when referring to the former primary examination.
- Corrected the KJSEA explanation: KJSEA is administered at the end of Grade 9; KPSEA is at Grade 6; KJSEA is not described as a replacement for KCPE at Grade 6.
- Replaced the claim that a fixed project score or a generic four-level rubric determines every learner’s report. Teachers are told to use the applicable KICD and KNEC guidance and keep assessment evidence traceable to the selected outcome.
- Removed the unsupported `60%/40%` national-versus-school assessment claim from the Senior School AI module.
- Updated Senior School wording to “STEM, Social Sciences, and Arts and Sports” and connected it to the current KICD Grade 10 design groupings.
- Removed the claim that Community Service Learning is a core subject for every Senior School learner. The revised text tells the teacher to check the applicable Grade 10 design and school programme.

### Learning design

Every available module now has an implementation guide with:

- a focused implementation purpose and key concepts;
- observable teacher-facing outcomes;
- a four-step classroom workflow;
- a realistic Kenyan classroom scenario;
- explicit teacher action, learner evidence and assessment decision;
- an interactive practical task with evidence to collect;
- a reflection prompt;
- authoritative starting points.

The existing lesson sequence, knowledge checks, reflections, assignments and certificates remain in place. The guide is shown in the module overview before the lesson list, so the content is useful to a new teacher without forcing every paragraph into a separate card.

### Assessment quality

The revised content distinguishes:

- formative assessment used during learning to decide what happens next;
- classroom evidence such as observation, questioning, work samples, practical performance, explanation and portfolios;
- rubric descriptors that describe observable criteria;
- national KJSEA reporting, where current KNEC regulations show four broad levels with two actual performance levels inside each broad level.

The content no longer tells teachers to transfer national score bands into every classroom rubric.

### Unsupported or risky content removed

- fabricated-looking cohort progress names and percentages from the program page;
- unverified claims that an AI output is automatically “KICD-compliant”, “KNEC-aligned” or official evidence;
- broad outcome, dropout, employer and assessment claims that were not supported by an identified source;
- fixed Junior School subject lists that conflicted with the current KICD grade pages.

## Remaining editorial boundary

The platform is a professional-development aid, not an official curriculum authority. Teachers are repeatedly instructed to verify the exact grade, learning area, strand, sub-strand, outcome, assessment procedure and current circular before using a resource with learners. The product does not claim KICD, KNEC, Ministry of Education, TSC, KEMI or CEMASTEA endorsement.

The three coming-soon program shells remain intentionally empty. They are not presented as completed learning modules and retain their existing “Launching Soon” state.
