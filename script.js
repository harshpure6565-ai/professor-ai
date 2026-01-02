const WORKER_URL = "jolly-sky-a255.harshpure6565.workers.dev";

async function askAI() {
  const q = document.getElementById("question").value.trim();
  const out = document.getElementById("output");
  const lang = document.getElementById("language").value;

  if (!q) {
    out.innerText = "Question likh pehle.";
    return;
  }

  out.innerText = "Professor AI soch raha hai…";

  try {
    const res = await fetch(WORKER_URL + "/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q, language: lang })
    });

    const data = await res.json();

    if (!data.answer) {
      out.innerText = "No response from AI.";
      return;
    }

    out.innerText = data.answer;
    speak(data.answer, lang);

  } catch (e) {
    out.innerText = "Server connect nahi ho raha.";
  }
}

function speak(text, lang) {
  if (!window.speechSynthesis) return;

  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);

  if (lang === "Hindi") u.lang = "hi-IN";
  else if (lang === "Marathi") u.lang = "mr-IN";
  else if (lang === "Urdu") u.lang = "ur-IN";
  else u.lang = "en-US";

  u.rate = 1;
  u.pitch = 1;
  speechSynthesis.speak(u);
}

function stopVoice() {
  speechSynthesis.cancel();
}
