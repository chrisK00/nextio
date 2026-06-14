import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		babel({ presets: [reactCompilerPreset()] })
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