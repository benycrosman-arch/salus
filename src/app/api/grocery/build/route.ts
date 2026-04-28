import { NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'

interface GroceryItem {
  name: string
  quantity: string
  category: 'produce' | 'protein' | 'pantry' | 'dairy' | 'snacks'
  estimatedPrice: number
  owned: boolean
}

export async function POST() {
  try {
    const guard = await guardRequest()
    if (!guard.ok) return guard.response

    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
    const weekStartDate = monday.toISOString().split('T')[0]

    const items: GroceryItem[] = [
      { name: 'Frutas Vermelhas Mix', quantity: '2 bandejas', category: 'produce', estimatedPrice: 12.90, owned: false },
      { name: 'Bananas', quantity: '6 unidades', category: 'produce', estimatedPrice: 4.50, owned: false },
      { name: 'Maçãs', quantity: '4 unidades', category: 'produce', estimatedPrice: 6.90, owned: false },
      { name: 'Abacates', quantity: '6 unidades', category: 'produce', estimatedPrice: 15.90, owned: false },
      { name: 'Batata Doce', quantity: '4 médias', category: 'produce', estimatedPrice: 8.90, owned: false },
      { name: 'Espinafre', quantity: '2 maços', category: 'produce', estimatedPrice: 7.80, owned: false },
      { name: 'Brócolis', quantity: '2 maços', category: 'produce', estimatedPrice: 9.80, owned: false },
      { name: 'Aspargos', quantity: '1 maço', category: 'produce', estimatedPrice: 12.90, owned: false },
      { name: 'Pimentões Coloridos', quantity: '4 unidades', category: 'produce', estimatedPrice: 11.90, owned: false },
      { name: 'Abobrinha', quantity: '3 médias', category: 'produce', estimatedPrice: 5.90, owned: false },
      { name: 'Tomate Cereja', quantity: '2 bandejas', category: 'produce', estimatedPrice: 9.80, owned: false },
      { name: 'Cenouras', quantity: '500g', category: 'produce', estimatedPrice: 3.90, owned: false },
      { name: 'Alface Americana', quantity: '2 unidades', category: 'produce', estimatedPrice: 7.80, owned: false },
      { name: 'Couve', quantity: '1 maço', category: 'produce', estimatedPrice: 4.50, owned: false },
      { name: 'Filé de Salmão', quantity: '4 x 170g', category: 'protein', estimatedPrice: 69.90, owned: false },
      { name: 'Peito de Frango', quantity: '1.5 kg', category: 'protein', estimatedPrice: 29.90, owned: false },
      { name: 'Carne Moída de Peru', quantity: '500g', category: 'protein', estimatedPrice: 18.90, owned: false },
      { name: 'Camarão', quantity: '400g', category: 'protein', estimatedPrice: 34.90, owned: false },
      { name: 'Filé de Bacalhau', quantity: '2 x 200g', category: 'protein', estimatedPrice: 39.90, owned: false },
      { name: 'Tofu Firme', quantity: '1 bloco', category: 'protein', estimatedPrice: 9.90, owned: false },
      { name: 'Iogurte Grego Natural', quantity: '1kg', category: 'dairy', estimatedPrice: 14.90, owned: false },
      { name: 'Queijo Cottage', quantity: '500g', category: 'dairy', estimatedPrice: 12.90, owned: false },
      { name: 'Ovos Caipira', quantity: '18 unidades', category: 'dairy', estimatedPrice: 19.90, owned: false },
      { name: 'Queijo Feta', quantity: '200g', category: 'dairy', estimatedPrice: 14.90, owned: false },
      { name: 'Quinoa', quantity: '500g', category: 'pantry', estimatedPrice: 12.90, owned: false },
      { name: 'Arroz Integral', quantity: '1kg', category: 'pantry', estimatedPrice: 7.90, owned: false },
      { name: 'Lentilha', quantity: '500g', category: 'pantry', estimatedPrice: 6.90, owned: false },
      { name: 'Grão-de-Bico', quantity: '2 latas', category: 'pantry', estimatedPrice: 11.80, owned: false },
      { name: 'Feijão Preto', quantity: '2 latas', category: 'pantry', estimatedPrice: 9.80, owned: false },
      { name: 'Aveia em Flocos', quantity: '500g', category: 'pantry', estimatedPrice: 8.90, owned: false },
      { name: 'Pasta de Amêndoas', quantity: '350g', category: 'pantry', estimatedPrice: 24.90, owned: false },
      { name: 'Tahini', quantity: '250g', category: 'pantry', estimatedPrice: 18.90, owned: false },
      { name: 'Mix de Castanhas', quantity: '300g', category: 'snacks', estimatedPrice: 19.90, owned: false },
      { name: 'Homus', quantity: '400g', category: 'snacks', estimatedPrice: 14.90, owned: false },
      { name: 'Chocolate 70% Cacau', quantity: '100g', category: 'snacks', estimatedPrice: 12.90, owned: false },
    ]

    const estimatedTotal = Math.round(items.reduce((sum, item) => sum + item.estimatedPrice, 0) * 100) / 100

    return NextResponse.json({
      weekStartDate,
      items,
      categories: ['produce', 'protein', 'pantry', 'dairy', 'snacks'],
      estimatedTotal,
    })
  } catch (error) {
    console.error('Grocery list build error:', error)
    return NextResponse.json(
      { error: 'Failed to build grocery list' },
      { status: 500 }
    )
  }
}
