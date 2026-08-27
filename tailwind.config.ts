import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d5ebff',
          200: '#b4dcff',
          300: '#7fc7ff',
          400: '#46a8ff',
          500: '#1c8ef7',
          600: '#0d73d3',
          700: '#0b5aa6',
          800: '#0f4d87',
          900: '#133f6d',
        },
      },
      boxShadow: {
        soft: '0 20px 45px rgba(18, 33, 66, 0.14)',
      },
    },
  },
  plugins: [],
};

export default config;
