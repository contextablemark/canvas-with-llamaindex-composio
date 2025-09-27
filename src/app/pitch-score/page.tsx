"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { ArrowLeft, Trophy, AlertCircle, Clock, TrendingUp, Eye } from "lucide-react";

interface PitchHistory {
  id: string;
  conversationId: string;
  companyId: string;
  companyName: string;
  sellerName: string;
  date: string;
  score: number;
  isPassing: boolean;
  duration: string;
  messageCount: number;
  criteriaMetCount: number;
}

export default function PitchScorePage() {
  const router = useRouter();
  
  // Mock pitch history data - in real app, fetch from API
  const [pitchHistory] = useState<PitchHistory[]>([
    {
      id: "1",
      conversationId: "pitch-1-1703123456",
      companyId: "1",
      companyName: "TechCorp Solutions",
      sellerName: "John Smith",
      date: new Date().toISOString(),
      score: 75,
      isPassing: true,
      duration: "1:45",
      messageCount: 8,
      criteriaMetCount: 6,
    },
    {
      id: "2",
      conversationId: "pitch-2-1703123456",
      companyId: "2",
      companyName: "Global Manufacturing Inc",
      sellerName: "John Smith",
      date: new Date(Date.now() - 86400000).toISOString(),
      score: 50,
      isPassing: false,
      duration: "2:00",
      messageCount: 12,
      criteriaMetCount: 4,
    },
    {
      id: "3",
      conversationId: "pitch-3-1703123456",
      companyId: "3",
      companyName: "Healthcare Innovations",
      sellerName: "John Smith",
      date: new Date(Date.now() - 172800000).toISOString(),
      score: 87.5,
      isPassing: true,
      duration: "1:30",
      messageCount: 10,
      criteriaMetCount: 7,
    },
  ]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    
    return date.toLocaleDateString();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  // Calculate statistics
  const totalPitches = pitchHistory.length;
  const successfulPitches = pitchHistory.filter(p => p.isPassing).length;
  const averageScore = pitchHistory.reduce((sum, p) => sum + p.score, 0) / totalPitches;
  const successRate = (successfulPitches / totalPitches) * 100;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/companies">
            <Button variant="ghost" size="sm" className="gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Companies
            </Button>
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Pitch History</h1>
              <p className="text-muted-foreground mt-1">
                Track your sales pitch performance over time
              </p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pitches</p>
                <p className="text-2xl font-bold">{totalPitches}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{successRate.toFixed(0)}%</p>
              </div>
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-2xl font-bold">{averageScore.toFixed(0)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold">{successfulPitches}/{totalPitches}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Pitch List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Pitches</h2>
          
          {pitchHistory.map((pitch) => (
            <div
              key={pitch.id}
              className="rounded-lg border bg-card p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/pitch-results/${pitch.conversationId}?company=${pitch.companyId}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-lg font-semibold">{pitch.companyName}</h3>
                    {pitch.isPassing ? (
                      <Trophy className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>Seller: {pitch.sellerName}</span>
                    <span>{formatDate(pitch.date)}</span>
                    <span>Duration: {pitch.duration}</span>
                    <span>{pitch.messageCount} messages</span>
                  </div>
                  
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Score:</span>
                      <span className={`font-semibold ${getScoreColor(pitch.score)}`}>
                        {pitch.score}%
                      </span>
                    </div>
                    <Progress value={pitch.score} className="h-2 w-32" />
                    <span className="text-sm text-muted-foreground">
                      {pitch.criteriaMetCount}/8 criteria met
                    </span>
                  </div>
                </div>
                
                <Button variant="ghost" size="sm" className="gap-2">
                  <Eye className="h-4 w-4" />
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {pitchHistory.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pitch history yet</h3>
            <p className="text-muted-foreground mb-4">
              Start practicing your sales pitches to see your progress here
            </p>
            <Link href="/companies">
              <Button>Browse Companies</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}