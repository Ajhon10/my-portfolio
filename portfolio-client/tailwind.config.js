/** @type {import('tailwindcss').Config} */

export default {
	content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
	darkMode: 'class',
	theme: {
		extend: {
			fontFamily: {
				inter: ['Inter', 'sans-serif'],
				mono: ['"JetBrains Mono"', 'monospace'],
				display: ['"Space Grotesk"', 'sans-serif'],
			},
			colors: {
				brand: {
					black: '#000000',
					blue: '#0066ff',
					blueDark: '#0044cc',
					blueLight: '#3388ff',
					gold: '#ffd700',
					gray: {
						50: '#f8fafc',
						100: '#f1f5f9',
						200: '#e2e8f0',
						300: '#cbd5e1',
						400: '#94a3b8',
						500: '#64748b',
						600: '#475569',
						700: '#334155',
						800: '#1e293b',
						900: '#0f172a',
						950: '#020617',
					},
				},
			},
			animation: {
				'blink-cursor': 'blink 1s step-end infinite',
				'gradient-shift': 'gradient-shift 12s ease infinite',
				'float-slow': 'float 8s ease-in-out infinite',
				'fade-in-up': 'fade-in-up 0.6s ease-out',
				'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
				'spin-slow': 'spin 4s linear infinite',
			},
			keyframes: {
				blink: {
					'0%, 50%': { opacity: '1' },
					'50.01%, 100%': { opacity: '0' },
				},
				'gradient-shift': {
					'0%, 100%': { backgroundPosition: '0% 50%' },
					'50%': { backgroundPosition: '100% 50%' },
				},
				float: {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-20px)' },
				},
				'fade-in-up': {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				'pulse-soft': {
					'0%, 100%': { opacity: '0.6' },
					'50%': { opacity: '1' },
				},
			},
			backgroundImage: {
				'grid-blue': 'linear-gradient(to right, rgba(0,102,255,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,102,255,0.07) 1px, transparent 1px)',
				'hero-gradient': 'radial-gradient(ellipse at top left, rgba(0,102,255,0.18), transparent 50%), radial-gradient(ellipse at bottom right, rgba(51,136,255,0.12), transparent 50%)',
			},
			boxShadow: {
				'glow-blue': '0 0 30px rgba(0,102,255,0.45)',
				'glow-gold': '0 0 24px rgba(255,215,0,0.35)',
			},
		},
	},
	plugins: [],
}
