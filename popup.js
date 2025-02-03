document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveButton = document.getElementById('saveKey');
  const summarizeButton = document.getElementById('summarizeText');

  // Load saved Gemini API key
  chrome.storage.local.get(['geminiApiKey'], (result) => {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    }
  });
  
  // Load saved TTS settings
  chrome.storage.local.get(['ttsApiKey', 'ttsRegion'], (result) => {
    if (result.ttsApiKey) {
      document.getElementById('ttsApiKey').value = result.ttsApiKey;
    }
    if (result.ttsRegion) {
      document.getElementById('ttsRegion').value = result.ttsRegion;
    }
  });

  // Save Gemini API key
  saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
        saveButton.textContent = 'Saved!';
        setTimeout(() => {
          saveButton.textContent = 'Save Key';
        }, 2000);
      });
    }
  });

  // Save TTS settings
  const ttsApiKeyInput = document.getElementById('ttsApiKey');
  const ttsRegionInput = document.getElementById('ttsRegion');
  const saveTtsSettingsButton = document.getElementById('saveTtsSettings');
  saveTtsSettingsButton.addEventListener('click', () => {
    const ttsApiKey = ttsApiKeyInput.value.trim();
    const ttsRegion = ttsRegionInput.value.trim();
    chrome.storage.local.set({ ttsApiKey, ttsRegion }, () => {
      saveTtsSettingsButton.textContent = 'Saved!';
      setTimeout(() => {
        saveTtsSettingsButton.textContent = 'Save TTS Settings';
      }, 2000);
    });
  });

  // Activate summarization mode
  summarizeButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: 'activateSummarization' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
        } else {
          console.log('Summarize mode activated:', response);
        }
      });
    });
  });
});