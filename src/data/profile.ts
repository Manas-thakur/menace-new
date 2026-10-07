// Every fact on the site lives here. Sources: résumé PDF (manas-thakur.github.io/Resume),
// LinkedIn (/in/manasthakur30), X (@Menace_thakur), GitHub (Manas-thakur) and tensorman.me.
// Where the résumé and LinkedIn disagree on dates, the résumé wins.

export const profile = {
  name: 'Manas Kumar Thakur',
  first: 'Manas',
  last: 'Thakur',
  /** The name in its own script: what the lake shows under the name. */
  devanagari: 'मानस ठाकुर',
  role: 'AI Engineer',
  handle: '@Menace_thakur',
  tagline: 'I build AI systems that can think through a task, use tools, and finish the job.',
  now: 'AI Engineer at Ocally',
  focus: ['AI infra', 'Harness engineering', 'Agentic systems', 'Computer vision'],
  base: 'Delhi NCR, India',
  timeZone: 'Asia/Kolkata',
  email: 'thakurmanas168@gmail.com',
  education: {
    degree: 'B.Tech, Computer Science (AI & ML)',
    school: 'Dronacharya College of Engineering',
    grad: '2027',
  },
  bio: [
    'AI Engineer at Ocally, working on AI infrastructure and agent harnesses.',
    'Before that: anomaly-detection research in Daegu, multi-agent systems for a San Francisco API company, a backend migration to GCP, and a Smart India Hackathon win with a YOLOv8 rock classifier.',
    'B.Tech in Computer Science (AI & ML) at Dronacharya College of Engineering, graduating 2027.',
  ],
  links: {
    github: 'https://github.com/Manas-thakur',
    linkedin: 'https://www.linkedin.com/in/manasthakur30',
    x: 'https://x.com/Menace_thakur',
    resume: 'https://manas-thakur.github.io/Resume/resume/resume.pdf',
    site: 'https://tensorman.me',
  },
} as const;

/** Optional photo for the commemorative stamp. Put a file in public/ and set its
 *  path here, e.g. '/portrait.jpg'. Left empty, the stamp shows the MT monogram. */
export const portrait: string | null = null;

export type TimeZoneTag = 'IST' | 'KST' | 'PT';

export const zones: { tag: TimeZoneTag; city: string; tz: string }[] = [
  { tag: 'IST', city: 'Delhi', tz: 'Asia/Kolkata' },
  { tag: 'KST', city: 'Daegu', tz: 'Asia/Seoul' },
  { tag: 'PT', city: 'Palo Alto', tz: 'America/Los_Angeles' },
];

/* ── Work: the tour ─────────────────────────────────────── */
export type Stage = {
  id: string;
  when: string;
  year: string;
  role: string;
  org: string;
  orgNote?: string;
  city: string;
  mode: string;
  zone: TimeZoneTag;
  points: string[];
  tags: string[];
};

export const stages: Stage[] = [
  {
    id: 'ocally',
    when: 'Jun 2026 — Now',
    year: '2026',
    role: 'AI Engineer',
    org: 'Ocally Inc.',
    city: 'Palo Alto, CA',
    mode: 'Remote · Full-time',
    zone: 'PT',
    points: [
      'AI infrastructure and agent harnesses at an early-stage company.',
      'Ocally is building Kai, an AI growth operator that works on every location of a local retail chain.',
    ],
    tags: ['AI infra', 'Agent harnesses', 'Transformers', 'Data modeling'],
  },
  {
    id: 'daegu',
    when: 'Mar 2026 — Sep 2026',
    year: '2026',
    role: 'AI Research Intern',
    org: 'Catholic University of Daegu',
    city: 'Daegu, South Korea',
    mode: 'On-site, then remote',
    zone: 'KST',
    points: [
      'Computer vision and anomaly detection for industrial inspection with YOLO, ResNet, CNN-based models and Amazon PatchCore.',
      'Designed, trained and evaluated deep-learning pipelines for defect detection, anomaly localisation and automated quality inspection.',
      'Model experiments and optimisation in PyTorch and OpenCV on real industrial datasets.',
    ],
    tags: ['PatchCore', 'YOLO', 'ResNet', 'PyTorch', 'OpenCV'],
  },
  {
    id: 'gdg',
    when: 'Sep 2025 — Sep 2026',
    year: '2025',
    role: 'Technical Team Lead',
    org: 'GDG on Campus DCE',
    city: 'Gurugram',
    mode: 'On-site',
    zone: 'IST',
    points: ['Led technical projects and workshops for the Google Developer Group chapter at Dronacharya College of Engineering.'],
    tags: ['Workshops', 'Projects', 'Mentoring'],
  },
  {
    id: 'magicapi',
    when: 'Jun 2025 — Aug 2025',
    year: '2025',
    role: 'AI Engineer Intern',
    org: 'MagicAPI Inc.',
    orgNote: 'API.Market · Noveum.ai',
    city: 'San Francisco, CA',
    mode: 'Remote',
    zone: 'PT',
    points: [
      'Built multi-agent AI systems that automate web-content analysis, saving 10+ manual hours a week.',
      'Built custom tools and microservices that made data processing 25% faster and AI workflows more accurate.',
      'Full-stack work: resolved 30+ bugs and tested new application features.',
    ],
    tags: ['Multi-agent', 'Tool calling', 'Microservices'],
  },
  {
    id: 'octalucent',
    when: 'Feb 2025 — May 2025',
    year: '2025',
    role: 'Backend Developer Intern',
    org: 'Octalucent (OSS & Consulting)',
    city: 'Gurugram',
    mode: 'Remote',
    zone: 'IST',
    points: [
      'Designed a 15+ table PostgreSQL schema for a new CRM, improving data consistency for client management.',
      'Deployed and maintained backend infrastructure on a local bare-metal cloud for the early rollout.',
      'Led the migration from on-premise servers to GCP VM instances, cutting latency by 30%.',
    ],
    tags: ['PostgreSQL', 'GCP', 'Bare-metal'],
  },
  {
    id: 'deviators',
    when: 'Jun 2024 — Jul 2025',
    year: '2024',
    role: 'AI Team',
    org: 'DEViators Club',
    city: 'Delhi NCR',
    mode: 'Campus',
    zone: 'IST',
    points: ["Hands-on AI and ML project work with the college's developer club."],
    tags: ['AI/ML'],
  },
  {
    id: 'freelance',
    when: 'Nov 2023 — Feb 2025',
    year: '2023',
    role: 'Computer Vision Engineer',
    org: 'Freelance',
    city: 'India',
    mode: 'Remote',
    zone: 'IST',
    points: [
      'Built custom models and fine-tuned transformer architectures (ViTs, DETR) for detection, classification, segmentation and pose estimation.',
      'Owned dataset pipelines end to end: cleaning, augmentation, labelling and validation.',
      'Shipped models behind REST APIs with Docker, FastAPI and Flask for clients across industries.',
    ],
    tags: ['ViT', 'DETR', 'FastAPI', 'Docker'],
  },
];

/* ── Projects: the stations ─────────────────────────────── */
export type Motif = 'shield' | 'track' | 'release' | 'strata' | 'crane' | 'pages' | 'flame';

export type Station = {
  id: string;
  freq: number;
  name: string;
  kicker: string;
  year: string;
  stack: string[];
  points: string[];
  metric?: { value: string; label: string };
  credit?: string;
  links: { label: string; href: string }[];
  motif: Motif;
};

export const stations: Station[] = [
  {
    id: 'warden',
    freq: 88.3,
    name: 'Warden',
    kicker: 'A trust layer for npm installs.',
    year: '2026',
    stack: ['TypeScript', 'Bun', 'OSV'],
    points: [
      'Checks npm packages before they install or execute: compares releases, verifies tarball integrity and applies deterministic supply-chain rules.',
      'Every check ends in a verdict — allow, warn or block — with its own exit code.',
      'wnpm doctor audits dependencies against OSV advisories, then keeps only the upgrade plans that pass the project’s own tests in isolated workspaces.',
    ],
    metric: { value: '0 · 10 · 20', label: 'allow · warn · block' },
    credit: 'Built with Bhavishya Chaturvedi and Pulkit',
    links: [{ label: 'GitHub', href: 'https://github.com/Manas-thakur/warden' }],
    motif: 'shield',
  },
  {
    id: 'trackshift',
    freq: 91.7,
    name: 'TrackShift',
    kicker: 'A race simulator with a gym for RL agents.',
    year: '2026',
    stack: ['Python', 'Gymnasium', 'SQLite', 'Docker'],
    points: [
      'Standalone circuit race simulator: up to 20 cars, 23 Crowdflow layouts, battery controls and live telemetry.',
      'Ships a Gymnasium environment for reinforcement learning and a 3D race view with chase, first-person and orbit cameras.',
      'Built for TrackShift 2026 at Plaksha University after a 3rd-place finish at Geek Room’s Grand Prix Hackathon.',
    ],
    metric: { value: '20', label: 'cars on the grid' },
    links: [{ label: 'GitHub', href: 'https://github.com/Manas-thakur/TrackShift' }],
    motif: 'track',
  },
  {
    id: 'paradize',
    freq: 94.5,
    name: 'Paradize',
    kicker: 'A home for people who build hardware.',
    year: '2026',
    stack: ['Platform', 'Marketplace', 'Research'],
    points: [
      'Write a hardware project down once — design, build instructions, parts list and firmware — and publish it as releases.',
      'A release pins one board revision and its firmware, so someone else can build that exact version a year later, or fork it.',
      'Builds check your parts bin, and only the lines you are short of become a kit. Still in development; the waitlist is open.',
    ],
    links: [{ label: 'paradize.space', href: 'https://www.paradize.space' }],
    motif: 'release',
  },
  {
    id: 'lithology',
    freq: 98.1,
    name: 'Lithology',
    kicker: 'Smart India Hackathon 2023 — winner.',
    year: '2023',
    stack: ['YOLOv8', 'Python', 'Computer vision'],
    points: [
      'Real-time detection and classification of rock types for automated lithology.',
      'Scraped and annotated a custom dataset of 1,500+ images, split 70:20:10 for training, validation and test.',
      'Fine-tuned YOLOv8 to 99.97% accuracy and 99.83% precision on the held-out test set.',
    ],
    metric: { value: '99.97%', label: 'test accuracy' },
    links: [{ label: 'GitHub', href: 'https://github.com/Manas-thakur/Lithology' }],
    motif: 'strata',
  },
  {
    id: 'construction',
    freq: 101.4,
    name: 'Construction Monitor',
    kicker: 'ML for construction progress monitoring — IDE 2024.',
    year: '2024',
    stack: ['Deep learning', 'OpenCV', 'Python'],
    points: [
      'Real-time ML system that tracks construction progress through automated image analysis.',
      'Its anomaly-detection module flagged 98% of reporting errors before they happened.',
      'Cut manual progress-tracking time by 30%.',
    ],
    metric: { value: '98%', label: 'reporting errors flagged' },
    links: [],
    motif: 'crane',
  },
  {
    id: 'documind',
    freq: 104.2,
    name: 'DocuMind',
    kicker: 'Ask your PDFs questions, on your own machine.',
    year: '2025',
    stack: ['Python', 'RAG', 'Ollama', 'Streamlit'],
    points: [
      'Retrieval-augmented generation over PDFs with semantic chunking and search.',
      'Runs on local models through Ollama, behind a Streamlit interface.',
    ],
    links: [{ label: 'GitHub', href: 'https://github.com/Manas-thakur/documind' }],
    motif: 'pages',
  },
  {
    id: 'gaslight',
    freq: 107.3,
    name: 'GasLight GPT',
    kicker: 'Conversational AI with a retro-futurist face.',
    year: '2025',
    stack: ['Python', 'FastAPI'],
    points: ['A conversational AI app served with FastAPI, wrapped in a retro-futuristic interface.'],
    links: [{ label: 'GitHub', href: 'https://github.com/Manas-thakur/gaslight_gpt' }],
    motif: 'flame',
  },
];

/* ── Press: The Kulhad Times ────────────────────────────── */
export type Clipping = {
  id: string;
  tag: string;
  date: string;
  headline: string;
  body: string;
  source: string;
};

export const clippings: Clipping[] = [
  {
    id: 'sih',
    tag: 'Exclusive',
    date: 'Dec 2023',
    headline: 'Delhi team wins Smart India Hackathon with a rock-reading AI',
    body: 'An automated lithology classifier built on YOLOv8 took the 2023 title. The team scraped and hand-labelled 1,500+ images; the fine-tuned model scored 99.97% accuracy on its test set.',
    source: 'Ministry of Education · SIH 2023',
  },
  {
    id: 'daegu',
    tag: 'Research',
    date: 'Mar 2026',
    headline: 'From NCR to Daegu, chasing defects pixel by pixel',
    body: 'On-site at the Catholic University of Daegu: anomaly detection for industrial inspection with PatchCore, YOLO and ResNet. The work continued remotely through September and ended with a letter of recommendation.',
    source: 'Daegu, South Korea',
  },
  {
    id: 'grandprix',
    tag: 'Hackathon',
    date: '2026',
    headline: 'Third at the Grand Prix. Next stop: Plaksha',
    body: 'A 3rd-place finish at Geek Room’s Grand Prix Hackathon, held at Paytm’s office, sent the team straight to TrackShift 2026 at Plaksha University for a 24-hour build.',
    source: 'Geek Room',
  },
  {
    id: 'cubicle',
    tag: 'Community',
    date: 'Oct 2026',
    headline: 'On the other side of the table',
    body: 'Now mentoring at Code Cubicle 6.0, a Geek Room hackathon that drew around 3,700 registrations, after a year as technical team lead at GDG on Campus DCE.',
    source: 'Code Cubicle 6.0',
  },
  {
    id: 'magicapi',
    tag: 'Industry',
    date: 'Summer 2025',
    headline: 'San Francisco startup, Delhi time zone',
    body: 'As an AI engineer intern at MagicAPI (API.Market, Noveum.ai), built multi-agent systems that took 10+ manual hours a week off the team’s plate.',
    source: 'MagicAPI Inc.',
  },
];

export const briefs: string[] = [
  'Engineers’ Day Idea Competition, DCE: 2nd place for a fire-resistant system for car accidents.',
  'IDE Bootcamp: advanced to Phase 2 at Amity University.',
  'Ocally: joined as AI Engineer in June 2026.',
];

/* ── Numbers: the departures board ─────────────────────── */
export type Figure = { value: string; what: string; where: string };

export const figures: Figure[] = [
  { value: '99.97%', what: 'YOLOv8 test accuracy', where: 'SIH 2023 · Lithology' },
  { value: '1,500+', what: 'Images hand-labelled', where: 'Lithology dataset' },
  { value: '10+ HRS', what: 'Manual work saved weekly', where: 'Multi-agent system · MagicAPI' },
  { value: '30%', what: 'Lower latency', where: 'CRM backend to GCP' },
  { value: '98%', what: 'Reporting errors flagged', where: 'Construction monitor' },
  { value: '703', what: 'GitHub contributions', where: 'Last 12 months · Oct 2026' },
];

/* ── Community & stack ──────────────────────────────────── */
export const community = [
  { role: 'Technical Team Lead', org: 'GDG on Campus DCE', when: '2025 — 2026' },
  { role: 'Mentor', org: 'Code Cubicle 6.0 · Geek Room', when: 'Oct 2026' },
  { role: 'AI Team', org: 'DEViators Club', when: '2024 — 2025' },
  { role: 'Winner', org: 'Smart India Hackathon', when: '2023' },
];

export type StackGroup = { group: string; items: string[] };

export const stack: StackGroup[] = [
  {
    group: 'Agents',
    items: ['Tool & function calling', 'Memory systems', 'Context management', 'Workflow orchestration', 'RAG & vector retrieval', 'LangGraph', 'LangChain', 'Prompt engineering'],
  },
  {
    group: 'Models',
    items: ['Transformers', 'ViTs', 'CNNs', 'LSTMs', 'U-Net', 'CLIP', 'DINO', 'ResNet', 'PatchCore', 'SAM', 'YOLOv8'],
  },
  {
    group: 'Frameworks',
    items: ['PyTorch', 'TensorFlow', 'Hugging Face Transformers', 'OpenCV', 'scikit-learn', 'FastAPI'],
  },
  {
    group: 'Infra',
    items: ['Docker', 'CI/CD', 'MLflow', 'Weights & Biases', 'CUDA', 'NVIDIA Jetson', 'Linux', 'GCP', 'REST APIs'],
  },
  {
    group: 'Data',
    items: ['PostgreSQL', 'MongoDB', 'Redis', 'Pinecone', 'LanceDB', 'ChromaDB', 'Pandas', 'NumPy'],
  },
  {
    group: 'Languages',
    items: ['Python', 'SQL', 'C++', 'JavaScript', 'TypeScript', 'R'],
  },
];

/* ── Ticker copy ────────────────────────────────────────── */
export const tapeLine = ['AI Engineer @ Ocally', 'AI infra', 'Harness engineering', 'Agentic systems', 'Computer vision', 'Delhi × Daegu × Palo Alto'];

export const greetings = [
  { text: 'नमस्ते', lang: 'hi', script: 'deva' },
  { text: '안녕하세요', lang: 'ko', script: 'hangul' },
  { text: 'Hello', lang: 'en', script: 'latin' },
] as const;
