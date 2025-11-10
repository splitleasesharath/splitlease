#!/bin/bash

# Cloudflare Pages build script
# This script builds the app and prepares it for deployment

echo "🔨 Starting build process..."

# Navigate to app directory
cd app || exit 1

echo "📦 Installing dependencies..."
npm install

echo "🏗️ Building application..."
npm run build

echo "✅ Build complete!"
echo "📁 Build output is in: app/dist"

# List the output for verification
ls -la dist/
