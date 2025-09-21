# AI Voice Chatbot

A real-time conversational voice interface built with the Gemini Live API, replicating the functionality of the Revolt Motors chatbot with advanced features like voice interruption and low-latency responses.

## 🎯 Features

- **Real-time Voice Conversation**: Natural speech-to-speech interaction
- **Voice Interruption**: Interrupt the AI mid-response for dynamic conversations  
- **Low Latency**: 1-2 second response times
- **Server-to-Server Architecture**: Secure backend implementation
- **Revolt Motors Focus**: AI assistant specialized in Revolt Motors information
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Gemini API key from [aistudio.google.com](https://aistudio.google.com)

### Installation

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd revolt-voice-chatbot
```

2. **Install server dependencies:**
```bash
cd server
npm install
```

3. **Set up environment variables:**
Create a `.env` file in the root directory:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
NODE_ENV=development
```

4. **Start the development server:**
```bash
npm run dev
```

5. **Open your browser:**
Navigate to `http://localhost:3000`

## 📁 Project Structure

```
revolt-voice-chatbot/
├── server/
│   ├── package.json
│   ├── server.js                 # Main server file
│   ├── config/
│   │   └── config.js            # Configuration settings
│   ├── services/
│   │   └── geminiService.js     # Gemini API integration
│   └── utils/
│       └── audioUtils.js        # Audio processing utilities
├── client/
│   ├── index.html               # Main HTML file
│   ├── css/
│   │   └── styles.css          # Styling
│   ├── js/
│   │   ├── app.js              # Main application logic
│   │   ├── audioRecorder.js    # Audio recording functionality
│   │   └── websocketClient.js  # WebSocket communication
│   └── assets/                 # Static assets
├── README.md
└── .env                        # Environment variables
```

## 🎙️ How to Use

1. **Start Conversation**: Click "Start Conversation" to initialize the voice session
2. **Hold to Speak**: Press and hold "Hold to Speak" button while talking
3. **Release to Send**: Release the button to send your audio to the AI
4. **Interrupt Anytime**: Click "Interrupt" to stop the AI mid-response
5. **Ask About Revolt**: The AI focuses on Revolt Motors topics - bikes, specs, pricing, etc.

## ⚙️ Configuration

### Model Selection

For **development** (higher rate limits):
```javascript
geminiModel: 'gemini-live-2.5-flash-preview'
```

For **production** (native audio dialog):
```javascript
geminiModel: 'gemini-2.5-flash-preview-native-audio-dialog'
```

### System Instructions

The AI is configured with specific instructions to only discuss  Motors vehicle topics. You can modify the system instructions in `server/config/config.js`:

```javascript
systemInstructions: `You are Rev, the voice assistant for Revolt Motors...`
```

## 🛠️ Development

### Running in Development Mode

```bash
cd server
npm run dev
```

This uses nodemon for automatic server restarts on file changes.

### Testing the Application

1. **Audio Permissions**: Ensure your browser allows microphone access
2. **HTTPS**: For production, serve over HTTPS for microphone access
3. **Network**: Test on different network conditions for latency

## 📱 Browser Compatibility

- **Chrome**: Full support
- **Firefox**: Full support  
- **Safari**: Requires HTTPS for microphone access
- **Mobile**: Touch-friendly interface with mobile gesture support

## 🔧 Troubleshooting

### Common Issues

**1. Microphone not working:**
- Check browser permissions
- Ensure HTTPS in production
- Try a different browser

**2. High latency:**
- Check internet connection
- Switch to development model for testing
- Verify API key has sufficient quota

**3. WebSocket connection fails:**
- Check firewall settings
- Verify server is running
- Check console for error messages

**4. Audio not playing:**
- Check browser audio permissions
- Verify audio context is started (user interaction required)
- Check browser console for errors

### API Rate Limits

The free tier has strict rate limits. For extensive testing:
- Use `gemini-live-2.5-flash-preview` during development
- Monitor usage at [aistudio.google.com](https://aistudio.google.com)
- Consider upgrading to paid tier for production

## 🚀 Deployment

### Environment Setup

```bash
NODE_ENV=production
GEMINI_API_KEY=your_production_key
PORT=80
```

### Production Recommendations

1. **HTTPS**: Required for microphone access
2. **Process Manager**: Use PM2 or similar for process management
3. **Reverse Proxy**: Use nginx for load balancing and SSL termination
4. **Rate Limiting**: Implement rate limiting for API protection
5. **Monitoring**: Add logging and monitoring for production use

### Docker Deployment (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Performance Optimization

- **Audio Chunk Size**: Optimized for 4096 samples
- **Sample Rate**: 16kHz for efficient processing  
- **Compression**: PCM to base64 encoding for transmission
- **Connection Pooling**: WebSocket connections are reused

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini Live API for powerful voice capabilities
- Socket.IO for real-time communication
- Web Audio API for audio processing
