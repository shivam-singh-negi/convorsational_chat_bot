#!/bin/bash

echo "🚀 Setting up Revolt Motors Voice Chatbot..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install server dependencies"
    exit 1
fi

echo "✅ Server dependencies installed successfully"

# Check if .env file exists
cd ..
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating template..."
    cat > .env << EOL
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
NODE_ENV=development
EOL
    echo "📝 Please edit .env file and add your Gemini API key from https://aistudio.google.com"
fi

echo "🎉 Setup complete!"
echo "📋 Next steps:"
echo "   1. Edit .env file and add your Gemini API key"
echo "   2. Run: cd server && npm run dev"
echo "   3. Open http://localhost:3000 in your browser"
echo "   4. Allow microphone permissions when prompted"