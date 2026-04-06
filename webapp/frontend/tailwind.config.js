/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'Inter', 'sans-serif'],
        display: ['Clash Display', 'Space Grotesk', 'sans-serif'],
      },
      colors: {
        // Geometric poster bold palette using OKLCH
        'brand': 'oklch(60% 0.25 15)', // Bold Red/Orange
        'brand-accent': 'oklch(80% 0.15 85)', // Vibrant Yellow
        'brand-dark': 'oklch(20% 0.05 250)', // Deep Navy/Ink
        'bg-primary': 'oklch(98% 0.01 90)', // Tinted off-white
        'bg-secondary': 'oklch(95% 0.02 90)', // Slightly darker tinted off-white
        'text-primary': 'oklch(15% 0.02 250)', // Almost black ink
        'text-secondary': 'oklch(40% 0.02 250)', // Dark gray ink
        'surface': '#ffffff',
        'border-color': 'oklch(85% 0.02 250)',
      },
      boxShadow: {
        'solid': '6px 6px 0px 0px rgba(0,0,0,1)',
        'solid-hover': '2px 2px 0px 0px rgba(0,0,0,1)',
      },
      borderRadius: {
        'geometric': '1.5rem', // Slightly rounded geometric shapes
        'geometric-lg': '2.5rem',
      }
    },
  },
  plugins: [],
}
