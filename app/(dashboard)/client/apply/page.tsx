"use client";

import { useState, useRef, useEffect, useDeferredValue } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import {
  CheckCircle, ChevronRight, Upload, X, FileText,
  Bot, User, Send, Loader2, Tag, ArrowLeft,
} from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

type ApplyStep = "chatbot" | "documents" | "review" | "submitted";

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

type ChatPhase = "greeting" | "product_intro" | "questioning" | "quoting" | "confirmed";

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

// ─── Constants ────────────────────────────────────────────────────────────────

const MENU_FOOTER = "\n\nType **Menu** to return to the Main Menu\nType **Exit** to end this chat";

const PRODUCT_LABELS: Record<string, string> = {
  motor: "Motor Insurance",
  health: "Health Insurance",
  property: "Property Insurance",
  life: "Life Insurance",
  travel: "Travel Insurance",
};

const PRODUCT_INTROS: Record<string, string> = {
  motor: "Our **Motor Insurance** policy protects you against financial loss in the event that your vehicle, its accessories or spare parts are stolen or damaged in an accident, fire, riot or strikes.",
  health: "Our **Health Insurance** plan gives you and your family access to quality healthcare, covering hospitalisation, outpatient treatment, and specialist consultations.",
  property: "Our **Property Insurance** policy protects your building and its contents against damage from fire, flooding, theft and other insured perils.",
  life: "Our **Life Insurance** plan ensures your loved ones are financially protected in the event of your passing, with a lump-sum payout to your named beneficiaries.",
  travel: "Our **Travel Insurance** policy covers medical emergencies, trip cancellations, lost luggage and other unexpected events while you are travelling outside Rwanda.",
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
      ask: () => "Please select your preferred policy:\n\n1. **Comprehensive Motor (Rate 4.5%)**\n2. **Third Party Fire & Theft (Rate 3%)**\n3. **Third Party Only (Rate 0.5%)**",
      quickReplies: ["1. Comprehensive Motor", "2. Third Party Fire & Theft", "3. Third Party Only"],
    },
    {
      key: "usage",
      ask: () => "What will the vehicle be used for?\n\n1. **Private use**\n2. **Commercial purposes**\n3. **Agricultural Vehicle**\n4. **Motorcycle**",
      quickReplies: ["1. Private use", "2. Commercial purposes", "3. Agricultural Vehicle", "4. Motorcycle"],
    },
    {
      key: "make",
      ask: () => "What is the **make** of your vehicle?\n_(e.g. Toyota, Nissan, BMW)_",
    },
    {
      key: "model",
      ask: (a) => `What is the **model** of your ${a.make}?\n_(e.g. Corolla, Harrier, X5)_`,
    },
    {
      key: "year",
      ask: (a) => `What **year** was your ${a.make} ${a.model} manufactured?\n_(e.g. 2019)_`,
    },
    {
      key: "registration",
      ask: () => "What is the vehicle's **registration number**?\n_(e.g. RAB 123A)_",
    },
    {
      key: "value",
      ask: (a) => `What is the current market value of your ${a.make} ${a.model} in RWF?\n_(e.g. RWF 10,000,000)_`,
    },
  ],
  travel: [
    {
      key: "destination",
      ask: () => "Which country or countries are you travelling to?\n_(e.g. Kenya, France, USA)_",
    },
    {
      key: "region",
      ask: (a) => `Which coverage plan suits your trip to **${a.destination}**?\n\n1. **Africa / Asia**\n2. **Europe Basic**\n3. **Europe Plus**\n4. **Worldwide Basic**\n5. **Worldwide Silver**\n6. **Worldwide Gold**`,
      quickReplies: ["1. Africa / Asia", "2. Europe Basic", "3. Europe Plus", "4. Worldwide Basic", "5. Worldwide Silver", "6. Worldwide Gold"],
    },
    {
      key: "departure",
      ask: () => "What is your departure date?\n_(DD/MM/YYYY — e.g. 15/04/2026)_",
    },
    {
      key: "returnDate",
      ask: () => "What is your return date?\n_(DD/MM/YYYY — e.g. 29/04/2026)_",
    },
    {
      key: "purpose",
      ask: () => "What is the purpose of your travel?\n\n1. **Business**\n2. **Leisure / Holiday**\n3. **Medical**\n4. **Education**\n5. **Other**",
      quickReplies: ["1. Business", "2. Leisure / Holiday", "3. Medical", "4. Education", "5. Other"],
    },
    {
      key: "preExisting",
      ask: () => "Do you have any pre-existing medical conditions or are you currently undergoing treatment?\n\n1. **Yes**\n2. **No**",
      quickReplies: ["1. Yes", "2. No"],
    },
    {
      key: "nextOfKin",
      ask: () => "Who is your next of kin?\n_(Please provide their name and phone number)_",
    },
  ],
  health: [
    {
      key: "dob",
      ask: () => "What is your date of birth?\n_(DD/MM/YYYY — e.g. 01/05/1990)_",
    },
    {
      key: "occupation",
      ask: () => "What is your occupation?\n_(e.g. Teacher, Engineer, Business owner)_",
    },
    {
      key: "dependants",
      ask: () => "How many family members (including yourself) do you want covered?\n\n1. **Just me**\n2. **2 people**\n3. **3 people**\n4. **4 people**\n5. **5 or more**",
      quickReplies: ["1. Just me", "2. 2 people", "3. 3 people", "4. 4 people", "5. 5 or more"],
    },
    {
      key: "preExisting",
      ask: () => "Do you have any pre-existing medical conditions?\n_(e.g. diabetes, hypertension)_\n\n1. **Yes**\n2. **No**",
      quickReplies: ["1. Yes", "2. No"],
    },
    {
      key: "sumInsured",
      ask: () => "What annual sum insured are you looking for in RWF?\n_(Maximum the insurer will pay per year)_\n\n1. **RWF 5,000,000**\n2. **RWF 10,000,000**\n3. **RWF 20,000,000**\n4. **RWF 50,000,000**",
      quickReplies: ["1. RWF 5,000,000", "2. RWF 10,000,000", "3. RWF 20,000,000", "4. RWF 50,000,000"],
    },
  ],
  property: [
    {
      key: "address",
      ask: () => "What is the full address of the property to be insured?\n_(e.g. KG 15 Ave, Kigali)_",
    },
    {
      key: "type",
      ask: () => "What type of property is this?\n\n1. **Residential**\n2. **Commercial**\n3. **Industrial**",
      quickReplies: ["1. Residential", "2. Commercial", "3. Industrial"],
    },
    {
      key: "construction",
      ask: () => "What are the walls and roof made of?\n\n1. **Stone / Iron Sheet**\n2. **Brick / Tiles**\n3. **Concrete / Concrete**",
      quickReplies: ["1. Stone / Iron Sheet", "2. Brick / Tiles", "3. Concrete / Concrete"],
    },
    {
      key: "yearBuilt",
      ask: () => "What year was the property built?\n_(e.g. 2010)_",
    },
    {
      key: "contents",
      ask: () => "Do you also want to insure the contents (furniture, electronics, appliances)?\n\n1. **Yes**\n2. **No**",
      quickReplies: ["1. Yes", "2. No"],
    },
    {
      key: "value",
      ask: () => "What is the estimated rebuilding value of the property in RWF?\n_(Cost to rebuild from scratch — e.g. RWF 50,000,000)_",
    },
  ],
  life: [
    {
      key: "dob",
      ask: () => "What is your date of birth?\n_(DD/MM/YYYY — e.g. 01/05/1985)_",
    },
    {
      key: "occupation",
      ask: () => "What is your occupation?\n_(e.g. Teacher, Engineer, Business owner)_",
    },
    {
      key: "smoker",
      ask: () => "Do you smoke or use any tobacco products?\n\n1. **Yes**\n2. **No**",
      quickReplies: ["1. Yes", "2. No"],
    },
    {
      key: "planType",
      ask: () => "Which type of life cover are you interested in?\n\n1. **Term Life** (fixed period)\n2. **Whole Life**\n3. **Endowment**",
      quickReplies: ["1. Term Life", "2. Whole Life", "3. Endowment"],
    },
    {
      key: "sumInsured",
      ask: () => "What sum insured are you looking for in RWF?\n_(The amount your beneficiaries will receive)_\n\n1. **RWF 5,000,000**\n2. **RWF 10,000,000**\n3. **RWF 30,000,000**\n4. **RWF 50,000,000**",
      quickReplies: ["1. RWF 5,000,000", "2. RWF 10,000,000", "3. RWF 30,000,000", "4. RWF 50,000,000"],
    },
    {
      key: "beneficiary",
      ask: () => "Who is your primary beneficiary?\n_(Please provide their name and relationship — e.g. Jane Doe, Spouse)_",
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
      const cover = answers.coverType ?? "Comprehensive Motor";
      const rate = cover.toLowerCase().includes("third party only") ? 0.005
        : cover.toLowerCase().includes("fire") ? 0.03
        : 0.045;
      const basicPremium = Math.max(30_000, Math.round(value * rate));
      const trainingLevy = Math.round(basicPremium * 0.005);
      const stampDuty = 5_000;
      const totalPremium = basicPremium + trainingLevy + stampDuty;
      return {
        sumInsured: value,
        premium: totalPremium,
        rateLabel: `${(rate * 100).toFixed(1)}% of vehicle value`,
        breakdown: [
          `Sum Insured: RWF ${value.toLocaleString()}`,
          `Basic Premium (${(rate * 100).toFixed(1)}%): RWF ${basicPremium.toLocaleString()}`,
          `Training Levy (0.5%): RWF ${trainingLevy.toLocaleString()}`,
          `Stamp Duty: RWF ${stampDuty.toLocaleString()}`,
          `TOTAL PREMIUM: RWF ${totalPremium.toLocaleString()}`,
        ],
      };
    }
    case "travel": {
      const days = parseDateDiff(answers.departure, answers.returnDate);
      const USD_TO_RWF = 1350;
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
      const basePremium = Math.round(premiumUsd * USD_TO_RWF);
      const adminFee = 2_000;
      const stampDuty = 3_000;
      const totalPremium = basePremium + adminFee + stampDuty;
      const coverageUsd = answers.region?.startsWith("Worldwide") ? 100_000 : 30_000;
      const coverage = coverageUsd * USD_TO_RWF;
      return {
        sumInsured: coverage,
        premium: totalPremium,
        rateLabel: `K-Claims flat rate — ${answers.region}`,
        breakdown: [
          `Destination: ${answers.destination}`,
          `Plan: ${answers.region ?? "Africa / Asia"}`,
          `Duration: ${days} day${days !== 1 ? "s" : ""}`,
          `Medical Cover: RWF ${coverage.toLocaleString()}`,
          `Base Premium: RWF ${basePremium.toLocaleString()}`,
          `Admin Fee: RWF ${adminFee.toLocaleString()}`,
          `Stamp Duty: RWF ${stampDuty.toLocaleString()}`,
          `TOTAL PREMIUM: RWF ${totalPremium.toLocaleString()}`,
        ],
      };
    }
    case "health": {
      const si = parseAmount(answers.sumInsured);
      const depCount = answers.dependants?.includes("Just me") || answers.dependants === "1" ? 1
        : answers.dependants?.includes("more") || answers.dependants?.includes("5") ? 5
        : parseAmount(answers.dependants) || 1;
      const rate = 0.04 + (depCount > 1 ? (depCount - 1) * 0.015 : 0);
      const basicPremium = Math.max(80_000, Math.round(si * rate));
      const adminFee = Math.round(basicPremium * 0.03);
      const stampDuty = 3_000;
      const totalPremium = basicPremium + adminFee + stampDuty;
      return {
        sumInsured: si,
        premium: totalPremium,
        rateLabel: `${(rate * 100).toFixed(1)}% of sum insured`,
        breakdown: [
          `Sum Insured: RWF ${si.toLocaleString()}`,
          `Lives Covered: ${depCount}`,
          `Basic Premium (${(rate * 100).toFixed(1)}%): RWF ${basicPremium.toLocaleString()}`,
          `Admin Fee (3%): RWF ${adminFee.toLocaleString()}`,
          `Stamp Duty: RWF ${stampDuty.toLocaleString()}`,
          `TOTAL PREMIUM: RWF ${totalPremium.toLocaleString()}`,
        ],
      };
    }
    case "property": {
      const value = parseAmount(answers.value);
      const hasContents = answers.contents?.toLowerCase().includes("yes") ?? false;
      const buildingPremium = Math.round(value * 0.0035);
      const contentsPremium = hasContents ? Math.round(value * 0.005) : 0;
      const basePremium = Math.max(50_000, buildingPremium + contentsPremium);
      const stampDuty = 5_000;
      const totalPremium = basePremium + stampDuty;
      return {
        sumInsured: value,
        premium: totalPremium,
        rateLabel: `0.35% buildings${hasContents ? " + 0.5% contents" : ""}`,
        breakdown: [
          `Sum Insured: RWF ${value.toLocaleString()}`,
          `Building Premium (0.35%): RWF ${buildingPremium.toLocaleString()}`,
          ...(hasContents ? [`Contents Premium (0.5%): RWF ${contentsPremium.toLocaleString()}`] : []),
          `Stamp Duty: RWF ${stampDuty.toLocaleString()}`,
          `TOTAL PREMIUM: RWF ${totalPremium.toLocaleString()}`,
        ],
      };
    }
    case "life": {
      const si = parseAmount(answers.sumInsured);
      const smoker = answers.smoker?.toLowerCase().includes("yes") ?? false;
      const rate = smoker ? 0.025 : 0.015;
      const basicPremium = Math.max(50_000, Math.round(si * rate));
      const adminFee = Math.round(basicPremium * 0.03);
      const stampDuty = 3_000;
      const totalPremium = basicPremium + adminFee + stampDuty;
      return {
        sumInsured: si,
        premium: totalPremium,
        rateLabel: `${(rate * 100).toFixed(1)}% of sum insured${smoker ? " (smoker loading)" : ""}`,
        breakdown: [
          `Sum Insured: RWF ${si.toLocaleString()}`,
          `Basic Premium (${(rate * 100).toFixed(1)}%): RWF ${basicPremium.toLocaleString()}`,
          ...(smoker ? [`Smoker Loading: included`] : []),
          `Admin Fee (3%): RWF ${adminFee.toLocaleString()}`,
          `Stamp Duty: RWF ${stampDuty.toLocaleString()}`,
          `TOTAL PREMIUM: RWF ${totalPremium.toLocaleString()}`,
        ],
      };
    }
    default:
      return { sumInsured: 0, premium: 0, rateLabel: "—", breakdown: [] };
  }
}

// ─── Chatbot helpers ──────────────────────────────────────────────────────────

const PRODUCT_ORDER = ["motor", "health", "property", "life", "travel"] as const;
const PRODUCT_QUICK_REPLIES = [
  "1. Motor Insurance", "2. Health Insurance", "3. Property Insurance",
  "4. Life Insurance", "5. Travel Insurance", "6. Customer Service Support",
];

function makeGreeting(firstName?: string): ChatMessage {
  const name = firstName ? ` ${firstName}` : "";
  return {
    from: "bot",
    text: `Hello${name}! 👋\n\nI'm **Klaims AI**, your personal insurance advisor. I am here to help you find the right cover and get an instant quote.\n\nPlease choose any of the options below by typing 1, 2, 3, 4, 5 or 6:\n\n1. **Motor Insurance**\n2. **Health Insurance**\n3. **Property Insurance**\n4. **Life Insurance**\n5. **Travel Insurance**\n6. **Customer Service Support**\n\nBy proceeding, you are accepting our terms and conditions.${MENU_FOOTER}`,
    quickReplies: PRODUCT_QUICK_REPLIES,
  };
}

const ACK: string[] = [
  "Got it! 👍", "Perfect, noted!", "Great, thanks!", "Understood!",
  "Noted! ✅", "Thanks for that!", "Excellent!", "Recorded 📝",
];
let ackIdx = 0;
const nextAck = () => ACK[ackIdx++ % ACK.length];

// ─── Document specs ───────────────────────────────────────────────────────────

interface DocSpec { name: string; required: boolean; accept: string; formatsLabel: string; }

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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ApplyPage() {
  const { user } = useUser();
  const { convexUser } = useCurrentUser();
  const [step, setStep] = useState<ApplyStep>("chatbot");
  const [isLoading, setIsLoading] = useState(false);

  const [product, setProduct] = useState<ProductData>({ type: "", label: "", sumInsured: 0, riskDetails: {} });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState<Set<string>>(new Set());
  const [agentUsername, setAgentUsername] = useState("");
  // Defer so we don't query on every keystroke
  const deferredAgentUsername = useDeferredValue(agentUsername);
  const agentLookup = useQuery(
    api.users.getByUsername,
    deferredAgentUsername.trim().length >= 3
      ? { username: deferredAgentUsername.trim() }
      : "skip"
  );
  const agentValid =
    deferredAgentUsername.trim().length >= 3 &&
    agentLookup !== undefined &&
    agentLookup !== null &&
    agentLookup.role === "distributor";
  const agentInvalid =
    deferredAgentUsername.trim().length >= 3 &&
    agentLookup !== undefined &&
    !agentValid;

  // Chatbot state
  const firstName = convexUser?.name?.split(" ")[0] ?? user?.firstName ?? "";
  const [messages, setMessages] = useState<ChatMessage[]>(() => [makeGreeting(firstName || undefined)]);
  const [inputValue, setInputValue] = useState("");
  const [convo, setConvo] = useState<ConvoState>({
    phase: "greeting", product: "", productLabel: "", questionIndex: 0, answers: {}, quote: null,
  });
  const chatEndRef = useRef<HTMLDivElement>(null);

  const submitFromOnboarding = useMutation(api.proposals.submitFromOnboarding);
  const generateUploadUrl = useMutation(api.fileStorage.generateUploadUrl);

  const clerkEmail = user?.emailAddresses?.[0]?.emailAddress ?? "";

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-redirect after submission
  useEffect(() => {
    if (step !== "submitted") return;
    const timer = setTimeout(() => { window.location.href = "/client"; }, 4000);
    return () => clearTimeout(timer);
  }, [step]);

  // ── Message helpers ───────────────────────────────────────────────────────

  const addMsg = (msg: ChatMessage) => setMessages((prev) => [...prev, msg]);
  const botSay = (text: string, quickReplies?: string[]) => addMsg({ from: "bot", text, quickReplies });
  const userSay = (text: string) => addMsg({ from: "user", text });

  // ── Input handler ─────────────────────────────────────────────────────────

  const handleInput = (input: string) => {
    if (!input.trim()) return;
    const trimmed = input.trim();
    userSay(trimmed);
    setInputValue("");

    const lower = trimmed.toLowerCase();

    // Special keywords
    if (lower === "menu" || lower === "main menu") {
      setConvo({ phase: "greeting", product: "", productLabel: "", questionIndex: 0, answers: {}, quote: null });
      setTimeout(() => setMessages([makeGreeting(firstName || undefined)]), 300);
      return;
    }
    if (lower === "exit" || lower === "bye" || lower === "quit") {
      setTimeout(() => botSay("Thank you for chatting with **Klaims AI**! 👋\n\nFeel free to return whenever you need assistance. Have a great day!"), 300);
      return;
    }

    // ── Greeting phase ────────────────────────────────────────────────────
    if (convo.phase === "greeting") {
      const num = parseInt(trimmed.replace(/^(\d+).*$/, "$1"));
      if (num === 6 || lower.includes("customer service") || lower.includes("support") || lower.includes("agent")) {
        setTimeout(() => botSay(
          "Got it! 📞 One of our Customer Service representatives will reach out shortly.\n\nIn the meantime, you can still get an instant quote:\n\n1. **Motor Insurance**\n2. **Health Insurance**\n3. **Property Insurance**\n4. **Life Insurance**\n5. **Travel Insurance**" + MENU_FOOTER,
          PRODUCT_QUICK_REPLIES.slice(0, 5)
        ), 400);
        return;
      }
      let productKey = "";
      if (!isNaN(num) && num >= 1 && num <= 5) {
        productKey = PRODUCT_ORDER[num - 1];
      } else {
        const normalised = lower.replace(/^\d+\.\s*/, "").trim();
        const found = Object.entries(PRODUCT_LABELS).find(([, label]) =>
          label.toLowerCase().includes(normalised) || normalised.includes(label.split(" ")[0].toLowerCase())
        );
        if (found) productKey = found[0];
      }
      if (!productKey) {
        setTimeout(() => botSay("Please type a number (1–6) to select an option." + MENU_FOOTER, PRODUCT_QUICK_REPLIES), 400);
        return;
      }
      const productLabel = PRODUCT_LABELS[productKey];
      const intro = PRODUCT_INTROS[productKey] ?? "";
      setConvo({ phase: "product_intro", product: productKey, productLabel, questionIndex: 0, answers: {}, quote: null });
      setTimeout(() => botSay(
        `Fantastic! ✨\n\n${intro}\n\nWould you like to:\n\n1. **Get an instant quote**\n2. **Talk to our Customer Care Team**` + MENU_FOOTER,
        ["1. Get an instant quote", "2. Talk to our Customer Care Team"]
      ), 500);
      return;
    }

    // ── Product intro phase ───────────────────────────────────────────────
    if (convo.phase === "product_intro") {
      const clean = trimmed.replace(/^\d+\.\s*/, "").trim().toLowerCase();
      if (clean.includes("customer care") || clean.includes("talk") || trimmed === "2") {
        setTimeout(() => botSay(
          "Got it! 📞 One of our Customer Care agents will reach out shortly.\n\nHere are more options:\n1. **Get an instant quote**\n2. **Return to Main Menu**" + MENU_FOOTER,
          ["1. Get an instant quote", "2. Return to Main Menu"]
        ), 400);
        return;
      }
      if (clean.includes("return") || clean.includes("main menu")) {
        setConvo({ phase: "greeting", product: "", productLabel: "", questionIndex: 0, answers: {}, quote: null });
        setTimeout(() => setMessages([makeGreeting(firstName || undefined)]), 300);
        return;
      }
      const firstQ = PRODUCT_QUESTIONS[convo.product][0];
      setConvo({ ...convo, phase: "questioning" });
      setTimeout(() => botSay(
        `Great! Let's build your **${convo.productLabel}** quote. I'll ask you a few quick questions.\n\n${firstQ.ask({})}` + MENU_FOOTER,
        firstQ.quickReplies
      ), 400);
      return;
    }

    // ── Questioning phase ─────────────────────────────────────────────────
    if (convo.phase === "questioning") {
      const questions = PRODUCT_QUESTIONS[convo.product];
      const currentQ = questions[convo.questionIndex];
      const cleanInput = trimmed.replace(/^\d+\.\s*/, "").trim();
      const newAnswers = { ...convo.answers, [currentQ.key]: cleanInput };
      const nextIndex = convo.questionIndex + 1;

      if (nextIndex < questions.length) {
        const nextQ = questions[nextIndex];
        setConvo({ ...convo, answers: newAnswers, questionIndex: nextIndex });
        setTimeout(() => botSay(`${nextAck()}\n\n${nextQ.ask(newAnswers)}` + MENU_FOOTER, nextQ.quickReplies), 500);
      } else {
        const quote = calculateQuote(convo.product, newAnswers);
        setConvo({ ...convo, answers: newAnswers, phase: "quoting", quote });
        const quoteLines = quote.breakdown.map((line, i) =>
          i === quote.breakdown.length - 1 ? `**${line}**` : line
        ).join("\n");
        setTimeout(() => botSay(
          `${nextAck()} That's all I need! ✅\n\nPlease find your quote below:\n\n${quoteLines}\n\nWould you like to:\n\n1. **Apply Now**\n2. **Save & Buy Later**\n3. **Speak to an Agent**` + MENU_FOOTER,
          ["1. Apply Now", "2. Save & Buy Later", "3. Speak to an Agent"]
        ), 600);
      }
      return;
    }

    // ── Quoting phase ─────────────────────────────────────────────────────
    if (convo.phase === "quoting") {
      const clean = trimmed.replace(/^\d+\.\s*/, "").trim().toLowerCase();
      if (clean.includes("apply") || trimmed === "1") {
        setConvo({ ...convo, phase: "confirmed" });
        setTimeout(() => botSay(
          `Excellent! 🎉 Your quote has been locked in.\n\nTo make it easier to complete your application, please click **Continue to Documents** below to upload your required files.\n\nOnce you are done, you will be able to review and submit your application.`
        ), 400);
      } else if (clean.includes("save") || clean.includes("later") || trimmed === "2") {
        setConvo({ ...convo, phase: "confirmed" });
        setTimeout(() => botSay(
          `Noted! 📋 Your quote has been saved.\n\nYour estimated **annual premium is RWF ${convo.quote!.premium.toLocaleString()}**.\n\nClick **Continue to Documents** whenever you are ready to complete your application.`
        ), 400);
      } else if (clean.includes("agent") || trimmed === "3") {
        setTimeout(() => botSay(
          `Got it! 📞 One of our agents will reach out shortly.\n\nHere are more options:\n1. **Apply Now**\n2. **Start Over**` + MENU_FOOTER,
          ["1. Apply Now", "2. Start Over"]
        ), 400);
      } else if (clean.includes("start over")) {
        setConvo({ phase: "greeting", product: "", productLabel: "", questionIndex: 0, answers: {}, quote: null });
        setTimeout(() => setMessages([makeGreeting(firstName || undefined)]), 400);
      }
    }
  };

  const handleContinueToDocuments = () => {
    setProduct({
      type: convo.product,
      label: convo.productLabel,
      sumInsured: convo.quote?.sumInsured ?? 0,
      riskDetails: convo.answers,
    });
    setStep("documents");
  };

  // ── File upload ───────────────────────────────────────────────────────────

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

  // ── Final submit ──────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!user || !convexUser) return;
    if (agentInvalid) {
      toast.error("The agent username you entered doesn't exist. Clear it or use a valid agent username.");
      return;
    }
    setIsLoading(true);
    try {
      await submitFromOnboarding({
        clerkId: user.id,
        name: convexUser.name,
        email: clerkEmail,
        phone: convexUser.phone,
        productType: product.type,
        sumInsured: product.sumInsured,
        riskDetails: { data: product.riskDetails },
        agentUsername: agentUsername.trim() || undefined,
        uploadedFiles,
      });
      toast.success("Application submitted successfully!");
      setStep("submitted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Progress ──────────────────────────────────────────────────────────────

  const STEPS: ApplyStep[] = ["chatbot", "documents", "review", "submitted"];
  const STEP_LABELS = ["AI Quote", "Documents", "Review", "Done"];
  const stepIdx = STEPS.indexOf(step);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/client" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Apply for Insurance</h2>
          <p className="text-sm text-gray-500 mt-0.5">Chat with our AI advisor to get an instant quote</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          {STEP_LABELS.map((label, i) => (
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
            style={{ width: `${(stepIdx / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">

        {/* ── Chatbot ── */}
        {step === "chatbot" && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">Talk to Klaims AI</h3>
              <p className="text-sm text-gray-500 mt-0.5">Answer a few questions to get your personalised quote.</p>
            </div>

            {/* Chat window */}
            <div className="h-[420px] overflow-y-auto border rounded-xl p-4 space-y-4 bg-gray-50">
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
                              k % 2 === 1 ? <em key={k} className="text-gray-400 not-italic text-xs">{p}</em> : p
                            )
                      )}
                    </div>
                    {msg.from === "bot" && msg.quickReplies && i === messages.length - 1 && convo.phase !== "confirmed" && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {msg.quickReplies.map((qr) => (
                          <button
                            key={qr}
                            onClick={() => handleInput(qr)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              qr.includes("Apply") || qr === "1. Get an instant quote"
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

            {/* Quote confirmed card */}
            {convo.phase === "confirmed" && convo.quote && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">Your Confirmed Quote</span>
                </div>
                <div className="space-y-1.5">
                  {convo.quote.breakdown.map((line, i) => {
                    const isTotal = i === convo.quote!.breakdown.length - 1;
                    const parts = line.split(": ");
                    return (
                      <div key={i} className={`flex justify-between text-sm ${isTotal ? "font-bold text-green-700 text-base pt-2 mt-1 border-t border-green-200" : "text-gray-600"}`}>
                        {parts.length === 2 ? (
                          <>
                            <span>{parts[0]}:</span>
                            <span className={isTotal ? "text-green-700" : "font-medium text-gray-800"}>{parts[1]}</span>
                          </>
                        ) : (
                          <span>{line}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Input */}
            {convo.phase !== "confirmed" ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInput(inputValue)}
                  placeholder="Type a number or your answer…"
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={() => handleInput(inputValue)} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={handleContinueToDocuments} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
                Continue to Documents <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* ── Documents ── */}
        {step === "documents" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900">Upload your documents</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Required for your <span className="font-medium text-blue-600">{product.label}</span> application.
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
                        <button onClick={() => setUploadedFiles((p) => p.filter((f) => f.name !== doc.name))} className="text-gray-400 hover:text-red-500">
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
              <button onClick={() => setStep("chatbot")} disabled={uploadingDocs.size > 0} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50">Back</button>
              <button onClick={handleDocumentsNext} disabled={uploadingDocs.size > 0} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {uploadingDocs.size > 0 ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <>Continue <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── Review ── */}
        {step === "review" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900">Review your application</h3>
              <p className="text-sm text-gray-500 mt-0.5">Confirm all details before submitting.</p>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Your Profile</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Name:</span> <span className="font-medium">{convexUser?.name}</span></div>
                  <div><span className="text-gray-500">Email:</span> <span className="font-medium">{clerkEmail}</span></div>
                  <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{convexUser?.phone ?? "—"}</span></div>
                </div>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Insurance Quote</p>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div><span className="text-gray-500">Product:</span> <span className="font-medium">{product.label}</span></div>
                  <div><span className="text-gray-500">Sum Insured:</span> <span className="font-medium">RWF {product.sumInsured.toLocaleString()}</span></div>
                  <div className="col-span-2"><span className="text-gray-500">Annual Premium:</span> <span className="font-bold text-blue-700 text-base">RWF {convo.quote?.premium.toLocaleString()}</span></div>
                </div>
                {convo.quote && (
                  <div className="pt-3 border-t space-y-1.5">
                    {convo.quote.breakdown.map((line, i) => {
                      const isTotal = i === convo.quote!.breakdown.length - 1;
                      const parts = line.split(": ");
                      return (
                        <div key={i} className={`flex justify-between text-xs ${isTotal ? "font-bold text-blue-700 text-sm pt-1 mt-1 border-t" : "text-gray-500"}`}>
                          {parts.length === 2 ? <><span>{parts[0]}:</span><span className="font-medium">{parts[1]}</span></> : <span>{line}</span>}
                        </div>
                      );
                    })}
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
              <div className="rounded-xl border p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Link an Agent <span className="text-gray-300 font-normal">(optional)</span></p>
                <p className="text-xs text-gray-400">If an agent referred you or is helping you, enter their username to link them to this application.</p>
                <div className={`flex items-center border rounded-lg overflow-hidden focus-within:ring-2 ${agentInvalid ? "border-red-300 focus-within:ring-red-300" : agentValid ? "border-green-300 focus-within:ring-green-300" : "focus-within:ring-blue-500"}`}>
                  <span className="px-3 py-2 bg-gray-50 text-gray-400 border-r text-sm">@</span>
                  <input
                    type="text"
                    value={agentUsername}
                    onChange={(e) => setAgentUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="agent_username"
                    className="flex-1 px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                {agentValid && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Agent found: {agentLookup!.name}
                  </p>
                )}
                {agentInvalid && (
                  <p className="text-xs text-red-500">No agent found with that username. Leave blank to submit without an agent.</p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("documents")} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Back</button>
              <button onClick={handleSubmit} disabled={isLoading} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
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
              <h3 className="text-xl font-bold text-gray-900">Application Submitted!</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Your application has been received and is now under review. An underwriter will assess it shortly.
              </p>
              <p className="text-xs text-blue-500">Redirecting to your dashboard in a few seconds…</p>
            </div>
            <button onClick={() => { window.location.href = "/client"; }} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
              Go to Dashboard Now <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
