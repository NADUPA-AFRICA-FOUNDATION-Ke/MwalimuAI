// The built-in resource library. Staff manage the live copy in the admin console (Content > Resource library);
// the learner app uses the published copy when one exists and falls back to this.
//
// Every entry here is an official source whose address was checked to be live on 2026-10-06, with no invented file
// sizes or document titles. Add your own files and links in the admin console.

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
    title: 'KICD: CBC curriculum designs',
    type: 'Link',
    size: '',
    description: 'The official curriculum designs published by the Kenya Institute of Curriculum Development, organised by learning area.',
    tags: ['CBC', 'Curriculum', 'Official'],
    url: 'https://kicd.ac.ke/cbc-materials/curriculum-designs/',
    free: true,
  },
  {
    id: 2,
    title: 'KICD: CBC materials',
    type: 'Link',
    size: '',
    description: 'The Kenya Institute of Curriculum Development’s page of CBC materials.',
    tags: ['CBC', 'Curriculum', 'Official'],
    url: 'https://kicd.ac.ke/cbc-materials/',
    free: true,
  },
  {
    id: 3,
    title: 'KNEC: Kenya National Examinations Council',
    type: 'Link',
    size: '',
    description: 'The national assessment body: information on examinations and assessment.',
    tags: ['Assessment', 'Official'],
    url: 'https://www.knec.ac.ke/',
    free: true,
  },
  {
    id: 4,
    title: 'Ministry of Education, Kenya',
    type: 'Link',
    size: '',
    description: 'Policies, circulars and announcements from the Ministry of Education.',
    tags: ['Policy', 'Official'],
    url: 'https://www.education.go.ke/',
    free: true,
  },
]
