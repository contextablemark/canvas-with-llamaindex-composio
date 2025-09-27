"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCopilotAction } from "@copilotkit/react-core";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { Building2, Users, Briefcase, Globe, Target, ArrowLeft, Play, Timer, CheckCircle2, Circle, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

interface CompanyDetails {
  id: string;
  name: string;
  industry: string;
  employees: string;
  website: string;
  description: string;
  jobOpenings: number;
  needs: string[];
  challenges: string[];
  currentSolutions: string[];
  decisionMakers: {
    name: string;
    role: string;
    focus: string;
  }[];
}

interface PitchCriteria {
  problem_solution: boolean;
  evidence_proof: boolean;
  differentiation: boolean;
  target_fit: boolean;
  implementation: boolean;
  credibility: boolean;
  business_case: boolean;
  next_steps: boolean;
}

interface PitchStatus {
  criteria_status: PitchCriteria;
  score_percentage: number;
  is_passing: boolean;
  last_evaluation: string;
  message_count: number;
}

// Mock company data - in real app, fetch from API
const getCompanyDetails = (id: string): CompanyDetails => {
  const companies: Record<string, CompanyDetails> = {
    "1": {
      id: "1",
      name: "TechCorp Solutions",
      industry: "Software Development",
      employees: "500-1000",
      website: "www.techcorp.com",
      description: "A leading software development company specializing in enterprise solutions, cloud computing, and AI-driven applications.",
      jobOpenings: 12,
      needs: [
        "Cloud infrastructure optimization",
        "DevOps tooling and automation",
        "Cybersecurity solutions",
        "Employee training platforms",
      ],
      challenges: [
        "Scaling development teams efficiently",
        "Maintaining code quality at scale",
        "Reducing time-to-market for new features",
        "Managing multi-cloud environments",
      ],
      currentSolutions: [
        "AWS for cloud hosting",
        "Jenkins for CI/CD",
        "Slack for communication",
        "Jira for project management",
      ],
      decisionMakers: [
        { name: "Sarah Johnson", role: "CTO", focus: "Technology strategy and innovation" },
        { name: "Mike Chen", role: "VP Engineering", focus: "Development processes and team efficiency" },
        { name: "Lisa Brown", role: "Director of IT", focus: "Infrastructure and security" },
      ],
    },
    "2": {
      id: "2",
      name: "Global Manufacturing Inc",
      industry: "Manufacturing",
      employees: "1000-5000",
      website: "www.globalmanufacturing.com",
      description: "A global leader in advanced manufacturing solutions, specializing in automation, robotics, and supply chain optimization.",
      jobOpenings: 8,
      needs: [
        "Supply chain visibility tools",
        "Predictive maintenance solutions",
        "Quality control automation",
        "Workforce management systems",
      ],
      challenges: [
        "Optimizing production efficiency",
        "Reducing equipment downtime",
        "Managing complex global supply chains",
        "Implementing Industry 4.0 technologies",
      ],
      currentSolutions: [
        "SAP for ERP",
        "Siemens for automation",
        "Microsoft Teams for communication",
        "Tableau for analytics",
      ],
      decisionMakers: [
        { name: "Robert Williams", role: "COO", focus: "Operations and efficiency" },
        { name: "Emily Zhang", role: "VP Supply Chain", focus: "Supply chain optimization" },
        { name: "David Martinez", role: "Director of Manufacturing", focus: "Production and quality" },
      ],
    },
    "3": {
      id: "3",
      name: "Healthcare Innovations",
      industry: "Healthcare",
      employees: "100-500",
      website: "www.healthcareinnovations.com",
      description: "A healthcare technology company focused on improving patient outcomes through innovative digital health solutions and data analytics.",
      jobOpenings: 15,
      needs: [
        "Patient data management systems",
        "Telemedicine platforms",
        "Healthcare analytics tools",
        "Compliance management solutions",
      ],
      challenges: [
        "Ensuring HIPAA compliance",
        "Integrating with legacy systems",
        "Improving patient engagement",
        "Managing healthcare data security",
      ],
      currentSolutions: [
        "Epic for EHR",
        "Zoom for telemedicine",
        "Office 365 for productivity",
        "Veracode for security",
      ],
      decisionMakers: [
        { name: "Dr. Patricia Thompson", role: "Chief Medical Officer", focus: "Clinical excellence and patient care" },
        { name: "James Wilson", role: "CTO", focus: "Healthcare technology and innovation" },
        { name: "Maria Garcia", role: "VP Compliance", focus: "Regulatory compliance and data security" },
      ],
    },
    "4": {
      id: "4",
      name: "Finance Leaders Ltd",
      industry: "Financial Services",
      employees: "5000+",
      website: "www.financeleaders.com",
      description: "A leading financial services company providing investment banking, wealth management, and corporate finance solutions globally.",
      jobOpenings: 20,
      needs: [
        "Risk management platforms",
        "Regulatory compliance tools",
        "Trading analytics systems",
        "Customer relationship management",
      ],
      challenges: [
        "Adapting to changing regulations",
        "Enhancing cybersecurity measures",
        "Improving customer experience",
        "Managing operational costs",
      ],
      currentSolutions: [
        "Bloomberg Terminal for trading",
        "Salesforce for CRM",
        "Workday for HR",
        "Splunk for security monitoring",
      ],
      decisionMakers: [
        { name: "Michael Anderson", role: "CFO", focus: "Financial strategy and risk management" },
        { name: "Jennifer Lee", role: "Chief Risk Officer", focus: "Risk assessment and compliance" },
        { name: "Thomas Brown", role: "CIO", focus: "Technology infrastructure and security" },
      ],
    },
  };

  // Return the company details if found, otherwise return TechCorp as default
  return companies[id] || companies["1"];
};

export default function CompanyDetailsPage({ params }: PageProps) {
  const { id } = use(params);
  const company = getCompanyDetails(id);
  const router = useRouter();

  // Pitch mode state
  const [isPitchMode, setIsPitchMode] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pitchStatus, setPitchStatus] = useState<PitchStatus | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes in seconds
  const [isPitchEnded, setIsPitchEnded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Add company context to the AI when not in pitch mode
  // The useCopilotAdditionalInstructions is handled by the CopilotChat component below

  // Define actions for the pitch process
  useCopilotAction({
    name: "analyze_company_need",
    description: "Analyze a specific company need and suggest how to address it",
    parameters: [
      {
        name: "need",
        type: "string",
        description: "The specific need to analyze",
        required: true,
      },
    ],
    handler: async ({ need }) => {
      return `Analyzing ${need} for ${company.name}...`;
    },
  });

  useCopilotAction({
    name: "generate_pitch_opener",
    description: "Generate an effective pitch opener for this company",
    parameters: [
      {
        name: "decision_maker",
        type: "string",
        description: "The decision maker you're pitching to",
        required: true,
      },
    ],
    handler: async ({ decision_maker }) => {
      return `Generated opener for ${decision_maker} at ${company.name}`;
    },
  });

  // Pitch mode effects and functions
  // Timer effect
  useEffect(() => {
    if (!isPitchMode || isPitchEnded || !pitchStatus) return;
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          endPitch();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPitchMode, isPitchEnded, pitchStatus]);

  // Check if criteria met
  useEffect(() => {
    if (pitchStatus?.is_passing && !isPitchEnded && isPitchMode) {
      endPitch();
    }
  }, [pitchStatus?.is_passing, isPitchMode]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startPitch = () => {
    const newConversationId = `pitch-${id}-${Date.now()}`;
    setConversationId(newConversationId);
    setIsPitchMode(true);
    setMessages([]);
    setPitchStatus(null);
    setTimeRemaining(120);
    setIsPitchEnded(false);
    initializePitch(newConversationId);
  };

  const initializePitch = async (convId: string) => {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        setIsLoading(true);
        const response = await fetch("/api/pitch/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: convId,
            company_info: {
              name: company.name,
              industry: company.industry,
              size: company.employees,
              pain_points: company.challenges,
              decision_makers: company.decisionMakers.map(dm => `${dm.name} (${dm.role})`),
              budget_range: "$100K - $500K", // Default value
              current_solutions: company.currentSolutions,
            },
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const primaryDecisionMaker = company.decisionMakers[0];
          setMessages([
            {
              role: "assistant",
              content: `Hi there! I'm ${primaryDecisionMaker.name}, ${primaryDecisionMaker.role} at ${company.name}. I have about 2 minutes for this call. What did you want to discuss with me today?`,
            },
          ]);
          await updatePitchStatus(convId);
          return;
        } else {
          const errorData = await response.json();
          throw new Error(`Server error: ${errorData.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error(`Pitch initialization attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          continue;
        } else {
          setMessages([
            {
              role: "assistant",
              content: `❌ Failed to initialize pitch after ${maxRetries} attempts. Please refresh the page and try again. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ]);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const updatePitchStatus = async (convId: string) => {
    try {
      const response = await fetch("/api/pitch/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: convId }),
      });

      if (response.ok) {
        const result = await response.json();
        setPitchStatus(result.status);
      }
    } catch (error) {
      console.error("Failed to get pitch status:", error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isPitchEnded || !isPitchMode) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/pitch/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: userMessage,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setMessages(prev => [...prev, { role: "assistant", content: result.response }]);
        setPitchStatus(result.status);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const endPitch = () => {
    setIsPitchEnded(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    // Navigate to results page after a short delay
    setTimeout(() => {
      router.push(`/pitch-results/${conversationId}?company=${id}`);
    }, 2000);
  };

  const exitPitchMode = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsPitchMode(false);
    setMessages([]);
    setPitchStatus(null);
    setTimeRemaining(120);
    setIsPitchEnded(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const criteriaLabels: Record<keyof PitchCriteria, string> = {
    problem_solution: "Problem & Solution",
    evidence_proof: "Evidence & Proof",
    differentiation: "Differentiation",
    target_fit: "Target Fit",
    implementation: "Implementation",
    credibility: "Credibility",
    business_case: "Business Case",
    next_steps: "Next Steps",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/companies">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Companies
            </Button>
          </Link>
          <div className="flex gap-2 items-center">
            {isPitchMode ? (
              <>
                <div className="flex items-center gap-4 mr-4">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    <span className={`font-mono font-medium ${timeRemaining < 30 ? "text-red-500" : ""}`}>
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                  <div className="text-sm font-medium">
                    Score: <span className="text-primary">{pitchStatus?.score_percentage.toFixed(0) || 0}%</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={exitPitchMode}
                >
                  <X className="h-4 w-4" />
                  Exit Pitch
                </Button>
              </>
            ) : (
              <Link href={`/pitch-score?company=${id}`}>
                <Button size="sm" variant="outline">View Pitch Scores</Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Pitch Chat Section - Left Side */}
        <div className={isPitchMode ? "w-full flex flex-col" : "w-1/2 border-r flex flex-col"}>
          {!isPitchMode ? (
            /* Pre-Pitch State - Show Start Pitch Button */
            <>
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
                <div className="text-center max-w-md">
                  <div className="mb-8">
                    <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                      <Play className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Ready to Pitch?</h2>
                    <p className="text-muted-foreground mb-6">
                      Test your sales pitch for <strong>{company.name}</strong> and get real-time feedback on 8 key criteria.
                    </p>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>2-minute timed evaluation</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Real-time criteria tracking</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Instant feedback & scoring</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>Automated follow-up emails</span>
                    </div>
                  </div>

                  <Button 
                    size="lg" 
                    className="w-full gap-2 text-lg py-6"
                    onClick={startPitch}
                  >
                    <Play className="w-5 h-5" />
                    Start Your Pitch
                  </Button>
                  
                  <p className="text-xs text-muted-foreground mt-4">
                    Click to begin your 2-minute pitch evaluation
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* Active Pitch State - Show Chat Interface */
            <>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-3xl mx-auto space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-4 animate-pulse">
                        <p className="text-sm">Evaluating your pitch...</p>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Section */}
              <div className="border-t p-4 bg-background/50 backdrop-blur-sm">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="max-w-3xl mx-auto flex gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={isPitchEnded ? "Pitch ended" : "Type your pitch here..."}
                    disabled={isPitchEnded || isLoading}
                    className="flex-1 rounded-md border border-input bg-background px-4 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                  />
                  <Button 
                    type="submit" 
                    disabled={isPitchEnded || isLoading || !inputMessage.trim()}
                    size="lg"
                    className="px-6"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>

        {/* Company Details - Right Side (only when not in pitch mode) */}
        {!isPitchMode && (
          <div className="w-1/2 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
            {/* Company Header */}
            <div className="flex items-start gap-4">
              <Building2 className="h-12 w-12 text-muted-foreground mt-1" />
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{company.name}</h1>
                <p className="text-muted-foreground">{company.industry}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {company.employees}
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    {company.website}
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    {company.jobOpenings} openings
                  </span>
                </div>
              </div>
            </div>

            {/* Company Description */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold mb-2">About</h3>
              <p className="text-sm text-muted-foreground">{company.description}</p>
            </div>

            {/* Company Needs */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Current Needs
              </h3>
              <ul className="space-y-2">
                {company.needs.map((need, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 mt-0.5">•</span>
                    <span>{need}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Challenges */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold mb-3">Pain Points & Challenges</h3>
              <ul className="space-y-2">
                {company.challenges.map((challenge, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{challenge}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Current Solutions */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold mb-3">Current Tech Stack</h3>
              <div className="flex flex-wrap gap-2">
                {company.currentSolutions.map((solution, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-md bg-yellow-500 px-2.5 py-0.5 text-sm"
                  >
                    {solution}
                  </span>
                ))}
              </div>
            </div>

            {/* Decision Makers */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold mb-3">Key Decision Makers</h3>
              <div className="space-y-3">
                {company.decisionMakers.map((person, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {person.name.split(" ").map(n => n[0]).join("")}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{person.name}</p>
                      <p className="text-xs text-muted-foreground">{person.role}</p>
                      <p className="text-xs text-muted-foreground mt-1">Focus: {person.focus}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
