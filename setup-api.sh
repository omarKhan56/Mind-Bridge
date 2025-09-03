#!/bin/bash

echo "🔑 MindBridge API Setup"
echo "======================"

# Check if .env exists
if [ ! -f "server/.env" ]; then
    echo "📝 Creating .env file from template..."
    cp server/.env.example server/.env
    echo "✅ Created server/.env"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🚀 Next Steps:"
echo "1. Get your Gemini API key from: https://makersuite.google.com/app/apikey"
echo "2. Edit server/.env and replace 'your-google-gemini-api-key-here' with your actual key"
echo "3. Test the setup: cd server && node scripts/simpleAITest.js"
echo ""
echo "📖 Full setup guide: See API_SETUP.md"
echo ""
echo "⚠️  Current Status: Using fallback algorithms (system works without API key)"
echo "✨  With API Key: Enhanced AI analysis, better insights, crisis detection"
