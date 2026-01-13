import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

export default defineConfig({
	plugins: [sveltekit()]
});
