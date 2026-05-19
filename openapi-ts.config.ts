import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: '../thefactory-backend/swagger/swagger.json',
  output: {
    path: './src/headless/api/generated',
  },
  plugins: ['@hey-api/client-axios', '@hey-api/typescript', '@hey-api/sdk'],
})
