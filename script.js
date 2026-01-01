const sendBtn = document.getElementById('sendBtn');
const voiceBtn = document.getElementById('voiceBtn');
const messages = document.getElementById('messages');
const userInput = document.getElementById('userInput');

// Daily limit logic
const DAILY_LIMIT = 10;
let today = new Date().toLocaleDateString();
let stored = JSON.parse(localStorage.getItem("professorAI")) || {};
if(stored.date !== today){ stored = {date: today, count:0}; localStorage.setItem("professorAI", JSON.stringify(stored)); }

// Send message function
async function sendMessage(text){
    let stored = JSON.parse(localStorage.getItem("professorAI"));
    if(stored.count >= DAILY_LIMIT){
        alert("Daily limit reached! Try tomorrow.");
        return;
    }

    // Show user message
    const userMsg = document.createElement('div');
    userMsg.textContent = "You: " + text;
    messages.appendChild(userMsg);

    // Gemini/OpenAI API call
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method:"POST",
        headers:{
            "Content-Type":"application/json",
            "Authorization":"Bearer AIzaSyDWMajQNKWwUlHtX-F-rDIukTMbPWTF5jc"
        },
        body: JSON.stringify({
            model:"gpt-5-mini",
            messages:[{role:"user", content:text}]
        })
    });
    const data = await res.json();
    const reply = data.choices[0].message.content;

    // Show AI reply
    const botMsg = document.createElement('div');
    botMsg.textContent = "Professor: " + reply;
    messages.appendChild(botMsg);
    messages.scrollTop = messages.scrollHeight;

    // Text to speech
    const utter = new SpeechSynthesisUtterance(reply);
    speechSynthesis.speak(utter);

    // Increment daily count
    stored.count++;
    localStorage.setItem("professorAI", JSON.stringify(stored));
}

// Send button click
sendBtn.onclick = () => { 
    if(userInput.value.trim()!=="") sendMessage(userInput.value); 
    userInput.value="";
}

// Voice button click
voiceBtn.onclick = () => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.start();
    recognition.onresult = (event) => sendMessage(event.results[0][0].transcript);
}
