// ===============================
// CONFIG
// ===============================
const WORKER_URL = "https://YOUR-WORKER-URL.workers.dev"; 
// 👆 isko apne Cloudflare Worker URL se replace karna

let speaking = false;

// ===============================
// MAIN ASK FUNCTION
// ===============================
async function askAI() {
  const questionInput = document.getElementById("question");
  const output = document.getElementById("output");
  const langSelect = document.getElementById("language");

  const question = questionInput.value.trim();
  const language = langSelect ? langSelect.value : "English";

  if (!question) {
    output.innerText = "Question likh pehle 🤡";
    return;
  }

  output.innerText = "Professor AI soch raha hai... ⏳";

  try {
    const res = await fetch(WORKER_URL + "/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question: question,
        language: language
      })
    });

    const data = await res.json();

    if (!res.ok) {
      output.innerText = data.error || "Server error ❌";
      return;
    }

    if (!data.answer) {
      output.innerText = "AI ne kuch nahi bola 🤡";
      return;
    }

    output.innerText = data.answer;

    // Auto voice speak
    speakText(data.answer, language);

  } catch (err) {
    console.error(err);
    output.innerText = "Worker connect nahi ho raha ❌";
  }
}

// ===============================
// VOICE (TEXT TO SPEECH)
// ===============================
function speakText(text, language) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);

  const voices = window.speechSynthesis.getVoices();

  // Simple language mapping
  if (language === "Hindi") {
    utter.lang = "hi-IN";
  } else if (language === "Marathi") {
    utter.lang = "mr-IN";
  } else if (language === "Urdu") {
    utter.lang = "ur-IN";
  } else {
    utter.lang = "en-US";
  }

  utter.rate = 1;
  utter.pitch = 1;

  window.speechSynthesis.speak(utter);
}

// ===============================
// STOP VOICE BUTTON (optional)
// ===============================
function stopVoice() {
  window.speechSynthesis.cancel();
}

// ===============================
// ENTER KEY SUPPORT
// ===============================
document.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    const el = document.getElementById("question");
    if (document.activeElement === el) {
      askAI();
    }
  }
});
