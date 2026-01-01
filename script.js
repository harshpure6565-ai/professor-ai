// ====================================
// CONFIGURATION
// ====================================
const CONFIG = {
    // Replace with your Cloudflare Worker URL
    WORKER_URL: 'https://your-worker.your-subdomain.workers.dev/api/chat',
    MAX_DAILY_MESSAGES: 10,
    MAX_CONTEXT_MESSAGES: 5,
    MAX_INPUT_LENGTH: 500
};

// ====================================
// STATE MANAGEMENT
// ====================================
const state = {
    conversationHistory: [],
    isProcessing: false,
    dailyMessageCount: 0,
    recognition: null,
    isRecording: false,
    currentUtterance: null
};

// ====================================
// DOM ELEMENTS
// ====================================
const elements = {
    chatContainer: document.getElementById('chatContainer'),
    userInput: document.getElementById('userInput'),
    sendBtn: document.getElementById('sendBtn'),
    micBtn: document.getElementById('micBtn'),
    cameraBtn: document.getElementById('cameraBtn'),
    charCount: document.getElementById('charCount'),
    usageCount: document.getElementById('usageCount'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    captionsBackground: document.getElementById('captionsBackground')
};

// ====================================
// INITIALIZATION
// ====================================
function init() {
    // Load daily message count from localStorage
    loadDailyCount();
    updateUsageDisplay();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize speech recognition
    initSpeechRecognition();
    
    // Check if Speech Synthesis is available
    if (!('speechSynthesis' in window)) {
        console.warn('Speech Synthesis not supported in this browser');
    }
}

// ====================================
// EVENT LISTENERS
// ====================================
function setupEventListeners() {
    // Send button click
    elements.sendBtn.addEventListener('click', handleSendMessage);
    
    // Enter key press
    elements.userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    // Character counter
    elements.userInput.addEventListener('input', updateCharCounter);
    
    // Mic button
    elements.micBtn.addEventListener('click', toggleSpeechRecognition);
    
    // Camera button (placeholder)
    elements.cameraBtn.addEventListener('click', handleCameraClick);
}

// ====================================
// DAILY USAGE TRACKING
// ====================================
function loadDailyCount() {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('professorAI_usage');
    
    if (stored) {
        const data = JSON.parse(stored);
        if (data.date === today) {
            state.dailyMessageCount = data.count;
        } else {
            // New day, reset count
            state.dailyMessageCount = 0;
            saveDailyCount();
        }
    }
}

function saveDailyCount() {
    const today = new Date().toDateString();
    localStorage.setItem('professorAI_usage', JSON.stringify({
        date: today,
        count: state.dailyMessageCount
    }));
}

function updateUsageDisplay() {
    elements.usageCount.textContent = state.dailyMessageCount;
}

function incrementUsageCount() {
    state.dailyMessageCount++;
    saveDailyCount();
    updateUsageDisplay();
}

function hasReachedDailyLimit() {
    return state.dailyMessageCount >= CONFIG.MAX_DAILY_MESSAGES;
}

// ====================================
// CHARACTER COUNTER
// ====================================
function updateCharCounter() {
    const length = elements.userInput.value.length;
    elements.charCount.textContent = length;
    
    if (length > CONFIG.MAX_INPUT_LENGTH * 0.9) {
        elements.charCount.style.color = 'var(--error-color)';
    } else {
        elements.charCount.style.color = 'var(--text-light)';
    }
}

// ====================================
// MESSAGE HANDLING
// ====================================
async function handleSendMessage() {
    const message = elements.userInput.value.trim();
    
    // Validation
    if (!message) return;
    if (state.isProcessing) return;
    if (hasReachedDailyLimit()) {
        showDailyLimitMessage();
        return;
    }
    
    // Clear input
    elements.userInput.value = '';
    updateCharCounter();
    
    // Add user message to UI
    addMessageToUI(message, 'user');
    
    // Add to conversation history
    state.conversationHistory.push({
        role: 'user',
        content: message
    });
    
    // Increment usage count
    incrementUsageCount();
    
    // Show loading
    showLoading(true);
    
    // Get AI response
    try {
        const response = await getAIResponse(message);
        
        // Add bot message to UI
        addMessageToUI(response, 'bot');
        
        // Add to conversation history
        state.conversationHistory.push({
            role: 'assistant',
            content: response
        });
        
        // Keep only last N messages for context
        if (state.conversationHistory.length > CONFIG.MAX_CONTEXT_MESSAGES * 2) {
            state.conversationHistory = state.conversationHistory.slice(-CONFIG.MAX_CONTEXT_MESSAGES * 2);
        }
        
        // Speak response
        speakText(response);
        
        // Show in background captions
        showBackgroundCaptions(response);
        
    } catch (error) {
        console.error('Error getting AI response:', error);
        addMessageToUI('Sorry, I encountered an error. Please try again.', 'bot');
    } finally {
        showLoading(false);
    }
}

function addMessageToUI(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Convert line breaks to paragraphs
    const paragraphs = message.split('\n').filter(p => p.trim());
    paragraphs.forEach(para => {
        const p = document.createElement('p');
        p.textContent = para;
        contentDiv.appendChild(p);
    });
    
    messageDiv.appendChild(contentDiv);
    elements.chatContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
}

function showDailyLimitMessage() {
    const message = `You've reached your daily limit of ${CONFIG.MAX_DAILY_MESSAGES} questions. Come back tomorrow to continue learning! 📚`;
    addMessageToUI(message, 'bot');
}

// ====================================
// AI API CALL
// ====================================
async function getAIResponse(userMessage) {
    const response = await fetch(CONFIG.WORKER_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: userMessage,
            history: state.conversationHistory
        })
    });
    
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.response;
}

// ====================================
// SPEECH RECOGNITION (INPUT)
// ====================================
function initSpeechRecognition() {
    // Check if browser supports Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.warn('Speech Recognition not supported');
        elements.micBtn.disabled = true;
        return;
    }
    
    state.recognition = new SpeechRecognition();
    state.recognition.continuous = false;
    state.recognition.interimResults = false;
    
    // Try to detect user's language, default to English
    state.recognition.lang = navigator.language || 'en-US';
    
    state.recognition.onstart = () => {
        state.isRecording = true;
        elements.micBtn.classList.add('recording');
    };
    
    state.recognition.onend = () => {
        state.isRecording = false;
        elements.micBtn.classList.remove('recording');
    };
    
    state.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        elements.userInput.value = transcript;
        updateCharCounter();
    };
    
    state.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        state.isRecording = false;
        elements.micBtn.classList.remove('recording');
    };
}

function toggleSpeechRecognition() {
    if (!state.recognition) {
        alert('Speech recognition is not supported in your browser.');
        return;
    }
    
    if (state.isRecording) {
        state.recognition.stop();
    } else {
        state.recognition.start();
    }
}

// ====================================
// SPEECH SYNTHESIS (OUTPUT)
// ====================================
function speakText(text) {
    // Stop any ongoing speech
    if (state.currentUtterance) {
        window.speechSynthesis.cancel();
    }
    
    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure voice (calm, slow-paced like a teacher)
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Try to select a good voice
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        // Prefer natural-sounding voices
        const preferredVoice = voices.find(v => 
            v.lang.startsWith(navigator.language.slice(0, 2)) && 
            (v.name.includes('Natural') || v.name.includes('Premium'))
        ) || voices.find(v => v.lang.startsWith('en'));
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
    }
    
    state.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
}

// ====================================
// BACKGROUND CAPTIONS
// ====================================
function showBackgroundCaptions(text) {
    // Split text into words
    const words = text.split(' ');
    let currentIndex = 0;
    
    // Clear existing captions
    elements.captionsBackground.textContent = '';
    
    // Animate words appearing one by one
    const interval = setInterval(() => {
        if (currentIndex >= words.length) {
            clearInterval(interval);
            return;
        }
        
        elements.captionsBackground.textContent += words[currentIndex] + ' ';
        currentIndex++;
        
        // Auto-scroll if text overflows
        if (elements.captionsBackground.scrollHeight > window.innerHeight) {
            elements.captionsBackground.scrollTop = elements.captionsBackground.scrollHeight;
        }
    }, 200); // Words appear every 200ms
}

// ====================================
// CAMERA BUTTON (PLACEHOLDER)
// ====================================
function handleCameraClick() {
    alert('📷 Camera feature coming soon!\n\nThis will allow you to:\n• Take photos of problems/questions\n• Upload images for analysis\n• Get visual explanations\n\nStay tuned!');
}

// ====================================
// LOADING OVERLAY
// ====================================
function showLoading(show) {
    state.isProcessing = show;
    
    if (show) {
        elements.loadingOverlay.classList.add('active');
        elements.sendBtn.disabled = true;
    } else {
        elements.loadingOverlay.classList.remove('active');
        elements.sendBtn.disabled = false;
    }
}

// ====================================
// UTILITY FUNCTIONS
// ====================================

// Detect language from text (simple heuristic)
function detectLanguage(text) {
    // Hindi characters
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    // Marathi characters (same script as Hindi, but can be detected contextually)
    if (/[\u0900-\u097F]/.test(text)) return 'mr';
    // Urdu characters
    if (/[\u0600-\u06FF]/.test(text)) return 'ur';
    // Default to English
    return 'en';
}

// Format timestamp
function getTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// ====================================
// START APPLICATION
// ====================================
document.addEventListener('DOMContentLoaded', init);

// Load voices for speech synthesis when available
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
}
