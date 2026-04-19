"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  Check,
  Sparkles,
  Users,
  Calendar,
  Dna,
} from "lucide-react";

// Mock product data
const supplements = [
  {
    id: "1",
    name: "Gut Support Blend",
    price: 39,
    description:
      "Prebiotics, probiotics, and postbiotics for optimal gut diversity",
    recommended: true,
    recommendationReason: "Microbiome score < 80",
    benefits: [
      "Supports microbiome diversity",
      "Reduces bloating",
      "Improves nutrient absorption",
    ],
  },
  {
    id: "2",
    name: "Vitamin D3 + K2",
    price: 24,
    description:
      "High-potency D3 with K2 for proper calcium metabolism",
    recommended: true,
    recommendationReason: "Vitamin D is low",
    benefits: [
      "Bone health",
      "Immune support",
      "Mood regulation",
    ],
  },
  {
    id: "3",
    name: "Magnesium Glycinate",
    price: 19,
    description:
      "Highly bioavailable magnesium for sleep and recovery",
    recommended: false,
    benefits: [
      "Better sleep",
      "Muscle recovery",
      "Stress reduction",
    ],
  },
];

const starterKit = {
  name: "NutriGen DNA + Microbiome Kit",
  price: 129,
  description:
    "Get your complete genetic nutrition profile and real microbiome analysis",
  waitlistCount: 2400,
  releaseDate: "Coming Q2 2025",
};

export default function ShopPage() {
  return (
    <div className="page-enter min-h-screen bg-[#faf8f4] p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-display text-4xl text-[#1a3a2a] sm:text-5xl">
            Science-Backed Supplements
          </h1>
          <p className="mt-3 text-[#1a3a2a]/50">
            Personalized to your biomarker gaps
          </p>
        </div>

        {/* Supplements Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {supplements.map((product) => (
            <Card
              key={product.id}
              className="group relative flex flex-col rounded-3xl border-0 bg-white p-7 shadow-md ring-1 ring-black/[0.04] transition-all hover:shadow-lg"
            >
              {/* Recommendation Badge */}
              {product.recommended && (
                <Badge className="absolute right-5 top-5 bg-[#d4520a] text-white hover:bg-[#d4520a]/90 rounded-lg px-2.5">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Recommended
                </Badge>
              )}

              {/* Product Header */}
              <div className="mb-4 mt-2">
                <h3 className="font-display text-xl text-[#1a3a2a]">
                  {product.name}
                </h3>
                <Badge
                  variant="outline"
                  className="mt-2 border-[#1a3a2a]/15 font-display text-sm text-[#1a3a2a]"
                >
                  ${product.price}/mo
                </Badge>
              </div>

              {/* Description */}
              <p className="mb-5 text-sm leading-relaxed text-[#1a3a2a]/50">
                {product.description}
              </p>

              <Separator className="mb-5 bg-[#e7e2da]" />

              {/* Benefits */}
              <div className="mb-6 flex-1 space-y-3">
                {product.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1a3a2a]/8">
                      <Check className="h-3 w-3 text-[#1a3a2a]" />
                    </div>
                    <span className="text-sm text-[#1a3a2a]/70">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Add to Cart Button */}
              <Button className="w-full rounded-xl bg-[#1a3a2a] text-white shadow-md shadow-[#1a3a2a]/15 transition-all hover:bg-[#1a3a2a]/90 hover:shadow-lg">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add to Cart
              </Button>
            </Card>
          ))}
        </div>

        {/* Starter Kit Section */}
        <div className="pt-4">
          <Card className="relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-white via-white to-[#1a3a2a]/[0.04] p-8 shadow-xl ring-2 ring-[#1a3a2a]/10">
            {/* Decorative background elements */}
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[#1a3a2a]/5 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-[#d4520a]/5 blur-3xl" />

            <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
              {/* Left side - Content */}
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a3a2a]/8">
                    <Dna className="h-6 w-6 text-[#1a3a2a]" />
                  </div>
                  <Badge className="bg-[#d4520a] text-white hover:bg-[#d4520a]/90 rounded-lg">
                    {starterKit.releaseDate}
                  </Badge>
                </div>

                <div>
                  <h2 className="mb-2 font-display text-3xl text-[#1a3a2a]">
                    {starterKit.name}
                  </h2>
                  <p className="text-sm leading-relaxed text-[#1a3a2a]/50 sm:text-base">
                    {starterKit.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[#1a3a2a]/50">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Join {starterKit.waitlistCount.toLocaleString()} on the waitlist
                  </span>
                </div>

                <Separator className="bg-[#e7e2da]" />

                <div className="space-y-3">
                  <Badge
                    variant="outline"
                    className="border-[#1a3a2a]/15 font-display text-base text-[#1a3a2a]"
                  >
                    ${starterKit.price} one-time
                  </Badge>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      "Complete DNA analysis",
                      "Microbiome sequencing",
                      "Personalized meal plans",
                      "Supplement recommendations",
                    ].map((feature) => (
                      <div key={feature} className="flex items-start gap-2">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1a3a2a]/8">
                          <Check className="h-3 w-3 text-[#1a3a2a]" />
                        </div>
                        <span className="text-sm text-[#1a3a2a]/70">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right side - CTA */}
              <div className="flex flex-col gap-4 md:items-end md:justify-center">
                <div className="rounded-3xl border-2 border-[#1a3a2a]/8 bg-white/90 p-8 shadow-lg backdrop-blur-sm">
                  <div className="mb-5 text-center">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#1a3a2a]/40">
                      Early Access Pricing
                    </p>
                    <p className="font-display text-5xl text-[#1a3a2a]">
                      ${starterKit.price}
                    </p>
                    <p className="mt-1 text-xs text-[#1a3a2a]/35">
                      Regular price: $199
                    </p>
                  </div>

                  <Button
                    size="lg"
                    className="group w-full rounded-xl bg-[#1a3a2a] py-6 text-lg font-semibold text-white shadow-lg shadow-[#1a3a2a]/20 transition-all hover:bg-[#1a3a2a]/90 hover:shadow-xl"
                  >
                    <Calendar className="mr-2 h-5 w-5" />
                    Join Waitlist
                    <Sparkles className="ml-2 h-5 w-5 transition-transform group-hover:scale-110" />
                  </Button>

                  <p className="mt-3 text-center text-xs text-[#1a3a2a]/35">
                    Be the first to know when we launch
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
