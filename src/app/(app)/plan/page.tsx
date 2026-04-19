"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Calendar,
  ShoppingCart,
  Sun,
  Coffee,
  UtensilsCrossed,
  Apple,
  Moon,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

// Mock meal data
const mockMeals = {
  Monday: [
    {
      type: "Breakfast",
      icon: Sun,
      name: "Greek Yogurt Parfait",
      description: "Greek yogurt with mixed berries, granola, and honey drizzle.",
      calories: 380,
      protein: 22,
      carbs: 48,
      fat: 12,
    },
    {
      type: "Morning Snack",
      icon: Coffee,
      name: "Apple & Almond Butter",
      description: "Sliced apple with 2 tbsp almond butter.",
      calories: 250,
      protein: 6,
      carbs: 28,
      fat: 14,
    },
    {
      type: "Lunch",
      icon: UtensilsCrossed,
      name: "Mediterranean Quinoa Bowl",
      description: "Quinoa with chickpeas, cucumber, tomatoes, feta, and lemon-tahini dressing.",
      calories: 520,
      protein: 18,
      carbs: 62,
      fat: 22,
    },
    {
      type: "Afternoon Snack",
      icon: Apple,
      name: "Veggie Sticks & Hummus",
      description: "Carrot, celery, bell pepper with hummus.",
      calories: 180,
      protein: 6,
      carbs: 22,
      fat: 8,
    },
    {
      type: "Dinner",
      icon: Moon,
      name: "Grilled Salmon & Sweet Potato",
      description: "Salmon fillet with roasted sweet potato, steamed broccoli, and lemon.",
      calories: 580,
      protein: 42,
      carbs: 38,
      fat: 26,
    },
  ],
  Tuesday: [
    { type: "Breakfast", icon: Sun, name: "Oatmeal Power Bowl", description: "Steel-cut oats with banana, walnuts, chia seeds, and cinnamon.", calories: 420, protein: 14, carbs: 58, fat: 16 },
    { type: "Morning Snack", icon: Coffee, name: "Protein Smoothie", description: "Spinach, banana, protein powder, almond milk.", calories: 280, protein: 24, carbs: 32, fat: 8 },
    { type: "Lunch", icon: UtensilsCrossed, name: "Chicken Caesar Salad", description: "Grilled chicken breast, romaine, parmesan, whole wheat croutons.", calories: 480, protein: 38, carbs: 28, fat: 24 },
    { type: "Afternoon Snack", icon: Apple, name: "Mixed Nuts & Berries", description: "Almonds, cashews with fresh blueberries.", calories: 220, protein: 8, carbs: 18, fat: 16 },
    { type: "Dinner", icon: Moon, name: "Turkey Meatballs & Zucchini Noodles", description: "Lean turkey meatballs with zoodles and marinara sauce.", calories: 520, protein: 45, carbs: 32, fat: 22 },
  ],
  Wednesday: [
    { type: "Breakfast", icon: Sun, name: "Avocado Toast & Eggs", description: "Whole grain toast with mashed avocado, poached eggs, cherry tomatoes.", calories: 410, protein: 18, carbs: 38, fat: 22 },
    { type: "Morning Snack", icon: Coffee, name: "Cottage Cheese & Pineapple", description: "Low-fat cottage cheese with fresh pineapple chunks.", calories: 200, protein: 16, carbs: 24, fat: 4 },
    { type: "Lunch", icon: UtensilsCrossed, name: "Thai Peanut Buddha Bowl", description: "Brown rice, edamame, cabbage, carrots, peanut sauce.", calories: 540, protein: 22, carbs: 64, fat: 20 },
    { type: "Afternoon Snack", icon: Apple, name: "Rice Cakes & Almond Butter", description: "Two rice cakes with almond butter and sliced banana.", calories: 240, protein: 7, carbs: 32, fat: 10 },
    { type: "Dinner", icon: Moon, name: "Beef Stir-Fry", description: "Lean beef strips with mixed vegetables, ginger-soy sauce, jasmine rice.", calories: 560, protein: 38, carbs: 52, fat: 20 },
  ],
  Thursday: [
    { type: "Breakfast", icon: Sun, name: "Protein Pancakes", description: "Whole wheat protein pancakes with fresh strawberries and maple syrup.", calories: 390, protein: 26, carbs: 52, fat: 10 },
    { type: "Morning Snack", icon: Coffee, name: "Greek Yogurt & Honey", description: "Plain Greek yogurt with honey and sliced almonds.", calories: 230, protein: 18, carbs: 22, fat: 8 },
    { type: "Lunch", icon: UtensilsCrossed, name: "Tuna Poke Bowl", description: "Sushi-grade tuna, sushi rice, avocado, cucumber, edamame, sesame.", calories: 510, protein: 35, carbs: 56, fat: 16 },
    { type: "Afternoon Snack", icon: Apple, name: "Energy Balls", description: "Homemade oat-date-peanut butter energy balls.", calories: 190, protein: 6, carbs: 26, fat: 8 },
    { type: "Dinner", icon: Moon, name: "Baked Cod & Asparagus", description: "Herb-crusted cod with roasted asparagus and quinoa pilaf.", calories: 490, protein: 42, carbs: 44, fat: 14 },
  ],
  Friday: [
    { type: "Breakfast", icon: Sun, name: "Spinach & Feta Omelet", description: "Three-egg omelet with spinach, feta, whole wheat toast.", calories: 420, protein: 28, carbs: 32, fat: 20 },
    { type: "Morning Snack", icon: Coffee, name: "Banana & Peanut Butter", description: "Medium banana with 2 tbsp natural peanut butter.", calories: 270, protein: 8, carbs: 34, fat: 12 },
    { type: "Lunch", icon: UtensilsCrossed, name: "Black Bean Burrito Bowl", description: "Black beans, brown rice, salsa, guacamole, corn, lettuce.", calories: 530, protein: 20, carbs: 68, fat: 18 },
    { type: "Afternoon Snack", icon: Apple, name: "Trail Mix", description: "Mixed nuts, dried cranberries, dark chocolate chips.", calories: 210, protein: 6, carbs: 22, fat: 13 },
    { type: "Dinner", icon: Moon, name: "Chicken Fajita Bowl", description: "Grilled chicken, peppers, onions, cauliflower rice, black beans.", calories: 550, protein: 44, carbs: 42, fat: 20 },
  ],
  Saturday: [
    { type: "Breakfast", icon: Sun, name: "Berry Smoothie Bowl", description: "Blended berries, banana, topped with granola, coconut, chia seeds.", calories: 400, protein: 12, carbs: 62, fat: 14 },
    { type: "Morning Snack", icon: Coffee, name: "Hard-Boiled Eggs & Veggies", description: "Two hard-boiled eggs with cherry tomatoes and cucumber.", calories: 180, protein: 14, carbs: 8, fat: 10 },
    { type: "Lunch", icon: UtensilsCrossed, name: "Caprese Sandwich", description: "Fresh mozzarella, tomatoes, basil, balsamic, whole grain bread.", calories: 460, protein: 22, carbs: 48, fat: 20 },
    { type: "Afternoon Snack", icon: Apple, name: "Protein Bar", description: "High-protein granola bar with dark chocolate.", calories: 230, protein: 12, carbs: 28, fat: 8 },
    { type: "Dinner", icon: Moon, name: "Shrimp Pasta Primavera", description: "Whole wheat pasta, shrimp, seasonal vegetables, garlic white wine sauce.", calories: 580, protein: 38, carbs: 64, fat: 18 },
  ],
  Sunday: [
    { type: "Breakfast", icon: Sun, name: "Breakfast Burrito", description: "Scrambled eggs, black beans, cheese, salsa in whole wheat tortilla.", calories: 440, protein: 24, carbs: 46, fat: 18 },
    { type: "Morning Snack", icon: Coffee, name: "Pear & Cheese", description: "Fresh pear slices with string cheese.", calories: 200, protein: 8, carbs: 28, fat: 6 },
    { type: "Lunch", icon: UtensilsCrossed, name: "Lentil Soup & Salad", description: "Hearty lentil vegetable soup with mixed green salad.", calories: 480, protein: 24, carbs: 66, fat: 12 },
    { type: "Afternoon Snack", icon: Apple, name: "Edamame", description: "Steamed edamame with sea salt.", calories: 150, protein: 12, carbs: 14, fat: 6 },
    { type: "Dinner", icon: Moon, name: "Herb-Roasted Chicken & Vegetables", description: "Roasted chicken thigh, Brussels sprouts, carrots, sweet potato.", calories: 570, protein: 40, carbs: 48, fat: 22 },
  ],
};

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const mealColors: Record<string, { bg: string; text: string }> = {
  Breakfast: { bg: "bg-[#d4520a]/10", text: "text-[#d4520a]" },
  "Morning Snack": { bg: "bg-amber-500/10", text: "text-amber-600" },
  Lunch: { bg: "bg-[#1a3a2a]/8", text: "text-[#1a3a2a]" },
  "Afternoon Snack": { bg: "bg-emerald-500/10", text: "text-emerald-600" },
  Dinner: { bg: "bg-indigo-500/10", text: "text-indigo-600" },
};

export default function PlanPage() {
  const [selectedDay, setSelectedDay] = useState("Monday");

  const meals = mockMeals[selectedDay as keyof typeof mockMeals];

  const dailyTotals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fat: acc.fat + meal.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <div className="page-enter min-h-screen bg-[#faf8f4] p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-4xl text-[#1a3a2a]">
              Your Meal Plan
            </h1>
            <p className="mt-1 text-[#1a3a2a]/40">
              AI-generated based on your profile and goals
            </p>
          </div>
          <Button
            size="lg"
            className="group rounded-xl bg-[#1a3a2a] text-white shadow-md shadow-[#1a3a2a]/15 transition-all hover:bg-[#1a3a2a]/90 hover:shadow-lg"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate New Plan
            <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        {/* Day Selector */}
        <Card className="rounded-2xl border-0 bg-white p-5 shadow-md ring-1 ring-black/[0.04]">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#1a3a2a]/40">
            <Calendar className="h-4 w-4" />
            Select Day
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex-shrink-0 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                  selectedDay === day
                    ? "bg-[#1a3a2a] text-white shadow-md shadow-[#1a3a2a]/20"
                    : "bg-[#faf8f4] text-[#1a3a2a]/60 hover:bg-[#1a3a2a]/5 ring-1 ring-black/[0.04]"
                }`}
              >
                {day.substring(0, 3)}
              </button>
            ))}
          </div>
        </Card>

        {/* Meal Cards */}
        <div className="space-y-4">
          {meals.map((meal, index) => {
            const Icon = meal.icon;
            const colors = mealColors[meal.type] || mealColors.Lunch;
            return (
              <Card
                key={index}
                className="group rounded-2xl border-0 bg-white p-6 shadow-md ring-1 ring-black/[0.04] transition-all hover:shadow-lg"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Left: Icon + Content */}
                  <div className="flex gap-4">
                    <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${colors.bg} ${colors.text}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1a3a2a]/35">
                          {meal.type}
                        </p>
                        <h3 className="font-display text-lg text-[#1a3a2a]">
                          {meal.name}
                        </h3>
                        <p className="mt-1 text-sm text-[#1a3a2a]/45">
                          {meal.description}
                        </p>
                      </div>
                      {/* Macros - Mobile */}
                      <div className="flex flex-wrap gap-2 sm:hidden">
                        <Badge variant="outline" className="border-[#1a3a2a]/10 bg-[#1a3a2a]/[0.03] text-[#1a3a2a]/70 text-xs rounded-lg">
                          {meal.calories} cal
                        </Badge>
                        <Badge variant="outline" className="border-emerald-500/15 bg-emerald-500/5 text-emerald-600 text-xs rounded-lg">
                          {meal.protein}g protein
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Right: Macros - Desktop */}
                  <div className="hidden shrink-0 flex-col gap-1.5 sm:flex">
                    <Badge variant="outline" className="justify-center border-[#1a3a2a]/10 bg-[#1a3a2a]/[0.03] text-[#1a3a2a]/70 text-xs rounded-lg">
                      {meal.calories} cal
                    </Badge>
                    <Badge variant="outline" className="justify-center border-emerald-500/15 bg-emerald-500/5 text-emerald-600 text-xs rounded-lg">
                      {meal.protein}g protein
                    </Badge>
                    <Badge variant="outline" className="justify-center border-amber-500/15 bg-amber-500/5 text-amber-600 text-xs rounded-lg">
                      {meal.carbs}g carbs
                    </Badge>
                    <Badge variant="outline" className="justify-center border-indigo-500/15 bg-indigo-500/5 text-indigo-600 text-xs rounded-lg">
                      {meal.fat}g fat
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Daily Summary */}
        <Card className="rounded-3xl border-0 bg-gradient-to-br from-[#1a3a2a] to-[#0f2318] p-8 text-white shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
          <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/50 relative">
            Daily Totals for {selectedDay}
          </h3>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 relative">
            <div>
              <p className="font-display text-4xl">{dailyTotals.calories}</p>
              <p className="text-sm text-white/40 mt-1">Calories</p>
            </div>
            <div>
              <p className="font-display text-4xl">{dailyTotals.protein}g</p>
              <p className="text-sm text-white/40 mt-1">Protein</p>
            </div>
            <div>
              <p className="font-display text-4xl">{dailyTotals.carbs}g</p>
              <p className="text-sm text-white/40 mt-1">Carbs</p>
            </div>
            <div>
              <p className="font-display text-4xl">{dailyTotals.fat}g</p>
              <p className="text-sm text-white/40 mt-1">Fat</p>
            </div>
          </div>
        </Card>

        {/* Generate Grocery List CTA */}
        <div className="pt-2">
          <Link href="/grocery" className="block">
            <Button
              size="lg"
              variant="outline"
              className="group w-full rounded-2xl border-2 border-[#1a3a2a] bg-white py-7 text-lg font-semibold text-[#1a3a2a] shadow-md transition-all hover:bg-[#1a3a2a] hover:text-white hover:shadow-lg"
            >
              <ShoppingCart className="mr-3 h-5 w-5" />
              Generate Grocery List
              <ChevronRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
