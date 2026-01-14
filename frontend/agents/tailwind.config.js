/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'agent-mint': '#a8dadc', // اللون الأخضر المائي من صورتك
        'agent-light': '#d1e7e0', // لون خلفية الـ feed
      }
    },
  },
  plugins: [],
}