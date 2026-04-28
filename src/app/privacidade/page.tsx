import Link from "next/link"

export const metadata = {
  title: "Política de Privacidade — Salus",
  description: "Como a Salus coleta, usa e protege seus dados.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#faf8f4] text-[#1a3a2a]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-[#1a3a2a]/60 hover:text-[#1a3a2a]">
          ← Voltar
        </Link>
        <h1 className="mt-6 font-serif text-4xl italic">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-[#1a3a2a]/60">Última atualização: 23 de abril de 2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-[#1a3a2a]/80">
          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">1. Quem somos</h2>
            <p className="mt-2">
              Salus é um app de nutrição inteligente que usa IA para analisar refeições, gerar planos
              alimentares e acompanhar dados de saúde. Esta política descreve quais dados coletamos,
              como usamos e seus direitos.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">2. Dados que coletamos</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><b>Conta:</b> e-mail, nome, senha (com hash), telefone (opcional).</li>
              <li><b>Perfil:</b> idade, sexo biológico, altura, peso, nível de atividade, cidade.</li>
              <li><b>Saúde:</b> objetivos, restrições alimentares, alergias, exames laboratoriais inseridos voluntariamente.</li>
              <li><b>Refeições:</b> fotos do prato, alimentos detectados, macros, score nutricional.</li>
              <li><b>Uso:</b> data e hora de registro, sequência de dias (streak), recomendações geradas.</li>
              <li><b>Pagamento:</b> ID de assinatura via Apple/Google. <b>Não armazenamos dados de cartão</b> — esses ficam com Apple/Google.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">3. Como usamos seus dados</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Operar o serviço (analisar refeições, gerar planos, calcular scores).</li>
              <li>Personalizar recomendações com base no seu perfil e objetivos.</li>
              <li>Melhorar o produto (analytics agregados e anônimos).</li>
              <li>Enviar notificações que você habilitou.</li>
              <li>Cumprir obrigações legais (LGPD, GDPR onde aplicável).</li>
            </ul>
            <p className="mt-3"><b>Não vendemos seus dados. Nunca.</b></p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">4. Quem processa seus dados (sub-processadores)</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><b>Supabase</b> (banco de dados, autenticação) — EUA, conformidade GDPR.</li>
              <li><b>Anthropic (Claude)</b> — análise de IA das fotos e texto. Não retém dados após o processamento.</li>
              <li><b>Vercel</b> — hospedagem da plataforma web.</li>
              <li><b>RevenueCat</b> — gestão de assinaturas no app móvel.</li>
              <li><b>Google OAuth</b> — apenas se você optar por entrar com Google.</li>
              <li><b>Apple Sign In</b> — apenas se você optar por entrar com Apple.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">5. Uso de IA</h2>
            <p className="mt-2">
              A Salus usa modelos de IA (Anthropic Claude) para identificar alimentos em fotos, estimar
              porções e gerar recomendações nutricionais. <b>As estimativas da IA são aproximações</b> —
              valores reais podem variar. <b>O conteúdo gerado pela IA não substitui aconselhamento
              médico, nutricional ou diagnóstico profissional.</b> Sempre consulte um profissional de
              saúde antes de mudanças significativas na sua dieta.
            </p>
            <p className="mt-2">
              Você pode reportar conteúdo gerado pela IA que pareça incorreto ou prejudicial via
              <a href="mailto:suporte@nulllabs.org" className="text-[#c4614a] hover:underline"> suporte@nulllabs.org</a>.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">6. Seus direitos (LGPD/GDPR)</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><b>Acesso:</b> baixe todos seus dados em <Link href="/settings" className="text-[#c4614a] hover:underline">Configurações</Link>.</li>
              <li><b>Correção:</b> edite seu perfil a qualquer momento.</li>
              <li><b>Exclusão:</b> exclua sua conta e todos os dados em Configurações → Excluir conta. A exclusão é imediata e permanente.</li>
              <li><b>Portabilidade:</b> exportação em JSON disponível em Configurações.</li>
              <li><b>Revogação de consentimento:</b> a qualquer momento, sem justificativa.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">7. Retenção</h2>
            <p className="mt-2">
              Mantemos seus dados enquanto sua conta estiver ativa. Ao excluir a conta, todos os dados
              pessoais são removidos em até 7 dias. Backups criptografados podem reter cópias por até
              30 dias antes da remoção definitiva.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">8. Segurança</h2>
            <p className="mt-2">
              Dados em trânsito são criptografados com TLS 1.2+. Dados em repouso são criptografados
              no nível do banco. Senhas usam hash bcrypt. Tokens de sessão expiram automaticamente.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">9. Crianças</h2>
            <p className="mt-2">
              A Salus não é destinada a menores de 18 anos. Não coletamos conscientemente dados de
              menores. Se você é responsável por um menor que criou uma conta, entre em contato.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">10. Mudanças</h2>
            <p className="mt-2">
              Podemos atualizar esta política. Mudanças materiais serão comunicadas por e-mail e
              dentro do app com pelo menos 30 dias de antecedência.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">11. Contato</h2>
            <p className="mt-2">
              Encarregado de Dados (DPO): <a href="mailto:privacidade@nulllabs.org" className="text-[#c4614a] hover:underline">privacidade@nulllabs.org</a><br />
              Suporte geral: <a href="mailto:suporte@nulllabs.org" className="text-[#c4614a] hover:underline">suporte@nulllabs.org</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
