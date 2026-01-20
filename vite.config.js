import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load .env file
dotenv.config();

// Read version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
const version = packageJson.version;

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		'__APP_VERSION__': JSON.stringify(version)
	}
});
