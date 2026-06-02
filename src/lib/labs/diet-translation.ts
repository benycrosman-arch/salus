// Translates an interpreted lab marker into concrete dietary actions the
// paciente can apply *today*. This is intentionally deterministic (no AI):
// the lab-ranges library already classified the marker, and the goal AI
// already biased the macro/micro targets via flags. This layer fills the
// gap in between — what to eat / cut / emphasize because of THIS specific
// marker reading.
//
// Each entry maps (canonical marker × severity bucket) → action plan.
// Severity buckets collapse the 6 LabStatus values into 3 that map cleanly
// to action intensity:
//   - 'attention' (borderline_low | borderline_high)
//   - 'altered'   (low | high)
//   - 'critical'  (critical_low | critical_high)
// Optimal markers don't translate to actions — they just confirm what's working.
//
// All copy is PT-BR and aimed at the paciente. The goal-engine flag the same
// marker raised (e.g. `cardio_focus`) is what the AI uses to retune kcal/macros;
// this file is what the *paciente sees* about each marker individually.

import type { InterpretedMarker } from './interpret'
import type { LabStatus } from './reference-ranges'

export type ActionSeverity = 'attention' | 'altered' | 'critical'

export interface DietAction {
  // Single concrete behavior change. Short — fits in a card row.
  text: string
}

export interface FoodGuidance {
  emphasize: string[]
  reduce: string[]
}

export interface MarkerTranslation {
  severity: ActionSeverity
  // One-sentence framing of WHY diet matters for this marker.
  why: string
  // What changes in the daily plan because of this marker.
  macroImpact: string | null
  // Concrete actions ranked by impact (max 4 — keep it actionable, not a textbook).
  actions: DietAction[]
  // Foods to lean into and pull back on. May be empty if the marker is purely macro-driven.
  foods: FoodGuidance
  // Goal-engine flag this marker pushes. Mirrors the flag attached in reference-ranges.
  goalFlag: string | null
}

export interface TranslatedMarker {
  marker: InterpretedMarker
  translation: MarkerTranslation | null  // null = no actionable change (optimal or unknown marker)
}

function bucket(status: LabStatus | null): ActionSeverity | null {
  if (!status) return null
  if (status === 'critical_low' || status === 'critical_high') return 'critical'
  if (status === 'low' || status === 'high') return 'altered'
  if (status === 'borderline_low' || status === 'borderline_high') return 'attention'
  return null
}

// Lookup table: canonical marker → (severity → translation).
// Reduce/emphasize lists are short and PT-BR food names the paciente will recognize.
const TABLE: Record<string, Partial<Record<ActionSeverity, MarkerTranslation>>> = {
  // ── METABOLISM ──────────────────────────────────────────────────────
  glucose: {
    attention: {
      severity: 'attention',
      why: 'Glicemia em jejum acima de 100 mg/dL sinaliza resistência à insulina começando — alimentação faz diferença real.',
      macroImpact: 'Carboidratos passam a ≤ 35 % das calorias, fibras alvo ≥ 30 g/dia.',
      actions: [
        { text: 'Troque pães e arroz brancos por versões integrais ou aveia em flocos.' },
        { text: 'Inclua proteína + fibra em todo café da manhã (não só pão e café).' },
        { text: 'Caminhe 10–15 min depois das maiores refeições.' },
        { text: 'Evite suco de fruta — prefira a fruta inteira.' },
      ],
      foods: {
        emphasize: ['aveia', 'feijão', 'lentilha', 'vegetais folhosos', 'oleaginosas', 'frutas vermelhas'],
        reduce: ['açúcar', 'pão branco', 'refrigerante', 'suco', 'doces', 'farinha refinada'],
      },
      goalFlag: 'low_glycemic',
    },
    altered: {
      severity: 'altered',
      why: 'Glicemia compatível com diabetes — alimentação estruturada baixa a glicose já em 2–4 semanas.',
      macroImpact: 'Carboidratos ≤ 30 % das calorias, fibras ≥ 35 g/dia, proteína 1,4–1,6 g/kg.',
      actions: [
        { text: 'Padronize o prato: ½ vegetais, ¼ proteína magra, ¼ carbo integral.' },
        { text: 'Corte bebidas açucaradas e sucos — só água, café e chá.' },
        { text: 'Inclua vinagre ou limão antes das refeições maiores (reduz pico).' },
        { text: 'Procure um médico para avaliação clínica em paralelo à dieta.' },
      ],
      foods: {
        emphasize: ['ovo', 'frango', 'peixe', 'tofu', 'feijão', 'brócolis', 'abacate', 'azeite'],
        reduce: ['açúcar', 'pão branco', 'arroz branco', 'doce', 'refrigerante', 'álcool'],
      },
      goalFlag: 'low_glycemic',
    },
    critical: {
      severity: 'critical',
      why: 'Glicemia muito elevada — risco de complicação aguda. Procure um médico antes de mexer só na dieta.',
      macroImpact: 'Carboidratos ≤ 30 %, fibras ≥ 35 g, proteína 1,4–1,6 g/kg (a confirmar com médico).',
      actions: [
        { text: 'Marque consulta médica nas próximas 48h.' },
        { text: 'Suspenda imediatamente bebidas e doces açucarados.' },
        { text: 'Mantenha hidratação alta (2,5–3 L de água/dia).' },
        { text: 'Use o app para registrar tudo que come — vai ajudar o médico/nutri.' },
      ],
      foods: {
        emphasize: ['vegetais não-amiláceos', 'proteína magra', 'oleaginosas', 'azeite'],
        reduce: ['todo açúcar adicionado', 'álcool', 'farinha refinada', 'fruta seca'],
      },
      goalFlag: 'low_glycemic',
    },
  },
  hba1c: {
    attention: {
      severity: 'attention',
      why: 'Pré-diabetes — janela em que dieta + atividade física revertem o quadro em 60–70 % dos casos (DPP study).',
      macroImpact: 'Carboidratos ≤ 35 % das calorias, fibras ≥ 30 g/dia, peso alvo −5 a −7 %.',
      actions: [
        { text: 'Mire em perder 5–7 % do peso atual nos próximos 6 meses.' },
        { text: 'Caminhe 150 min/semana (pode ser 30 min × 5 dias).' },
        { text: 'Substitua carboidratos refinados por integrais em pelo menos 2 refeições/dia.' },
        { text: 'Reduza álcool a no máximo 1 dose nos dias em que beber.' },
      ],
      foods: {
        emphasize: ['aveia', 'feijão', 'quinoa', 'sementes de chia/linhaça', 'vegetais coloridos'],
        reduce: ['açúcar adicionado', 'biscoito', 'pão branco', 'cerveja', 'refrigerante'],
      },
      goalFlag: 'low_glycemic',
    },
    altered: {
      severity: 'altered',
      why: 'HbA1c compatível com diabetes — controle alimentar tem impacto direto em complicações de longo prazo.',
      macroImpact: 'Carboidratos ≤ 30 %, fibras ≥ 35 g, distribuir carbo em 3–4 refeições para evitar picos.',
      actions: [
        { text: 'Consulta com endocrinologista nas próximas 2 semanas, se ainda não tem.' },
        { text: 'Aprenda a contar carboidratos — comece pelas refeições maiores.' },
        { text: 'Inclua proteína em todo lanche (impede que vire só açúcar circulante).' },
        { text: 'Sono 7–8 h: privação de sono piora resistência à insulina.' },
      ],
      foods: {
        emphasize: ['ovo', 'iogurte natural', 'frango', 'feijão', 'folhas verdes', 'azeite'],
        reduce: ['arroz branco', 'macarrão', 'pão', 'doce', 'fruta seca'],
      },
      goalFlag: 'low_glycemic',
    },
    critical: {
      severity: 'critical',
      why: 'Controle glicêmico ruim por meses — risco cardiovascular e renal alto.',
      macroImpact: 'Mesmas regras de altered + acompanhamento médico próximo.',
      actions: [
        { text: 'Procure endocrinologista nas próximas 48h.' },
        { text: 'Suspenda açúcar adicionado e álcool integralmente.' },
        { text: 'Registre todas as refeições no app — seu nutri/médico vão usar o histórico.' },
      ],
      foods: {
        emphasize: ['proteína magra', 'vegetais', 'oleaginosas', 'azeite'],
        reduce: ['todo açúcar', 'farinhas refinadas', 'álcool'],
      },
      goalFlag: 'low_glycemic',
    },
  },

  // ── LIPIDS ──────────────────────────────────────────────────────────
  ldl: {
    attention: {
      severity: 'attention',
      why: 'LDL acima de 100 mg/dL aumenta gradualmente o risco cardiovascular — gordura saturada é a alavanca mais sensível.',
      macroImpact: 'Gordura saturada ≤ 7 % das calorias, fibras solúveis ≥ 10 g/dia.',
      actions: [
        { text: 'Troque manteiga por azeite extra-virgem como gordura principal.' },
        { text: 'Adicione aveia (½ xícara) em pelo menos 4 cafés da semana.' },
        { text: 'Inclua peixe gordo 2× por semana (sardinha, salmão).' },
        { text: 'Limite carne vermelha a 1–2 porções/semana.' },
      ],
      foods: {
        emphasize: ['aveia', 'feijão', 'maçã', 'pera', 'berinjela', 'sardinha', 'castanhas', 'azeite'],
        reduce: ['manteiga', 'bacon', 'embutidos', 'pele de frango', 'fritura'],
      },
      goalFlag: 'cardio_focus',
    },
    altered: {
      severity: 'altered',
      why: 'LDL elevado — alterações alimentares reduzem 10–15 % em 8–12 semanas; combine com atividade física.',
      macroImpact: 'Gordura saturada ≤ 6 %, fibras solúveis ≥ 10–15 g, proteína vegetal pelo menos 2× por dia.',
      actions: [
        { text: 'Remova frituras, embutidos e queijos amarelos das refeições da semana.' },
        { text: 'Use psyllium ou farinha de linhaça (1 col. de sopa/dia) — fibra solúvel comprovada.' },
        { text: 'Inclua sterois vegetais via margarinas funcionais ou suplemento, se nutri orientar.' },
        { text: 'Atividade aeróbica 30 min × 5 dias por semana.' },
      ],
      foods: {
        emphasize: ['aveia', 'psyllium', 'linhaça', 'lentilha', 'tofu', 'salmão', 'azeite', 'abacate'],
        reduce: ['queijo amarelo', 'manteiga', 'creme de leite', 'salame', 'bacon', 'pele de frango'],
      },
      goalFlag: 'cardio_focus',
    },
    critical: {
      severity: 'critical',
      why: 'LDL muito elevado — risco cardiovascular relevante. Dieta ajuda, mas medicação costuma ser indicada.',
      macroImpact: 'Mesmas regras + avaliação cardiológica para definir estatina ou alternativa.',
      actions: [
        { text: 'Consulta cardiológica nas próximas 2 semanas.' },
        { text: 'Adote padrão DASH ou mediterrâneo de imediato.' },
        { text: 'Suspenda frituras, embutidos e doces de confeitaria.' },
      ],
      foods: {
        emphasize: ['peixes gordos', 'vegetais', 'leguminosas', 'azeite', 'oleaginosas'],
        reduce: ['carne vermelha', 'queijo amarelo', 'embutidos', 'açúcar', 'fritura'],
      },
      goalFlag: 'cardio_focus',
    },
  },
  hdl: {
    altered: {
      severity: 'altered',
      why: 'HDL baixo aumenta risco cardiovascular — exercício e gorduras boas elevam.',
      macroImpact: 'Gorduras mono e poli-insaturadas alvo 20–25 % das calorias, manter triglicérides baixos.',
      actions: [
        { text: 'Atividade aeróbica 150 min/semana sobe HDL em 5–10 %.' },
        { text: 'Use azeite extra-virgem como gordura principal.' },
        { text: 'Inclua peixe gordo 2× por semana.' },
        { text: 'Se fuma, parar é o que mais sobe HDL — sem comparação.' },
      ],
      foods: {
        emphasize: ['azeite', 'abacate', 'castanhas', 'salmão', 'sardinha', 'linhaça'],
        reduce: ['gordura trans', 'açúcar', 'álcool em excesso'],
      },
      goalFlag: 'cardio_focus',
    },
  },
  triglycerides: {
    attention: {
      severity: 'attention',
      why: 'Triglicérides limítrofes — açúcar simples e álcool são as alavancas mais fortes.',
      macroImpact: 'Carboidratos refinados < 10 % das calorias, ômega-3 marinho 1–2 g/dia.',
      actions: [
        { text: 'Reduza álcool a no máximo 1 dose nos dias em que beber.' },
        { text: 'Corte refrigerantes, sucos e doces da rotina diária.' },
        { text: 'Peixe gordo 2× por semana ou suplemento de ômega-3 (com orientação).' },
      ],
      foods: {
        emphasize: ['salmão', 'sardinha', 'linhaça', 'aveia', 'feijão', 'azeite'],
        reduce: ['açúcar', 'álcool', 'refrigerante', 'suco', 'farinha branca'],
      },
      goalFlag: 'low_glycemic',
    },
    altered: {
      severity: 'altered',
      why: 'Triglicérides elevados — combinação de açúcar, álcool e excesso calórico.',
      macroImpact: 'Carboidratos ≤ 30 % das calorias, ômega-3 2–4 g/dia, déficit calórico leve se houver excesso de peso.',
      actions: [
        { text: 'Suspenda álcool por 4 semanas e reavalie o exame.' },
        { text: 'Aumente peixe gordo para 3× por semana.' },
        { text: 'Atividade física aeróbica regular (150 min/semana).' },
      ],
      foods: {
        emphasize: ['peixes gordos', 'vegetais', 'leguminosas', 'oleaginosas'],
        reduce: ['álcool', 'açúcar', 'suco', 'doce', 'arroz branco'],
      },
      goalFlag: 'low_glycemic',
    },
    critical: {
      severity: 'critical',
      why: 'Triglicérides muito altos — risco de pancreatite aguda.',
      macroImpact: 'Gordura ≤ 15 % das calorias até estabilizar, suspender álcool integralmente.',
      actions: [
        { text: 'Procure médico nos próximos dias.' },
        { text: 'Suspenda álcool completamente.' },
        { text: 'Dieta muito baixa em gordura até a próxima coleta.' },
      ],
      foods: {
        emphasize: ['arroz', 'batata', 'frutas', 'vegetais', 'proteína muito magra'],
        reduce: ['todo álcool', 'gordura saturada', 'açúcar', 'fritura'],
      },
      goalFlag: 'low_glycemic',
    },
  },
  total_cholesterol: {
    attention: {
      severity: 'attention',
      why: 'Colesterol total limítrofe — geralmente reflete LDL ou triglicérides. Olhe a fração específica.',
      macroImpact: 'Mesma estratégia de LDL/triglicérides conforme qual fração estiver alta.',
      actions: [
        { text: 'Veja LDL e triglicérides para saber o que ajustar primeiro.' },
        { text: 'Inclua aveia e leguminosas diariamente.' },
      ],
      foods: {
        emphasize: ['aveia', 'leguminosas', 'azeite', 'peixes gordos'],
        reduce: ['gordura saturada', 'açúcar', 'álcool'],
      },
      goalFlag: 'cardio_focus',
    },
    altered: {
      severity: 'altered',
      why: 'Colesterol total elevado — quase sempre LDL alto. Combine fibras solúveis + redução de gordura saturada.',
      macroImpact: 'Veja recomendações de LDL alterado.',
      actions: [
        { text: 'Adote padrão mediterrâneo ou DASH.' },
        { text: 'Reduza queijo amarelo, embutidos e carne vermelha.' },
      ],
      foods: {
        emphasize: ['aveia', 'leguminosas', 'azeite', 'peixes gordos', 'oleaginosas'],
        reduce: ['gordura saturada', 'embutidos', 'queijo amarelo'],
      },
      goalFlag: 'cardio_focus',
    },
  },

  // ── VITAMINS ────────────────────────────────────────────────────────
  vitaminD: {
    attention: {
      severity: 'attention',
      why: 'Vitamina D insuficiente — afeta imunidade, ossos e humor. Alimentação ajuda parcialmente; sol e suplementação resolvem.',
      macroImpact: 'Sem mudança macro. Suplementação costuma ser indicada (avaliar com médico).',
      actions: [
        { text: 'Exposição solar 15–20 min/dia em horário seguro (manhã ou fim de tarde).' },
        { text: 'Peixes gordos 2× por semana (salmão, sardinha, atum).' },
        { text: 'Converse com nutri/médico sobre suplementação — alimentação só raramente é suficiente.' },
      ],
      foods: {
        emphasize: ['salmão', 'sardinha', 'atum', 'gema de ovo', 'cogumelos shitake', 'leite fortificado'],
        reduce: [],
      },
      goalFlag: 'vit_d_priority',
    },
    altered: {
      severity: 'altered',
      why: 'Deficiência de vitamina D — perda óssea acelerada, imunidade reduzida.',
      macroImpact: 'Sem mudança macro. Suplementação geralmente necessária (dose definida por médico).',
      actions: [
        { text: 'Marque avaliação médica para iniciar reposição.' },
        { text: 'Exposição solar diária 15–20 min sem protetor (rosto + braços).' },
        { text: 'Inclua peixes gordos e gema de ovo na rotina.' },
      ],
      foods: {
        emphasize: ['salmão', 'sardinha', 'gema de ovo', 'fígado', 'leite fortificado'],
        reduce: [],
      },
      goalFlag: 'vit_d_priority',
    },
    critical: {
      severity: 'critical',
      why: 'Deficiência grave de vitamina D — risco ósseo e metabólico.',
      macroImpact: 'Reposição médica urgente.',
      actions: [
        { text: 'Procure médico nesta semana para reposição.' },
        { text: 'Combine sol + dieta + suplementação.' },
      ],
      foods: { emphasize: ['salmão', 'sardinha', 'gema de ovo'], reduce: [] },
      goalFlag: 'vit_d_priority',
    },
  },
  b12: {
    attention: {
      severity: 'attention',
      why: 'B12 caindo — comum em quem come pouca proteína animal ou usa antiácidos crônicos.',
      macroImpact: 'Sem mudança macro. Reforçar fontes alimentares e considerar suplemento.',
      actions: [
        { text: 'Inclua ovo ou laticínio diariamente.' },
        { text: 'Se vegano: suplemento de B12 é não-negociável.' },
        { text: 'Reavalie em 3 meses.' },
      ],
      foods: {
        emphasize: ['ovo', 'iogurte', 'queijo', 'carne', 'peixe', 'frango', 'fígado'],
        reduce: [],
      },
      goalFlag: 'b12_priority',
    },
    altered: {
      severity: 'altered',
      why: 'Deficiência de B12 — pode causar fadiga, formigamento e anemia.',
      macroImpact: 'Sem mudança macro. Suplementação oral ou injetável (médico decide).',
      actions: [
        { text: 'Avaliação médica para iniciar reposição.' },
        { text: 'Reforce alimentos de origem animal na rotina.' },
        { text: 'Se vegano: suplemento metilcobalamina diário.' },
      ],
      foods: {
        emphasize: ['fígado', 'carne vermelha magra', 'ovo', 'peixe', 'frango', 'leite'],
        reduce: [],
      },
      goalFlag: 'b12_priority',
    },
    critical: {
      severity: 'critical',
      why: 'Deficiência grave de B12 — pode causar dano neurológico se não tratada.',
      macroImpact: 'Reposição médica imediata.',
      actions: [
        { text: 'Procure médico nesta semana.' },
        { text: 'Não dependa só da dieta para corrigir — precisa suplemento.' },
      ],
      foods: { emphasize: ['carne', 'ovo', 'peixe', 'fígado'], reduce: [] },
      goalFlag: 'b12_priority',
    },
  },
  ferritin: {
    attention: {
      severity: 'attention',
      why: 'Ferritina baixa — reservas de ferro diminuindo. Tratar antes de virar anemia.',
      macroImpact: 'Reforçar ferro heme (carne) + combinar com vitamina C nas refeições principais.',
      actions: [
        { text: 'Inclua carne vermelha magra 2–3× por semana.' },
        { text: 'Combine feijão/lentilha com fonte de vitamina C (limão, laranja, pimentão).' },
        { text: 'Evite café/chá nas refeições principais — atrapalha absorção.' },
      ],
      foods: {
        emphasize: ['carne vermelha magra', 'fígado', 'feijão', 'lentilha', 'espinafre', 'beterraba'],
        reduce: ['café junto da comida', 'chá preto junto da comida'],
      },
      goalFlag: 'iron_focus',
    },
    altered: {
      severity: 'altered',
      why: 'Deficiência de ferro — sintomas comuns: cansaço, queda de cabelo, falta de ar.',
      macroImpact: 'Ferro heme alvo 2–3 porções/semana + suplementação geralmente indicada.',
      actions: [
        { text: 'Avaliação médica para investigar causa e iniciar reposição.' },
        { text: 'Carne vermelha 3× por semana.' },
        { text: 'Suco de laranja junto com leguminosas para potencializar absorção.' },
        { text: 'Não tome café/leite junto do almoço.' },
      ],
      foods: {
        emphasize: ['fígado', 'carne vermelha', 'feijão preto', 'lentilha', 'gergelim', 'pimentão'],
        reduce: ['café junto da refeição', 'leite junto da refeição'],
      },
      goalFlag: 'iron_focus',
    },
    critical: {
      severity: 'critical',
      why: 'Reservas de ferro praticamente zeradas — provável anemia ferropriva.',
      macroImpact: 'Reposição médica + dieta agressiva em ferro heme.',
      actions: [
        { text: 'Avaliação médica nos próximos dias.' },
        { text: 'Suplementação de ferro com vitamina C, conforme prescrição.' },
      ],
      foods: { emphasize: ['fígado', 'carne vermelha', 'leguminosas + vitamina C'], reduce: ['café com refeição'] },
      goalFlag: 'iron_focus',
    },
  },

  // ── KIDNEY / LIVER / INFLAMMATION ───────────────────────────────────
  creatinine: {
    attention: {
      severity: 'attention',
      why: 'Creatinina levemente elevada — pode ser desidratação, muita proteína, ou início de disfunção renal.',
      macroImpact: 'Proteína dentro de 1,2–1,4 g/kg/dia (não exagerar), hidratação 35 mL/kg/dia.',
      actions: [
        { text: 'Aumente água para 2,5–3 L/dia.' },
        { text: 'Reavalie em 30 dias antes de tirar conclusões.' },
        { text: 'Reduza suplementos de creatina/whey em excesso.' },
      ],
      foods: { emphasize: ['água', 'frutas', 'vegetais'], reduce: ['suplementos proteicos em excesso', 'sal em excesso'] },
      goalFlag: 'renal_caution',
    },
    altered: {
      severity: 'altered',
      why: 'Creatinina elevada — sinal de função renal comprometida.',
      macroImpact: 'Proteína cap em 1,0–1,2 g/kg/dia, sódio < 2 g/dia, hidratação cuidadosa.',
      actions: [
        { text: 'Consulta nefrológica para investigar causa.' },
        { text: 'Reduza sal, embutidos e conservas.' },
        { text: 'Não tome anti-inflamatório sem orientação médica.' },
      ],
      foods: { emphasize: ['vegetais frescos', 'frutas', 'arroz', 'proteína magra com moderação'], reduce: ['embutidos', 'conserva', 'sal de adição', 'refrigerante'] },
      goalFlag: 'renal_caution',
    },
    critical: {
      severity: 'critical',
      why: 'Creatinina muito elevada — avaliação nefrológica urgente.',
      macroImpact: 'Dieta renal específica definida pelo nefrologista + nutri.',
      actions: [
        { text: 'Procure nefrologista nesta semana.' },
        { text: 'Não ajuste proteína sozinho — pode piorar.' },
      ],
      foods: { emphasize: [], reduce: ['sódio', 'potássio em excesso'] },
      goalFlag: 'renal_caution',
    },
  },
  urea: {
    altered: {
      severity: 'altered',
      why: 'Ureia elevada — relaciona com proteína em excesso ou função renal.',
      macroImpact: 'Mesmo cuidado de creatinina alterada.',
      actions: [
        { text: 'Veja creatinina junto para entender se é renal ou só dieta.' },
        { text: 'Modere proteína se estava muito acima de 1,6 g/kg.' },
      ],
      foods: { emphasize: ['água', 'vegetais'], reduce: ['suplemento proteico em excesso'] },
      goalFlag: 'renal_caution',
    },
  },
  uric_acid: {
    attention: {
      severity: 'attention',
      why: 'Hiperuricemia — risco de gota e cálculo renal. Purinas e frutose são as alavancas.',
      macroImpact: 'Reduzir frutose adicionada, álcool (especialmente cerveja) e carne vermelha.',
      actions: [
        { text: 'Corte cerveja e bebidas com xarope de milho.' },
        { text: 'Reduza vísceras, frutos do mar e carne vermelha.' },
        { text: 'Aumente água para 2,5 L/dia para diluir.' },
        { text: 'Inclua laticínios magros (efeito uricosúrico comprovado).' },
      ],
      foods: {
        emphasize: ['laticínio magro', 'café', 'cereja', 'vegetais', 'água'],
        reduce: ['cerveja', 'destilados', 'frutos do mar', 'vísceras', 'carne vermelha', 'refrigerante'],
      },
      goalFlag: 'low_purine',
    },
    altered: {
      severity: 'altered',
      why: 'Ácido úrico alto — risco real de crise de gota.',
      macroImpact: 'Mesmas regras de attention + perda de peso 5–7 % se houver excesso.',
      actions: [
        { text: 'Suspenda cerveja até reavaliar.' },
        { text: 'Carne vermelha no máximo 1× por semana.' },
        { text: 'Procure médico se tiver dor articular.' },
      ],
      foods: {
        emphasize: ['laticínio magro', 'café', 'cereja', 'vegetais'],
        reduce: ['álcool', 'frutos do mar', 'vísceras', 'carne vermelha', 'açúcar adicionado'],
      },
      goalFlag: 'low_purine',
    },
  },
  alt: {
    attention: {
      severity: 'attention',
      why: 'ALT (TGP) levemente elevada — comum em esteatose hepática (gordura no fígado).',
      macroImpact: 'Reduzir frutose adicionada e álcool, déficit calórico leve se houver excesso de peso.',
      actions: [
        { text: 'Suspenda bebidas açucaradas e álcool por 4–6 semanas.' },
        { text: 'Perda de 5–7 % do peso reduz gordura hepática significativamente.' },
        { text: 'Atividade física 150 min/semana.' },
      ],
      foods: { emphasize: ['café preto', 'vegetais', 'peixes', 'oleaginosas'], reduce: ['álcool', 'açúcar', 'refrigerante', 'fritura'] },
      goalFlag: 'liver_caution',
    },
    altered: {
      severity: 'altered',
      why: 'ALT elevada — investigação hepática necessária.',
      macroImpact: 'Mesmas regras de attention + avaliação médica.',
      actions: [
        { text: 'Consulta com hepatologista ou clínico.' },
        { text: 'Suspenda álcool integralmente.' },
        { text: 'Dieta mediterrânea é a mais estudada para esteatose.' },
      ],
      foods: { emphasize: ['peixe', 'azeite', 'vegetais', 'leguminosas', 'café'], reduce: ['álcool', 'açúcar', 'fritura', 'embutido'] },
      goalFlag: 'liver_caution',
    },
    critical: {
      severity: 'critical',
      why: 'ALT muito elevada — avaliação médica imediata.',
      macroImpact: 'Definida com hepatologista.',
      actions: [
        { text: 'Procure médico nos próximos 2 dias.' },
        { text: 'Suspenda álcool, ervas e suplementos sem orientação.' },
      ],
      foods: { emphasize: ['água', 'vegetais', 'frutas'], reduce: ['álcool', 'suplementos sem prescrição'] },
      goalFlag: 'liver_caution',
    },
  },
  ast: {
    attention: {
      severity: 'attention',
      why: 'AST (TGO) levemente elevada — junto com ALT sugere esteatose; isolada pode ser muscular.',
      macroImpact: 'Mesma estratégia de ALT levemente elevada.',
      actions: [
        { text: 'Reduza álcool e açúcar adicionado.' },
        { text: 'Veja relação AST/ALT — se > 2, pensar em álcool.' },
      ],
      foods: { emphasize: ['vegetais', 'peixes', 'café'], reduce: ['álcool', 'açúcar', 'fritura'] },
      goalFlag: 'liver_caution',
    },
    altered: {
      severity: 'altered',
      why: 'AST elevada — investigação hepática (ou muscular se exercício pesado recente).',
      macroImpact: 'Reduzir álcool e açúcar; reavaliar em 4–6 semanas.',
      actions: [
        { text: 'Consulta médica.' },
        { text: 'Suspenda álcool por 4 semanas e repita.' },
      ],
      foods: { emphasize: ['vegetais', 'peixe', 'azeite'], reduce: ['álcool', 'fritura'] },
      goalFlag: 'liver_caution',
    },
  },
  ggt: {
    attention: {
      severity: 'attention',
      why: 'GGT elevada — sinal mais sensível para álcool e esteatose hepática.',
      macroImpact: 'Suspender álcool é a alavanca mais rápida.',
      actions: [
        { text: 'Suspenda álcool por 4 semanas e repita o exame.' },
        { text: 'Reduza frituras e ultraprocessados.' },
      ],
      foods: { emphasize: ['café', 'vegetais', 'peixe'], reduce: ['álcool', 'ultraprocessados', 'fritura'] },
      goalFlag: 'liver_caution',
    },
    altered: {
      severity: 'altered',
      why: 'GGT alta — fígado ou vias biliares sob estresse.',
      macroImpact: 'Suspender álcool, déficit calórico leve se excesso de peso.',
      actions: [
        { text: 'Consulta médica para investigar.' },
        { text: 'Suspenda álcool integralmente.' },
      ],
      foods: { emphasize: ['vegetais', 'peixe', 'azeite', 'café'], reduce: ['álcool', 'embutidos', 'açúcar'] },
      goalFlag: 'liver_caution',
    },
  },
  crp: {
    attention: {
      severity: 'attention',
      why: 'PCR moderada — inflamação crônica de baixo grau, comum em obesidade abdominal e dieta ultraprocessada.',
      macroImpact: 'Aumentar ômega-3 marinho (1–2 g/dia) e fibras, reduzir ultraprocessados.',
      actions: [
        { text: 'Inclua peixe gordo 2× por semana.' },
        { text: 'Reduza ultraprocessados (snacks, refrigerante, embutidos).' },
        { text: 'Aumente cores no prato — antioxidantes vegetais ajudam.' },
      ],
      foods: { emphasize: ['salmão', 'sardinha', 'linhaça', 'frutas vermelhas', 'cúrcuma', 'azeite', 'vegetais coloridos'], reduce: ['ultraprocessados', 'açúcar', 'gordura trans'] },
      goalFlag: 'anti_inflammatory',
    },
    altered: {
      severity: 'altered',
      why: 'Inflamação elevada — investigar causa (infecção, doença autoimune, obesidade visceral).',
      macroImpact: 'Padrão mediterrâneo + ômega-3 2–3 g/dia.',
      actions: [
        { text: 'Avaliação médica para descartar causa aguda.' },
        { text: 'Adote padrão mediterrâneo integralmente.' },
        { text: 'Sono 7–8h e atividade física regular.' },
      ],
      foods: { emphasize: ['peixes gordos', 'vegetais', 'azeite', 'oleaginosas', 'frutas vermelhas'], reduce: ['açúcar', 'fritura', 'embutidos'] },
      goalFlag: 'anti_inflammatory',
    },
    critical: {
      severity: 'critical',
      why: 'PCR muito alta — quase sempre infecção ou inflamação aguda.',
      macroImpact: 'A definir após diagnóstico médico.',
      actions: [
        { text: 'Procure médico nesta semana.' },
        { text: 'Hidratação alta, dieta leve e digestível enquanto investiga.' },
      ],
      foods: { emphasize: ['caldos', 'frutas', 'vegetais cozidos'], reduce: ['álcool', 'fritura'] },
      goalFlag: 'anti_inflammatory',
    },
  },

  // ── BLOOD ───────────────────────────────────────────────────────────
  hemoglobin: {
    altered: {
      severity: 'altered',
      why: 'Hemoglobina baixa — provável anemia. Mais comum: deficiência de ferro, B12 ou folato.',
      macroImpact: 'Ferro heme alvo 3 porções/semana + vitamina C nas refeições principais + investigar B12.',
      actions: [
        { text: 'Avaliação médica para definir tipo de anemia.' },
        { text: 'Carne vermelha 3× por semana se não houver restrição.' },
        { text: 'Suco de laranja junto de leguminosas/vegetais verdes.' },
        { text: 'Sem café/chá dentro de 1h das refeições principais.' },
      ],
      foods: { emphasize: ['fígado', 'carne vermelha', 'feijão', 'lentilha', 'espinafre', 'laranja', 'pimentão'], reduce: ['café com refeição', 'chá com refeição'] },
      goalFlag: 'iron_focus',
    },
  },
  hematocrit: {
    altered: {
      severity: 'altered',
      why: 'Hematócrito baixo — geralmente acompanha hemoglobina baixa. Mesma estratégia.',
      macroImpact: 'Ver hemoglobina.',
      actions: [
        { text: 'Veja hemoglobina, ferritina e B12 para entender o quadro completo.' },
      ],
      foods: { emphasize: ['carne vermelha', 'leguminosas', 'vitamina C'], reduce: ['café com refeição'] },
      goalFlag: 'iron_focus',
    },
  },

  // ── MINERALS ────────────────────────────────────────────────────────
  magnesium: {
    attention: {
      severity: 'attention',
      why: 'Magnésio limítrofe — afeta sono, cãibras e regulação glicêmica.',
      macroImpact: 'Reforçar fontes alimentares; suplementação raramente necessária se dieta variada.',
      actions: [
        { text: 'Inclua oleaginosas (1 punhado/dia) e folhas verdes escuras.' },
        { text: 'Cacau puro ou chocolate 70 % + é fonte concentrada.' },
      ],
      foods: { emphasize: ['castanha-do-pará', 'amêndoa', 'espinafre', 'aveia', 'feijão', 'cacau'], reduce: [] },
      goalFlag: 'magnesium_priority',
    },
    altered: {
      severity: 'altered',
      why: 'Magnésio baixo — pode causar cãibras, fadiga, irritabilidade.',
      macroImpact: 'Suplementação geralmente indicada; reforçar dieta em paralelo.',
      actions: [
        { text: 'Converse com nutri/médico sobre suplemento (citrato ou glicinato).' },
        { text: 'Reforce oleaginosas, folhas verdes e leguminosas diariamente.' },
      ],
      foods: { emphasize: ['amêndoa', 'castanha', 'espinafre', 'aveia', 'feijão preto', 'cacau'], reduce: ['álcool em excesso'] },
      goalFlag: 'magnesium_priority',
    },
  },
}

export function translateMarker(marker: InterpretedMarker): TranslatedMarker {
  const severity = bucket(marker.status)
  if (!marker.canonical || !severity) {
    return { marker, translation: null }
  }
  const byMarker = TABLE[marker.canonical]
  if (!byMarker) return { marker, translation: null }
  // Try exact severity first; fall back to a higher severity entry if missing
  // (so a `critical` reading without a specific entry uses `altered`).
  const direct = byMarker[severity]
  const fallback = severity === 'critical' ? byMarker.altered : null
  const translation = direct ?? fallback ?? null
  return { marker, translation }
}

export interface ExamTranslation {
  // Per-marker translations, in clinical-priority order (critical → altered → attention).
  items: TranslatedMarker[]
  // De-duplicated list of goal-engine flags this exam pushes.
  goalFlags: string[]
  // Total actionable markers (markers with a non-null translation).
  actionableCount: number
}

const PRIORITY: Record<ActionSeverity, number> = {
  critical: 0,
  altered: 1,
  attention: 2,
}

export function translateExam(markers: InterpretedMarker[]): ExamTranslation {
  const items = markers.map(translateMarker)
  items.sort((a, b) => {
    const sa = a.translation ? PRIORITY[a.translation.severity] : 99
    const sb = b.translation ? PRIORITY[b.translation.severity] : 99
    if (sa !== sb) return sa - sb
    // Keep optimal markers grouped after actionable ones, alphabetical by label.
    const la = a.marker.label ?? a.marker.rawMarker
    const lb = b.marker.label ?? b.marker.rawMarker
    return la.localeCompare(lb, 'pt-BR')
  })

  const flagSet = new Set<string>()
  let actionable = 0
  for (const it of items) {
    if (it.translation) {
      actionable++
      if (it.translation.goalFlag) flagSet.add(it.translation.goalFlag)
    }
  }

  return {
    items,
    goalFlags: Array.from(flagSet),
    actionableCount: actionable,
  }
}
