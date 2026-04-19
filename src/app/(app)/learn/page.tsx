"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowUpRight } from "lucide-react";

const articles = [
  {
    id: 1,
    title: "The 30 Plants Per Week Rule",
    description: "Why gut health research points to diversity over quantity, and how to hit this target without overthinking it.",
    tag: "gut health",
    readTime: "5 min read",
    featured: true,
  },
  {
    id: 2,
    title: "Understanding Your Glycemic Response",
    description: "Blood sugar spikes aren't just about carbs — timing, food combos, and even stress play a role.",
    tag: "blood sugar",
    readTime: "7 min read",
    featured: false,
  },
  {
    id: 3,
    title: "Fiber Diversity: Why Variety Matters More Than Quantity",
    description: "Different fibers feed different gut bacteria. Here's how to optimize your intake.",
    tag: "gut health",
    readTime: "4 min read",
    featured: false,
  },
  {
    id: 4,
    title: "How to Read a Blood Test for Nutrition",
    description: "Biomarkers like HbA1c, ferritin, and Vitamin D tell a story. Learn what yours means.",
    tag: "biomarkers",
    readTime: "6 min read",
    featured: false,
  },
  {
    id: 5,
    title: "Fermented Foods Ranked by Gut Impact",
    description: "Not all fermented foods are created equal. Here's what the research actually shows.",
    tag: "gut health",
    readTime: "5 min read",
    featured: false,
  },
  {
    id: 6,
    title: "Omega-3 Sources: A Complete Guide",
    description: "From fish to flax — understanding EPA, DHA, and ALA for optimal brain and heart health.",
    tag: "inflammation",
    readTime: "4 min read",
    featured: false,
  },
  {
    id: 7,
    title: "Why Your Blood Sugar Spikes Vary Day to Day",
    description: "Sleep, stress, and exercise timing all influence how your body processes the same meal.",
    tag: "blood sugar",
    readTime: "6 min read",
    featured: false,
  },
  {
    id: 8,
    title: "Signs You're Vitamin D Deficient",
    description: "Fatigue, mood changes, and muscle weakness could all point to low Vitamin D levels.",
    tag: "energy",
    readTime: "3 min read",
    featured: false,
  },
];

const tagColors: Record<string, string> = {
  "gut health": "bg-[#1a3a2a]/8 text-[#1a3a2a] border-[#1a3a2a]/15",
  "blood sugar": "bg-[#d4520a]/8 text-[#d4520a] border-[#d4520a]/15",
  "biomarkers": "bg-emerald-500/8 text-emerald-600 border-emerald-500/15",
  "inflammation": "bg-amber-500/8 text-amber-600 border-amber-500/15",
  "energy": "bg-indigo-500/8 text-indigo-600 border-indigo-500/15",
};

export default function LearnPage() {
  const featuredArticle = articles.find((a) => a.featured);
  const regularArticles = articles.filter((a) => !a.featured);

  return (
    <div className="page-enter min-h-screen bg-[#faf8f4] p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="font-display text-4xl text-[#1a3a2a]">Learn</h1>
          <p className="text-[#1a3a2a]/50">
            Science-backed nutrition insights
          </p>
        </div>

        {/* Featured Article */}
        {featuredArticle && (
          <Card className="group relative rounded-3xl border-0 bg-gradient-to-br from-white via-white to-[#1a3a2a]/[0.04] shadow-xl ring-1 ring-[#1a3a2a]/[0.06] overflow-hidden hover:shadow-2xl transition-all cursor-pointer">
            <div className="absolute top-5 right-5 z-10">
              <Badge className="bg-[#d4520a] text-white shadow-md rounded-lg px-3">
                Featured
              </Badge>
            </div>
            <CardHeader className="space-y-4 pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant="outline"
                  className={`rounded-lg ${tagColors[featuredArticle.tag] || ""}`}
                >
                  {featuredArticle.tag}
                </Badge>
                <div className="flex items-center gap-1.5 text-sm text-[#1a3a2a]/40">
                  <Clock className="size-4" />
                  <span>{featuredArticle.readTime}</span>
                </div>
              </div>
              <CardTitle className="font-display text-3xl leading-tight text-[#1a3a2a] group-hover:text-[#d4520a] transition-colors">
                {featuredArticle.title}
              </CardTitle>
              <CardDescription className="text-base leading-relaxed text-[#1a3a2a]/50">
                {featuredArticle.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm font-medium text-[#1a3a2a]">
                <span>Read article</span>
                <ArrowUpRight className="size-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Article Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {regularArticles.map((article) => (
            <Card
              key={article.id}
              className="group rounded-2xl border-0 bg-white shadow-md ring-1 ring-black/[0.04] hover:shadow-lg hover:ring-[#1a3a2a]/10 transition-all cursor-pointer"
            >
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`rounded-lg text-xs ${tagColors[article.tag] || ""}`}
                  >
                    {article.tag}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-xs text-[#1a3a2a]/35">
                    <Clock className="size-3.5" />
                    <span>{article.readTime}</span>
                  </div>
                </div>
                <CardTitle className="text-lg leading-tight text-[#1a3a2a] group-hover:text-[#d4520a] transition-colors">
                  {article.title}
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed line-clamp-2 text-[#1a3a2a]/45">
                  {article.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm font-medium text-[#1a3a2a]">
                  <span>Read more</span>
                  <ArrowUpRight className="size-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
