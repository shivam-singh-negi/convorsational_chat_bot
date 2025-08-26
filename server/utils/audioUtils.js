class AudioUtils {
  // Convert base64 to audio buffer
  static base64ToBuffer(base64String) {
    return Buffer.from(base64String, 'base64');
  }

  // Convert audio buffer to base64
  static bufferToBase64(buffer) {
    return buffer.toString('base64');
  }

  // Simulate speech-to-text conversion
  static simulateSpeechToText(audioData) {
    // In a real implementation, this would use a speech-to-text service
    // For demo purposes, return sample text based on audio length
    const audioLength = audioData.length;
    
    const sampleResponses = [
      "Tell me about Revolt Motors",
      "What is the price of RV400?",
      "What are the specifications of RV300?",
      "Where can I buy a Revolt motorcycle?",
      "How long does the battery last?",
      "What is the range of Revolt bikes?",
      "Tell me about battery swapping",
      "What colors are available?",
      "How fast can it go?",
      "Is there a mobile app?"
    ];
    
    // Return a random response based on audio data length
    const index = Math.floor(audioLength / 1000) % sampleResponses.length;
    return sampleResponses[index];
  }

  // Validate audio format
  static validateAudioFormat(mimeType) {
    const supportedFormats = [
      'audio/wav',
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
      'audio/mpeg',
      'audio/pcm'
    ];
    
    return supportedFormats.includes(mimeType);
  }

  // Process audio chunk for real-time streaming
  static processAudioChunk(chunk, sampleRate = 16000) {
    try {
      // Convert chunk to appropriate format for processing
      const processedChunk = {
        data: chunk,
        sampleRate: sampleRate,
        timestamp: Date.now()
      };
      
      return processedChunk;
    } catch (error) {
      console.error('Error processing audio chunk:', error);
      return null;
    }
  }
}

module.exports = AudioUtils;