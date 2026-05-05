# Krishok Barta — কৃষক বার্তা

Voice AI assistant for farmers in Bangladesh.

Farmers can ask questions in Bangla and receive simple spoken Bangla answers about crop disease, weather, market price, subsidies, loans, and farming guidance.

## Summary From Product Document

Krishok Barta is a voice-first mobile app for Bangladeshi farmers, especially farmers who cannot read or type comfortably. The core experience is intentionally simple:

1. Farmer opens the app.
2. Farmer taps one large microphone button.
3. Farmer asks a question in Bangla.
4. The app transcribes the voice.
5. Gemini generates a simple Bangla answer.
6. The answer is converted to Bangla speech.
7. The answer plays automatically.

The app is free for farmers. Future revenue can come from NGOs, government contracts, grants, and agriculture partners.

## Project Requirements

### Core Users

- Farmers in Bangladesh
- Farmers with low literacy
- First-time smartphone users
- Rural users who prefer Bangla voice over text

### Core Features

- Voice question in Bangla
- Bangla speech-to-text
- Gemini AI answer in simple Bangla
- Bangla text-to-speech
- Auto-play answer audio
- Big mobile-friendly microphone button
- Topic shortcuts
- Recent question history
- Feedback: helpful / not helpful
- No login required for prototype

### Main Topics

- আবহাওয়া
- ফসলের রোগ
- বাজার দর
- সরকারি ভর্তুকি
- কৃষি ঋণ
- সার ও বীজ
- জমি ও সেচ

### Non-Functional Requirements

- Bangla-first interface
- Very large touch targets
- No keyboard required for core use
- Answers under 4 short sentences
- Works on Android phones first
- Free to start
- Easy to deploy and demo

## Prototype Tech Stack

This prototype uses the same simple stack as the Bangla Voice Assistant:

- Python
- Flask
- Gemini via `google-genai`
- Google Speech Recognition via `SpeechRecognition`
- gTTS for Bangla audio
- pydub + static-ffmpeg for audio conversion
- HTML/CSS/JavaScript PWA-style mobile UI

## Files

```text
krishok-barta/
├── app.py
├── requirements.txt
├── README.md
├── .env.example
├── templates/
│   ├── base.html
│   ├── index.html
│   ├── mobile.html
│   └── dashboard.html
└── static/
    ├── css/styles.css
    └── js/app.js
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your Gemini key.

```env
GOOGLE_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.1-flash-live-preview
GEMINI_TIMEOUT_SECONDS=25
PUBLIC_URL=
```

## Run Locally

```powershell
cd C:\Users\asus\Downloads\Bangla-Voice-Assistant\krishok-barta
pip install -r requirements.txt
python app.py
```

Open:

```text
http://127.0.0.1:6060/
http://127.0.0.1:6060/mobile
http://127.0.0.1:6060/dashboard
```

## Mobile App Direction

This project currently includes a mobile web app/PWA. This is the fastest way to test with farmers on Android phones.

Later, convert it into a native app with:

- React Native
- Expo
- Expo AV
- React Navigation
- AsyncStorage

## Roadmap

1. Prototype: voice question to spoken Bangla answer
2. Field test with 3 to 5 farmers
3. Add farmer history and feedback
4. Add crop disease knowledge base
5. Add local market price data
6. Add subsidy and loan information
7. Convert PWA to Expo Android app
8. Pilot with 20 farmers
9. Partner with NGO/DAE/BRAC
