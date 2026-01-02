const WORKER_URL = "https://jolly-sky-a255.harshpure6565.workers.dev";

async function askAI() {
  const input = document.getElementById("question");
  const output = document.getElementById("output");

  const text = input.value.trim();
  if (!text) {
    output.innerText = "Pehle kuch likh.";
    return;
  }

  output.innerText = "Professor AI soch raha hai…";

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text   // ✅ VERY IMPORTANT
      })
    });

    const data = await res.json();

    if (data.error) {
      output.innerText = data.error;
    } else {
      output.innerText = data.response || "No reply";
      speak(data.response);
    }

  } catch (e) {
    output.innerText = "Server connect nahi ho raha.";
    console.error(e);
  }
}

// 🔊 Voice Output
function speak(text) {
  if (!text) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-IN";
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}
