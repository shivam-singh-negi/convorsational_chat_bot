class VoiceAssistantApp {
    constructor() {
        this.audioRecorder = new AudioRecorder();
        this.wsClient = new WebSocketClient();
        this.isSessionActive = false;
        this.isListening = false;
        this.isSpeaking = false;
        this.visualizerInterval = null;
        this.heartbeatInterval = null;
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupWebSocketCallbacks();
        this.checkAudioSupport();
    }

    initializeElements() {
        // Main control elements
        this.startBtn = document.getElementById('startBtn');
        this.recordBtn = document.getElementById('recordBtn');
        this.interruptBtn = document.getElementById('interruptBtn');
        
        // Status elements
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.statusIcon = document.getElementById('statusIcon');
        this.pulseRing = document.getElementById('pulseRing');
        
        // UI elements
        this.conversationLog = document.getElementById('conversationLog');
        this.audioVisualizer = document.getElementById('audioVisualizer');
        
        // Get visualizer bars
        this.visualizerBars = this.audioVisualizer.querySelectorAll('.visualizer-bar');
    }

    setupEventListeners() {
        // Start session button
        this.startBtn.addEventListener('click', () => this.startSession());
        
        // Record button - Hold to speak functionality
        this.recordBtn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.startListening();
        });
        
        this.recordBtn.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.stopListening();
        });
        
        this.recordBtn.addEventListener('mouseleave', (e) => {
            if (this.isListening) {
                this.stopListening();
            }
        });
        
        // Touch events for mobile devices
        this.recordBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startListening();
        });
        
        this.recordBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopListening();
        });
        
        this.recordBtn.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            if (this.isListening) {
                this.stopListening();
            }
        });
        
        // Interrupt button
        this.interruptBtn.addEventListener('click', () => this.interrupt());
        
        // Prevent context menu on record button
        this.recordBtn.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        document.addEventListener('keyup', (e) => this.handleKeyboardShortcuts(e));
        
        // Audio error handler
        window.addEventListener('audioError', (e) => {
            this.updateStatus(`Audio Error: ${e.detail.message}`, 'error');
            this.addMessageToLog('System', e.detail.message, 'system');
        });
        
        // Page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isListening) {
                this.stopListening();
            }
        });
        
        // Window before unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    handleKeyboardShortcuts(e) {
        // Space bar for push-to-talk
        if (e.code === 'Space' && !e.repeat) {
            e.preventDefault();
            
            if (e.type === 'keydown' && this.isSessionActive && !this.isListening && !this.isSpeaking) {
                this.startListening();
            } else if (e.type === 'keyup' && this.isListening) {
                this.stopListening();
            }
        }
        
        // Escape key to interrupt
        if (e.code === 'Escape' && e.type === 'keydown' && this.isSpeaking) {
            this.interrupt();
        }
    }

    setupWebSocketCallbacks() {
        // Connection established
        this.wsClient.on('connected', () => {
            console.log('WebSocket connected');
            this.updateStatus('Connected to server', 'ready');
        });

        // Connection lost
        this.wsClient.on('disconnected', (reason) => {
            console.log('WebSocket disconnected:', reason);
            this.isSessionActive = false;
            this.updateStatus('Disconnected from server', 'error');
            this.addMessageToLog('System', 'Connection lost. Please refresh the page.', 'system');
            this.resetButtons();
        });

        // Session ready
        this.wsClient.on('sessionReady', (data) => {
            console.log('Session ready:', data);
            this.isSessionActive = true;
            this.updateStatus('Ready to chat! 🎤', 'ready');
            this.recordBtn.disabled = false;
            this.interruptBtn.disabled = false;
            
            // Start heartbeat
            this.startHeartbeat();
            
            this.addMessageToLog('System', 'Voice session started! Hold the "Hold to Speak" button and talk about Revolt Motors.', 'system');
        });

        // Transcription received
        this.wsClient.on('transcription', (data) => {
            console.log('Transcription:', data.text);
            this.addMessageToLog('You', data.text, 'user');
        });

        // Audio response received
        this.wsClient.on('audioResponse', async (data) => {
            console.log('Audio response received:', data);
            this.isSpeaking = true;
            this.updateStatus('Speaking...', 'speaking');
            this.interruptBtn.disabled = false;
            
            // Add AI response to log
            if (data.text) {
                this.addMessageToLog('Rev', data.text, 'ai');
            }
            
            // Play the audio response
            try {
                if (data.text) {
                    await this.audioRecorder.speakText(data.text);
                } else if (data.audio) {
                    await this.audioRecorder.playAudioFromBase64(data.audio, data.mimeType);
                }
            } catch (error) {
                console.error('Error playing audio response:', error);
            }
        });

        // Turn complete
        this.wsClient.on('turnComplete', () => {
            console.log('Turn complete');
            this.isSpeaking = false;
            this.updateStatus('Ready to chat! 🎤', 'ready');
            this.interruptBtn.disabled = true;
        });

        // Interrupted successfully
        this.wsClient.on('interrupted', () => {
            console.log('Speech interrupted');
            this.isSpeaking = false;
            this.audioRecorder.stopSpeaking();
            this.updateStatus('Interrupted. Ready to chat! 🎤', 'ready');
            this.interruptBtn.disabled = true;
            this.addMessageToLog('System', 'Speech interrupted.', 'system');
        });

        // Error handling
        this.wsClient.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.updateStatus(`Error: ${error.message}`, 'error');
            this.addMessageToLog('System', `Error: ${error.message}`, 'system');
            
            if (error.type === 'rate-limit') {
                this.recordBtn.disabled = true;
                setTimeout(() => {
                    if (this.isSessionActive) {
                        this.recordBtn.disabled = false;
                    }
                }, 60000); // Re-enable after 1 minute
            }
        });
    }

    checkAudioSupport() {
        if (!AudioRecorder.isSupported()) {
            this.updateStatus('Audio not supported in this browser', 'error');
            this.startBtn.disabled = true;
            this.addMessageToLog('System', 'Your browser does not support audio recording. Please use Chrome, Firefox, or Safari.', 'system');
        }
    }

    async startSession() {
        try {
            this.updateStatus('Initializing...', 'loading');
            this.startBtn.disabled = true;
            this.startBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Initializing...</span>';
            
            // Initialize audio recorder
            const audioInitialized = await this.audioRecorder.initialize();
            if (!audioInitialized) {
                throw new Error('Failed to initialize audio. Please check microphone permissions.');
            }
            
            this.updateStatus('Connecting to server...', 'loading');
            
            // Connect to WebSocket
            await this.wsClient.connect();
            
            this.updateStatus('Starting voice session...', 'loading');
            
            // Start Gemini session
            const sessionStarted = this.wsClient.startSession();
            if (!sessionStarted) {
                throw new Error('Failed to start voice session');
            }
            
        } catch (error) {
            console.error('Error starting session:', error);
            this.updateStatus('Failed to start session', 'error');
            this.addMessageToLog('System', error.message, 'system');
            this.resetStartButton();
        }
    }

    startListening() {
        if (!this.isSessionActive || this.isListening || this.isSpeaking) {
            console.warn('Cannot start listening:', { 
                sessionActive: this.isSessionActive, 
                isListening: this.isListening, 
                isSpeaking: this.isSpeaking 
            });
            return;
        }
        
        console.log('Starting to listen...');
        this.isListening = true;
        this.updateStatus('Listening...', 'listening');
        this.recordBtn.classList.add('recording');
        this.statusIcon.textContent = '🎤';
        
        // Start audio visualization
        this.startAudioVisualization();
        
        // Start recording and send audio data in real-time
        const recordingStarted = this.audioRecorder.startRecording((audioData) => {
            this.wsClient.sendAudioData(audioData);
        });
        
        if (!recordingStarted) {
            this.stopListening();
            this.updateStatus('Failed to start recording', 'error');
        }
    }

    stopListening() {
        if (!this.isListening) {
            return;
        }
        
        console.log('Stopping listening...');
        this.isListening = false;
        this.audioRecorder.stopRecording();
        this.recordBtn.classList.remove('recording');
        this.statusIcon.textContent = '⏳';
        
        // Stop audio visualization
        this.stopAudioVisualization();
        
        // Notify server that audio input has ended
        this.wsClient.endAudioInput();
        
        this.updateStatus('Processing...', 'processing');
    }

    interrupt() {
        if (!this.isSpeaking) {
            console.warn('Cannot interrupt: not currently speaking');
            return;
        }
        
        console.log('Interrupting speech...');
        this.wsClient.interrupt();
        this.updateStatus('Interrupting...', 'processing');
        this.statusIcon.textContent = '✋';
    }

    updateStatus(text, state) {
        this.statusText.textContent = text;
        
        // Remove all state classes
        this.pulseRing.classList.remove('listening', 'speaking', 'processing', 'error', 'ready', 'loading');
        
        // Add current state class
        if (state) {
            this.pulseRing.classList.add(state);
        }
        
        // Update status text color and icon based on state
        const stateConfig = {
            ready: { color: '#667eea', icon: '🎙️' },
            listening: { color: '#ff6b6b', icon: '🎤' },
            speaking: { color: '#28a745', icon: '🗣️' },
            processing: { color: '#ffa726', icon: '⏳' },
            error: { color: '#dc3545', icon: '❌' },
            loading: { color: '#6c757d', icon: '⏳' }
        };
        
        if (stateConfig[state]) {
            this.statusText.style.color = stateConfig[state].color;
            if (this.statusIcon && !this.isListening) {
                this.statusIcon.textContent = stateConfig[state].icon;
            }
        }
    }

    addMessageToLog(sender, message, type = 'user') {
        // Remove welcome message if it exists
        const welcomeMessage = this.conversationLog.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <strong>${sender}</strong>
                <span class="message-time">${timestamp}</span>
            </div>
            <div class="message-content">${this.escapeHtml(message)}</div>
        `;
        
        this.conversationLog.appendChild(messageDiv);
        this.conversationLog.scrollTop = this.conversationLog.scrollHeight;
        
        // Limit message history to prevent memory issues
        const messages = this.conversationLog.querySelectorAll('.message');
        if (messages.length > 50) {
            messages[0].remove();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    startAudioVisualization() {
        if (this.visualizerInterval) {
            return;
        }
        
        this.audioVisualizer.classList.add('active');
        
        this.visualizerInterval = setInterval(() => {
            if (!this.isListening) {
                return;
            }
            
            // Get audio data for visualization
            const audioData = this.audioRecorder.getVisualizationData();
            
            // Update visualizer bars
            this.visualizerBars.forEach((bar, index) => {
                const height = Math.max(10, audioData[index] * 50);
                bar.style.height = `${height}px`;
            });
        }, 100);
    }

    stopAudioVisualization() {
        if (this.visualizerInterval) {
            clearInterval(this.visualizerInterval);
            this.visualizerInterval = null;
        }
        
        this.audioVisualizer.classList.remove('active');
        
        // Reset visualizer bars
        this.visualizerBars.forEach(bar => {
            bar.style.height = '10px';
        });
    }

    startHeartbeat() {
        if (this.heartbeatInterval) {
            return;
        }
        
        // Send heartbeat every 30 seconds to keep connection alive
        this.heartbeatInterval = setInterval(() => {
            if (this.wsClient.getConnectionStatus().connected) {
                this.wsClient.sendHeartbeat();
            }
        }, 30000);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    resetButtons() {
        this.recordBtn.disabled = true;
        this.interruptBtn.disabled = true;
        this.recordBtn.classList.remove('recording');
        this.resetStartButton();
    }

    resetStartButton() {
        this.startBtn.disabled = false;
        this.startBtn.innerHTML = '<span class="btn-icon">🚀</span><span class="btn-text">Start Conversation</span>';
    }

    // Get app statistics
    getStatistics() {
        const messages = this.conversationLog.querySelectorAll('.message');
        const userMessages = this.conversationLog.querySelectorAll('.user-message');
        const aiMessages = this.conversationLog.querySelectorAll('.ai-message');
        
        return {
            totalMessages: messages.length,
            userMessages: userMessages.length,
            aiMessages: aiMessages.length,
            sessionActive: this.isSessionActive,
            connectionStatus: this.wsClient.getConnectionStatus()
        };
    }

    // Export conversation log
    exportConversation() {
        const messages = this.conversationLog.querySelectorAll('.message');
        const conversation = Array.from(messages).map(msg => {
            const header = msg.querySelector('.message-header strong').textContent;
            const content = msg.querySelector('.message-content').textContent;
            const time = msg.querySelector('.message-time').textContent;
            return `[${time}] ${header}: ${content}`;
        }).join('\n');
        
        const blob = new Blob([conversation], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `revolt-conversation-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Clear conversation log
    clearConversation() {
        if (confirm('Are you sure you want to clear the conversation history?')) {
            this.conversationLog.innerHTML = `
                <div class="welcome-message">
                    <div class="message-content">
                        <p>👋 Hi! I'm <strong>Rev</strong>, your Revolt Motors voice assistant.</p>
                        <p>Press <strong>"Start Conversation"</strong> to begin, then <strong>hold "Hold to Speak"</strong> to talk with me about Revolt Motors and our amazing electric motorcycles!</p>
                        <p>💡 <em>Try asking about: RV400 specs, pricing, dealerships, battery range, or anything about Revolt!</em></p>
                    </div>
                </div>
            `;
        }
    }

    cleanup() {
        console.log('Cleaning up application...');
        
        // Stop any ongoing processes
        this.stopListening();
        this.stopAudioVisualization();
        this.stopHeartbeat();
        
        // Cleanup audio and WebSocket
        this.audioRecorder.cleanup();
        this.wsClient.cleanup();
        
        // Reset state
        this.isSessionActive = false;
        this.isListening = false;
        this.isSpeaking = false;
    }

    // Debug method
    getDebugInfo() {
        return {
            app: {
                sessionActive: this.isSessionActive,
                isListening: this.isListening,
                isSpeaking: this.isSpeaking
            },
            audio: {
                supported: AudioRecorder.isSupported(),
                context: this.audioRecorder.audioContext?.state,
                stream: !!this.audioRecorder.stream
            },
            websocket: this.wsClient.getConnectionStatus(),
            statistics: this.getStatistics()
        };
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Revolt Motors Voice Assistant...');
    
    const app = new VoiceAssistantApp();
    
    // Make app globally accessible for debugging
    window.revoltApp = app;
    
    // Add keyboard shortcut info to console
    console.log('⌨️  Keyboard shortcuts:');
    console.log('  - Space: Hold to speak (when session is active)');
    console.log('  - Escape: Interrupt AI speech');
    console.log('💡 Debug info available via: window.revoltApp.getDebugInfo()');
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        app.cleanup();
    });
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && app.isListening) {
            app.stopListening();
        }
    });
    
    console.log('✅ Revolt Motors Voice Assistant initialized successfully!');
});

// Service worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}