import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Garante que o HTML do onboarding-nutri nunca fica em cache. O form
        // já é renderizado por um server component que redireciona usuários
        // que completaram onboarding, mas o no-store aqui protege contra
        // intermediate proxies servindo um shell antigo.
        source: '/onboarding-nutri',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
