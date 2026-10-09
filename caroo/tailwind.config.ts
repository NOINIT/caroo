import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        caroo: {
          groen: '#1A7A6E',
          'groen-licht': '#E8F5F3',
          oranje: '#E8711A',
          'oranje-licht': '#FDF2EC',
          donker: '#1A2F5A',
          grijs: '#6B7280',
          'grijs-licht': '#F3F4F6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // WCAG AA: minimaal 18px voor body tekst ouderen interface
        'ou-sm': ['1rem', { lineHeight: '1.6' }],     // 16px
        'ou-base': ['1.125rem', { lineHeight: '1.6' }], // 18px
        'ou-lg': ['1.25rem', { lineHeight: '1.5' }],   // 20px
        'ou-xl': ['1.5rem', { lineHeight: '1.4' }],    // 24px
        'ou-2xl': ['1.875rem', { lineHeight: '1.3' }], // 30px
      },
      borderRadius: {
        caroo: '0.75rem',
        'caroo-lg': '1rem',
      },
    },
  },
  plugins: [],
}

export default config
