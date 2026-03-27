/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        head: ['Playfair Display', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy:    '#0A1628',
        navy2:   '#0D1F3C',
        teal:    '#0D9488',
        teal2:   '#0F766E',
        gold:    '#C8952A',
        gold2:   '#F0C040',
        'gold-bg': '#FEF9EC',
        off:     '#F4F6FB',
        lgray:   '#CBD5E1',
        bgray:   '#64748B',
        success: '#166534',
        'success-bg': '#DCFCE7',
      }
    }
  },
  plugins: []
}
