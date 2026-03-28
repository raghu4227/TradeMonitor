/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#F5A623',
          green: '#00C851',
          red: '#FF4444',
          blue: '#33B5E5',
          purple: '#AA66CC',
          orange: '#FF8800',
        },
        surface: {
          900: '#0d1117',
          800: '#161b22',
          700: '#21262d',
          600: '#30363d',
          500: '#484f58',
        },
      },
    },
  },
  plugins: [],
};
