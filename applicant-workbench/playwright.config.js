import { defineConfig, devices } from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'*.spec.js',fullyParallel:false,workers:1,reporter:'list',use:{baseURL:process.env.APP_URL||'http://127.0.0.1:3200',trace:'retain-on-failure',screenshot:'only-on-failure'},projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}]});
