function scrollToSection(id) {
  document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

function highlight(el) {
  el.style.backgroundColor = '#c8e6c9';
  el.style.color = '#1b5e20';
}

function unhighlight(el) {
  el.style.backgroundColor = '#e3f2fd';
  el.style.color = '#000';
}

// Healthcare Chatbot Logic with Gemini API
const chatForm = document.getElementById('chat-form');
const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');

// Use the correct Gemini model version
const GEMINI_MODEL = 'gemini-1.5-pro';

function appendMessage(sender, text, showTime = true) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('chat-msg');
  msgDiv.classList.add(sender === 'You' ? 'user' : 'bot');
  const now = new Date();
  let timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  msgDiv.innerHTML = `<span>${text}</span>` + (showTime ? `<span class=\"msg-time\">${timeStr}</span>` : '');
  // Insert at the top for column-reverse, so it appears at the bottom visually
  chatWindow.insertBefore(msgDiv, chatWindow.firstChild);
  chatWindow.scrollTop = 0;
}

async function getGeminiResponse(input) {
  const endpoint = '/api/gemini';
  // The backend expects { model, prompt }
  const body = {
    model: GEMINI_MODEL,
    prompt: `You are a helpful healthcare assistant. Answer the following question with general advice only, and remind users to consult a doctor for serious issues.\n\nUser: ${input}`
  };
  try {
    console.log('Sending request to backend...', body);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = `Error (${res.status}): `;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage += errorJson.error || errorJson.message || errorJson.details || 'Unknown error';
      } catch(e) {
        errorMessage += errorText || 'Unknown error';
      }
      return errorMessage;
    }
    const data = await res.json();
    if (data.error) {
      // Gemini API error
      return `Error: ${data.error.message || data.error}`;
    }
    // Gemini API returns { candidates: [ { content: { parts: [ { text: ... } ] } } ] }
    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
      return data.candidates[0].content.parts[0].text;
    } else {
      return "Sorry, I couldn't get a response from the AI. Please try again later.";
    }
  } catch (err) {
    return "Error connecting to Gemini API. Please check your connection and try again.";
  }
}

const typingIndicator = document.getElementById('typing-indicator');

if (chatForm) {
  chatForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const userMsg = userInput.value.trim();
    if (!userMsg) return;
    appendMessage('You', userMsg);
    userInput.value = '';
    typingIndicator.style.display = 'flex';
    const botReply = await getGeminiResponse(userMsg);
    typingIndicator.style.display = 'none';
    appendMessage('Bot', botReply);
  });
}

