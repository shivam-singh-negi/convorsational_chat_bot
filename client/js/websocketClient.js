class WebSocketClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.sessionId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.callbacks = {
            sessionReady: null,
            audioResponse: null,
            transcription: null,
            turnComplete: null,
            interrupted: null,
            error: null,
            connected: null,
            disconnected: null
        };
    }

    connect() {
        return new Promise((resolve, reject) => {
            try {
                console.log('Connecting to server...');
                
                // Initialize socket connection
                this.socket = io({
                    transports: ['websocket', 'polling'],
                    upgrade: true,
                    rememberUpgrade: true,
                    timeout: 10000,
                    forceNew: true
                });
                
                // Connection success handler
                this.socket.on('connect', () => {
                    console.log('Connected to server successfully');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    
                    if (this.callbacks.connected) {
                        this.callbacks.connected();
                    }
                    
                    resolve();
                });
                
                // Connection error handler
                this.socket.on('connect_error', (error) => {
                    console.error('Connection error:', error);
                    this.isConnected = false;
                    
                    if (this.reconnectAttempts === 0) {
                        // First connection attempt failed
                        reject(new Error(`Failed to connect to server: ${error.message}`));
                    } else {
                        // Reconnection attempt failed
                        this.handleReconnection();
                    }
                });
                
                // Disconnection handler
                this.socket.on('disconnect', (reason) => {
                    console.log('Disconnected from server:', reason);
                    this.isConnected = false;
                    this.sessionId = null;
                    
                    if (this.callbacks.disconnected) {
                        this.callbacks.disconnected(reason);
                    }
                    
                    // Auto-reconnect unless it was intentional
                    if (reason !== 'io client disconnect') {
                        this.handleReconnection();
                    }
                });
                
                // Session ready handler
                this.socket.on('session-ready', (data) => {
                    this.sessionId = data.sessionId;
                    console.log('Session ready:', this.sessionId);
                    
                    if (this.callbacks.sessionReady) {
                        this.callbacks.sessionReady(data);
                    }
                });
                
                // Audio response handler
                this.socket.on('audio-response', (data) => {
                    console.log('Audio response received');
                    
                    if (this.callbacks.audioResponse) {
                        this.callbacks.audioResponse(data);
                    }
                });
                
                // Transcription handler
                this.socket.on('transcription', (data) => {
                    console.log('Transcription received:', data.text);
                    
                    if (this.callbacks.transcription) {
                        this.callbacks.transcription(data);
                    }
                });
                
                // Turn complete handler
                this.socket.on('turn-complete', () => {
                    console.log('Turn complete');
                    
                    if (this.callbacks.turnComplete) {
                        this.callbacks.turnComplete();
                    }
                });
                
                // Interruption handler
                this.socket.on('interrupted', () => {
                    console.log('Successfully interrupted');
                    
                    if (this.callbacks.interrupted) {
                        this.callbacks.interrupted();
                    }
                });
                
                // Error handler
                this.socket.on('error', (error) => {
                    console.error('Socket error:', error);
                    
                    if (this.callbacks.error) {
                        this.callbacks.error(error);
                    }
                });
                
                // Custom event handlers
                this.setupCustomEventHandlers();
                
            } catch (error) {
                console.error('Failed to initialize socket connection:', error);
                reject(error);
            }
        });
    }

    setupCustomEventHandlers() {
        // Handle server status updates
        this.socket.on('server-status', (data) => {
            console.log('Server status:', data);
        });

        // Handle rate limiting notifications
        this.socket.on('rate-limit', (data) => {
            console.warn('Rate limit warning:', data);
            if (this.callbacks.error) {
                this.callbacks.error({
                    message: 'Rate limit reached. Please wait before making more requests.',
                    type: 'rate-limit'
                });
            }
        });
    }

    handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            if (this.callbacks.error) {
                this.callbacks.error({
                    message: 'Lost connection to server. Please refresh the page.',
                    type: 'connection-lost'
                });
            }
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
        
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
        
        setTimeout(() => {
            if (!this.isConnected && this.socket) {
                this.socket.connect();
            }
        }, delay);
    }

    startSession() {
        if (!this.isConnected) {
            console.error('Cannot start session: not connected to server');
            return false;
        }

        console.log('Starting new session...');
        this.socket.emit('start-session');
        return true;
    }

    sendAudioData(audioData) {
        if (!this.isConnected || !this.sessionId) {
            console.warn('Cannot send audio: no active session');
            return false;
        }

        // Send audio data chunk
        this.socket.emit('audio-data', { 
            audio: audioData,
            sessionId: this.sessionId,
            timestamp: Date.now()
        });
        
        return true;
    }

    endAudioInput() {
        if (!this.isConnected || !this.sessionId) {
            console.warn('Cannot end audio input: no active session');
            return false;
        }

        console.log('Ending audio input...');
        this.socket.emit('audio-end', {
            sessionId: this.sessionId,
            timestamp: Date.now()
        });
        
        return true;
    }

    interrupt() {
        if (!this.isConnected || !this.sessionId) {
            console.warn('Cannot interrupt: no active session');
            return false;
        }

        console.log('Sending interrupt signal...');
        this.socket.emit('interrupt', {
            sessionId: this.sessionId,
            timestamp: Date.now()
        });
        
        return true;
    }

    // Register event callbacks
    on(event, callback) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = callback;
        } else {
            console.warn(`Unknown event: ${event}`);
        }
    }

    // Remove event callback
    off(event) {
        if (this.callbacks.hasOwnProperty(event)) {
            this.callbacks[event] = null;
        }
    }

    // Get connection status
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            sessionActive: !!this.sessionId,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    // Send heartbeat to keep connection alive
    sendHeartbeat() {
        if (this.isConnected && this.socket) {
            this.socket.emit('heartbeat', {
                timestamp: Date.now(),
                sessionId: this.sessionId
            });
        }
    }

    // Clean disconnect
    disconnect() {
        console.log('Disconnecting from server...');
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.isConnected = false;
        this.sessionId = null;
        this.reconnectAttempts = 0;
    }

    // Cleanup method
    cleanup() {
        this.disconnect();
        
        // Clear all callbacks
        Object.keys(this.callbacks).forEach(key => {
            this.callbacks[key] = null;
        });
    }
}