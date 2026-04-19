import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // TODO: Replace with actual logic based on meal plan
    // For now, return hardcoded grocery list

    const mockGroceryList = {
      weekStartDate: '2025-01-13',
      items: [
        { name: 'Mixed Berries', quantity: '2 cups', category: 'produce', estimatedPrice: 6.99 },
        { name: 'Bananas', quantity: '6 count', category: 'produce', estimatedPrice: 2.49 },
        { name: 'Apples', quantity: '4 count', category: 'produce', estimatedPrice: 3.99 },
        { name: 'Avocados', quantity: '6 count', category: 'produce', estimatedPrice: 8.99 },
        { name: 'Sweet Potatoes', quantity: '4 medium', category: 'produce', estimatedPrice: 4.99 },
        { name: 'Spinach', quantity: '2 bunches', category: 'produce', estimatedPrice: 5.98 },
        { name: 'Broccoli', quantity: '2 heads', category: 'produce', estimatedPrice: 4.98 },
        { name: 'Asparagus', quantity: '1 bunch', category: 'produce', estimatedPrice: 4.99 },
        { name: 'Bell Peppers', quantity: '4 mixed colors', category: 'produce', estimatedPrice: 6.99 },
        { name: 'Zucchini', quantity: '3 medium', category: 'produce', estimatedPrice: 3.99 },
        { name: 'Cherry Tomatoes', quantity: '2 pints', category: 'produce', estimatedPrice: 5.98 },
        { name: 'Carrots', quantity: '1 lb bag', category: 'produce', estimatedPrice: 2.49 },
        { name: 'Romaine Lettuce', quantity: '2 heads', category: 'produce', estimatedPrice: 4.98 },
        { name: 'Kale', quantity: '1 bunch', category: 'produce', estimatedPrice: 2.99 },
        { name: 'Salmon Fillets', quantity: '4 x 170g', category: 'protein', estimatedPrice: 18.99 },
        { name: 'Chicken Breast', quantity: '1.5 kg', category: 'protein', estimatedPrice: 14.99 },
        { name: 'Ground Turkey', quantity: '500g', category: 'protein', estimatedPrice: 8.99 },
        { name: 'Shrimp', quantity: '400g', category: 'protein', estimatedPrice: 12.99 },
        { name: 'Cod Fillets', quantity: '2 x 200g', category: 'protein', estimatedPrice: 10.99 },
        { name: 'Firm Tofu', quantity: '1 block', category: 'protein', estimatedPrice: 3.49 },
        { name: 'Greek Yogurt', quantity: '1kg tub', category: 'dairy', estimatedPrice: 5.99 },
        { name: 'Cottage Cheese', quantity: '500g', category: 'dairy', estimatedPrice: 4.49 },
        { name: 'Eggs', quantity: '18 count', category: 'dairy', estimatedPrice: 6.99 },
        { name: 'Feta Cheese', quantity: '200g', category: 'dairy', estimatedPrice: 5.49 },
        { name: 'Quinoa', quantity: '500g bag', category: 'pantry', estimatedPrice: 4.99 },
        { name: 'Brown Rice', quantity: '1kg bag', category: 'pantry', estimatedPrice: 3.99 },
        { name: 'Lentils', quantity: '500g bag', category: 'pantry', estimatedPrice: 2.99 },
        { name: 'Chickpeas', quantity: '2 cans', category: 'pantry', estimatedPrice: 3.98 },
        { name: 'Black Beans', quantity: '2 cans', category: 'pantry', estimatedPrice: 3.98 },
        { name: 'Steel-Cut Oats', quantity: '500g', category: 'pantry', estimatedPrice: 4.49 },
        { name: 'Almond Butter', quantity: '350g jar', category: 'pantry', estimatedPrice: 8.99 },
        { name: 'Tahini', quantity: '250g jar', category: 'pantry', estimatedPrice: 6.99 },
        { name: 'Mixed Nuts', quantity: '300g bag', category: 'snacks', estimatedPrice: 7.99 },
        { name: 'Hummus', quantity: '400g tub', category: 'snacks', estimatedPrice: 4.99 },
        { name: 'Dark Chocolate', quantity: '100g bar', category: 'snacks', estimatedPrice: 3.99 },
      ],
      categories: ['produce', 'protein', 'pantry', 'dairy', 'snacks'],
      estimatedTotal: 165.67,
    }

    return NextResponse.json(mockGroceryList)
  } catch (error) {
    console.error('Grocery list build error:', error)
    return NextResponse.json(
      { error: 'Failed to build grocery list' },
      { status: 500 }
    )
  }
}
