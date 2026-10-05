// The built-in resource library. Staff manage the live copy in the admin console (Content > Resource library);
// the learner app uses the published copy when one exists and falls back to this.

export type BuiltInResource = {
  id: number
  title: string
  type: string
  size: string
  description: string
  tags: string[]
  url: string | null
  free: boolean
}

export const RESOURCES: BuiltInResource[] = [
  {
    id: 1,
    title: 'CBC Implementation Guide 2024',
    type: 'PDF',
    size: '2.4 MB',
    description: 'Comprehensive guide on CBC curriculum implementation strategies.',
    tags: ['CBC', 'Implementation', 'Guidelines'],
    url: 'https://kicd.ac.ke/curriculum-designs/',
    free: true,
  },
  {
    id: 2,
    title: 'Formative Assessment Toolkit',
    type: 'PDF',
    size: '1.8 MB',
    description: 'Ready-to-use templates and tools for formative assessments.',
    tags: ['Assessment', 'Templates', 'Tools'],
    url: null,
    free: false,
  },
  {
    id: 3,
    title: 'Video: Competency-Based Grading',
    type: 'Video',
    size: '45 min',
    description: 'Expert video on implementing competency-based grading systems.',
    tags: ['Grading', 'Video', 'Assessment'],
    url: 'https://www.youtube.com/@KICDKenya',
    free: true,
  },
  {
    id: 4,
    title: 'Inclusive Classroom Strategies',
    type: 'PDF',
    size: '2.1 MB',
    description: 'Practical strategies for supporting diverse learners in CBC.',
    tags: ['Inclusion', 'Diversity', 'Strategies'],
    url: null,
    free: false,
  },
  {
    id: 5,
    title: 'Digital Tools for CBC',
    type: 'Video',
    size: '30 min',
    description: 'Overview of digital tools that support CBC implementation.',
    tags: ['Technology', 'Tools', 'Video'],
    url: null,
    free: false,
  },
  {
    id: 6,
    title: 'Parent Communication Templates',
    type: 'PDF',
    size: '0.9 MB',
    description: 'Templates for communicating CBC changes to parents.',
    tags: ['Communication', 'Templates', 'Parents'],
    url: null,
    free: false,
  },
]
