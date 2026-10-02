import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		babel({ presets: [reactCompilerPreset()] }),
		VitePWA({
			registerType: 'autoUpdate',
			injectRegister: 'auto',
			manifest: false,
			includeAssets: ['favicon.svg', 'icons.svg', 'manifest.json'],
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
				navigateFallback: 'index.html',
				cleanupOutdatedCaches: true,
			},
		})
	],
	define: {
		'process.env': {
			API_BASE_URL: process.env.VITE_API_BASE_URL || 'http://localhost:5149',
		},
	},
	// Add this css and build block to guarantee strict source mapping
	css: {
		devSourcemap: true
	},
	build: {
		sourcemap: true
	}
})