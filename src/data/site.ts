import ps4Img from "@/assets/raw/ps4.jpg";
import ps4ProImg from "@/assets/raw/ps4pro.jpg";
import gtaImg from "@/assets/raw/gta.jpg";
import rdr2Img from "@/assets/raw/rdr2.jpg";
import wweImg from "@/assets/raw/wwe.jpg";
import fc27Img from "@/assets/raw/fc24.jpg";
import mk11Img from "@/assets/raw/mk11.jpg";
import spidermanImg from "@/assets/raw/spiderman.jpg";

/* ------------------------------------------------------------------ */
/* Business info                                                       */
/* ------------------------------------------------------------------ */
export const BUSINESS = {
  name: "Atrocity Gaming Lounge",
  tagline: "PLAY • CONNECT • ENJOY",
  phoneDisplay: "+91 9025785087",
  phoneE164: "+919025785087",
  whatsapp: "919025785087",
  email: "atrocitygaming109@gmail.com",
  addressLines: [
    "No. 723C, Erode Main Road,",
    "Opp. Indian Overseas Bank (IOB), Four Road,",
    "Kavindapadi, Erode, Tamil Nadu 638455",
  ],
  addressFull:
    "No. 723C, Erode Main Road, Opp. Indian Overseas Bank (IOB), Four Road, Kavindapadi, Erode, Tamil Nadu 638455",
  hoursLabel: "Open Daily from 10:00 AM to 10:00 PM",
  hoursShort: "10:00 AM – 10:00 PM",
  /** Landmark-based query: the lounge is directly opposite IOB, Four Road. */
  mapsQuery: "Indian Overseas Bank, Four Road, Kavindapadi, Erode, Tamil Nadu 638455",
} as const;

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */
export const NAV_LINKS = [
  { id: "home", label: "Home" },
  { id: "consoles", label: "Consoles" },
  { id: "games", label: "Games" },
  { id: "pricing", label: "Pricing" },
  { id: "events", label: "Events & Tournaments" },
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Contact" },
] as const;

/** Sections observed by the scroll-spy. */
export const SPY_IDS = ["home", "consoles", "games", "pricing", "events", "faq", "contact"] as const;

/* ------------------------------------------------------------------ */
/* Consoles & Hardware                                                 */
/* ------------------------------------------------------------------ */
export type ConsoleId = "ps4" | "ps4pro";
export type ConsolePref = "PS4" | "PS4 Pro" | "Any console";

export interface ConsoleInfo {
  id: ConsoleId;
  name: string;
  short: "PS4" | "PS4 Pro";
  badge: string;
  tagline: string;
  description: string;
  image: string;
  hourlyRate: number;
  pack3Rate: number;
  dayPassRate: number;
  specs: { label: string; value: string }[];
  highlights: string[];
}

export const CONSOLES: ConsoleInfo[] = [
  {
    id: "ps4",
    name: "PlayStation 4",
    short: "PS4",
    badge: "Station 1 · 1080p",
    tagline: "Smooth Full HD · The multiplayer favourite",
    description:
      "Reliable Full HD gaming with access to the complete game library — ideal for story campaigns, party games, and heated couch multiplayer with your squad.",
    image: ps4Img,
    hourlyRate: 70,
    pack3Rate: 200,
    dayPassRate: 350,
    specs: [
      { label: "Hourly rate", value: "₹70 / hour" },
      { label: "Resolution", value: "1080p Full HD" },
      { label: "GPU", value: "1.84 TFLOPS" },
      { label: "Controller", value: "DualShock 4" },
    ],
    highlights: ["Full game library access", "Wireless DualShock 4 controllers", "HDR on supported titles", "Great for 1v1 and multiplayer"],
  },
  {
    id: "ps4pro",
    name: "PlayStation 4 Pro",
    short: "PS4 Pro",
    badge: "Station 2 · 4K Ready",
    tagline: "4K-Ready Visuals · Boost Mode Enhanced",
    description:
      "More than twice the GPU power of standard PS4 for up to 4K output, HDR colour, and steadier boosted frame rates on enhanced titles — built for players who want every detail.",
    image: ps4ProImg,
    hourlyRate: 90,
    pack3Rate: 230,
    dayPassRate: 380,
    specs: [
      { label: "Hourly rate", value: "₹90 / hour" },
      { label: "Resolution", value: "Up to 4K" },
      { label: "GPU", value: "4.2 TFLOPS" },
      { label: "Visuals", value: "HDR · Boost" },
    ],
    highlights: ["4K-ready, Pro-enhanced visuals", "HDR for richer colour & contrast", "Boosted frame rates on supported games", "Ideal for competitive play"],
  },
];

/* ------------------------------------------------------------------ */
/* Services & booking                                                  */
/* ------------------------------------------------------------------ */
export type ServiceId = "hourly" | "pack3" | "daypass" | "group" | "tournament";
export type ServiceKind = "console" | "group" | "tournament";

export const RACING_TITLES = ["Gran Turismo Sport", "F1® Series", "DiRT Rally 2.0", "Assetto Corsa Competizione", "Project CARS 2"];

export interface Service {
  id: ServiceId;
  name: string;
  short: string;
  kind: ServiceKind;
  ps4Price: number | null;
  ps4ProPrice: number | null;
  durationMins: number;
  note: string;
}

export const SERVICES: Service[] = [
  {
    id: "hourly",
    name: "Per Hour",
    short: "Per Hour",
    kind: "console",
    ps4Price: 70,
    ps4ProPrice: 90,
    durationMins: 60,
    note: "Full game library · DualShock 4 controllers",
  },
  {
    id: "pack3",
    name: "3 Hours Package",
    short: "3 Hours",
    kind: "console",
    ps4Price: 200,
    ps4ProPrice: 230,
    durationMins: 180,
    note: "15 mins bonus play time · Save ₹10 on PS4 / ₹40 on PS4 Pro",
  },
  {
    id: "daypass",
    name: "5 Hours Day Pass",
    short: "Day Pass",
    kind: "console",
    ps4Price: 350,
    ps4ProPrice: 380,
    durationMins: 300,
    note: "30 mins bonus play time · Priority booking · Save ₹70 on PS4 Pro",
  },
  {
    id: "group",
    name: "Group Event (Full Venue)",
    short: "Group Event",
    kind: "group",
    ps4Price: 2500,
    ps4ProPrice: 2500,
    durationMins: 60,
    note: "Exclusive use of both PS4 & PS4 Pro stations",
  },
  {
    id: "tournament",
    name: "Tournament Registration",
    short: "Tournament",
    kind: "tournament",
    ps4Price: null,
    ps4ProPrice: null,
    durationMins: 0,
    note: "Dates & entry details shared on WhatsApp",
  },
];

export const getService = (id: ServiceId): Service => SERVICES.find((s) => s.id === id) ?? SERVICES[0];

export interface BookingPrefill {
  service?: ServiceId;
  consolePref?: ConsolePref;
  date?: string;
  time?: string;
  game?: string;
  tournament?: string;
}

/* ------------------------------------------------------------------ */
/* Pricing Packages                                                    */
/* ------------------------------------------------------------------ */
export interface PricingPlan {
  id: ServiceId;
  name: string;
  category: string;
  ps4Price: number;
  ps4ProPrice: number;
  bonusMinutes?: number;
  unit: string;
  tagline: string;
  features: string[];
  ps4Savings?: string;
  ps4ProSavings?: string;
  badge?: string;
  featured?: boolean;
  cta: string;
}

export const PRICING: PricingPlan[] = [
  {
    id: "hourly",
    name: "Per Hour",
    category: "Drop In",
    ps4Price: 70,
    ps4ProPrice: 90,
    unit: "/ hour",
    tagline: "Drop in and play at your own pace.",
    features: ["Access to full game library", "DualShock 4 controllers", "Crystal-clear graphics & immersive gameplay"],
    cta: "Book Hourly",
  },
  {
    id: "pack3",
    name: "3 Hours Package",
    category: "Squad Session",
    ps4Price: 200,
    ps4ProPrice: 230,
    unit: "/ 3 hours",
    tagline: "The perfect session with your squad.",
    ps4Savings: "Save ₹10 on PS4",
    ps4ProSavings: "Save ₹40 on PS4 Pro",
    features: ["15 mins bonus play time", "Access to full game library", "DualShock 4 controllers"],
    cta: "Book 3 Hours",
  },
  {
    id: "daypass",
    name: "5 Hours Day Pass",
    category: "Marathon",
    ps4Price: 350,
    ps4ProPrice: 380,
    unit: "/ 5 hours",
    tagline: "Go all in — marathon mode unlocked.",
    ps4ProSavings: "Save ₹70 on PS4 Pro",
    badge: "Ultimate Pass",
    featured: true,
    features: ["30 mins bonus play time", "Priority booking", "Access to full game library", "DualShock 4 controllers"],
    cta: "Get Day Pass",
  },
];

/* ------------------------------------------------------------------ */
/* Games                                                               */
/* ------------------------------------------------------------------ */
export type GameFilter = "All" | "Open World" | "Sports" | "Fighting" | "Multiplayer";
export const GAME_FILTERS: GameFilter[] = ["All", "Open World", "Sports", "Fighting", "Multiplayer"];

export interface Game {
  id: string;
  title: string;
  studio: string;
  image: string;
  tag: string;
  genres: Exclude<GameFilter, "All">[];
  modes: string[];
  blurb: string;
}

export const GAMES: Game[] = [
  {
    id: "gta5",
    title: "Grand Theft Auto V",
    studio: "Rockstar Games",
    image: gtaImg,
    tag: "Open World",
    genres: ["Open World"],
    modes: ["Story", "Online"],
    blurb: "Pull off daring heists and tear through Los Santos in one of the biggest open worlds ever made.",
  },
  {
    id: "rdr2",
    title: "Red Dead Redemption 2",
    studio: "Rockstar Games",
    image: rdr2Img,
    tag: "Western Epic",
    genres: ["Open World"],
    modes: ["Story", "Online"],
    blurb: "Ride with the Van der Linde gang across a breathtaking, living frontier in this cinematic western.",
  },
  {
    id: "wwe2k",
    title: "WWE 2K",
    studio: "2K",
    image: wweImg,
    tag: "Wrestling",
    genres: ["Sports", "Fighting", "Multiplayer"],
    modes: ["Versus", "Local Multiplayer"],
    blurb: "Step into the squared circle — slam, pin and settle rivalries with friends in front of a roaring crowd.",
  },
  {
    id: "fc27",
    title: "FC27",
    studio: "EA Sports",
    image: fc27Img,
    tag: "Football",
    genres: ["Sports", "Multiplayer"],
    modes: ["1v1", "Local Multiplayer"],
    blurb: "Take the world's top clubs onto the pitch — perfect for heated 1v1 derbies and co-op matches.",
  },
  {
    id: "mk11",
    title: "Mortal Kombat 11",
    studio: "NetherRealm Studios",
    image: mk11Img,
    tag: "Fighting",
    genres: ["Fighting", "Multiplayer"],
    modes: ["1v1 Versus", "Story"],
    blurb: "Brutal combos, iconic fighters and legendary Fatalities. Settle every argument the Kombat way.",
  },
  {
    id: "spiderman",
    title: "Spider-Man",
    studio: "Marvel's · Insomniac Games",
    image: spidermanImg,
    tag: "Action-Adventure",
    genres: ["Open World"],
    modes: ["Story", "Single Player"],
    blurb: "Swing through Manhattan as Peter Parker in a cinematic, high-flying superhero adventure.",
  },
];

export const GROUP_PERKS = [
  "Exclusive access to the entire venue",
  "Both PS4 & PS4 Pro stations for your crew",
  "Pick your own game lineup",
  "Run your own private mini tournament",
];

export const GROUP_STEPS = [
  { title: "Pick your date", text: "Choose a day and start time that works for your group." },
  { title: "Send your request", text: "Book online — your details reach us instantly on WhatsApp." },
  { title: "We confirm & prep", text: "We lock in both stations and get every game ready." },
  { title: "Game on", text: "Walk in, grab a controller and own the arena." },
];

export const OCCASIONS = ["Birthday Parties", "College Squads", "Office Outings", "Gaming Nights", "Private Tournaments", "Celebrations"];

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */
export type FaqCategory = "Bookings" | "Walk-ins" | "Hardware" | "Events";
export const FAQ_CATEGORIES = ["All", "Bookings", "Walk-ins", "Hardware", "Events"] as const;
export type FaqFilter = (typeof FAQ_CATEGORIES)[number];

export interface FaqItem {
  category: FaqCategory;
  q: string;
  a: string;
}

export const FAQS: FaqItem[] = [
  {
    category: "Hardware",
    q: "Which consoles do you have at the lounge?",
    a: "We have two dedicated stations: one PlayStation 4 (₹70/hr) and one PlayStation 4 Pro (₹90/hr). Both feature wireless DualShock 4 controllers and access to our full premium game library.",
  },
  {
    category: "Hardware",
    q: "What is the price difference between PS4 and PS4 Pro?",
    a: "PS4 is ₹70/hour (₹200 for 3 hours, ₹350 for 5 hours). PS4 Pro is ₹90/hour (₹230 for 3 hours, ₹380 for 5 hours), delivering 4K-ready output, HDR colour, and steadier boosted frame rates on enhanced titles.",
  },
  {
    category: "Bookings",
    q: "How do I book a session?",
    a: "Tap “Book Now”, choose your console (PS4 or PS4 Pro), package, date and time, then send the request — it opens WhatsApp with your details pre-filled so our team can confirm your slot quickly. Prefer talking? Call us on +91 9025785087.",
  },
  {
    category: "Bookings",
    q: "How does the bonus time on packages work?",
    a: "The 3 Hours Package comes with 15 minutes of bonus play time and the 5 Hours Day Pass comes with 30 minutes — added on top of your booked hours. Day Pass players also get priority booking.",
  },
  {
    category: "Bookings",
    q: "Can I reschedule my booking?",
    a: "Yes. Just call or WhatsApp us on +91 9025785087 as early as possible and we’ll do our best to move you to another available slot.",
  },
  {
    category: "Walk-ins",
    q: "Do you accept walk-ins?",
    a: "Absolutely! Walk-ins are welcome every day from 10:00 AM to 10:00 PM, subject to availability. Because we have two dedicated consoles (one PS4 and one PS4 Pro), booking ahead is the best way to guarantee your preferred station.",
  },
  {
    category: "Walk-ins",
    q: "What are your opening hours?",
    a: "We’re open daily from 10:00 AM to 10:00 PM — weekdays and weekends.",
  },
  {
    category: "Walk-ins",
    q: "Where exactly are you located?",
    a: "No. 723C, Erode Main Road, right opposite Indian Overseas Bank (IOB), Four Road, Kavindapadi, Erode, Tamil Nadu 638455.",
  },
  {
    category: "Walk-ins",
    q: "I’m new to gaming — can I still come?",
    a: "Of course. First-timers, casual players and seasoned pros are all welcome. Our team will help you get set up and pick a game that suits you.",
  },
  {
    category: "Events",
    q: "Can we book the whole venue for a group?",
    a: "Yes! Group events give your crew exclusive use of the entire venue (both PS4 and PS4 Pro stations) for a flat ₹2500 — ideal for birthdays, college squads and office outings. Book from the Events section or give us a call.",
  },
  {
    category: "Events",
    q: "How do tournaments work?",
    a: "We host local tournaments across titles like FC27, Mortal Kombat 11, and WWE 2K. Register from the Tournaments tab and we’ll share dates, formats and entry details with you on WhatsApp.",
  },
];
