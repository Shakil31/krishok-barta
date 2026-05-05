import asyncio
import os
import tempfile

import requests
import static_ffmpeg
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, send_file
from google import genai


static_ffmpeg.add_paths()
load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-live-preview")
GEMINI_TIMEOUT_SECONDS = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "25"))
PUBLIC_URL = os.getenv("PUBLIC_URL", "").rstrip("/")

app = Flask(__name__)
gemini_client = genai.Client(
    api_key=GOOGLE_API_KEY,
    http_options={"api_version": "v1alpha"},
)

served_files = {}
history = []

TOPICS = {
    "weather": "আবহাওয়া",
    "disease": "ফসলের রোগ",
    "price": "বাজার দর",
    "subsidy": "সরকারি ভর্তুকি",
    "loan": "কৃষি ঋণ",
    "seed": "সার ও বীজ",
    "irrigation": "জমি ও সেচ",
}

SYSTEM_PROMPT = """
তুমি "কৃষক বার্তা", বাংলাদেশের কৃষকদের জন্য একটি ভয়েস-প্রথম AI কৃষি সহকারী।
তোমার লক্ষ্য হলো কৃষককে সহজ বাংলা কথায় দ্রুত, নিরাপদ ও কাজে লাগার মতো পরামর্শ দেওয়া।

উত্তর দেওয়ার নিয়ম:
- সবসময় সহজ, সম্মানজনক ও গ্রামীণ কথার মতো বাংলা ব্যবহার করবে।
- উত্তর ৩ থেকে ৫টি ছোট বাক্যের মধ্যে রাখবে, যাতে শুনে বোঝা যায়।
- সম্ভব হলে ২-৩টি পরিষ্কার করণীয় ধাপ দেবে।
- প্রশ্ন অস্পষ্ট হলে আগে একটি ছোট follow-up প্রশ্ন করবে।
- ফসলের রোগ, পোকা, সার-বীজ, সেচ, মাটি, আবহাওয়া প্রস্তুতি, বাজার দর যাচাই, ভর্তুকি ও কৃষি ঋণ বিষয়ে সাহায্য করবে।
- কীটনাশক, ছত্রাকনাশক, আগাছানাশক বা ডোজের বিষয়ে নিশ্চিত নির্দেশ দেওয়ার আগে কৃষি অফিস/উপ-সহকারী কৃষি কর্মকর্তার পরামর্শ নিতে বলবে।
- মানুষ বা পশুর চিকিৎসা, আইন, সরকারি টাকা/ভর্তুকি বা ঋণের চূড়ান্ত সিদ্ধান্তের ক্ষেত্রে নিকটস্থ অফিস/যোগ্য ব্যক্তির কাছে যাচাই করতে বলবে।
- আবহাওয়া বা বাজার দরের লাইভ তথ্য না থাকলে সরাসরি বলবে: "আমার কাছে এখন লাইভ তথ্য নেই।" এরপর স্থানীয় বাজার, কৃষি অফিস বা নির্ভরযোগ্য সূত্রে যাচাই করতে বলবে।
- বিপদজনক বা ক্ষতিকর কোনো কাজ শেখাবে না।

উত্তরের ধরন:
প্রথমে সরাসরি উত্তর দাও।
তারপর দরকার হলে ছোট করণীয় দাও।
শেষে ঝুঁকি থাকলে কৃষি অফিসে যোগাযোগ করতে বলো।
"""


async def ask_gemini_live(prompt: str) -> str:
    text_parts = []

    async with gemini_client.aio.live.connect(
        model=GEMINI_MODEL,
        config={"response_modalities": ["TEXT"]},
    ) as session:
        await session.send(input=prompt, end_of_turn=True)

        async for message in session.receive():
            server_content = message.server_content
            if not server_content or not server_content.model_turn:
                continue

            for part in server_content.model_turn.parts or []:
                if part.text:
                    text_parts.append(part.text)

    return "".join(text_parts).strip()


def ask_ai(question: str, topic: str = "") -> str:
    topic_context = f"বিষয়: {topic}\n" if topic else ""
    prompt = f"{SYSTEM_PROMPT}\n\n{topic_context}কৃষকের প্রশ্ন: {question}"

    try:
        answer = asyncio.run(
            asyncio.wait_for(
                ask_gemini_live(prompt),
                timeout=GEMINI_TIMEOUT_SECONDS,
            )
        )
        if answer:
            print(f"Gemini answered with {GEMINI_MODEL}: {answer}")
            return answer
        print(f"{GEMINI_MODEL} returned an empty answer")
    except asyncio.TimeoutError:
        print(f"{GEMINI_MODEL} timed out after {GEMINI_TIMEOUT_SECONDS} seconds")
    except Exception as exc:
        print(f"{GEMINI_MODEL} failed: {exc}")

    return (
        "দুঃখিত, AI সার্ভার এখন ব্যস্ত। "
        "আপনি একটু পরে আবার প্রশ্ন করুন। "
        "জরুরি হলে নিকটস্থ কৃষি অফিসে যোগাযোগ করুন।"
    )


def text_to_speech(text: str) -> str:
    from gtts import gTTS

    tts = gTTS(text=text, lang="bn", slow=False)
    path = tempfile.mktemp(suffix=".mp3")
    tts.save(path)
    return path


def transcribe_audio_file(file_path: str) -> str:
    import speech_recognition as sr
    from pydub import AudioSegment

    wav_path = tempfile.mktemp(suffix=".wav")
    try:
        AudioSegment.from_file(file_path).export(wav_path, format="wav")
        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            audio_data = recognizer.record(source)
        return recognizer.recognize_google(audio_data, language="bn-BD")
    except sr.UnknownValueError:
        return ""
    except sr.RequestError:
        return ""
    finally:
        if os.path.exists(wav_path):
            os.unlink(wav_path)


def audio_url_for(path: str) -> str:
    filename = os.path.basename(path)
    served_files[filename] = path
    local_path = f"/audio/{filename}"
    if PUBLIC_URL:
        return f"{PUBLIC_URL}{local_path}"
    return local_path


def remember(question: str, answer: str, topic: str):
    history.insert(0, {
        "question": question,
        "answer": answer,
        "topic": topic or "সাধারণ",
    })
    del history[30:]


@app.route("/")
def index():
    return render_template("index.html", topics=TOPICS)


@app.route("/mobile")
def mobile():
    return render_template("mobile.html", topics=TOPICS)


@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html", topics=TOPICS, history=history)


@app.route("/audio/<filename>")
def audio(filename):
    if filename not in served_files:
        return "Not found", 404
    return send_file(served_files[filename], mimetype="audio/mpeg")


@app.route("/api/status")
def status():
    return jsonify({
        "app": "Krishok Barta",
        "running": True,
        "gemini_key": bool(GOOGLE_API_KEY),
        "gemini_model": GEMINI_MODEL,
        "gemini_timeout_seconds": GEMINI_TIMEOUT_SECONDS,
        "history_count": len(history),
    })


@app.route("/api/ask", methods=["POST"])
def ask():
    topic_key = request.form.get("topic", "")
    topic = TOPICS.get(topic_key, topic_key)
    question = request.form.get("question", "").strip()
    uploaded_audio = request.files.get("audio")
    upload_path = ""

    try:
        if uploaded_audio and uploaded_audio.filename:
            suffix = os.path.splitext(uploaded_audio.filename)[1] or ".webm"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                uploaded_audio.save(tmp.name)
                upload_path = tmp.name
            question = transcribe_audio_file(upload_path)

        if not question:
            return jsonify({"error": "প্রশ্নটি পাওয়া যায়নি। আবার বলুন অথবা লিখুন।"}), 400

        answer = ask_ai(question, topic)
        speech_path = text_to_speech(answer)
        remember(question, answer, topic)

        return jsonify({
            "question": question,
            "answer": answer,
            "audio_url": audio_url_for(speech_path),
        })
    except Exception as exc:
        print(f"Ask failed: {exc}")
        return jsonify({"error": "দুঃখিত, এখন উত্তর দেওয়া যাচ্ছে না।"}), 500
    finally:
        if upload_path and os.path.exists(upload_path):
            os.unlink(upload_path)


@app.route("/manifest.json")
def manifest():
    return jsonify({
        "name": "Krishok Barta",
        "short_name": "কৃষক বার্তা",
        "start_url": "/mobile",
        "display": "standalone",
        "background_color": "#F4F6F3",
        "theme_color": "#1A7A4A",
        "description": "Voice AI assistant for farmers of Bangladesh.",
    })


if __name__ == "__main__":
    print("Krishok Barta running")
    print("Website:    http://127.0.0.1:6060/")
    print("Mobile app: http://127.0.0.1:6060/mobile")
    print("Dashboard:  http://127.0.0.1:6060/dashboard")
    app.run(debug=False, port=6060)
