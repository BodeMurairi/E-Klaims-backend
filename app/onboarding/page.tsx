"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ROLES, ROLE_DASHBOARD_PATHS } from "@/lib/constants";
import { UserRole } from "@/lib/types";
import { toast } from "sonner";
import {
  CheckCircle, ChevronRight, Upload, X, FileText,
  Bot, User, Send, Loader2, Tag,
} from "lucide-react";

// ─── Step type (product step merged into chatbot) ─────────────────────────────

type ClientStep = "role" | "profile" | "chatbot" | "documents" | "review" | "submitted";

// ─── Profile & product state ─────────────────────────────────────────────────

interface ProfileData {
  firstName: string;
  lastName: string;
  phone: string;
  nationalId: string;
}

interface ProductData {
  type: string;
  label: string;
  sumInsured: number;
  riskDetails: Record<string, string>;
}

interface UploadedFile {
  storageId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

// ─── Chatbot state machine ────────────────────────────────────────────────────

type ChatPhase = "greeting" | "questioning" | "quoting" | "confirmed";

interface Quote {
  premium: number;
  sumInsured: number;
  rateLabel: string;
  breakdown: string[];
}

interface ConvoState {
  phase: ChatPhase;
  product: string;
  productLabel: string;
  questionIndex: number;
  answers: Record<string, string>;
  quote: Quote | null;
}

interface ChatMessage {
  from: "bot" | "user";
  text: string;
  quickReplies?: string[];
}

// ─── Product question flows ───────────────────────────────────────────────────

const PRODUCT_LABELS: Record<string, string> = {
  motor: "Motor Insurance",
  health: "Health Insurance",
  property: "Property Insurance",
  life: "Life Insurance",
  travel: "Travel Insurance",
};

interface Question {
  key: string;
  ask: (answers: Record<string, string>) => string;
  quickReplies?: string[];
}

const PRODUCT_QUESTIONS: Record<string, Question[]> = {
  motor: [
    {
      key: "coverType",
      ask: () => "What type of motor cover are you looking for?",
      quickReplies: ["Comprehensive", "Third Party Only", "Third Party, Fire & Theft"],
    },
    {
      key: "make",
      ask: () => "What is the **make** of your vehicle? _(e.g. Toyota, Nissan, BMW)_",
    },
    {
      key: "model",
      ask: (a) => `What is the **model** of your ${a.make}? _(e.g. Corolla, Harrier, X5)_`,
    },
    {
      key: "year",
      ask: (a) => `What **year** was your ${a.make} ${a.model} manufactured?`,
    },
    {
      key: "registration",
      ask: () => "What is the vehicle's **registration number**?",
    },
    {
      key: "usage",
      ask: () => "How will the vehicle be used?",
      quickReplies: ["Private", "Commercial", "PSV / Taxi"],
    },
    {
      key: "value",
      ask: (a) =>
        `What is the current **market value** of your ${a.make} ${a.model} in RWF?\n_(This is the amount it would cost to replace the vehicle today)_`,
    },
  ],
  travel: [
    {
      key: "destination",
      ask: () => "Which **country or countries** are you traveling to?",
    },
    {
      key: "region",
      ask: (a) =>
        `Which coverage plan suits your trip to **${a.destination}**?`,
      quickReplies: ["Africa / Asia", "Europe Basic", "Europe Plus", "Worldwide Basic", "Worldwide Silver", "Worldwide Gold"],
    },
    {
      key: "departure",
      ask: () => "What is your **departure date**? _(DD/MM/YYYY)_",
    },
    {
      key: "returnDate",
      ask: () => "What is your **return date**? _(DD/MM/YYYY)_",
    },
    {
      key: "purpose",
      ask: () => "What is the **purpose** of your travel?",
      quickReplies: ["Business", "Leisure / Holiday", "Medical", "Education", "Other"],
    },
    {
      key: "mode",
      ask: () => "What is your **mode of travel**?",
      quickReplies: ["Air", "Land", "Sea"],
    },
    {
      key: "preExisting",
      ask: () =>
        "Do you have any **pre-existing medical conditions** or are you currently undergoing treatment?",
      quickReplies: ["Yes", "No"],
    },
    {
      key: "nextOfKin",
      ask: () =>
        "Who is your **next of kin**? Please provide their name and phone number.",
    },
  ],
  health: [
    {
      key: "dob",
      ask: () => "What is your **date of birth**? _(DD/MM/YYYY)_",
    },
    {
      key: "occupation",
      ask: () => "What is your **occupation**?",
    },
    {
      key: "dependants",
      ask: () =>
        "How many **family members** (including yourself) do you want covered under this plan?",
      quickReplies: ["Just me", "2", "3", "4", "5+"],
    },
    {
      key: "preExisting",
      ask: () =>
        "Do you have any **pre-existing medical conditions**? _(e.g. diabetes, hypertension)_",
      quickReplies: ["Yes", "No"],
    },
    {
      key: "sumInsured",
      ask: () =>
        "What **annual sum insured** are you looking for in RWF?\n_(This is the maximum the insurer will pay per year)_",
      quickReplies: ["5,000,000", "10,000,000", "20,000,000", "50,000,000"],
    },
  ],
  property: [
    {
      key: "address",
      ask: () => "What is the **full address** of the property to be insured?",
    },
    {
      key: "type",
      ask: () => "Is this a residential or commercial property?",
      quickReplies: ["Residential", "Commercial", "Industrial"],
    },
    {
      key: "construction",
      ask: () => "What are the **walls and roof** made of?",
      quickReplies: ["Stone / Iron Sheet", "Brick / Tiles", "Concrete / Concrete"],
    },
    {
      key: "yearBuilt",
      ask: () => "What **year** was the property built?",
    },
    {
      key: "contents",
      ask: () => "Do you want to insure the **contents** (furniture, electronics, etc.) as well?",
      quickReplies: ["Yes", "No"],
    },
    {
      key: "value",
      ask: () =>
        "What is the **estimated rebuilding value** of the property in RWF?\n_(The cost to rebuild it from scratch, not the market value)_",
    },
  ],
  life: [
    {
      key: "dob",
      ask: () => "What is your **date of birth**? _(DD/MM/YYYY)_",
    },
    {
      key: "occupation",
      ask: () => "What is your **occupation**?",
    },
    {
      key: "smoker",
      ask: () => "Do you **smoke** or use tobacco products?",
      quickReplies: ["Yes", "No"],
    },
    {
      key: "planType",
      ask: () => "Which type of life cover are you interested in?",
      quickReplies: ["Term Life (fixed period)", "Whole Life", "Endowment"],
    },
    {
      key: "sumInsured",
      ask: () =>
        "What **sum insured** are you looking for in RWF?\n_(The amount your beneficiaries receive)_",
      quickReplies: ["5,000,000", "10,000,000", "30,000,000", "50,000,000"],
    },
    {
      key: "beneficiary",
      ask: () =>
        "Who is your **primary beneficiary**? Please provide their name and relationship.",
    },
  ],
};

// ─── Quote calculator ─────────────────────────────────────────────────────────

function parseAmount(raw: string): number {
  return Number(raw.replace(/[^0-9.]/g, "")) || 0;
}

function parseDateDiff(dep: string, ret: string): number {
  const p = (s: string) => {
    const [d, m, y] = s.split("/").map(Number);
    return new Date(y, m - 1, d);
  };
  const days = Math.ceil((p(ret).getTime() - p(dep).getTime()) / 86_400_000);
  return Math.max(1, isNaN(days) ? 7 : days);
}

function calculateQuote(product: string, answers: Record<string, string>): Quote {
  switch (product) {
    case "motor": {
      const value = parseAmount(answers.value);
      const cover = answers.coverType ?? "Comprehensive";
      const rate = cover === "Third Party Only" ? 0.03 : 0.05;
      const premium = Math.max(30_000, value * rate);
      return {
        sumInsured: value,
        premium,
        rateLabel: `${(rate * 100).toFixed(0)}% of vehicle value`,
        breakdown: [
          `Vehicle: ${answers.make} ${answers.model} (${answers.year})`,
          `Cover type: ${cover}`,
          `Vehicle value: RWF ${value.toLocaleString()}`,
          `Rate: ${(rate * 100).toFixed(0)}%`,
          `Annual premium: RWF ${premium.toLocaleString()}`,
        ],
      };
    }
    case "travel": {
      const days = parseDateDiff(answers.departure, answers.returnDate);
      const USD_TO_RWF = 1350;

      // Travel rates (USD) by duration bracket and region plan
      // Brackets: [maxDays, Africa/Asia, EuroBasic, EuroPlus, WwBasic, WwSilver, WwGold]
      const TRAVEL_RATES: [number, number, number, number, number, number, number][] = [
        [8,   24.54, 24.54, 26.85, 29.03, 33.05, 33.58],
        [14,  25.80, 25.80, 28.80, 29.97, 34.27, 34.78],
        [21,  27.70, 27.70, 33.18, 34.44, 37.43, 38.05],
        [32,  35.28, 35.28, 39.53, 42.31, 52.83, 53.81],
        [49,  41.60, 41.60, 52.15, 58.41, 70.09, 71.41],
        [62,  52.15, 52.15, 60.57, 66.36, 79.92, 81.46],
        [92,  60.14, 60.14, 77.74, 84.54, 94.81, 96.67],
        [180, 79.56, 79.56, 111.16, 131.11, 160.28, 163.59],
      ];
      const REGION_IDX: Record<string, number> = {
        "Africa / Asia": 1, "Europe Basic": 2, "Europe Plus": 3,
        "Worldwide Basic": 4, "Worldwide Silver": 5, "Worldwide Gold": 6,
      };
      const colIdx = REGION_IDX[answers.region] ?? 1;
      const bracket = TRAVEL_RATES.find(([max]) => days <= max) ?? TRAVEL_RATES[TRAVEL_RATES.length - 1];
      const premiumUsd = bracket[colIdx];
      const premium = Math.round(premiumUsd * USD_TO_RWF);
      const coverageUsd = answers.region?.startsWith("Worldwide") ? 100_000 : 30_000;
      const coverage = coverageUsd * USD_TO_RWF;
      return {
        sumInsured: coverage,
        premium,
        rateLabel: `K-Claims flat rate — ${answers.region}`,
        breakdown: [
          `Destination: ${answers.destination}`,
          `Plan: ${answers.region ?? "Africa / Asia"}`,
          `Duration: ${days} day${days !== 1 ? "s" : ""}`,
          `Medical cover: RWF ${coverage.toLocaleString()}`,
          `Base rate: $${premiumUsd} USD`,
          `Total premium: RWF ${premium.toLocaleString()}`,
        ],
      };
    }
    case "health": {
      const si = parseAmount(answers.sumInsured);
      const depCount = answers.dependants === "Just me" ? 1 : parseAmount(answers.dependants);
      const rate = 0.04 + (depCount > 1 ? (depCount - 1) * 0.015 : 0);
      const premium = Math.max(80_000, si * rate);
      return {
        sumInsured: si,
        premium,
        rateLabel: `${(rate * 100).toFixed(1)}% of sum insured`,
        breakdown: [
          `Lives covered: ${depCount}`,
          `Annual sum insured: RWF ${si.toLocaleString()}`,
          `Rate: ${(rate * 100).toFixed(1)}%`,
          `Annual premium: RWF ${premium.toLocaleString()}`,
        ],
      };
    }
    case "property": {
      const value = parseAmount(answers.value);
      const hasContents = answers.contents === "Yes";
      const buildingPremium = value * 0.0035;
      const contentsPremium = hasContents ? value * 0.005 : 0;
      const premium = Math.max(50_000, buildingPremium + contentsPremium);
      return {
        sumInsured: value,
        premium,
        rateLabel: `0.35% buildings${hasContents ? " + 0.5% contents" : ""}`,
        breakdown: [
          `Property: ${answers.address}`,
          `Building value: RWF ${value.toLocaleString()} @ 0.35%`,
          ...(hasContents ? [`Contents @ 0.5% included`] : []),
          `Annual premium: RWF ${premium.toLocaleString()}`,
        ],
      };
    }
    case "life": {
      const si = parseAmount(answers.sumInsured);
      const smoker = answers.smoker === "Yes";
      const rate = smoker ? 0.025 : 0.015;
      const premium = Math.max(50_000, si * rate);
      return {
        sumInsured: si,
        premium,
        rateLabel: `${(rate * 100).toFixed(1)}% of sum insured${smoker ? " (smoker loading)" : ""}`,
        breakdown: [
          `Sum insured: RWF ${si.toLocaleString()}`,
          `Smoker: ${smoker ? "Yes" : "No"}`,
          `Rate: ${(rate * 100).toFixed(1)}%`,
          `Annual premium: RWF ${premium.toLocaleString()}`,
        ],
      };
    }
    default:
      return { sumInsured: 0, premium: 0, rateLabel: "—", breakdown: [] };
  }
}

// ─── Ordered product list (used by chatbot menu) ──────────────────────────────

const PRODUCT_ORDER = ["motor", "health", "property", "life", "travel"] as const;
const PRODUCT_QUICK_REPLIES = [
  "1. Motor Insurance", "2. Health Insurance", "3. Property Insurance",
  "4. Life Insurance", "5. Travel Insurance", "6. Speak to an Agent",
];

function makeGreeting(firstName?: string): ChatMessage {
  const name = firstName ? ` ${firstName}` : "";
  return {
    from: "bot",
    text: `Hello${name}! 👋\n\nI'm **Klaims AI**, your personal insurance advisor. I am here to help you find the right coverage and get an instant quote.\n\nPlease choose any of the options below by typing the **number** or clicking a button:\n\n1. Motor Insurance\n2. Health Insurance\n3. Property Insurance\n4. Life Insurance\n5. Travel Insurance\n6. Speak to an Agent`,
    quickReplies: PRODUCT_QUICK_REPLIES,
  };
}

// ─── Acknowledgement phrases (makes bot feel human) ──────────────────────────

const ACK: string[] = [
  "Got it! 👍", "Perfect, noted!", "Great, thanks!", "Understood!",
  "Noted! ✅", "Thanks for that!", "Excellent!", "Recorded 📝",
];
let ackIdx = 0;
const nextAck = () => ACK[ackIdx++ % ACK.length];

// ─── Doc specs ────────────────────────────────────────────────────────────────

interface DocSpec {
  name: string;
  required: boolean;
  accept: string;
  formatsLabel: string;
}

const REQUIRED_DOCS: Record<string, DocSpec[]> = {
  motor: [
    { name: "National ID / Passport", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
    { name: "Driving License", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
    { name: "Vehicle Logbook / Registration", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
  ],
  health: [
    { name: "National ID / Passport", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
  ],
  property: [
    { name: "National ID / Passport", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
    { name: "Title Deed / Lease Agreement", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
    { name: "Valuation Report", required: false, accept: "application/pdf", formatsLabel: "PDF only" },
  ],
  life: [
    { name: "National ID / Passport", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
    { name: "Medical Certificate", required: false, accept: "application/pdf", formatsLabel: "PDF only" },
  ],
  travel: [
    { name: "Passport", required: true, accept: "image/png,image/jpeg,image/webp,application/pdf", formatsLabel: "PNG, JPG, WEBP or PDF" },
  ],
};

// ─── Application status tracker ──────────────────────────────────────────────

const APPLICATION_STATUSES = [
  { key: "submitted", label: "Submitted", desc: "Your application has been received." },
  { key: "under_review", label: "Under Review", desc: "An underwriter is reviewing your application." },
  { key: "more_info", label: "More Information Requested", desc: "The insurer may ask for additional details." },
  { key: "approved", label: "Approved", desc: "Your application has been approved." },
  { key: "declined", label: "Declined", desc: "Your application was declined." },
  { key: "converted", label: "Converted to Policy", desc: "Your policy is now active." },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user } = useUser();
  const [step, setStep] = useState<ClientStep>("role");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [profile, setProfile] = useState<ProfileData>({ firstName: "", lastName: "", phone: "", nationalId: "" });
  const [product, setProduct] = useState<ProductData>({ type: "", label: "", sumInsured: 0, riskDetails: {} });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState<Set<string>>(new Set());

  // ── Chatbot state ──────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([makeGreeting()]);
  const [inputValue, setInputValue] = useState("");
  const [convo, setConvo] = useState<ConvoState>({
    phase: "greeting",
    product: "",
    productLabel: "",
    questionIndex: 0,
    answers: {},
    quote: null,
  });
  const chatEndRef = useRef<HTMLDivElement>(null);

  const submitFromOnboarding = useMutation(api.proposals.submitFromOnboarding);
  const generateUploadUrl = useMutation(api.fileStorage.generateUploadUrl);
  const existingUser = useQuery(
    api.users.getByClerkId,
    user ? { clerkId: user.id } : "skip"
  );

  const clerkFirstName = user?.firstName ?? "";
  const clerkLastName = user?.lastName ?? "";
  const clerkEmail = user?.emailAddresses?.[0]?.emailAddress ?? "";

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-redirect to dashboard 4 seconds after successful submission
  useEffect(() => {
    if (step !== "submitted") return;
    const timer = setTimeout(() => { window.location.href = "/client"; }, 4000);
    return () => clearTimeout(timer);
  }, [step]);

  // ── Add messages helpers ───────────────────────────────────────────────────

  const addMsg = (msg: ChatMessage) => setMessages((prev) => [...prev, msg]);

  const botSay = (text: string, quickReplies?: string[]) =>
    addMsg({ from: "bot", text, quickReplies });

  const userSay = (text: string) => addMsg({ from: "user", text });

  // ── Main input handler ────────────────────────────────────────────────────
  // NOTE: All setTimeout/botSay calls are OUTSIDE setConvo to avoid React
  // Strict Mode double-invoking updater functions and firing responses twice.

  const handleInput = (input: string) => {
    if (!input.trim()) return;
    userSay(input);
    setInputValue("");

    // ── Phase: greeting — product selection ──────────────────────────────
    if (convo.phase === "greeting") {
      const numStr = input.trim().replace(/^(\d+).*$/, "$1");
      const num = parseInt(numStr);

      if (num === 6 || input.toLowerCase().includes("agent")) {
        setTimeout(() => botSay(
          "Got it! 📞 One of our agents will reach out to assist you shortly.\n\nIn the meantime, you can still get an instant quote by choosing a product:",
          PRODUCT_QUICK_REPLIES.slice(0, 5)
        ), 400);
        return;
      }

      let productKey = "";
      if (!isNaN(num) && num >= 1 && num <= 5) {
        productKey = PRODUCT_ORDER[num - 1];
      } else {
        const normalised = input.toLowerCase().replace(/^\d+\.\s*/, "").trim();
        const found = Object.entries(PRODUCT_LABELS).find(([, label]) =>
          label.toLowerCase().includes(normalised) ||
          normalised.includes(label.split(" ")[0].toLowerCase())
        );
        if (found) productKey = found[0];
      }

      if (!productKey) {
        setTimeout(() => botSay(
          "Please type a **number** (1–6) to select an option.",
          PRODUCT_QUICK_REPLIES
        ), 400);
        return;
      }

      const productLabel = PRODUCT_LABELS[productKey];
      const firstQ = PRODUCT_QUESTIONS[productKey][0];
      setConvo({
        phase: "questioning", product: productKey, productLabel,
        questionIndex: 0, answers: {}, quote: null,
      });
      setTimeout(() => botSay(
        `Great choice! **${productLabel}** it is. 🎉\n\nI'll ask you a few quick questions to build your personalised quote.\n\n${firstQ.ask({})}`,
        firstQ.quickReplies
      ), 500);
      return;
    }

    // ── Phase: questioning — collect answers one by one ──────────────────
    if (convo.phase === "questioning") {
      const questions = PRODUCT_QUESTIONS[convo.product];
      const currentQ = questions[convo.questionIndex];
      const newAnswers = { ...convo.answers, [currentQ.key]: input };
      const nextIndex = convo.questionIndex + 1;

      if (nextIndex < questions.length) {
        const nextQ = questions[nextIndex];
        setConvo({ ...convo, answers: newAnswers, questionIndex: nextIndex });
        setTimeout(() => botSay(
          `${nextAck()} ${nextQ.ask(newAnswers)}`,
          nextQ.quickReplies
        ), 500);
      } else {
        const quote = calculateQuote(convo.product, newAnswers);
        setConvo({ ...convo, answers: newAnswers, phase: "quoting", quote });
        setTimeout(() => botSay(
          `${nextAck()} That's all I need!\n\n💰 **Your Personalised Quote**\n\n${quote.breakdown.map((l) => `• ${l}`).join("\n")}\n\n_Rate basis: ${quote.rateLabel}_\n\nWould you like to proceed with this quote?`,
          ["✅ Accept & Continue", "🔄 Start Over", "📞 Speak to an Agent"]
        ), 600);
      }
      return;
    }

    // ── Phase: quoting — accept / reject ─────────────────────────────────
    if (convo.phase === "quoting") {
      if (input.includes("Accept")) {
        setConvo({ ...convo, phase: "confirmed" });
        setTimeout(() => botSay(
          `Excellent! Your quote has been locked in. 🎉\n\nYour estimated **annual premium is RWF ${convo.quote!.premium.toLocaleString()}**.\n\nClick **Continue to Documents** below to upload your files and finalise your application.`
        ), 400);
      } else if (input.includes("Start Over")) {
        setConvo({ phase: "greeting", product: "", productLabel: "", questionIndex: 0, answers: {}, quote: null });
        setTimeout(() => botSay(
          "No problem! Let's start fresh.\n\nPlease choose an option:\n\n1. Motor Insurance\n2. Health Insurance\n3. Property Insurance\n4. Life Insurance\n5. Travel Insurance\n6. Speak to an Agent",
          PRODUCT_QUICK_REPLIES
        ), 400);
      } else {
        setTimeout(() => botSay(
          "No problem! One of our agents will reach out to assist you. In the meantime, you can still continue with this quote or start over.",
          ["✅ Accept & Continue", "🔄 Start Over"]
        ), 400);
      }
    }
  };

  const handleContinueToDocuments = () => {
    // Push product data from convo into product state, then advance step
    setProduct({
      type: convo.product,
      label: convo.productLabel,
      sumInsured: convo.quote?.sumInsured ?? 0,
      riskDetails: convo.answers,
    });
    setStep("documents");
  };

  // ── Role selection ─────────────────────────────────────────────────────────

  const handleRoleSelect = async (role: UserRole) => {
    setSelectedRole(role);
    if (role !== "client") {
      setIsLoading(true);
      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, onboardingComplete: true }),
        });
        if (!res.ok) throw new Error("Failed to update role");
        await user?.reload();
        window.location.href = ROLE_DASHBOARD_PATHS[role];
      } catch {
        toast.error("Setup failed. Please try again.");
        setIsLoading(false);
      }
      return;
    }
    // Pre-fill profile from existing user data
    const existingPhone = existingUser?.phone ?? "";
    const existingNationalId = existingUser?.nationalId ?? "";
    const [existingFirst = clerkFirstName, ...rest] = (existingUser?.name ?? `${clerkFirstName} ${clerkLastName}`).split(" ");
    const existingLast = rest.join(" ") || clerkLastName;
    setProfile({
      firstName: existingFirst,
      lastName: existingLast,
      phone: existingPhone,
      nationalId: existingNationalId,
    });

    // Skip profile step if already completed
    if (existingPhone && existingNationalId) {
      setMessages([makeGreeting(existingFirst)]);
      setConvo({ phase: "greeting", product: "", productLabel: "", questionIndex: 0, answers: {}, quote: null });
      setStep("chatbot");
    } else {
      setStep("profile");
    }
  };

  // ── Profile ────────────────────────────────────────────────────────────────

  const handleProfileNext = () => {
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!profile.phone.trim()) { toast.error("Phone number is required."); return; }
    if (!profile.nationalId.trim()) { toast.error("National ID / Passport is required."); return; }
    setMessages([makeGreeting(profile.firstName)]);
    setConvo({ phase: "greeting", product: "", productLabel: "", questionIndex: 0, answers: {}, quote: null });
    setStep("chatbot");
  };

  // ── File upload ────────────────────────────────────────────────────────────

  const handleFileUpload = async (file: File, docName: string) => {
    const contentType = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "application/octet-stream");
    setUploadingDocs((p) => new Set(p).add(docName));
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!result.ok) throw new Error(`Upload failed (HTTP ${result.status})`);
      const { storageId } = await result.json();
      if (!storageId) throw new Error("No storageId in response");
      setUploadedFiles((p) => [
        ...p.filter((f) => f.name !== docName),
        { storageId, name: docName, mimeType: contentType, sizeBytes: file.size },
      ]);
      toast.success(`${docName} uploaded.`);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(`Upload failed: ${err instanceof Error ? err.message : "Please try again."}`);
    } finally {
      setUploadingDocs((p) => { const n = new Set(p); n.delete(docName); return n; });
    }
  };

  const handleDocumentsNext = () => {
    const required = (REQUIRED_DOCS[product.type] ?? []).filter((d) => d.required);
    const missing = required.filter((d) => !uploadedFiles.find((f) => f.name === d.name));
    if (missing.length > 0) {
      toast.error(`Please upload: ${missing.map((d) => d.name).join(", ")}`);
      return;
    }
    setStep("review");
  };

  // ── Final submit ───────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // 1. Create proposal + update Convex user
      await submitFromOnboarding({
        clerkId: user.id,
        name: `${profile.firstName} ${profile.lastName}`.trim(),
        email: clerkEmail,
        phone: profile.phone || undefined,
        nationalId: profile.nationalId || undefined,
        productType: product.type,
        sumInsured: product.sumInsured,
        riskDetails: { data: product.riskDetails },
        uploadedFiles,
      });

      // 2. Update Clerk metadata so dashboard allows access
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "client", onboardingComplete: true }),
      });
      if (!res.ok) throw new Error("Failed to update account metadata");

      // 3. Refresh Clerk session so layout reads fresh metadata
      await user.reload();

      // 4. Show success screen — auto-redirect fires via useEffect
      toast.success("Application submitted! You will be redirected to your dashboard.");
      setStep("submitted");
    } catch (err) {
      console.error("Submission error:", err);
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Progress bar ─────────────────────────────────────────────────────────

  const CLIENT_STEPS: ClientStep[] = ["profile", "chatbot", "documents", "review", "submitted"];
  const CLIENT_STEP_LABELS = ["Profile", "AI Quote", "Documents", "Review", "Done"];
  const stepIdx = CLIENT_STEPS.indexOf(step);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">E-Klaims</h1>
        </div>

        {/* Progress (client flow only) */}
        {selectedRole === "client" && step !== "role" && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              {CLIENT_STEP_LABELS.map((label, i) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i < stepIdx ? "bg-blue-600 text-white" :
                    i === stepIdx ? "bg-blue-600 text-white ring-4 ring-blue-100" :
                    "bg-gray-200 text-gray-400"
                  }`}>
                    {i < stepIdx ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:block ${i === stepIdx ? "text-blue-600 font-medium" : "text-gray-400"}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(stepIdx / (CLIENT_STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-8">

          {/* ── Role ── */}
          {step === "role" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Welcome to E-Klaims</h2>
                <p className="text-sm text-gray-500 mt-1">Select your role to get started.</p>
              </div>
              {isLoading ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-gray-500 text-sm">Setting up your account…</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ROLES.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => handleRoleSelect(role.value as UserRole)}
                      className="text-left p-4 rounded-xl border-2 border-gray-100 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                    >
                      <div className="font-medium text-gray-900 group-hover:text-blue-700">{role.label}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{role.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Profile ── */}
          {step === "profile" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Complete your profile</h2>
                <p className="text-sm text-gray-500 mt-1">A few details to set up your account.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input type="text" value={profile.firstName}
                    onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="First name"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input type="text" value={profile.lastName}
                    onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Last name"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={clerkEmail} readOnly
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input type="tel" value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+250 700 000 000"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">National ID / Passport Number</label>
                <input type="text" value={profile.nationalId}
                  onChange={(e) => setProfile((p) => ({ ...p, nationalId: e.target.value }))}
                  placeholder="ID or Passport number"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={handleProfileNext}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Chatbot ── */}
          {step === "chatbot" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Talk to Klaims AI</h2>
                <p className="text-sm text-gray-500 mt-1">Answer a few questions to get your instant quote.</p>
              </div>

              {/* Chat window */}
              <div className="h-80 overflow-y-auto border rounded-xl p-4 space-y-4 bg-gray-50">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.from === "bot" && (
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`max-w-sm ${msg.from === "bot" ? "" : "items-end flex flex-col"}`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                        msg.from === "bot"
                          ? "bg-white border text-gray-800 rounded-tl-none shadow-sm"
                          : "bg-blue-600 text-white rounded-tr-none"
                      }`}>
                        {msg.text.split(/\*\*(.+?)\*\*/).map((part, j) =>
                          j % 2 === 1
                            ? <strong key={j}>{part}</strong>
                            : part.split(/_(.*?)_/).map((p, k) =>
                                k % 2 === 1 ? <em key={k} className="text-gray-500">{p}</em> : p
                              )
                        )}
                      </div>
                      {/* Quick replies attached to this message */}
                      {msg.from === "bot" && msg.quickReplies && i === messages.length - 1 && convo.phase !== "confirmed" && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {msg.quickReplies.map((qr) => (
                            <button
                              key={qr}
                              onClick={() => handleInput(qr)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                qr.includes("Accept") || qr.includes("Continue")
                                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                                  : "bg-white border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600"
                              }`}
                            >
                              {qr}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {msg.from === "user" && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Quote summary card (shown when confirmed) */}
              {convo.phase === "confirmed" && convo.quote && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-800">Your Quote</span>
                  </div>
                  <div className="space-y-1">
                    {convo.quote.breakdown.map((line, i) => (
                      <p key={i} className={`text-sm ${i === convo.quote!.breakdown.length - 1 ? "font-bold text-green-700 text-base mt-1" : "text-gray-600"}`}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Text input */}
              {convo.phase !== "confirmed" && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleInput(inputValue)}
                    placeholder="Type your answer…"
                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={() => handleInput(inputValue)}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}

              {convo.phase === "confirmed" && (
                <button onClick={handleContinueToDocuments}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                  Continue to Documents <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* ── Documents ── */}
          {step === "documents" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Upload your documents</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Required documents for your <span className="font-medium text-blue-600">{product.label}</span> application.
                </p>
              </div>
              <div className="space-y-4">
                {(REQUIRED_DOCS[product.type] ?? []).map((doc) => {
                  const uploaded = uploadedFiles.find((f) => f.name === doc.name);
                  const isUploading = uploadingDocs.has(doc.name);
                  return (
                    <div key={doc.name} className={`border rounded-xl p-4 transition-colors ${uploaded ? "border-green-200 bg-green-50" : "border-gray-200"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <FileText className={`w-4 h-4 ${uploaded ? "text-green-500" : "text-gray-400"}`} />
                          <span className="text-sm font-medium text-gray-800">{doc.name}</span>
                          {doc.required
                            ? <span className="text-xs text-red-500 font-medium">Required</span>
                            : <span className="text-xs text-gray-400">Optional</span>}
                        </div>
                        {uploaded && !isUploading && (
                          <button onClick={() => setUploadedFiles((p) => p.filter((f) => f.name !== doc.name))}
                            className="text-gray-400 hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mb-3 ml-6">Accepted: {doc.formatsLabel}</p>

                      {isUploading && (
                        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> <span>Uploading…</span>
                        </div>
                      )}
                      {!isUploading && uploaded && (
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 rounded-lg px-3 py-2">
                          <CheckCircle className="w-4 h-4" />
                          <span className="truncate">{uploaded.name}</span>
                          <span className="text-green-500 text-xs ml-auto flex-shrink-0">{(uploaded.sizeBytes / 1024).toFixed(0)} KB</span>
                        </div>
                      )}
                      {!isUploading && !uploaded && (
                        <label className="flex flex-col items-center gap-2 cursor-pointer border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors text-center">
                          <Upload className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-500">Click to select file</span>
                          <input type="file" className="hidden" accept={doc.accept}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (file) handleFileUpload(file, doc.name);
                            }} />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("chatbot")} disabled={uploadingDocs.size > 0}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50">Back</button>
                <button onClick={handleDocumentsNext} disabled={uploadingDocs.size > 0}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {uploadingDocs.size > 0
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                    : <>Continue <ChevronRight className="w-4 h-4" /></>}
                </button>
              </div>
            </div>
          )}

          {/* ── Review ── */}
          {step === "review" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Review your application</h2>
                <p className="text-sm text-gray-500 mt-1">Confirm details before submitting.</p>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Your Profile</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Name:</span> <span className="font-medium">{profile.firstName} {profile.lastName}</span></div>
                    <div><span className="text-gray-500">Email:</span> <span className="font-medium">{clerkEmail}</span></div>
                    <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{profile.phone}</span></div>
                    <div><span className="text-gray-500">National ID:</span> <span className="font-medium">{profile.nationalId}</span></div>
                  </div>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Insurance Quote</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Product:</span> <span className="font-medium">{product.label}</span></div>
                    <div><span className="text-gray-500">Sum Insured:</span> <span className="font-medium">RWF {product.sumInsured.toLocaleString()}</span></div>
                    <div className="col-span-2"><span className="text-gray-500">Annual Premium:</span> <span className="font-bold text-blue-700 text-base">RWF {convo.quote?.premium.toLocaleString()}</span></div>
                  </div>
                  {convo.quote && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      {convo.quote.breakdown.map((line, i) => (
                        <p key={i} className="text-xs text-gray-500">• {line}</p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-xl border p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Uploaded Documents</p>
                  {uploadedFiles.length === 0
                    ? <p className="text-sm text-gray-400">No documents uploaded.</p>
                    : <ul className="space-y-1">{uploadedFiles.map((f) => (
                        <li key={f.name} className="flex items-center gap-2 text-sm text-green-700">
                          <CheckCircle className="w-4 h-4" /> {f.name}
                        </li>
                      ))}</ul>}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("documents")}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Back</button>
                <button onClick={handleSubmit} disabled={isLoading}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Submit Application"}
                </button>
              </div>
            </div>
          )}

          {/* ── Submitted ── */}
          {step === "submitted" && (
            <div className="space-y-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-9 h-9 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Application Submitted!</h2>
                <p className="text-sm text-gray-500 max-w-sm">
                  Your application has been received. An underwriter will review it shortly.
                </p>
                <p className="text-xs text-blue-500">Redirecting to your dashboard in a few seconds…</p>
              </div>
              <div className="text-left bg-gray-50 rounded-xl p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Application Status</p>
                {APPLICATION_STATUSES.map((s, i) => (
                  <div key={s.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${i === 0 ? "bg-green-500" : "bg-gray-200"}`}>
                        {i === 0 ? <CheckCircle className="w-4 h-4 text-white" /> : <span className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      {i < APPLICATION_STATUSES.length - 1 && (
                        <div className={`w-0.5 h-6 mt-1 ${i === 0 ? "bg-green-200" : "bg-gray-200"}`} />
                      )}
                    </div>
                    <div className="pb-2">
                      <p className={`text-sm font-medium ${i === 0 ? "text-green-700" : "text-gray-400"}`}>{s.label}</p>
                      <p className="text-xs text-gray-400">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => { window.location.href = "/client"; }}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                Go to Dashboard Now <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
