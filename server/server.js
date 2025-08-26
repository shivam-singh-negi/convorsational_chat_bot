const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('./config/config');
const geminiService = require('./services/geminiService');
const AudioUtils = require('./utils/audioUtils');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  let sessionId = null;
  let audioBuffer = [];

  socket.on('start-session', async () => {
    try {
      sessionId = uuidv4();
      console.log('Starting new session:', sessionId);
      
      const session = await geminiService.createLiveSession(sessionId);
      
      // Simulate session setup delay
      setTimeout(() => {
        socket.emit('session-ready', { 
          sessionId: sessionId,
          status: 'ready'
        });
      }, 1500);
      
    } catch (error) {
      console.error('Error starting session:', error);
      socket.emit('error', { message: 'Failed to start session' });
    }
  });

  socket.on('audio-data', async (data) => {
    if (!sessionId) {
      socket.emit('error', { message: 'No active session' });
      return;
    }

    try {
      // Accumulate audio data
      audioBuffer.push(data.audio);
      console.log(`Received audio data chunk for session ${sessionId}`);
      
    } catch (error) {
      console.error('Error processing audio data:', error);
      socket.emit('error', { message: 'Failed to process audio' });
    }
  });

  socket.on('audio-end', async () => {
    if (!sessionId || audioBuffer.length === 0) {
      return;
    }

    try {
      console.log(`Processing complete audio input for session ${sessionId}`);
      
      // Simulate speech-to-text conversion
      const combinedAudio = audioBuffer.join('');
      const transcribedText = AudioUtils.simulateSpeechToText(combinedAudio);
      
      console.log(`Transcribed text: ${transcribedText}`);
      
      // Process with Gemini
      const response = await geminiService.processAudioInput(sessionId, transcribedText);
      
      // Send transcription to client
      socket.emit('transcription', { text: transcribedText });
      
      // Simulate processing delay for realism
      setTimeout(() => {
        // Send audio response
        socket.emit('audio-response', {
          audio: response.audio.audioData,
          mimeType: response.audio.mimeType,
          text: response.text,
          duration: response.audio.duration
        });
        
        // Signal turn complete
        setTimeout(() => {
          socket.emit('turn-complete');
        }, response.audio.duration);
        
      }, 500); // 500ms processing delay
      
      // Clear audio buffer
      audioBuffer = [];
      
    } catch (error) {
      console.error('Error processing complete audio:', error);
      socket.emit('error', { message: 'Failed to process audio input' });
    }
  });

  socket.on('interrupt', async () => {
    if (!sessionId) return;

    try {
      await geminiService.interruptSpeech(sessionId);
      socket.emit('interrupted');
      console.log(`Interrupted session ${sessionId}`);
    } catch (error) {
      console.error('Error interrupting:', error);
      socket.emit('error', { message: 'Failed to interrupt' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (sessionId) {
      geminiService.closeSession(sessionId);
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
server.listen(config.port, () => {
  console.log(`🚀 Revolt Voice Chatbot Server running on port ${config.port}`);
  console.log(`📱 Open http://localhost:${config.port} to access the application`);
  console.log(`🔑 Gemini API Key: ${config.geminiApiKey ? 'Configured ✅' : 'Missing ❌'}`);
  console.log(`🎤 Ready to accept voice connections...`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});