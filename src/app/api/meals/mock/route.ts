import { NextResponse } from 'next/server'
import type { MealAnalysis } from '@/lib/types'

const mockResponses: MealAnalysis[] = [
  {
    foods: [
      { name: "Grilled Chicken Breast", quantity: "150", unit: "g", estimatedCalories: 248, protein_g: 46, carbs_g: 0, fat_g: 5.4, fiber_g: 0, isProcessed: false },
      { name: "Brown Rice", quantity: "1", unit: "cup", estimatedCalories: 216, protein_g: 5, carbs_g: 45, fat_g: 1.8, fiber_g: 3.5, isProcessed: false },
      { name: "Steamed Broccoli", quantity: "1", unit: "cup", estimatedCalories: 55, protein_g: 3.7, carbs_g: 11, fat_g: 0.6, fiber_g: 5.1, isProcessed: false },
      { name: "Mixed Salad Greens", quantity: "2", unit: "cups", estimatedCalories: 18, protein_g: 1.5, carbs_g: 3.5, fat_g: 0.2, fiber_g: 1.8, isProcessed: false },
      { name: "Cherry Tomatoes", quantity: "6", unit: "pieces", estimatedCalories: 18, protein_g: 0.9, carbs_g: 3.9, fat_g: 0.2, fiber_g: 1.1, isProcessed: false },
    ],
    totalMacros: { calories: 555, protein: 57, carbs: 63, fat: 8, fiber: 12, sugar: 6 },
    fiberDiversityCount: 4,
    glycemicImpact: "low",
    processedFoodRatio: 0,
    mealScore: 82,
    feedback: "Great protein-to-carb ratio with excellent fiber diversity from 4 plant sources. Adding a drizzle of olive oil would boost healthy fat absorption of fat-soluble vitamins.",
    swapSuggestions: [
      "Add avocado slices for heart-healthy monounsaturated fats",
      "Try quinoa instead of brown rice for complete amino acid profile"
    ]
  },
  {
    foods: [
      { name: "White Pasta", quantity: "2", unit: "cups", estimatedCalories: 442, protein_g: 16, carbs_g: 86, fat_g: 2.6, fiber_g: 2.5, isProcessed: true },
      { name: "Marinara Sauce (jar)", quantity: "0.5", unit: "cup", estimatedCalories: 66, protein_g: 2, carbs_g: 10, fat_g: 2, fiber_g: 2, isProcessed: true },
      { name: "Parmesan Cheese", quantity: "2", unit: "tbsp", estimatedCalories: 42, protein_g: 3.8, carbs_g: 0.4, fat_g: 2.8, fiber_g: 0, isProcessed: false },
    ],
    totalMacros: { calories: 550, protein: 22, carbs: 96, fat: 7, fiber: 5, sugar: 8 },
    fiberDiversityCount: 1,
    glycemicImpact: "high",
    processedFoodRatio: 0.67,
    mealScore: 28,
    feedback: "High glycemic load from white pasta with limited plant diversity. The processed marinara adds hidden sugars. This meal will likely cause a significant blood sugar spike.",
    swapSuggestions: [
      "Swap white pasta for lentil pasta to cut glycemic impact by ~40% and triple fiber",
      "Make fresh tomato sauce with garlic, basil, and olive oil instead of jarred",
      "Add roasted vegetables (zucchini, bell peppers) for fiber diversity"
    ]
  },
  {
    foods: [
      { name: "Salmon Fillet", quantity: "170", unit: "g", estimatedCalories: 354, protein_g: 38, carbs_g: 0, fat_g: 22, fiber_g: 0, isProcessed: false },
      { name: "Roasted Sweet Potato", quantity: "1", unit: "medium", estimatedCalories: 103, protein_g: 2.3, carbs_g: 24, fat_g: 0.1, fiber_g: 3.8, isProcessed: false },
      { name: "Sauteed Spinach", quantity: "2", unit: "cups", estimatedCalories: 42, protein_g: 5.4, carbs_g: 6.8, fat_g: 0.8, fiber_g: 4.3, isProcessed: false },
      { name: "Lemon Wedge", quantity: "1", unit: "wedge", estimatedCalories: 3, protein_g: 0.1, carbs_g: 1, fat_g: 0, fiber_g: 0.3, isProcessed: false },
      { name: "Quinoa", quantity: "0.5", unit: "cup", estimatedCalories: 111, protein_g: 4, carbs_g: 20, fat_g: 1.8, fiber_g: 2.6, isProcessed: false },
    ],
    totalMacros: { calories: 613, protein: 50, carbs: 52, fat: 25, fiber: 11, sugar: 5 },
    fiberDiversityCount: 4,
    glycemicImpact: "low",
    processedFoodRatio: 0,
    mealScore: 92,
    feedback: "Exceptional meal — omega-3 rich salmon paired with excellent fiber diversity from 4 plant sources. The sweet potato provides slow-release carbs while spinach delivers iron and folate.",
    swapSuggestions: [
      "Add fermented kimchi on the side for gut microbiome support"
    ]
  }
]

export async function POST() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500))

  // Return a random mock response
  const response = mockResponses[Math.floor(Math.random() * mockResponses.length)]

  return NextResponse.json(response)
}
