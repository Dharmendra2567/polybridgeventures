/**
 * Global API Base URL
 * Monolithic deployment uses relative path '/api/v1'.
 * Resolves seamlessly to the same origin on:
 * - Local development (via Vite reverse proxy to Fastify port 4000)
 * - Localtunnel (via Vite reverse proxy over tunnel)
 * - Vercel production (via monolithic Vercel Serverless Function)
 */
export const API_BASE = '/api/v1';
