export type ContactCategory = 'caregiver' | 'family' | 'doctor' | 'emergency';

export interface Contact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  category: ContactCategory;
  isPrimary?: boolean;
}

export const DEFAULT_CONTACTS: Contact[] = [
  { id: 'c1', name: 'Priya', relation: 'Daughter · Primary Caregiver', phone: '+919800000001', category: 'caregiver', isPrimary: true },
  { id: 'c2', name: 'Anil', relation: 'Son', phone: '+919800000003', category: 'family' },
  { id: 'c3', name: 'Meena', relation: 'Neighbour', phone: '+919800000004', category: 'family' },
  { id: 'c4', name: 'Dr. Sharma', relation: 'Physician · City Hospital', phone: '+919800000002', category: 'doctor' },
  { id: 'c5', name: 'Ambulance', relation: '24x7 Emergency Ambulance', phone: '108', category: 'emergency', isPrimary: true },
  { id: 'c6', name: 'Police', relation: 'Emergency Services', phone: '100', category: 'emergency' },
  { id: 'c7', name: 'Women Helpline', relation: 'Emergency Services', phone: '1091', category: 'emergency' },
];

export interface MedicalInfo {
  bloodGroup: string;
  conditions: string[];
  allergies: string[];
  medications: string[];
  homeAddress: string;
}

export const PATIENT_MEDICAL_INFO: MedicalInfo = {
  bloodGroup: 'B+',
  conditions: ['Early-stage Dementia', 'Mild Hypertension'],
  allergies: ['Penicillin'],
  medications: ['Donepezil 5mg — Night', 'Amlodipine 5mg — Morning'],
  homeAddress: 'House No. 12, Near Shiv Mandir, Guwahati, Assam',
};

export interface Task {
  id: string;
  title: string;
  time: string;
  done: boolean;
}

export const DEFAULT_TASKS: Task[] = [
  { id: 't1', title: 'Morning walk in the garden', time: '7:30 AM', done: false },
  { id: 't2', title: 'Visit the temple', time: '9:00 AM', done: false },
  { id: 't3', title: 'Rest after lunch', time: '2:00 PM', done: false },
  { id: 't4', title: 'Tea with the family', time: '5:00 PM', done: false },
  { id: 't5', title: 'Evening prayer', time: '7:00 PM', done: false },
  { id: 't6', title: 'Call your son, Anil', time: '8:00 PM', done: false },
];

// --- Reminders (§18) — configured by the caregiver, delivered by the patient app ---

export type ReminderKind = 'medication' | 'appointment' | 'activity';

export interface Reminder {
  id: string;
  kind: ReminderKind;
  title: string;
  time: string; // display string, e.g. "5:00 PM"
  note?: string;
  acknowledged: boolean;
}

export const SEED_REMINDERS: Reminder[] = [
  { id: 'r1', kind: 'medication', title: 'Take medicine', time: '8:00 AM', acknowledged: false },
  { id: 'r2', kind: 'medication', title: 'Take medicine', time: '2:00 PM', acknowledged: false },
  { id: 'r3', kind: 'medication', title: 'Take medicine', time: '9:00 PM', acknowledged: false },
  { id: 'r4', kind: 'activity', title: 'Drink a glass of water', time: '11:00 AM', acknowledged: false },
  { id: 'r5', kind: 'activity', title: 'Evening walk with Priya', time: '6:30 PM', acknowledged: false },
  { id: 'r6', kind: 'activity', title: 'Check your blood pressure', time: '7:30 PM', acknowledged: false },
];

// --- Next appointment (§25.3) — set by the doctor, synced to the patient ---

export interface Appointment {
  date: string; // human-readable
  doctorName: string;
  hospital: string;
}

export const SEED_APPOINTMENT: Appointment = {
  date: 'Mon 22 Sep, 11:30 AM',
  doctorName: 'Dr. Sharma',
  hospital: 'City Hospital, Guwahati',
};

// --- Regional / language content packs (§5) ---

export interface ContentPackInfo {
  region: string;
  language: string;
  greeting: string;   // localized "hello"
  sizeMb: number;
}

export const CONTENT_PACKS: ContentPackInfo[] = [
  { region: 'Assam', language: 'Assamese', greeting: 'নমস্কাৰ', sizeMb: 42 },
  { region: 'Assam', language: 'English', greeting: 'Namaste', sizeMb: 30 },
  { region: 'Manipur', language: 'Manipuri', greeting: 'ꯈꯨꯔꯨꯝꯖꯔꯤ', sizeMb: 40 },
  { region: 'Manipur', language: 'English', greeting: 'Namaste', sizeMb: 30 },
  { region: 'Meghalaya', language: 'Khasi', greeting: 'Khublei', sizeMb: 38 },
  { region: 'Meghalaya', language: 'English', greeting: 'Namaste', sizeMb: 30 },
  { region: 'Mizoram', language: 'Mizo', greeting: 'Chibai', sizeMb: 38 },
  { region: 'Mizoram', language: 'English', greeting: 'Namaste', sizeMb: 30 },
  { region: 'Tripura', language: 'Kokborok', greeting: 'Khulumkha', sizeMb: 38 },
  { region: 'Tripura', language: 'English', greeting: 'Namaste', sizeMb: 30 },
  { region: 'Nagaland', language: 'English', greeting: 'Namaste', sizeMb: 30 },
  { region: 'Arunachal Pradesh', language: 'English', greeting: 'Namaste', sizeMb: 30 },
  { region: 'Sikkim', language: 'Nepali', greeting: 'नमस्ते', sizeMb: 40 },
  { region: 'Sikkim', language: 'English', greeting: 'Namaste', sizeMb: 30 },
];

export function findPack(region: string, language: string): ContentPackInfo {
  return (
    CONTENT_PACKS.find((p) => p.region === region && p.language === language) ?? {
      region,
      language,
      greeting: 'Namaste',
      sizeMb: 32,
    }
  );
}

// --- Sample "family photos" (§12). Real uploads (expo-image-picker) replace these. ---
// Inline SVG data URIs so there are no binary assets to bundle or license.

function svgPhoto(bg1: string, bg2: string, caption: string): string {
  // Simple drawn "photograph" — silhouettes of two figures against a warm
  // gradient. No emoji (keeps the data URI ASCII-safe) and no binary asset.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='${bg1}'/><stop offset='1' stop-color='${bg2}'/>
    </linearGradient></defs>
    <rect width='600' height='400' fill='url(#g)'/>
    <circle cx='240' cy='150' r='42' fill='#ffffff' opacity='0.9'/>
    <rect x='196' y='198' width='88' height='150' rx='30' fill='#ffffff' opacity='0.9'/>
    <circle cx='355' cy='170' r='34' fill='#ffffff' opacity='0.75'/>
    <rect x='320' y='210' width='70' height='130' rx='26' fill='#ffffff' opacity='0.75'/>
    <text x='300' y='378' font-size='26' fill='#ffffff' font-family='sans-serif' text-anchor='middle' opacity='0.95'>${caption}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_PHOTOS: { id: string; label: string; uri: string }[] = [
  { id: 'family', label: 'Family gathering', uri: svgPhoto('#F2B441', '#E07A3F', 'Diwali, 2019') },
  { id: 'grandkids', label: 'With the grandchildren', uri: svgPhoto('#4FA8D8', '#3E7C6B', 'Summer visit') },
  { id: 'wedding', label: "Priya's wedding", uri: svgPhoto('#B15D8C', '#6C4FD6', 'Guwahati, 2015') },
];

// --- Community / Stories (§22–§24) — caregiver-written, moderated, ranked ---

export type CommunityCategory = 'positive-moments' | 'caregiving-tips' | 'experiences' | 'routines';

export const COMMUNITY_CATEGORIES: { id: CommunityCategory; label: string; icon: string }[] = [
  { id: 'positive-moments', label: 'Positive Moments', icon: 'sunny-outline' },
  { id: 'caregiving-tips', label: 'Caregiving Tips', icon: 'bulb-outline' },
  { id: 'experiences', label: 'Experiences', icon: 'heart-outline' },
  { id: 'routines', label: 'Routines', icon: 'time-outline' },
];

export interface CommunityPost {
  id: string;
  author: string;
  title: string;
  excerpt: string;
  category: CommunityCategory;
  language: string;
  upvotes: number;
  views: number;
  /** Content passed moderation and is approved as patient-appropriate (spec §23-24). */
  approved: true;
}

// In the full platform, this content is written by caregivers in the portal,
// then goes through moderation + engagement-based ranking (spec §23) before
// becoming visible here in a simple, patient-friendly format (spec §24).
export const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'p1',
    author: 'Meena',
    title: 'Singing old Bihu songs together',
    excerpt: 'We sang an old Bihu song together this morning and it was a lovely, calm start to the day.',
    category: 'positive-moments',
    language: 'Assamese',
    upvotes: 128,
    views: 1900,
    approved: true,
  },
  {
    id: 'p2',
    author: 'Rohit',
    title: 'A gentle way to talk about forgetfulness',
    excerpt: 'Patience and short, simple sentences have made our evenings much calmer for both of us.',
    category: 'caregiving-tips',
    language: 'English',
    upvotes: 94,
    views: 1500,
    approved: true,
  },
  {
    id: 'p3',
    author: 'Lakshmi',
    title: 'The evening walk that became our favourite habit',
    excerpt: 'A short walk near the temple every evening has become something we both look forward to.',
    category: 'routines',
    language: 'English',
    upvotes: 76,
    views: 1100,
    approved: true,
  },
  {
    id: 'p4',
    author: 'Arjun',
    title: 'What helped us on the hard days',
    excerpt: 'Some days are harder than others. Playing familiar old songs always seems to help.',
    category: 'experiences',
    language: 'Hindi',
    upvotes: 61,
    views: 880,
    approved: true,
  },
  {
    id: 'p5',
    author: 'Fatima',
    title: 'Keeping a photo book by the front door',
    excerpt: 'A small album of named family photos near the door helps with visitors and going out.',
    category: 'caregiving-tips',
    language: 'English',
    upvotes: 143,
    views: 2100,
    approved: true,
  },
];

/** Engagement-based ranking (spec §23): more positive engagement → higher rank. */
export function rankScore(post: CommunityPost): number {
  return post.upvotes * 3 + post.views / 100;
}

export interface RecallQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export const RECALL_QUESTIONNAIRE: RecallQuestion[] = [
  {
    id: 'q1',
    question: 'What did you have for breakfast today?',
    options: ['Rice & fish curry', 'Bread & tea', 'Not sure'],
    correctIndex: 1,
  },
  {
    id: 'q2',
    question: 'Who visited you yesterday?',
    options: ['Neighbour', 'Daughter', "Don't remember"],
    correctIndex: 1,
  },
  {
    id: 'q3',
    question: 'Which festival is coming up next?',
    options: ['Bihu', 'Durga Puja', 'Not sure'],
    correctIndex: 1,
  },
];
