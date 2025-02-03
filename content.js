let summaryCard = null;
let currentSpeech = null;
let isSummarizeActive = false;  // New flag for summarization mode

// Create and position the summary card
function createSummaryCard(x, y) {
  if (summaryCard) {
    document.body.removeChild(summaryCard);
  }

  summaryCard = document.createElement('div');
  summaryCard.className = 'summary-card loading';
  summaryCard.innerHTML = `
    <div class="summary-header">
      <h3 class="summary-title">Summary</h3>
      <div class="summary-controls">
        <button class="summary-button play-button" title="Play">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </button>
        <button class="summary-button close-button" title="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
    <div class="summary-loader">
      <div class="loader"></div>
    </div>
  `;

  // Position the card
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  summaryCard.style.left = `${Math.min(x, viewport.width - 420)}px`;
  summaryCard.style.top = `${Math.min(y, viewport.height - 200)}px`;

  document.body.appendChild(summaryCard);

  // Add event listeners
  const closeButton = summaryCard.querySelector('.close-button');
  closeButton.addEventListener('click', () => {
    if (summaryCard) {
      stopSpeech();
      document.body.removeChild(summaryCard);
      summaryCard = null;
    }
  });

  return summaryCard;
}

// Listen for messages to activate summarization mode
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'activateSummarization') {
    isSummarizeActive = true;
    // Create a small corner modal instead of an alert
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.bottom = '16px';
    modal.style.right = '16px';
    modal.style.backgroundColor = '#333';
    modal.style.color = '#fff';
    modal.style.padding = '8px 16px';
    modal.style.borderRadius = '4px';
    modal.style.zIndex = '9999';
    modal.textContent = 'Summarize mode activated. Select text.';
    document.body.appendChild(modal);
    setTimeout(() => modal.remove(), 2000);
    sendResponse({ status: 'ok' });
  }
});

// Handle text selection only when mode is active
document.addEventListener('mouseup', async (event) => {
  if (!isSummarizeActive) return;  // Only proceed if mode is activated
  isSummarizeActive = false; // Reset mode after one use

  const selectedText = window.getSelection().toString().trim();
  if (selectedText.length > 10) {
    const x = event.pageX - window.scrollX;
    const y = event.pageY - window.scrollY;
    
    const card = createSummaryCard(x, y);
    
    try {
      const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
      if (!geminiApiKey) {
        updateSummaryContent('Please set your Gemini API key in the extension popup.');
        return;
      }
      const summary = await getSummary(selectedText, geminiApiKey);
      updateSummaryContent(summary);
      
      const playButton = card.querySelector('.play-button');
      playButton.addEventListener('click', async () => {
        if (currentSpeech && !currentSpeech.paused) {
          stopSpeech();
          playButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          `;
        } else {
          try {
            await speakText(summary);
            playButton.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            `;
          } catch (err) {
            // Disable the button to avoid repeated errors
            playButton.disabled = true;
            playButton.textContent = "TTS Error";
          }
        }
      });
    } catch (error) {
      updateSummaryContent('Error generating summary. Please try again.');
      console.error('Summarization error:', error);
    }
  }
});

// Updated updateSummaryContent to add scrollable behavior if content is too long
function updateSummaryContent(content) {
  if (summaryCard) {
    summaryCard.classList.remove('loading');
    // Changed to a div for custom styling
    const contentDiv = document.createElement('div');
    contentDiv.className = 'summary-content';
    contentDiv.textContent = content;
    contentDiv.style.maxHeight = '200px'; // adjust as needed
    contentDiv.style.overflowY = 'auto';
    
    const loader = summaryCard.querySelector('.summary-loader');
    if (loader) {
      loader.replaceWith(contentDiv);
    }
  }
}

// Updated speakText function to remove hardcoded TTS key and use default TTS if none provided
async function speakText(text) {
  stopSpeech();

  chrome.storage.local.get(['ttsApiKey', 'ttsRegion'], async (result) => {
    if (result.ttsApiKey && result.ttsRegion) {
      // Use Azure TTS if key and region are provided
      const subscriptionKey = result.ttsApiKey;
      const region = result.ttsRegion;
      
      const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="en-US-AndrewMultilingualNeural">${text}</voice>
      </speak>`;
      
      const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
            "Ocp-Apim-Subscription-Key": subscriptionKey
          },
          body: ssml
        });
    
        if (!response.ok) {
          const errorMsg = "Azure TTS response error: " + response.status + " " + response.statusText;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
    
        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(blob);
        currentSpeech = new Audio(audioUrl);
        currentSpeech.play();
    
      } catch (err) {
        console.error("Error in Azure TTS:", err);
        throw err;
      }
    } else {
      // Fallback: use built-in browser SpeechSynthesis
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Google')) || voices.find(v => v.lang === 'en-US');
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      currentSpeech = utterance;
      window.speechSynthesis.speak(utterance);
    }
  });
}

// Updated stopSpeech function to stop Azure audio playback
function stopSpeech() {
  if (currentSpeech) {
    if (typeof currentSpeech.pause === "function") {
      currentSpeech.pause();
    }
    currentSpeech.currentTime = 0;
    currentSpeech = null;
  }
}

// Updated getSummary with fallback for overloaded models
async function getSummary(text, apiKey) {
  const models = ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-pro"];
  let lastError;
  
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      console.log("Fetching summary using model:", model);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Identify whether the provided text is a multiple-choice question or a passage to summarize, keep this information to yourself, do not say in the response that "this is a passage to summerize" or "this is a multiple choice question". If it is a multiple-choice question, return the correct answer with an explanation. If it is a passage, provide a clear and concise summary while preserving key details. Text:${text}`
            }]
          }]
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error with model (${model}):`, response.status, response.statusText, errorText);
        
        // Check for 503 and overloaded error message to try next model
        if (response.status === 503 && errorText.toLowerCase().includes("model is overloaded")) {
          console.warn(`Model ${model} is overloaded, trying next model...`);
          lastError = new Error(`Model ${model} is overloaded`);
          continue;
        } else {
          throw new Error('Failed to get summary: ' + response.statusText);
        }
      }
      
      const data = await response.json();
      console.log("API Response Data using model (" + model + "):", data);
      return data.candidates[0].content.parts[0].text;
      
    } catch (err) {
      console.error(`Error using model (${model}):`, err);
      lastError = err;
      // If error is due to model overload, try next model; otherwise, break
      if (!(err.message && err.message.toLowerCase().includes("overloaded"))) {
        throw err;
      }
    }
  }
  // If all models fail, then throw the last error encountered.
  throw lastError;
}

// Make the summary card draggable
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

document.addEventListener("mousedown", dragStart);
document.addEventListener("mousemove", drag);
document.addEventListener("mouseup", dragEnd);

function dragStart(e) {
  if (!summaryCard || !e.target.closest('.summary-header')) return;
  
  initialX = e.clientX - xOffset;
  initialY = e.clientY - yOffset;

  if (e.target.closest('.summary-card')) {
    isDragging = true;
  }
}

function drag(e) {
  if (!isDragging) return;
  
  e.preventDefault();
  
  currentX = e.clientX - initialX;
  currentY = e.clientY - initialY;

  xOffset = currentX;
  yOffset = currentY;

  setTranslate(currentX, currentY, summaryCard);
}

function setTranslate(xPos, yPos, el) {
  el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
}

function dragEnd(e) {
  initialX = currentX;
  initialY = currentY;
  isDragging = false;
}