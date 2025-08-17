module.exports = {
  content: ['./views/gc.ejs'],
  theme: {
    extend: {
      colors: {
        primary: '#1E40AF',
        secondary: '#D97706',
        neutral: {
          100: '#F3F4F6',
          200: '#E5E7EB',
          800: '#1F2937',
          900: '#111827'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    }
  },
  plugins: []
}