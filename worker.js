// ====================================
// CORS HEADERS
// ====================================
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// ====================================
// PROFESSOR AI SYSTEM PROMPT
// ====================================
const SYSTEM_PROMPT = `You are "Professor AI", a warm, patient, and highly knowledgeable teacher who loves helping students learn.

YOUR PERSONALITY:
- Speak like a friendly human professor, not a robot
- Be enthusiastic about teaching
- Show emotional intelligence and support
- Use humor appropriately (light and educational)
- Never say "I am an AI" or "as an AI model"
- Be encouraging when students struggle

YOUR TEACHING STYLE:
1. Always explain step-by-step
2. Start simple, then add depth
3. Use real-world examples and analogies
4. Break complex topics into digestible parts
5. Ask if clarification is needed (but don't overdo it)
6. Provide memorable summaries for educational topics

LANGUAGE RULES:
- Automatically detect the student's language
- Respond in the SAME language they use
- Support: English, Hindi, Hinglish, Marathi, Urdu
- If they mix languages, mirror their style naturally

RESPONSE FORMAT:
- Use short paragraphs (2-4 sentences max)
- Be conversational, not formal
- Avoid bullet points unless listing steps
- Keep responses focused and clear

IMPORTANT:
- You're teaching, not just answering
- Make learning enjoyable and memorable
- Build on previous messages in the conversation
- Be supportive if the student seems confused`;

// ====================================
// MAIN WORKER HANDLER
// ====================================
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: CORS_HEADERS });
    }
    
    // Only allow POST requests
    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
    }
    
    try {
        // Parse request body
        const body = await request.json();
        const { message, history } = body;
        
        // Validate input
        if (!message || typeof message !== 'string') {
            return jsonResponse({ error: 'Invalid message' }, 400);
        }
        
        // Get AI response from Gemini
        const aiResponse = await getGeminiResponse(message, history);
        
        return jsonResponse({ response: aiResponse });
        
    } catch (error) {
        console.error('Worker error:', error);
        return jsonResponse({ 
            error: 'Internal server error',
            details: error.message 
        }, 500);
    }
}

// ====================================
// GEMINI API INTEGRATION
// ====================================
async function getGeminiResponse(userMessage, conversationHistory = []) {
    // Get API key from environment variable
    const apiKey = GEMINI_API_KEY;
    
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
    }
    
    // Gemini API endpoint
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    
    // Build conversation context
    const messages = buildConversationContext(userMessage, conversationHistory);
    
    // Prepare request payload
    const payload = {
        contents: messages,
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
        },
        safetySettings: [
            {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
    };
    
    // Make API request
    const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // Extract response text
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const text = data.candidates[0].content.parts[0].text;
        return text.trim();
    }
    
    throw new Error('Invalid response from Gemini API');
}

// ====================================
// BUILD CONVERSATION CONTEXT
// ====================================
function buildConversationContext(currentMessage, history) {
    const messages = [];
    
    // Add system prompt as first user message with model response
    messages.push({
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT }]
    });
    
    messages.push({
        role: 'model',
        parts: [{ text: 'Understood! I am Professor AI, ready to teach with patience, clarity, and enthusiasm. I will respond in the student\'s language and make learning engaging and memorable.' }]
    });
    
    // Add conversation history
    if (history && Array.isArray(history)) {
        history.forEach(msg => {
            if (msg.role === 'user') {
                messages.push({
                    role: 'user',
                    parts: [{ text: msg.content }]
                });
            } else if (msg.role === 'assistant') {
                messages.push({
                    role: 'model',
                    parts: [{ text: msg.content }]
                });
            }
        });
    }
    
    // Add current message
    messages.push({
        role: 'user',
        parts: [{ text: currentMessage }]
    });
    
    return messages;
}

// ====================================
// HELPER FUNCTIONS
// ====================================
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS
        }
    });
}
