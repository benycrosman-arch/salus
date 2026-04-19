"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Calendar,
  Target,
  Activity,
  UtensilsCrossed,
  LogOut,
  Edit,
  CreditCard,
  FlaskConical,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

// Mock user data
const mockUser = {
  name: "Alex Johnson",
  email: "alex@example.com",
  plan: "Premium",
  memberSince: "January 2024",
  initials: "AJ",
  healthGoals: ["Gut Health", "More Energy", "Lose Weight"],
  biomarkers: {
    microbiome: {
      score: 68,
      max: 100,
      status: "moderate",
    },
    vitaminD: {
      value: 28,
      unit: "ng/mL",
      status: "low",
      label: "Vitamin D",
    },
    hba1c: {
      value: 5.2,
      unit: "%",
      status: "normal",
      label: "HbA1c",
    },
  },
  diet: {
    type: "Omnivore",
    allergies: ["Dairy", "Gluten"],
  },
};

export default function ProfilePage() {
  return (
    <div className="page-enter min-h-screen bg-[#faf8f4] p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-4xl text-[#1a3a2a]">Profile & Settings</h1>
          <p className="mt-1 text-[#1a3a2a]/40">
            Manage your account and health preferences
          </p>
        </div>

        {/* Profile Card */}
        <Card className="rounded-3xl border-0 bg-white p-8 shadow-lg ring-1 ring-black/[0.04]">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <Avatar className="h-24 w-24 bg-[#1a3a2a] text-white ring-4 ring-[#1a3a2a]/10">
              <AvatarFallback className="font-display text-2xl">
                {mockUser.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
                <h2 className="font-display text-2xl text-[#1a3a2a]">
                  {mockUser.name}
                </h2>
                <Badge className="bg-[#1a3a2a] text-white hover:bg-[#1a3a2a]/90 rounded-lg">
                  {mockUser.plan}
                </Badge>
              </div>
              <div className="space-y-1.5 text-sm text-[#1a3a2a]/50">
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <Mail className="h-4 w-4" />
                  <span>{mockUser.email}</span>
                </div>
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <Calendar className="h-4 w-4" />
                  <span>Member since {mockUser.memberSince}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Health Goals */}
        <Card className="rounded-2xl border-0 bg-white p-6 shadow-md ring-1 ring-black/[0.04]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#d4520a]/10">
              <Target className="h-4 w-4 text-[#d4520a]" />
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1a3a2a]/40">
              Health Goals
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {mockUser.healthGoals.map((goal) => (
              <Badge
                key={goal}
                variant="outline"
                className="border-[#1a3a2a]/15 bg-[#1a3a2a]/5 px-4 py-2 text-sm text-[#1a3a2a] rounded-xl"
              >
                {goal}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Biomarker Summary */}
        <Card className="rounded-2xl border-0 bg-white p-6 shadow-md ring-1 ring-black/[0.04]">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a3a2a]/8">
              <Activity className="h-4 w-4 text-[#1a3a2a]" />
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1a3a2a]/40">
              Biomarker Summary
            </h3>
          </div>

          <div className="space-y-6">
            {/* Microbiome Score */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#1a3a2a]">
                  Microbiome Score
                </span>
                <span className="font-display text-lg text-[#1a3a2a]">
                  {mockUser.biomarkers.microbiome.score}/{mockUser.biomarkers.microbiome.max}
                </span>
              </div>
              <Progress
                value={mockUser.biomarkers.microbiome.score}
                className="h-3 rounded-full"
              />
              <p className="text-xs text-[#1a3a2a]/40">
                Your gut diversity is moderate. Consider adding more plant variety.
              </p>
            </div>

            <Separator className="bg-[#e7e2da]" />

            {/* Individual Biomarkers */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Vitamin D */}
              <div className="flex items-start gap-3 rounded-2xl border border-[#d4520a]/15 bg-[#d4520a]/[0.04] p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#d4520a]/10">
                  <AlertCircle className="h-4 w-4 text-[#d4520a]" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#1a3a2a]">
                      {mockUser.biomarkers.vitaminD.label}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-[#d4520a]/20 bg-[#d4520a]/8 text-xs text-[#d4520a] rounded-md"
                    >
                      Low
                    </Badge>
                  </div>
                  <div className="font-display text-xl text-[#1a3a2a]">
                    {mockUser.biomarkers.vitaminD.value}{" "}
                    <span className="text-sm font-sans font-normal text-[#1a3a2a]/40">
                      {mockUser.biomarkers.vitaminD.unit}
                    </span>
                  </div>
                  <p className="text-xs text-[#1a3a2a]/40">
                    Below optimal range (30-50 ng/mL)
                  </p>
                </div>
              </div>

              {/* HbA1c */}
              <div className="flex items-start gap-3 rounded-2xl border border-[#1a3a2a]/10 bg-[#1a3a2a]/[0.03] p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1a3a2a]/8">
                  <CheckCircle className="h-4 w-4 text-[#1a3a2a]" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#1a3a2a]">
                      {mockUser.biomarkers.hba1c.label}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-[#1a3a2a]/15 bg-[#1a3a2a]/8 text-xs text-[#1a3a2a] rounded-md"
                    >
                      Normal
                    </Badge>
                  </div>
                  <div className="font-display text-xl text-[#1a3a2a]">
                    {mockUser.biomarkers.hba1c.value}
                    <span className="text-sm font-sans font-normal text-[#1a3a2a]/40">
                      {mockUser.biomarkers.hba1c.unit}
                    </span>
                  </div>
                  <p className="text-xs text-[#1a3a2a]/40">
                    Healthy blood sugar control
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Diet Preferences */}
        <Card className="rounded-2xl border-0 bg-white p-6 shadow-md ring-1 ring-black/[0.04]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a3a2a]/8">
              <UtensilsCrossed className="h-4 w-4 text-[#1a3a2a]" />
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1a3a2a]/40">
              Diet Preferences
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium text-[#1a3a2a]/35">
                Diet Type
              </p>
              <Badge
                variant="outline"
                className="border-[#1a3a2a]/15 bg-[#1a3a2a]/5 px-4 py-2 text-sm text-[#1a3a2a] rounded-xl"
              >
                {mockUser.diet.type}
              </Badge>
            </div>

            <Separator className="bg-[#e7e2da]" />

            <div>
              <p className="mb-2 text-xs font-medium text-[#1a3a2a]/35">
                Allergies & Restrictions
              </p>
              <div className="flex flex-wrap gap-2">
                {mockUser.diet.allergies.map((allergy) => (
                  <Badge
                    key={allergy}
                    variant="outline"
                    className="border-[#d4520a]/20 bg-[#d4520a]/5 px-3 py-1.5 text-sm text-[#d4520a] rounded-xl"
                  >
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Account Actions */}
        <Card className="rounded-2xl border-0 bg-white p-6 shadow-md ring-1 ring-black/[0.04]">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a3a2a]/8">
              <User className="h-4 w-4 text-[#1a3a2a]" />
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1a3a2a]/40">
              Account Actions
            </h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              className="justify-start rounded-xl border-[#1a3a2a]/10 text-[#1a3a2a] hover:bg-[#1a3a2a]/5"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>

            <Button
              variant="outline"
              className="justify-start rounded-xl border-[#1a3a2a]/10 text-[#1a3a2a] hover:bg-[#1a3a2a]/5"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Manage Subscription
            </Button>

            <Button
              variant="outline"
              className="justify-start rounded-xl border-[#1a3a2a]/10 text-[#1a3a2a] hover:bg-[#1a3a2a]/5"
            >
              <FlaskConical className="mr-2 h-4 w-4" />
              Update Lab Results
            </Button>

            <Button
              variant="destructive"
              className="justify-start rounded-xl bg-red-500/90 text-white hover:bg-red-500"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
