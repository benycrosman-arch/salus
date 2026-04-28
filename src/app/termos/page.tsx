import Link from "next/link"

export const metadata = {
  title: "Termos de Uso — Salus",
  description: "Termos e condições do serviço Salus.",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#faf8f4] text-[#1a3a2a]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-[#1a3a2a]/60 hover:text-[#1a3a2a]">
          ← Voltar
        </Link>
        <h1 className="mt-6 font-serif text-4xl italic">Termos de Uso</h1>
        <p className="mt-2 text-sm text-[#1a3a2a]/60">Última atualização: 23 de abril de 2026</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-[#1a3a2a]/80">
          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">1. Aceitação</h2>
            <p className="mt-2">
              Ao criar uma conta ou usar a Salus (web, iOS ou Android), você concorda com estes
              Termos e com nossa <Link href="/privacidade" className="text-[#c4614a] hover:underline">Política de Privacidade</Link>.
              Se não concordar, não use o serviço.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">2. O que é a Salus</h2>
            <p className="mt-2">
              A Salus é um aplicativo de nutrição assistida por IA. Oferecemos análise de refeições
              por imagem, score nutricional, planos alimentares personalizados e recomendações.
              <b> A Salus não é um serviço médico, não realiza diagnósticos e não substitui aconselhamento
              de profissionais de saúde.</b>
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">3. Idade mínima</h2>
            <p className="mt-2">
              Você precisa ter <b>18 anos ou mais</b> para criar uma conta. Não coletamos
              conscientemente dados de menores.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">4. Sua conta</h2>
            <p className="mt-2">
              Você é responsável por manter suas credenciais seguras e por todas atividades na sua
              conta. Notifique-nos imediatamente se suspeitar de acesso não autorizado.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">5. Assinatura e pagamentos</h2>
            <p className="mt-2">
              A Salus oferece um plano gratuito com funcionalidades básicas e um plano <b>Pro</b> por
              assinatura paga.
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><b>Mensal:</b> R$ 59/mês.</li>
              <li><b>Anual:</b> R$ 590/ano (≈ R$ 49,17/mês — economia de 17%).</li>
            </ul>
            <p className="mt-2">
              Assinaturas no app iOS são processadas pela <b>Apple</b> e cobradas no seu Apple ID.
              Assinaturas no Android são processadas pelo <b>Google Play</b> e cobradas na sua conta
              Google. <b>Renovação automática</b> ao final de cada período, salvo cancelamento com no
              mínimo 24h de antecedência.
            </p>
            <p className="mt-2">
              <b>Para cancelar:</b> iOS — Ajustes → seu nome → Assinaturas. Android — Play Store →
              perfil → Pagamentos e assinaturas → Assinaturas.
            </p>
            <p className="mt-2">
              <b>Reembolsos:</b> sujeitos às políticas da Apple e do Google. A Salus não processa
              reembolsos diretamente.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">6. Uso de IA — limitações</h2>
            <p className="mt-2">
              As análises e recomendações são geradas por modelos de IA e podem conter imprecisões.
              <b> Não use a Salus como única fonte de decisão para condições médicas, alergias graves
              ou regimes nutricionais sob orientação clínica.</b> Em caso de dúvida, consulte um
              nutricionista, médico ou profissional habilitado.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">7. Uso aceitável</h2>
            <p className="mt-2">Você concorda em não:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Usar a Salus para qualquer fim ilegal ou enganoso.</li>
              <li>Tentar acessar dados de outros usuários ou comprometer a segurança do sistema.</li>
              <li>Fazer engenharia reversa, copiar ou redistribuir o serviço.</li>
              <li>Usar bots, scrapers ou automação não autorizada.</li>
              <li>Carregar conteúdo que não seja seu ou que viole direitos de terceiros.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">8. Conteúdo do usuário</h2>
            <p className="mt-2">
              Você mantém a propriedade das fotos, anotações e dados que carrega. Concede à Salus
              uma licença não-exclusiva apenas para operar o serviço (processar a foto pela IA,
              armazenar para você acessar depois). Não usamos seu conteúdo para treinar modelos
              externos.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">9. Encerramento</h2>
            <p className="mt-2">
              Você pode encerrar sua conta a qualquer momento em Configurações → Excluir conta.
              Podemos suspender ou encerrar contas que violem estes Termos, com aviso quando possível.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">10. Limitação de responsabilidade</h2>
            <p className="mt-2">
              A Salus é fornecida &ldquo;como está&rdquo;. Não garantimos resultados específicos de
              saúde, perda de peso ou desempenho atlético. Na máxima extensão permitida em lei,
              não nos responsabilizamos por danos indiretos, incidentais ou consequenciais decorrentes
              do uso do serviço.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">11. Alterações</h2>
            <p className="mt-2">
              Podemos modificar estes Termos. Mudanças materiais serão comunicadas com 30 dias de
              antecedência. O uso continuado após a comunicação implica aceitação.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">12. Lei e foro</h2>
            <p className="mt-2">
              Estes Termos são regidos pelas leis do Brasil. Fica eleito o foro da comarca de
              São Paulo/SP para dirimir controvérsias, salvo direitos de consumidor previstos no CDC.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-lg text-[#1a3a2a]">13. Contato</h2>
            <p className="mt-2">
              <a href="mailto:suporte@nulllabs.org" className="text-[#c4614a] hover:underline">
                suporte@nulllabs.org
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
