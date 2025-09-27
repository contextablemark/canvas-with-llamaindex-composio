"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Mail, 
  Trophy, 
  Clock,
  TrendingUp,
  AlertCircle 
} from "lucide-react";

interface PageProps {
  params: Promise<{
    id: string; // This is the conversation ID
  }>;
}

interface PitchStatus {
  criteria_status: {
    problem_solution: boolean;
    evidence_proof: boolean;
    differentiation: boolean;
    target_fit: boolean;
    implementation: boolean;
    credibility: boolean;
    business_case: boolean;
    next_steps: boolean;
  };
  score_percentage: number;
  is_passing: boolean;
  last_evaluation: string;
  message_count: number;
}

interface EmailTemplate {
  subject: string;
  body: string;
}

interface CompanyInfo {
  name: string;
  primaryEmail: string;
  decisionMaker: string;
}

// Mock company data - in real app, fetch from API
const getCompanyInfo = (id: string): CompanyInfo => {
  const companies: Record<string, CompanyInfo> = {
    "1": {
      name: "TechCorp Solutions",
      primaryEmail: "sarah.johnson@techcorp.com",
      decisionMaker: "Sarah Johnson",
    },
    "2": {
      name: "Global Manufacturing Inc",
      primaryEmail: "robert.williams@globalmanufacturing.com",
      decisionMaker: "Robert Williams",
    },
    "3": {
      name: "Healthcare Innovations",
      primaryEmail: "patricia.thompson@healthcareinnovations.com",
      decisionMaker: "Dr. Patricia Thompson",
    },
    "4": {
      name: "Finance Leaders Ltd",
      primaryEmail: "michael.anderson@financeleaders.com",
      decisionMaker: "Michael Anderson",
    },
  };

  return companies[id] || companies["1"];
};

export default function PitchResultsPage({ params }: PageProps) {
  const { id: conversationId } = use(params);
  const searchParams = useSearchParams();
  const companyId = searchParams.get("company") || "";
  const router = useRouter();
  const companyInfo = getCompanyInfo(companyId);
  
  const [pitchStatus, setPitchStatus] = useState<PitchStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate>({
    subject: `Following up on our conversation - ${companyInfo.name}`,
    body: `Dear ${companyInfo.decisionMaker},

Thank you for taking the time to discuss how our solution can help ${companyInfo.name} achieve your business objectives.

As we discussed, our platform addresses your key challenges and can deliver significant value to your organization.

I'd love to schedule a follow-up meeting to dive deeper into the implementation timeline and discuss next steps.

Would you be available for a 30-minute call next week?

Best regards,
[Your Name]`
  });

  useEffect(() => {
    fetchPitchStatus();
  }, [conversationId]);

  const fetchPitchStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/pitch/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId }),
      });

      if (response.ok) {
        const result = await response.json();
        setPitchStatus(result.status);
      }
    } catch (error) {
      console.error("Failed to fetch pitch status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendFollowUpEmail = async () => {
    setIsSendingEmail(true);
    
    try {
      const response = await fetch("/api/pitch/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email: companyInfo.primaryEmail,
          subject: emailTemplate.subject,
          body: emailTemplate.body,
          company_name: companyInfo.name,
        }),
      });

      if (response.ok) {
        setEmailSent(true);
        setShowEmailForm(false);
      } else {
        const errorData = await response.json();
        alert(`Failed to send email: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error sending email:", error);
      alert("Failed to send email. Please try again.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const criteriaLabels: Record<string, string> = {
    problem_solution: "Problem & Solution",
    evidence_proof: "Evidence & Proof",
    differentiation: "Differentiation",
    target_fit: "Target Fit",
    implementation: "Implementation",
    credibility: "Credibility",
    business_case: "Business Case",
    next_steps: "Next Steps",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading pitch results...</p>
        </div>
      </div>
    );
  }

  const isPassing = pitchStatus?.is_passing || false;
  const score = pitchStatus?.score_percentage || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href={`/company/${companyId}`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Company
            </Button>
          </Link>
          <Link href="/pitch-score">
            <Button size="sm" variant="outline">View All Pitches</Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-8">
        {/* Result Header */}
        <div className={`rounded-lg p-8 mb-8 text-center ${
          isPassing ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"
        }`}>
          <div className="flex justify-center mb-4">
            {isPassing ? (
              <Trophy className="h-16 w-16 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="h-16 w-16 text-red-600 dark:text-red-400" />
            )}
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {isPassing ? "Pitch Successful!" : "Pitch Needs Improvement"}
          </h1>
          <p className="text-xl mb-4">Score: {score.toFixed(0)}%</p>
          <p className="text-muted-foreground">
            {isPassing 
              ? "Congratulations! You've met the criteria for a successful pitch."
              : "You didn't quite meet the 60% threshold. Review the feedback below."}
          </p>
        </div>

        {/* Criteria Breakdown */}
        <div className="bg-card rounded-lg border p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Criteria Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(criteriaLabels).map(([key, label]) => {
              const isMet = pitchStatus?.criteria_status[key as keyof typeof pitchStatus.criteria_status] || false;
              return (
                <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-background">
                  {isMet ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${isMet ? "font-medium" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-lg border p-4 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-semibold">{pitchStatus?.message_count || 0}</p>
            <p className="text-sm text-muted-foreground">Messages Sent</p>
          </div>
          <div className="bg-card rounded-lg border p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-semibold">{score.toFixed(0)}%</p>
            <p className="text-sm text-muted-foreground">Score Achieved</p>
          </div>
          <div className="bg-card rounded-lg border p-4 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-semibold">
              {Object.values(pitchStatus?.criteria_status || {}).filter(Boolean).length}/8
            </p>
            <p className="text-sm text-muted-foreground">Criteria Met</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          {isPassing && !emailSent && (
            <Button
              size="lg"
              className="gap-2"
              onClick={() => setShowEmailForm(true)}
            >
              <Mail className="h-5 w-5" />
              Send Follow-up Email
            </Button>
          )}
          {emailSent && (
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
              <p className="font-medium">Email draft created successfully!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Check your Gmail drafts to review and send the email.
              </p>
            </div>
          )}
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push(`/pitch/${companyId}`)}
          >
            Try Another Pitch
          </Button>
        </div>

        {/* Email Form Modal */}
        {showEmailForm && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
            <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Send Follow-up Email</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEmailForm(false)}
                  disabled={isSendingEmail}
                >
                  ✕
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">To</label>
                    <input
                      type="email"
                      value={companyInfo.primaryEmail}
                      disabled
                      className="w-full mt-1 rounded-md border border-input bg-muted px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Company</label>
                    <input
                      type="text"
                      value={companyInfo.name}
                      disabled
                      className="w-full mt-1 rounded-md border border-input bg-muted px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <input
                    type="text"
                    value={emailTemplate.subject}
                    onChange={(e) => setEmailTemplate({ ...emailTemplate, subject: e.target.value })}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Enter email subject..."
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">Message</label>
                  <textarea
                    value={emailTemplate.body}
                    onChange={(e) => setEmailTemplate({ ...emailTemplate, body: e.target.value })}
                    rows={15}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Enter your follow-up message..."
                  />
                </div>

                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">
                    💡 <strong>Tip:</strong> This email will be sent as a draft to your Gmail account. 
                    You can review and send it from there, or it will be sent automatically if configured.
                  </p>
                </div>
              </div>

              <div className="flex justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEmailTemplate({
                        subject: `Following up on our conversation - ${companyInfo.name}`,
                        body: `Dear ${companyInfo.decisionMaker},\n\nThank you for taking the time to discuss how our solution can help ${companyInfo.name} achieve your business objectives.\n\nAs we discussed, our platform addresses your key challenges and can deliver significant value to your organization.\n\nI'd love to schedule a follow-up meeting to dive deeper into the implementation timeline and discuss next steps.\n\nWould you be available for a 30-minute call next week?\n\nBest regards,\n[Your Name]`
                      });
                    }}
                    disabled={isSendingEmail}
                  >
                    Reset Template
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowEmailForm(false)}
                    disabled={isSendingEmail}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={sendFollowUpEmail}
                    disabled={isSendingEmail || !emailTemplate.subject.trim() || !emailTemplate.body.trim()}
                    className="gap-2"
                  >
                    {isSendingEmail ? (
                      <>Creating Draft...</>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Create Email Draft
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
