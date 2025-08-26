@echo off
echo 🚀 Setting up Revolt Motors Voice Chatbot...

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm.
    pause
    exit /b 1
)

echo ✅ Node.js and npm are installed

:: Install server dependencies
echo 📦 Installing server dependencies...
cd server
call npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install server dependencies
    pause
    exit /b 1
)

echo ✅ Server dependencies installed successfully

:: Check if .env file exists
cd ..
if not exist .env (
    echo ⚠️  .env file not found. Creating template...
    (
        echo GEMINI_API_KEY=your_gemini_api_key_here
        echo PORT=3000
        echo NODE_ENV=development
    ) > .env
    echo 📝 Please edit .env file and add your Gemini API key from https://aistudio.google.com
)

echo 🎉 Setup complete!
echo 📋 Next steps:
echo    1. Edit .env file and add your Gemini API key
echo    2. Run: cd server && npm run dev
echo    3. Open http://localhost:3000 in your browser
echo    4. Allow microphone permissions when prompted
pause