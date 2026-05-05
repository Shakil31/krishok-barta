# Krishok Barta Project Requirements

## Product Goal

Build a Bangla voice-first AI assistant that helps Bangladeshi farmers ask agriculture questions without typing or reading.

## Target Users

- Farmers in Bangladesh
- Low-literacy or illiterate users
- Older farmers
- Rural Android phone users
- Farmers who need quick guidance on crops, prices, weather, subsidies, and loans

## Core User Story

As a farmer, I want to press one button and ask a question in Bangla, so that I can hear a simple answer without reading or typing.

## Must-Have Features

- Bangla-only voice question flow
- Large microphone button
- Speech-to-text using Bangla language recognition
- Gemini answer in simple Bangla
- Text-to-speech audio reply in Bangla
- Auto-play answer
- Topic shortcuts
- Question history
- Helpful/not helpful feedback
- No login in prototype

## Topics

- Weather: আবহাওয়া
- Crop disease: ফসলের রোগ
- Market price: বাজার দর
- Subsidy: সরকারি ভর্তুকি
- Agriculture loan: কৃষি ঋণ
- Seed and fertilizer: সার ও বীজ
- Irrigation and land: জমি ও সেচ

## Screens

1. Splash / welcome
2. Home with large microphone button
3. Listening screen with animated feedback
4. Answer screen with auto-play audio
5. History screen
6. Admin dashboard for prototype testing

## Prototype Architecture

- Frontend: mobile web/PWA
- Backend: Flask prototype
- AI: Gemini 2.5 Flash with Flash Lite fallback
- STT: Google Speech Recognition, language `bn-BD`
- TTS: gTTS Bangla
- Audio conversion: pydub + static-ffmpeg

## Future Native Mobile Architecture

- React Native
- Expo
- React Navigation
- Expo AV
- AsyncStorage
- FastAPI backend
- PostgreSQL/Supabase
- Redis cache
- Cloudinary audio storage

## Data Entities

- Farmer
- Conversation
- Message
- CropKnowledge
- MarketPrice
- GovernmentSubsidy

## API Requirements

- `POST /api/ask`
- `POST /api/voice/process`
- `POST /api/voice/feedback`
- `GET /api/status`
- `GET /api/conversations/{farmer_id}`
- `GET /api/prices/{district}`
- `GET /api/subsidies`

## Success Criteria

- Farmer can ask a Bangla question by voice
- App returns a Bangla answer within a few seconds
- Answer is short, clear, and spoken aloud
- Farmer can use the app without typing
- Prototype can be tested on Android phone browser

