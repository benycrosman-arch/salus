// Reference ranges for blood-test markers, anchored to top-tier Brazilian and
// international guidelines. Each range cites its source so the rationale travels
// with the data. Cuts are intentionally clinical, not "lab default", because the
// goal is to drive nutrition decisions — not to repeat what the patient already
// sees on the printed laudo.
//
// Conventions:
// - bands are inclusive on the lower bound, exclusive on the upper, except
//   `optimalMin`/`optimalMax` which are inclusive on both (the "green zone").
// - sex 'M' = masculino, 'F' = feminino. 'any' applies to both.
// - units are the canonical PT-BR clinical units; the parser normalizes.
// - the `flag` is a short tag the goal engine consumes to bias macros / micros.

export type Sex = 'M' | 'F' | 'any'

export type LabStatus =
  | 'critical_low'
  | 'low'
  | 'borderline_low'
  | 'optimal'
  | 'borderline_high'
  | 'high'
  | 'critical_high'

export interface Band {
  // half-open [min, max). null on either side means "no lower/upper bound".
  min: number | null
  max: number | null
  status: LabStatus
  // Patient-facing copy in PT-BR. One sentence. No medical advice — the goal
  // engine and the nutri provide the actionable plan.
  message: string
  // Tag the goal generator can pick up to bias macros, micros, or flags.
  flag?: string
}

export interface RangeRule {
  marker: string                  // canonical key, lowercase snake-ish
  label: string                   // PT-BR label for UI
  unit: string                    // canonical unit
  // When to apply this rule. The first matching rule wins, so order matters.
  appliesTo: {
    sex?: Sex
    minAge?: number
    maxAge?: number
    pregnancy?: boolean           // not yet collected in onboarding; reserved
  }
  bands: Band[]
  source: string                  // citation line shown to the nutri / in goal rationale
}

const SBPC_SBEM_VITD =
  'SBPC/SBEM 2024 — Posicionamento sobre 25-OH-D'
const ADA_2024 =
  'ADA Standards of Care 2024 — Diagnosis and Classification of Diabetes'
const SBC_2025 =
  'SBC 2025 — Atualização da Diretriz Brasileira de Dislipidemias'
const SBEM_TIREOIDE =
  'SBEM 2024 — Diretrizes de doenças tireoidianas / FEBRASGO 2022 (gestação)'
const PNCQ_HEMO =
  'PNCQ 2019 + Pesquisa Nacional de Saúde — valores hematológicos brasileiros'
const SBN_FUNCAO_RENAL =
  'SBN/SBPC — referência clínica padrão (creatinina, ureia)'
const SBPC_HEPATICAS =
  'SBPC — referência clínica padrão (ALT, AST, GGT)'
const WHO_FERRITIN =
  'WHO 2020 — ferritin thresholds for iron status / SBHH consenso'
const ENDO_SOC_B12 =
  'BSH 2014 + Stabler 2013 NEJM — vitamina B12 e holotranscobalamina'

export const RANGE_RULES: RangeRule[] = [
  // ──────────────────────────────────────────────────────────────────
  // GLICEMIA — ADA 2024
  // ──────────────────────────────────────────────────────────────────
  {
    marker: 'glucose',
    label: 'Glicose em jejum',
    unit: 'mg/dL',
    appliesTo: { sex: 'any', minAge: 0 },
    source: ADA_2024,
    bands: [
      { min: null, max: 54, status: 'critical_low', message: 'Hipoglicemia grave — atendimento imediato.' },
      { min: 54, max: 70, status: 'low', message: 'Hipoglicemia leve.' },
      { min: 70, max: 100, status: 'optimal', message: 'Glicemia em jejum normal.' },
      { min: 100, max: 126, status: 'borderline_high', message: 'Glicemia alterada (pré-diabetes).', flag: 'low_glycemic' },
      { min: 126, max: 250, status: 'high', message: 'Compatível com diabetes — confirmar.', flag: 'low_glycemic' },
      { min: 250, max: null, status: 'critical_high', message: 'Glicemia muito elevada — avaliação médica urgente.', flag: 'low_glycemic' },
    ],
  },
  {
    marker: 'hba1c',
    label: 'Hemoglobina glicada (HbA1c)',
    unit: '%',
    appliesTo: { sex: 'any', minAge: 0 },
    source: ADA_2024,
    bands: [
      { min: null, max: 5.7, status: 'optimal', message: 'HbA1c normal.' },
      { min: 5.7, max: 6.5, status: 'borderline_high', message: 'Pré-diabetes — janela de prevenção.', flag: 'low_glycemic' },
      { min: 6.5, max: 8, status: 'high', message: 'Compatível com diabetes — manejo necessário.', flag: 'low_glycemic' },
      { min: 8, max: null, status: 'critical_high', message: 'Controle glicêmico ruim — risco cardiovascular elevado.', flag: 'low_glycemic' },
    ],
  },

  // ──────────────────────────────────────────────────────────────────
  // LIPÍDEOS — SBC 2025 (metas de baixo risco; o sistema NÃO calcula risco
  // cardiovascular, então usa a faixa "ótima" da população geral).
  // ──────────────────────────────────────────────────────────────────
  {
    marker: 'ldl',
    label: 'LDL (colesterol "ruim")',
    unit: 'mg/dL',
    appliesTo: { sex: 'any', minAge: 18 },
    source: SBC_2025,
    bands: [
      { min: null, max: 100, status: 'optimal', message: 'LDL ótimo.' },
      { min: 100, max: 130, status: 'borderline_high', message: 'LDL acima da faixa desejável.', flag: 'cardio_focus' },
      { min: 130, max: 160, status: 'high', message: 'LDL elevado — risco cardiovascular relevante.', flag: 'cardio_focus' },
      { min: 160, max: null, status: 'critical_high', message: 'LDL muito elevado — avaliar tratamento.', flag: 'cardio_focus' },
    ],
  },
  {
    marker: 'hdl',
    label: 'HDL (colesterol "bom")',
    unit: 'mg/dL',
    appliesTo: { sex: 'M', minAge: 18 },
    source: SBC_2025,
    bands: [
      { min: null, max: 40, status: 'low', message: 'HDL baixo — fator de risco cardiovascular.', flag: 'cardio_focus' },
      { min: 40, max: 60, status: 'optimal', message: 'HDL adequado.' },
      { min: 60, max: null, status: 'optimal', message: 'HDL elevado — protetor.' },
    ],
  },
  {
    marker: 'hdl',
    label: 'HDL (colesterol "bom")',
    unit: 'mg/dL',
    appliesTo: { sex: 'F', minAge: 18 },
    source: SBC_2025,
    bands: [
      { min: null, max: 50, status: 'low', message: 'HDL baixo — fator de risco cardiovascular.', flag: 'cardio_focus' },
      { min: 50, max: 60, status: 'optimal', message: 'HDL adequado.' },
      { min: 60, max: null, status: 'optimal', message: 'HDL elevado — protetor.' },
    ],
  },
  {
    marker: 'triglycerides',
    label: 'Triglicérides',
    unit: 'mg/dL',
    appliesTo: { sex: 'any', minAge: 18 },
    source: SBC_2025,
    bands: [
      { min: null, max: 150, status: 'optimal', message: 'Triglicérides normais (jejum).' },
      { min: 150, max: 200, status: 'borderline_high', message: 'Triglicérides limítrofes.', flag: 'low_glycemic' },
      { min: 200, max: 500, status: 'high', message: 'Triglicérides elevados — atenção a açúcar e álcool.', flag: 'low_glycemic' },
      { min: 500, max: null, status: 'critical_high', message: 'Risco de pancreatite — avaliação médica.', flag: 'low_glycemic' },
    ],
  },
  {
    marker: 'total_cholesterol',
    label: 'Colesterol total',
    unit: 'mg/dL',
    appliesTo: { sex: 'any', minAge: 18 },
    source: SBC_2025,
    bands: [
      { min: null, max: 190, status: 'optimal', message: 'Colesterol total desejável.' },
      { min: 190, max: 240, status: 'borderline_high', message: 'Colesterol total limítrofe.', flag: 'cardio_focus' },
      { min: 240, max: null, status: 'high', message: 'Colesterol total elevado.', flag: 'cardio_focus' },
    ],
  },

  // ──────────────────────────────────────────────────────────────────
  // VITAMINA D — SBPC/SBEM. A faixa 30-60 vale para grupos de risco
  // (idosos, gestantes, doenças ósseas/autoimunes); para população geral
  // saudável, ≥ 20 ng/mL é suficiente. Como o app não pergunta sobre
  // doença óssea, usamos ≥ 30 como "ótimo" para idosos (≥ 60 anos)
  // e ≥ 20 para o resto — sem chamar de "deficiente" o que a SBEM não chama.
  // ──────────────────────────────────────────────────────────────────
  {
    marker: 'vitaminD',
    label: 'Vitamina D (25-OH)',
    unit: 'ng/mL',
    appliesTo: { sex: 'any', minAge: 60 },
    source: SBPC_SBEM_VITD,
    bands: [
      { min: null, max: 10, status: 'critical_low', message: 'Deficiência grave — risco ósseo importante.', flag: 'vit_d_priority' },
      { min: 10, max: 20, status: 'low', message: 'Deficiência — perda óssea acelerada.', flag: 'vit_d_priority' },
      { min: 20, max: 30, status: 'borderline_low', message: 'Insuficiente para idoso — alvo é ≥ 30 ng/mL.', flag: 'vit_d_priority' },
      { min: 30, max: 60, status: 'optimal', message: 'Vitamina D adequada para idoso.' },
      { min: 60, max: 100, status: 'borderline_high', message: 'Vitamina D alta — revisar suplementação.' },
      { min: 100, max: null, status: 'high', message: 'Vitamina D excessiva — risco de hipercalcemia.' },
    ],
  },
  {
    marker: 'vitaminD',
    label: 'Vitamina D (25-OH)',
    unit: 'ng/mL',
    appliesTo: { sex: 'any', minAge: 0 },
    source: SBPC_SBEM_VITD,
    bands: [
      { min: null, max: 10, status: 'critical_low', message: 'Deficiência grave de vitamina D.', flag: 'vit_d_priority' },
      { min: 10, max: 20, status: 'low', message: 'Vitamina D baixa — reposição costuma ser indicada.', flag: 'vit_d_priority' },
      { min: 20, max: 30, status: 'optimal', message: 'Vitamina D suficiente para população saudável.' },
      { min: 30, max: 100, status: 'optimal', message: 'Vitamina D em faixa-alvo de grupos de risco.' },
      { min: 100, max: null, status: 'high', message: 'Vitamina D excessiva — risco de hipercalcemia.' },
    ],
  },

  // ──────────────────────────────────────────────────────────────────
  // FERRITINA — WHO 2020 + SBHH. Ferritina é proteína de fase aguda; em
  // inflamação sobe e mascara deficiência. Cortes abaixo seguem o consenso
  // de "depleção de estoque" e "ferritina elevada".
  // ──────────────────────────────────────────────────────────────────
  {
    marker: 'ferritin',
    label: 'Ferritina',
    unit: 'ng/mL',
    appliesTo: { sex: 'M', minAge: 18 },
    source: WHO_FERRITIN,
    bands: [
      { min: null, max: 30, status: 'low', message: 'Estoque de ferro baixo — risco de anemia ferropriva.', flag: 'iron_focus' },
      { min: 30, max: 300, status: 'optimal', message: 'Ferritina adequada.' },
      { min: 300, max: 500, status: 'borderline_high', message: 'Ferritina elevada — investigar inflamação.' },
      { min: 500, max: null, status: 'high', message: 'Ferritina muito elevada — investigar sobrecarga ou inflamação.' },
    ],
  },
  {
    marker: 'ferritin',
    label: 'Ferritina',
    unit: 'ng/mL',
    appliesTo: { sex: 'F', minAge: 18 },
    source: WHO_FERRITIN,
    bands: [
      { min: null, max: 15, status: 'critical_low', message: 'Estoque de ferro esgotado.', flag: 'iron_focus' },
      { min: 15, max: 30, status: 'low', message: 'Estoque de ferro baixo — comum em mulheres em idade reprodutiva.', flag: 'iron_focus' },
      { min: 30, max: 200, status: 'optimal', message: 'Ferritina adequada.' },
      { min: 200, max: 500, status: 'borderline_high', message: 'Ferritina elevada — investigar inflamação.' },
      { min: 500, max: null, status: 'high', message: 'Ferritina muito elevada — investigar sobrecarga ou inflamação.' },
    ],
  },

  // ──────────────────────────────────────────────────────────────────
  // VITAMINA B12 — BSH 2014 / Stabler 2013. Faixa "cinzenta" 200-300
  // pg/mL é classificada como borderline porque ~40% dos idosos com
  // valores nessa faixa têm deficiência funcional (MMA elevado).
  // ──────────────────────────────────────────────────────────────────
  {
    marker: 'b12',
    label: 'Vitamina B12',
    unit: 'pg/mL',
    appliesTo: { sex: 'any', minAge: 60 },
    source: ENDO_SOC_B12,
    bands: [
      { min: null, max: 200, status: 'low', message: 'Deficiência clínica de B12.', flag: 'b12_priority' },
      { min: 200, max: 350, status: 'borderline_low', message: 'B12 limítrofe para idoso — alvo é ≥ 350 pg/mL.', flag: 'b12_priority' },
      { min: 350, max: 900, status: 'optimal', message: 'B12 adequada.' },
      { min: 900, max: null, status: 'borderline_high', message: 'B12 elevada — revisar suplementação.' },
    ],
  },
  {
    marker: 'b12',
    label: 'Vitamina B12',
    unit: 'pg/mL',
    appliesTo: { sex: 'any', minAge: 0 },
    source: ENDO_SOC_B12,
    bands: [
      { min: null, max: 200, status: 'low', message: 'Deficiência clínica de B12.', flag: 'b12_priority' },
      { min: 200, max: 300, status: 'borderline_low', message: 'B12 na zona cinzenta — comum em vegetarianos.', flag: 'b12_priority' },
      { min: 300, max: 900, status: 'optimal', message: 'B12 adequada.' },
      { min: 900, max: null, status: 'borderline_high', message: 'B12 elevada — revisar suplementação.' },
    ],
  },

  // ──────────────────────────────────────────────────────────────────
  // TIREOIDE — SBEM / FEBRASGO. TSH alvo geral 0,5-4,5; o app não usa
  // referência de gestação porque não coleta esse status no onboarding.
  // ──────────────────────────────────────────────────────────────────
  {
    marker: 'tsh',
    label: 'TSH',
    unit: 'mUI/L',
    appliesTo: { sex: 'any', minAge: 18 },
    source: SBEM_TIREOIDE,
    bands: [
      { min: null, max: 0.4, status: 'low', message: 'TSH suprimido — investigar hipertireoidismo.' },
      { min: 0.4, max: 4.5, status: 'optimal', message: 'TSH normal.' },
      { min: 4.5, max: 10, status: 'borderline_high', message: 'Hipotireoidismo subclínico — confirmar.' },
      { min: 10, max: null, status: 'high', message: 'TSH elevado — compatível com hipotireoidismo.' },
    ],
  },
  {
    marker: 't4_free',
    label: 'T4 livre',
    unit: 'ng/dL',
    appliesTo: { sex: 'any', minAge: 18 },
    source: SBEM_TIREOIDE,
    bands: [
      { min: null, max: 0.7, status: 'low', message: 'T4 livre baixo.' },
      { min: 0.7, max: 1.8, status: 'optimal', message: 'T4 livre normal.' },
      { min: 1.8, max: null, status: 'high', message: 'T4 livre elevado.' },
    ],
  },

  // ──────────────────────────────────────────────────────────────────
  // FUNÇÃO RENAL — referência clínica padrão SBN/SBPC.
  // ──────────────────────────────────────────────────────────────────
  {
    marker: 'creatinine',
    label: 'Creatinina',
    unit: 'mg/dL',
    appliesTo: { sex: 'M', minAge: 18 },
    source: SBN_FUNCAO_RENAL,
    bands: [
      { min: null, max: 0.7, status: 'low', message: 'Creatinina baixa — pode refletir baixa massa muscular.' },
      { min: 0.7, max: 1.3, status: 'optimal', message: 'Função renal normal.' },
      { min: 1.3, max: 2, status: 'high', message: 'Creatinina elevada — atenção à função renal.', flag: 'renal_caution' },
      { min: 2, max: null, status: 'critical_high', message: 'Creatinina muito elevada — avaliação nefrológica.', flag: 'renal_caution' },
    ],
  },
  {
    marker: 'creatinine',
    label: 'Creatinina',
    unit: 'mg/dL',
    appliesTo: { sex: 'F', minAge: 18 },
    source: SBN_FUNCAO_RENAL,
    bands: [
      { min: null, max: 0.6, status: 'low', message: 'Creatinina baixa — pode refletir baixa massa muscular.' },
      { min: 0.6, max: 1.2, status: 'optimal', message: 'Função renal normal.' },
      { min: 1.2, max: 1.8, status: 'high', message: 'Creatinina elevada — atenção à função renal.', flag: 'renal_caution' },
      { min: 1.8, max: null, status: 'critical_high', message: 'Creatinina muito elevada — avaliação nefrológica.', flag: 'renal_caution' },
    ],
  },
  {
    marker: 'urea',
    label: 'Ureia',
    unit: 'mg/dL',
    appliesTo: { sex: 'any', minAge: 18 },
    source: SBN_FUNCAO_RENAL,
    bands: [
      { min: null, max: 19, status: 'low', message: 'Ureia baixa — pode refletir baixa ingestão proteica.' },
      { min: 19, max: 50, status: 'optimal', message: 'Ureia normal.' },
      { min: 50, max: 80, status: 'high', message: 'Ureia elevada — investigar função renal e proteínas.', flag: 'renal_caution' },
      { min: 80, max: null, status: 'critical_high', message: 'Ureia muito elevada — avaliação nefrológica.', flag: 'renal_caution' },
    ],
  },
  {
    marker: 'uric_acid',
    label: 'Ácido úrico',
    unit: 'mg/dL',
    appliesTo: { sex: 'M', minAge: 18 },
    source: SBN_FUNCAO_RENAL,
    bands: [
      { min: null, max: 3.4, status: 'low', message: 'Ácido úrico baixo.' },
      { min: 3.4, max: 7, status: 'optimal', message: 'Ácido úrico normal.' },
      { min: 7, max: 9, status: 'borderline_high', message: 'Hiperuricemia — risco de gota e cálculos.', flag: 'low_purine' },
      { min: 9, max: null, status: 'high', message: 'Ácido úrico elevado — risco de gota.', flag: 'low_purine' },
    ],
  },
  {
    marker: 'uric_acid',
    label: 'Ácido úrico',
    unit: 'mg/dL',
    appliesTo: { sex: 'F', minAge: 18 },
    source: SBN_FUNCAO_RENAL,
    bands: [
      { min: null, max: 2.5, status: 'low', message: 'Ácido úrico baixo.' },
      { min: 2.5, max: 6, status: 'optimal', message: 'Ácido úrico normal.' },
      { min: 6, max: 8, status: 'borderline_high', message: 'Hiperuricemia — risco de gota.', flag: 'low_purine' },
      { min: 8, max: null, status: 'high', message: 'Ácido úrico elevado.', flag: 'low_purine' },
    ],
  },

  // ──────────────────────────────────────────────────────────────────
  // FÍGADO — SBPC.
  // ──────────────────────────────────────────────────────────────────
  {
    marker: 'alt',
    label: 'ALT (TGP)',
    unit: 'U/L',
    appliesTo: { sex: 'any', minAge: 18 },
    source: SBPC_HEPATICAS,
    bands: [
      { min: null, max: 41, status: 'optimal', message: 'ALT normal.' },
      { min: 41, max: 80, status: 'borderline_high', message: 'ALT levemente elevada — investigar fígado.', flag: 'liver_caution' },
      { min: 80, max: 200, status: 'high', message: 'ALT elevada — avaliação hepática.', flag: 'liver_caution' },
      { min: 200, max: null, status: 'critical_high', message: 'ALT muito elevada — avaliação médica.', flag: 'liver_caution' },
    ],
  },
  {
    marker: 'ast',
    label: 'AST (TGO)',
    unit: 'U/L',
    appliesTo: { sex: 'any', minAge: 18 },
    source: SBPC_HEPATICAS,
    bands: [
      { min: null, max: 37, status: 'optimal', message: 'AST normal.' },
      { min: 37, max: 80, status: 'borderline_high', message: 'AST levemente elevada.', flag: 'liver_caution' },
      { min: 80, max: 200, status: 'high', message: 'AST elevada.', flag: 'liver_caution' },
      { min: 200, max: null, status: 'critical_high', message: 'AST muito elevada — avaliação médica.', flag: 'liver_caution' },
    ],
  },
  {
    marker: 'ggt',
    label: 'Gama-GT (GGT)',
    unit: 'U/L',
    appliesTo: { sex: 'M', minAge: 18 },
    source: SBPC_HEPATICAS,
    bands: [
      { min: null, max: 60, status: 'optimal', message: 'GGT normal.' },
      { min: 60, max: 120, status: 'borderline_high', message: 'GGT elevada — comum com álcool, esteatose.', flag: 'liver_caution' },
      { min: 120, max: null, status: 'high', message: 'GGT alta — investigar fígado/vias biliares.', flag: 'liver_caution' },
    ],
  },
  {
    marker: 'ggt',
    label: 'Gama-GT (GGT)',
    unit: 'U/L',
    appliesTo: { sex: 'F', minAge: 18 },
    source: SBPC_HEPATICAS,
    bands: [
      { min: null, max: 40, status: 'optimal', message: 'GGT normal.' },
      { min: 40, max: 80, status: 'borderline_high', message: 'GGT elevada.', flag: 'liver_caution' },
      { min: 80, max: null, status: 'high', message: 'GGT alta — investigar fígado/vias biliares.', flag: 'liver_caution' },
    ],
  },

  // ──────────────────────────────────────────────────────────────────
  // HEMOGRAMA — Pesquisa Nacional de Saúde (Brasil) / PNCQ 2019.
  // ──────────────────────────────────────────────────────────────────
  {
    marker: 'hemoglobin',
    label: 'Hemoglobina',
    unit: 'g/dL',
    appliesTo: { sex: 'M', minAge: 18 },
    source: PNCQ_HEMO,
    bands: [
      { min: null, max: 13, status: 'low', message: 'Hemoglobina baixa — investigar anemia.', flag: 'iron_focus' },
      { min: 13, max: 17, status: 'optimal', message: 'Hemoglobina normal.' },
      { min: 17, max: null, status: 'borderline_high', message: 'Hemoglobina elevada.' },
    ],
  },
  {
    marker: 'hemoglobin',
    label: 'Hemoglobina',
    unit: 'g/dL',
    appliesTo: { sex: 'F', minAge: 18 },
    source: PNCQ_HEMO,
    bands: [
      { min: null, max: 12, status: 'low', message: 'Hemoglobina baixa — investigar anemia.', flag: 'iron_focus' },
      { min: 12, max: 15.5, status: 'optimal', message: 'Hemoglobina normal.' },
      { min: 15.5, max: null, status: 'borderline_high', message: 'Hemoglobina elevada.' },
    ],
  },
  {
    marker: 'hematocrit',
    label: 'Hematócrito',
    unit: '%',
    appliesTo: { sex: 'M', minAge: 18 },
    source: PNCQ_HEMO,
    bands: [
      { min: null, max: 39, status: 'low', message: 'Hematócrito baixo.' },
      { min: 39, max: 52, status: 'optimal', message: 'Hematócrito normal.' },
      { min: 52, max: null, status: 'borderline_high', message: 'Hematócrito elevado.' },
    ],
  },
  {
    marker: 'hematocrit',
    label: 'Hematócrito',
    unit: '%',
    appliesTo: { sex: 'F', minAge: 18 },
    source: PNCQ_HEMO,
    bands: [
      { min: null, max: 35, status: 'low', message: 'Hematócrito baixo.' },
      { min: 35, max: 46, status: 'optimal', message: 'Hematócrito normal.' },
      { min: 46, max: null, status: 'borderline_high', message: 'Hematócrito elevado.' },
    ],
  },

  // ──────────────────────────────────────────────────────────────────
  // OUTROS — quando o laudo traz, o app interpreta.
  // ──────────────────────────────────────────────────────────────────
  {
    marker: 'crp',
    label: 'PCR ultrassensível',
    unit: 'mg/L',
    appliesTo: { sex: 'any', minAge: 18 },
    source: 'AHA/CDC 2003 — PCR-us para risco cardiovascular',
    bands: [
      { min: null, max: 1, status: 'optimal', message: 'Inflamação baixa.' },
      { min: 1, max: 3, status: 'borderline_high', message: 'Inflamação moderada.' },
      { min: 3, max: 10, status: 'high', message: 'Inflamação elevada.', flag: 'anti_inflammatory' },
      { min: 10, max: null, status: 'critical_high', message: 'PCR muito alta — investigar infecção/inflamação.', flag: 'anti_inflammatory' },
    ],
  },
  {
    marker: 'magnesium',
    label: 'Magnésio sérico',
    unit: 'mg/dL',
    appliesTo: { sex: 'any', minAge: 18 },
    source: 'NIH ODS — Magnesium reference intervals',
    bands: [
      { min: null, max: 1.7, status: 'low', message: 'Magnésio baixo.', flag: 'magnesium_priority' },
      { min: 1.7, max: 2.4, status: 'optimal', message: 'Magnésio normal.' },
      { min: 2.4, max: null, status: 'borderline_high', message: 'Magnésio elevado.' },
    ],
  },
  {
    marker: 'sodium',
    label: 'Sódio',
    unit: 'mEq/L',
    appliesTo: { sex: 'any', minAge: 18 },
    source: 'SBPC — referência clínica padrão',
    bands: [
      { min: null, max: 135, status: 'low', message: 'Hiponatremia.' },
      { min: 135, max: 145, status: 'optimal', message: 'Sódio normal.' },
      { min: 145, max: null, status: 'high', message: 'Hipernatremia.' },
    ],
  },
  {
    marker: 'potassium',
    label: 'Potássio',
    unit: 'mEq/L',
    appliesTo: { sex: 'any', minAge: 18 },
    source: 'SBPC — referência clínica padrão',
    bands: [
      { min: null, max: 3.5, status: 'low', message: 'Hipocalemia — atenção a câimbras.' },
      { min: 3.5, max: 5.1, status: 'optimal', message: 'Potássio normal.' },
      { min: 5.1, max: null, status: 'high', message: 'Hipercalemia — avaliação médica.' },
    ],
  },
]

// All canonical marker keys the goal engine knows about.
export const KNOWN_MARKER_KEYS = Array.from(
  new Set(RANGE_RULES.map((r) => r.marker)),
)

export function findRangeRule(
  marker: string,
  sex: Sex,
  age: number,
): RangeRule | null {
  const candidates = RANGE_RULES.filter((r) => r.marker === marker)
  for (const rule of candidates) {
    const a = rule.appliesTo
    if (a.sex && a.sex !== 'any' && a.sex !== sex) continue
    if (typeof a.minAge === 'number' && age < a.minAge) continue
    if (typeof a.maxAge === 'number' && age > a.maxAge) continue
    return rule
  }
  return null
}

export function classifyValue(value: number, bands: Band[]): Band | null {
  for (const band of bands) {
    const aboveMin = band.min === null || value >= band.min
    const belowMax = band.max === null || value < band.max
    if (aboveMin && belowMax) return band
  }
  return null
}
