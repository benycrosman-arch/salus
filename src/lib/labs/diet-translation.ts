// Maps lab flags (from reference-ranges.ts) to concrete dietary guidance.
// Pure functions — no DB, no network. Consumed by the health-data results UI.

export interface DietItem {
  food: string
  reason: string
}

export interface DietRecommendation {
  flag: string
  priority: 'critical' | 'high' | 'medium'
  title: string
  context: string
  increase: DietItem[]
  reduce: DietItem[]
  tip?: string
}

const FLAG_MAP: Record<string, Omit<DietRecommendation, 'flag'>> = {
  low_glycemic: {
    priority: 'high',
    title: 'Controle do açúcar no sangue',
    context: 'Glicemia ou triglicérides alterados indicam resistência à insulina — o foco é estabilizar a glicose e reduzir picos.',
    increase: [
      { food: 'Leguminosas (feijão, lentilha, grão-de-bico)', reason: 'fibra solúvel retarda absorção de glicose' },
      { food: 'Cereais integrais (aveia, quinoa, arroz integral)', reason: 'menor índice glicêmico que refinados' },
      { food: 'Vegetais fibrosos (brócolis, couve, espinafre)', reason: 'fibra + micronutrientes sem impacto glicêmico' },
      { food: 'Proteínas magras (frango, peixe, ovos)', reason: 'saciedade sem elevar glicemia' },
      { food: 'Canela (1 colher de chá/dia)', reason: 'melhora sensibilidade à insulina em estudos clínicos' },
    ],
    reduce: [
      { food: 'Açúcar, mel e xarope de milho', reason: 'elevação rápida da glicemia' },
      { food: 'Sucos de fruta e bebidas açucaradas', reason: 'frutose em excesso piora triglicérides e resistência insulínica' },
      { food: 'Pão branco, arroz branco, macarrão refinado', reason: 'alto índice glicêmico' },
      { food: 'Álcool (especialmente cerveja)', reason: 'interfere no controle glicêmico e eleva triglicérides' },
    ],
    tip: 'Monte o prato com proteína + fibra + gordura boa antes do carboidrato — isso reduz o pico de glicemia em até 30%.',
  },

  cardio_focus: {
    priority: 'high',
    title: 'Saúde cardiovascular (colesterol e lipídeos)',
    context: 'Perfil lipídico alterado — alimentação adequada pode reduzir LDL em até 20-30% e elevar HDL sem medicamento.',
    increase: [
      { food: 'Peixes gordos (salmão, sardinha, atum — 2×/semana)', reason: 'ômega-3 reduz triglicérides e inflamação' },
      { food: 'Aveia e farelo de aveia', reason: 'beta-glucana reduz LDL comprovadamente (AHA)' },
      { food: 'Nozes e amêndoas (30 g/dia)', reason: 'gorduras mono e poli-insaturadas elevam HDL' },
      { food: 'Azeite extra-virgem (2–3 colheres/dia)', reason: 'ácido oleico com efeito cardioprotetor' },
      { food: 'Leguminosas (feijão, ervilha, lentilha)', reason: 'reduz absorção intestinal de colesterol' },
      { food: 'Linhaça e chia', reason: 'ômega-3 vegetal + fibra solúvel' },
    ],
    reduce: [
      { food: 'Carnes gordas e embutidos (bacon, salame, linguiça)', reason: 'gordura saturada eleva LDL diretamente' },
      { food: 'Manteiga e creme de leite em excesso', reason: 'saturada e gordura trans natural' },
      { food: 'Frituras e ultraprocessados (biscoitos, salgadinhos)', reason: 'gordura trans piora LDL e baixa HDL' },
      { food: 'Álcool em excesso', reason: 'eleva triglicérides e prejudica perfil lipídico' },
    ],
    tip: 'O padrão mediterrâneo (azeite, peixes, vegetais, leguminosas, nozes) é o com maior evidência para lipídeos.',
  },

  iron_focus: {
    priority: 'high',
    title: 'Ferro e produção de sangue',
    context: 'Estoque de ferro baixo — a dieta combinada com estratégias de absorção consegue recuperar ferritina em 4–8 semanas.',
    increase: [
      { food: 'Carnes vermelhas magras (2–3×/semana)', reason: 'ferro heme com melhor absorção (15–35%)' },
      { food: 'Fígado bovino (1×/semana)', reason: 'fonte mais densa de ferro heme + B12' },
      { food: 'Feijão, lentilha e grão-de-bico', reason: 'ferro não-heme + folato' },
      { food: 'Espinafre e couve refogados', reason: 'ferro não-heme + vitamina C natural' },
      { food: 'Frutas cítricas ou pimentão na mesma refeição', reason: 'vitamina C aumenta absorção do ferro não-heme em até 3×' },
    ],
    reduce: [
      { food: 'Chá, café e vinho junto às refeições', reason: 'taninos inibem absorção de ferro em até 60%' },
      { food: 'Cálcio (laticínio) junto ao alimento com ferro', reason: 'competição direta na absorção intestinal' },
    ],
    tip: 'Tome um copo de suco de laranja ou limonada natural junto à refeição rica em ferro — simples e muito eficaz.',
  },

  vit_d_priority: {
    priority: 'medium',
    title: 'Vitamina D',
    context: 'Deficiência de vitamina D é muito comum no Brasil mesmo em regiões ensolaradas — dieta ajuda, mas exposição solar é essencial.',
    increase: [
      { food: 'Salmão e atum (2–3×/semana)', reason: 'maior concentração de vitamina D3 em alimentos' },
      { food: 'Sardinha e anchova', reason: 'boa fonte de D3 + ômega-3' },
      { food: 'Gema de ovo', reason: 'vitamina D + vitaminas A e B12' },
      { food: 'Cogumelos expostos ao sol (shiitake, shimeji)', reason: 'única fonte vegetal relevante de D2' },
      { food: 'Leite e iogurte enriquecidos com vitamina D', reason: 'D3 adicionada + cálcio (parceiro da vitamina D)' },
    ],
    reduce: [],
    tip: '15–20 min de sol nos braços e pernas entre 10h–15h, sem protetor, 3×/semana gera mais D3 do que qualquer alimento.',
  },

  b12_priority: {
    priority: 'medium',
    title: 'Vitamina B12',
    context: 'B12 existe quase exclusivamente em alimentos animais — vegetarianos e veganos têm risco elevado de deficiência.',
    increase: [
      { food: 'Fígado bovino (1×/semana)', reason: 'fonte mais densa de B12 existente' },
      { food: 'Carnes, frango e peixe', reason: 'B12 altamente biodisponível' },
      { food: 'Ovos e laticínios', reason: 'B12 + proteína completa' },
      { food: 'Leite de soja ou aveia enriquecido', reason: 'opção plant-based com B12 adicionada' },
      { food: 'Fermento nutricional enriquecido', reason: 'B12 para veganos — verificar rótulo (nem todo tem)' },
    ],
    reduce: [],
    tip: 'Se você é vegetariano ou usa metformina (diabetes), suplementação de B12 costuma ser necessária — converse com seu médico.',
  },

  liver_caution: {
    priority: 'high',
    title: 'Proteção do fígado',
    context: 'Enzimas hepáticas elevadas indicam estresse no fígado — alimentação anti-inflamatória e redução de tóxicos são a base.',
    increase: [
      { food: 'Crucíferas (brócolis, couve-flor, repolho)', reason: 'sulforafano apoia detoxificação hepática' },
      { food: 'Café (2–3 xícaras/dia, sem açúcar)', reason: 'reduz fibrose e esteatose em estudos clínicos robustos' },
      { food: 'Azeite extra-virgem', reason: 'anti-inflamatório, protege hepatócitos' },
      { food: 'Nozes e castanhas', reason: 'vitamina E + ômega-3 protetores' },
      { food: 'Água (2–3 L/dia)', reason: 'dilui toxinas e apoia excreção biliar' },
    ],
    reduce: [
      { food: 'Álcool (incluindo doses pequenas)', reason: 'principal agressor hepático — zero durante recuperação' },
      { food: 'Açúcar e frutose em excesso', reason: 'causa diretamente esteatose hepática (DHGNA)' },
      { food: 'Frituras e ultraprocessados', reason: 'gordura trans + aditivos sobrecarregam o fígado' },
      { food: 'Suplementos e medicamentos desnecessários', reason: 'muitos são hepatotóxicos — valide com médico' },
    ],
    tip: 'Esteatose hepática responde muito bem à perda de 5–10% do peso corporal com dieta e redução de açúcar.',
  },

  renal_caution: {
    priority: 'critical',
    title: 'Atenção: função renal alterada',
    context: 'Marcadores renais fora do esperado — ajuste dietético em doença renal deve ser supervisionado por nutricionista especializada em nefrologia.',
    increase: [
      { food: 'Água (meta individualizada — consulte médico)', reason: 'hidratação adequada suporta filtração renal' },
      { food: 'Clara de ovo', reason: 'proteína de alto valor com menos escórias nitrogenadas que a carne' },
      { food: 'Arroz branco, macarrão simples', reason: 'menor fósforo que integrais — indicado em casos renais' },
    ],
    reduce: [
      { food: 'Proteína em excesso (>1,0–1,2 g/kg)', reason: 'aumenta ureia e sobrecarrega rins' },
      { food: 'Alimentos ricos em potássio se orientado (banana, laranja, batata)', reason: 'hipercalemia é perigosa em doença renal' },
      { food: 'Laticínios em excesso, refrigerante cola, embutidos', reason: 'fósforo que o rim doente não excreta adequadamente' },
      { food: 'Sal em excesso', reason: 'eleva pressão e acelera perda de função renal' },
    ],
    tip: 'Não corte alimentos sem orientação individual — os limites dependem do estágio da doença renal.',
  },

  low_purine: {
    priority: 'high',
    title: 'Ácido úrico elevado (risco de gota)',
    context: 'Hiperuricemia aumenta risco de crise de gota e cálculos renais — dieta hipopurínica é eficaz e bem estabelecida.',
    increase: [
      { food: 'Água (2,5–3 L/dia)', reason: 'facilita excreção renal do ácido úrico' },
      { food: 'Cerejas, morangos e frutas vermelhas', reason: 'antocianinas reduzem ácido úrico em estudos clínicos' },
      { food: 'Vegetais, leguminosas e cereais', reason: 'baixo teor de purinas' },
      { food: 'Laticínios desnatados', reason: 'proteína láctea tem efeito uricosúrico protetor' },
    ],
    reduce: [
      { food: 'Vísceras (fígado, rim, miolo, coração)', reason: 'altíssimo teor de purinas' },
      { food: 'Frutos do mar (camarão, mexilhão, sardinha em lata)', reason: 'alto teor de purinas' },
      { food: 'Carne vermelha em excesso (> 150 g/dia)', reason: 'purinas + gordura saturada' },
      { food: 'Cerveja e bebidas alcoólicas', reason: 'inibe excreção renal de ácido úrico — principal gatilho de crises' },
      { food: 'Refrigerantes e sucos com frutose', reason: 'frutose acelera produção endógena de ácido úrico' },
    ],
    tip: 'Beber água regularmente ao longo do dia (não de uma vez) é a medida mais simples e eficaz para reduzir ácido úrico.',
  },

  anti_inflammatory: {
    priority: 'high',
    title: 'Redução da inflamação sistêmica',
    context: 'PCR elevada indica inflamação crônica — o padrão alimentar é um dos determinantes mais fortes e modificáveis.',
    increase: [
      { food: 'Peixes gordos (salmão, sardinha) — 2×/semana', reason: 'ômega-3 EPA/DHA com ação anti-inflamatória potente' },
      { food: 'Frutas vermelhas (mirtilo, morango, amora)', reason: 'antocianinas com forte ação antioxidante' },
      { food: 'Cúrcuma com pimenta-preta', reason: 'curcumina + piperina anti-inflamatória comprovada' },
      { food: 'Azeite extra-virgem', reason: 'oleocantal tem ação análoga ao ibuprofeno em baixas doses' },
      { food: 'Verduras escuras (espinafre, couve, rúcula)', reason: 'vitamina K, folato e antioxidantes' },
      { food: 'Nozes (30 g/dia)', reason: 'ômega-3 + vitamina E + polifenóis' },
    ],
    reduce: [
      { food: 'Ultraprocessados (chips, fast food, bolachas)', reason: 'gordura trans + aditivos pró-inflamatórios' },
      { food: 'Óleos vegetais refinados em excesso (soja, milho, girassol)', reason: 'excesso de ômega-6 piora razão ômega-6/ômega-3' },
      { food: 'Açúcar e bebidas açucaradas', reason: 'glicação proteica e ativação de vias pró-inflamatórias' },
      { food: 'Álcool', reason: 'pró-inflamatório sistêmico, especialmente em excesso' },
    ],
    tip: 'A dieta mediterrânea tem a maior evidência clínica para redução de PCR e risco cardiovascular.',
  },

  magnesium_priority: {
    priority: 'medium',
    title: 'Magnésio baixo',
    context: 'Deficiência de magnésio afeta energia, sono, controle muscular e glicemia — a dieta consegue recuperar sem suplemento na maioria dos casos.',
    increase: [
      { food: 'Sementes de abóbora e girassol (30 g/dia)', reason: 'maior concentração de magnésio em alimentos' },
      { food: 'Amêndoas, castanha-de-caju e nozes', reason: 'magnésio + gorduras boas' },
      { food: 'Chocolate amargo 70%+ cacau (30 g/dia)', reason: 'boa fonte de magnésio + antioxidantes' },
      { food: 'Feijão preto, edamame e lentilha', reason: 'magnésio + proteína vegetal' },
      { food: 'Banana e abacate', reason: 'magnésio + potássio' },
      { food: 'Arroz integral e quinoa', reason: 'magnésio + fibras' },
    ],
    reduce: [
      { food: 'Álcool em excesso', reason: 'aumenta excreção renal de magnésio' },
      { food: 'Refrigerantes cola em excesso', reason: 'fósforo compete com magnésio na absorção' },
    ],
    tip: 'Magnésio oral (citrato ou bisglicinato — 200–400 mg à noite) é bem tolerado se a dieta não for suficiente.',
  },
}

export function getDietTranslations(flags: string[]): DietRecommendation[] {
  const seen = new Set<string>()
  const results: DietRecommendation[] = []
  for (const flag of flags) {
    if (seen.has(flag)) continue
    seen.add(flag)
    const rec = FLAG_MAP[flag]
    if (rec) results.push({ flag, ...rec })
  }
  const order: Record<DietRecommendation['priority'], number> = { critical: 0, high: 1, medium: 2 }
  return results.sort((a, b) => order[a.priority] - order[b.priority])
}
