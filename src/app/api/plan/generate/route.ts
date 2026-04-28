import { NextResponse } from 'next/server'
import { guardRequest } from '@/lib/api-guard'

interface MealDetail {
  name: string
  description: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

interface DayPlan {
  day: string
  meals: {
    breakfast: MealDetail
    snack1: MealDetail
    lunch: MealDetail
    snack2: MealDetail
    dinner: MealDetail
  }
}

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

    const days: DayPlan[] = [
      {
        day: 'Segunda',
        meals: {
          breakfast: { name: 'Parfait de Iogurte Grego', description: 'Iogurte grego com frutas vermelhas, chia e mel', calories: 320, protein_g: 18, carbs_g: 42, fat_g: 8 },
          snack1: { name: 'Maçã com Pasta de Amêndoas', description: 'Fatias de maçã com pasta de amêndoas natural', calories: 180, protein_g: 4, carbs_g: 22, fat_g: 9 },
          lunch: { name: 'Bowl de Frango com Quinoa', description: 'Frango grelhado sobre quinoa com legumes assados e molho tahini', calories: 480, protein_g: 38, carbs_g: 45, fat_g: 14 },
          snack2: { name: 'Homus com Palitos de Cenoura', description: 'Homus caseiro com palitos de cenoura e pepino', calories: 150, protein_g: 5, carbs_g: 18, fat_g: 7 },
          dinner: { name: 'Salmão com Batata Doce', description: 'Salmão ao forno com batata doce assada e brócolis', calories: 520, protein_g: 42, carbs_g: 38, fat_g: 18 },
        },
      },
      {
        day: 'Terça',
        meals: {
          breakfast: { name: 'Overnight Oats com Banana', description: 'Aveia com banana, canela e nozes', calories: 340, protein_g: 12, carbs_g: 52, fat_g: 10 },
          snack1: { name: 'Mix de Castanhas', description: 'Amêndoas, castanhas e cranberries desidratadas', calories: 200, protein_g: 6, carbs_g: 18, fat_g: 13 },
          lunch: { name: 'Salada Mediterrânea', description: 'Grão-de-bico, pepino, tomate, cebola roxa, feta e azeite', calories: 420, protein_g: 16, carbs_g: 48, fat_g: 18 },
          snack2: { name: 'Salsão com Pasta de Amendoim', description: 'Talos de salsão com pasta de amendoim natural', calories: 160, protein_g: 7, carbs_g: 10, fat_g: 12 },
          dinner: { name: 'Almôndegas de Peru com Abobrinha', description: 'Almôndegas de peru com espaguete de abobrinha e molho marinara', calories: 460, protein_g: 36, carbs_g: 32, fat_g: 18 },
        },
      },
      {
        day: 'Quarta',
        meals: {
          breakfast: { name: 'Scramble de Ovos com Abacate', description: 'Ovos mexidos com espinafre, tomate e cogumelos, cobertos com abacate', calories: 360, protein_g: 22, carbs_g: 18, fat_g: 22 },
          snack1: { name: 'Cottage com Frutas Vermelhas', description: 'Queijo cottage com mirtilos e morangos', calories: 170, protein_g: 15, carbs_g: 20, fat_g: 3 },
          lunch: { name: 'Sopa de Lentilha', description: 'Sopa de lentilha com legumes e pão integral', calories: 440, protein_g: 22, carbs_g: 68, fat_g: 8 },
          snack2: { name: 'Iogurte com Granola', description: 'Iogurte grego com granola caseira', calories: 210, protein_g: 12, carbs_g: 28, fat_g: 6 },
          dinner: { name: 'Tacos de Camarão', description: 'Camarão grelhado em tortilha de milho com salada de repolho', calories: 480, protein_g: 32, carbs_g: 52, fat_g: 14 },
        },
      },
      {
        day: 'Quinta',
        meals: {
          breakfast: { name: 'Smoothie Bowl', description: 'Bowl de smoothie de frutas com granola, coco ralado e frutas frescas', calories: 380, protein_g: 14, carbs_g: 58, fat_g: 12 },
          snack1: { name: 'Ovos Cozidos com Tomate', description: 'Dois ovos cozidos com tomatinhos cereja', calories: 180, protein_g: 14, carbs_g: 6, fat_g: 11 },
          lunch: { name: 'Stir-Fry de Tofu', description: 'Tofu crocante com legumes variados em molho gengibre-alho sobre arroz integral', calories: 460, protein_g: 20, carbs_g: 58, fat_g: 16 },
          snack2: { name: 'Edamame com Sal Marinho', description: 'Edamame no vapor levemente salgado', calories: 150, protein_g: 12, carbs_g: 12, fat_g: 6 },
          dinner: { name: 'Fajita de Frango', description: 'Frango grelhado com pimentões sobre arroz com coentro e limão', calories: 500, protein_g: 40, carbs_g: 48, fat_g: 14 },
        },
      },
      {
        day: 'Sexta',
        meals: {
          breakfast: { name: 'Torrada com Abacate', description: 'Pão multigrãos com abacate amassado, sementes de hemp e tomatinhos', calories: 340, protein_g: 12, carbs_g: 38, fat_g: 16 },
          snack1: { name: 'Smoothie Proteico', description: 'Banana, espinafre, whey e leite de amêndoas', calories: 220, protein_g: 20, carbs_g: 28, fat_g: 4 },
          lunch: { name: 'Wrap de Atum', description: 'Salada de atum com iogurte grego em folhas de alface', calories: 380, protein_g: 34, carbs_g: 18, fat_g: 18 },
          snack2: { name: 'Pimentão com Guacamole', description: 'Tiras de pimentão com guacamole caseiro', calories: 140, protein_g: 3, carbs_g: 14, fat_g: 10 },
          dinner: { name: 'Bacalhau com Aspargos', description: 'Bacalhau ao forno com aspargos grelhados e arroz selvagem', calories: 460, protein_g: 38, carbs_g: 42, fat_g: 12 },
        },
      },
      {
        day: 'Sábado',
        meals: {
          breakfast: { name: 'Panquecas Proteicas', description: 'Panquecas de aveia com frutas vermelhas e mel', calories: 400, protein_g: 24, carbs_g: 54, fat_g: 10 },
          snack1: { name: 'Biscoito de Arroz com Amêndoas', description: 'Biscoito de arroz integral com pasta de amêndoas e banana', calories: 190, protein_g: 5, carbs_g: 26, fat_g: 8 },
          lunch: { name: 'Burrito Bowl de Feijão Preto', description: 'Feijão preto, arroz integral, salsa, queijo e guacamole', calories: 520, protein_g: 22, carbs_g: 72, fat_g: 16 },
          snack2: { name: 'Melancia com Feta', description: 'Cubos de melancia com queijo feta esfarelado e hortelã', calories: 130, protein_g: 4, carbs_g: 18, fat_g: 5 },
          dinner: { name: 'Carne com Legumes Assados', description: 'Medalhões de carne com raízes assadas e quinoa', calories: 540, protein_g: 42, carbs_g: 44, fat_g: 20 },
        },
      },
      {
        day: 'Domingo',
        meals: {
          breakfast: { name: 'Omelete de Legumes', description: 'Omelete de 3 ovos com vegetais e torrada integral', calories: 380, protein_g: 26, carbs_g: 28, fat_g: 18 },
          snack1: { name: 'Chips de Couve', description: 'Couve assada temperada com levedura nutricional', calories: 100, protein_g: 4, carbs_g: 12, fat_g: 4 },
          lunch: { name: 'Salada Caesar de Frango', description: 'Frango grelhado sobre alface romana com molho Caesar caseiro', calories: 440, protein_g: 38, carbs_g: 24, fat_g: 22 },
          snack2: { name: 'Chocolate 70% com Amêndoas', description: 'Quadradinhos de chocolate amargo com amêndoas', calories: 180, protein_g: 5, carbs_g: 16, fat_g: 13 },
          dinner: { name: 'Curry de Grão-de-Bico', description: 'Curry de legumes e grão-de-bico sobre arroz basmati', calories: 500, protein_g: 18, carbs_g: 78, fat_g: 14 },
        },
      },
    ]

    const groceryList: GroceryItem[] = [
      { name: 'Filé de Salmão', quantity: '4 x 170g', category: 'protein', estimatedPrice: 69.90, owned: false },
      { name: 'Peito de Frango', quantity: '1.5 kg', category: 'protein', estimatedPrice: 29.90, owned: false },
      { name: 'Carne Moída de Peru', quantity: '500g', category: 'protein', estimatedPrice: 18.90, owned: false },
      { name: 'Camarão', quantity: '400g', category: 'protein', estimatedPrice: 34.90, owned: false },
      { name: 'Filé de Bacalhau', quantity: '2 x 200g', category: 'protein', estimatedPrice: 39.90, owned: false },
      { name: 'Medalhões de Carne', quantity: '4 x 150g', category: 'protein', estimatedPrice: 45.90, owned: false },
      { name: 'Tofu Firme', quantity: '1 bloco (400g)', category: 'protein', estimatedPrice: 9.90, owned: false },
      { name: 'Iogurte Grego', quantity: '1kg', category: 'dairy', estimatedPrice: 14.90, owned: false },
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
      { name: 'Frutas Vermelhas', quantity: '2 bandejas', category: 'produce', estimatedPrice: 12.90, owned: false },
      { name: 'Bananas', quantity: '6 unidades', category: 'produce', estimatedPrice: 4.50, owned: false },
      { name: 'Maçãs', quantity: '4 unidades', category: 'produce', estimatedPrice: 6.90, owned: false },
      { name: 'Abacates', quantity: '6 unidades', category: 'produce', estimatedPrice: 15.90, owned: false },
      { name: 'Batata Doce', quantity: '4 médias', category: 'produce', estimatedPrice: 8.90, owned: false },
      { name: 'Espinafre', quantity: '2 maços', category: 'produce', estimatedPrice: 7.80, owned: false },
      { name: 'Brócolis', quantity: '2 maços', category: 'produce', estimatedPrice: 9.80, owned: false },
      { name: 'Aspargos', quantity: '1 maço', category: 'produce', estimatedPrice: 12.90, owned: false },
      { name: 'Pimentões', quantity: '4 cores variadas', category: 'produce', estimatedPrice: 11.90, owned: false },
      { name: 'Abobrinha', quantity: '3 médias', category: 'produce', estimatedPrice: 5.90, owned: false },
      { name: 'Tomate Cereja', quantity: '2 bandejas', category: 'produce', estimatedPrice: 9.80, owned: false },
      { name: 'Alface Americana', quantity: '2 unidades', category: 'produce', estimatedPrice: 7.80, owned: false },
    ]

    const estimatedTotal = Math.round(groceryList.reduce((sum, item) => sum + item.estimatedPrice, 0) * 100) / 100

    return NextResponse.json({
      weekStartDate,
      days,
      groceryList,
      estimatedTotal,
    })
  } catch (error) {
    console.error('Meal plan generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate meal plan' },
      { status: 500 }
    )
  }
}
