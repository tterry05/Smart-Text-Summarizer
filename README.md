# Smart Text Summarizer Chrome Extension

A Chrome extension that uses Google's Gemini API to summarize selected text with optional text-to-speech capabilities.

## Features
- AI-powered text summarization
- Text-to-speech playback (Microsoft Azure or browser default)  
- Draggable summary card interface
- Local storage of API keys
- Privacy focused - no data stored externally

## Installation
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Setup

### Required: Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Open the extension popup and paste your key
4. Click "Save Key"

### Optional: Microsoft Azure TTS
1. Create a Speech service in [Azure Portal](https://portal.azure.com)
2. Get the service key and region
3. Enter both in the extension popup
4. Click "Save TTS Settings"
5. If not configured, browser's default TTS will be used

## Usage
1. Click the extension icon and press "Summarize Text" 
2. Select any text on a webpage
3. A summary card will appear with text-to-speech controls
4. Click the play button to hear the summary

## Privacy
All API keys and settings are stored locally in Chrome storage. No data is sent to external servers besides the required API calls to Gemini and Azure (if configured).

## License
MIT
