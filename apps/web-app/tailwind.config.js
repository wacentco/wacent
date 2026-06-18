/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0F1E',
        surface: '#111827',
        'surface-raised': '#1A2236',
        border: '#1E2D45',
        primary: '#00D68F',
        'primary-dark': '#00A36C',
        accent: '#6366F1',
        'text-primary': '#F1F5F9',
        'text-secondary': '#94A3B8',
        'text-muted': '#475569',
        success: '#00D68F',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      backgroundImage: {
        'primary-glow': 'radial-gradient(circle, rgba(0,214,143,0.12) 0%, transparent 70%)',
      },
    },
  },
  plugins: [],
}
