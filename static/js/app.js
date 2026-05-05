const resultPanels = document.querySelectorAll("[data-result]");

function showResult(data, options = {}) {
    let answerAudio = null;

    resultPanels.forEach((panel) => {
        panel.hidden = false;
        const question = panel.querySelector("[data-question]");
        const answer = panel.querySelector("[data-answer]");
        const audio = panel.querySelector("[data-audio]");

        if (question) question.textContent = data.question ? `প্রশ্ন: ${data.question}` : "";
        if (answer) answer.textContent = data.answer || data.error || "";
        if (audio && data.audio_url) {
            answerAudio = audio;
            audio.src = data.audio_url;
            audio.onended = options.onAudioEnded || null;
            audio.play().catch(() => {
                if (options.onAudioEnded) options.onAudioEnded();
            });
        } else if (options.onAudioEnded) {
            window.setTimeout(options.onAudioEnded, 900);
        }

        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    return answerAudio;
}

async function ask(form, audioBlob, options = {}) {
    const button = form.querySelector("button[type='submit']");
    const original = button ? button.textContent : "";
    const formData = new FormData(form);

    if (options.questionText) {
        formData.set("question", options.questionText);
    }

    if (audioBlob) {
        formData.append("audio", audioBlob, "question.webm");
    }

    if (button) {
        button.disabled = true;
        button.textContent = "উত্তর তৈরি হচ্ছে...";
    }
    form.classList.add("is-busy");

    try {
        const response = await fetch("/api/ask", {
            method: "POST",
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Request failed");
        showResult(data, { onAudioEnded: options.onAudioEnded });
        if (!options.keepForm) {
            form.reset();
            resetTopicPicker(form);
        }
        loadStatus();
        return data;
    } catch (error) {
        showResult({ answer: error.message || "সমস্যা হয়েছে। আবার চেষ্টা করুন।" }, {
            onAudioEnded: options.onAudioEnded,
        });
        return null;
    } finally {
        form.classList.remove("is-busy");
        if (button) {
            button.disabled = false;
            button.textContent = original;
        }
    }
}

document.querySelectorAll("[data-ask-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        ask(form);
    });
});

function resetTopicPicker(form) {
    const topicInput = form.querySelector("input[name='topic']");
    const chips = form.querySelectorAll("[data-topic]");
    if (!topicInput || !chips.length) return;

    chips.forEach((chip, index) => {
        const isFirst = index === 0;
        chip.classList.toggle("is-active", isFirst);
        if (isFirst) topicInput.value = chip.dataset.topic;
    });
}

document.querySelectorAll("[data-topic]").forEach((chip) => {
    chip.addEventListener("click", () => {
        const form = chip.closest("form");
        const topicInput = form ? form.querySelector("input[name='topic']") : null;
        if (!form || !topicInput) return;

        form.querySelectorAll("[data-topic]").forEach((item) => {
            item.classList.toggle("is-active", item === chip);
        });
        topicInput.value = chip.dataset.topic;
    });
});

async function loadStatus() {
    const fields = document.querySelectorAll("[data-status]");
    if (!fields.length) return;

    try {
        const response = await fetch("/api/status");
        const data = await response.json();
        fields.forEach((field) => {
            const value = data[field.dataset.status];
            if (typeof value === "boolean") {
                field.textContent = value ? "Ready" : "Missing";
            } else {
                field.textContent = value ?? "0";
            }
        });
    } catch {
        fields.forEach((field) => {
            field.textContent = "Offline";
        });
    }
}

loadStatus();

const voiceForm = document.querySelector("[data-voice-form]");

if (voiceForm) {
    const recordButton = voiceForm.querySelector("[data-record-button]");
    const recordLabel = voiceForm.querySelector("[data-record-label]");
    const questionInput = voiceForm.querySelector("textarea[name='question']");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let conversationOn = false;
    let recognition = null;
    let recognitionBusy = false;
    let recorder = null;
    let chunks = [];
    let latestAudio = null;
    let activeStream = null;

    function setListeningState(isListening, label = "মাইক চাপুন") {
        voiceForm.classList.toggle("is-recording-form", isListening);
        recordButton.classList.toggle("is-recording", isListening);
        recordLabel.textContent = label;
    }

    function stopConversation() {
        conversationOn = false;
        if (recognition) {
            recognition.onend = null;
            recognition.stop();
        }
        setListeningState(false, "মাইক চাপুন");
    }

    function startListening() {
        if (!conversationOn || recognitionBusy || !recognition) return;
        recognitionBusy = true;
        setListeningState(true, "শুনছি...");
        recognition.start();
    }

    async function handleRecognizedSpeech(transcript) {
        const question = transcript.trim();
        recognitionBusy = false;

        if (!question) {
            if (conversationOn) startListening();
            return;
        }

        if (questionInput) questionInput.value = question;
        setListeningState(false, "উত্তর দিচ্ছি");

        await ask(voiceForm, null, {
            keepForm: true,
            questionText: question,
            onAudioEnded: () => {
                if (conversationOn) {
                    window.setTimeout(startListening, 500);
                }
            },
        });
    }

    function setupSpeechConversation() {
        if (!SpeechRecognition) return false;

        recognition = new SpeechRecognition();
        recognition.lang = "bn-BD";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            const result = event.results[event.results.length - 1];
            const transcript = result && result[0] ? result[0].transcript : "";
            handleRecognizedSpeech(transcript);
        };

        recognition.onerror = () => {
            recognitionBusy = false;
            if (conversationOn) {
                setListeningState(false, "আবার বলুন");
                window.setTimeout(startListening, 900);
            }
        };

        recognition.onend = () => {
            recognitionBusy = false;
            if (conversationOn && !voiceForm.classList.contains("is-busy")) {
                window.setTimeout(startListening, 500);
            }
        };

        return true;
    }

    async function startRecordingFallback() {
        activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunks = [];
        latestAudio = null;
        recorder = new MediaRecorder(activeStream);

        recorder.addEventListener("dataavailable", (event) => {
            if (event.data.size > 0) chunks.push(event.data);
        });

        recorder.start();
        setListeningState(true, "থামুন");
    }

    function stopRecordingFallback() {
        return new Promise((resolve) => {
            if (!recorder || recorder.state !== "recording") {
                resolve(latestAudio);
                return;
            }

            recorder.addEventListener("stop", () => {
                latestAudio = new Blob(chunks, { type: "audio/webm" });
                if (activeStream) {
                    activeStream.getTracks().forEach((track) => track.stop());
                }
                activeStream = null;
                setListeningState(false, "পাঠানো হচ্ছে");
                resolve(latestAudio);
            }, { once: true });

            recorder.stop();
        });
    }

    const speechModeReady = setupSpeechConversation();

    recordButton.addEventListener("click", async () => {
        if (speechModeReady) {
            if (conversationOn) {
                stopConversation();
                return;
            }

            conversationOn = true;
            startListening();
            return;
        }

        if (recorder && recorder.state === "recording") {
            const audioBlob = await stopRecordingFallback();
            await ask(voiceForm, audioBlob);
            latestAudio = null;
            recordLabel.textContent = "মাইক চাপুন";
            return;
        }

        try {
            await startRecordingFallback();
        } catch {
            showResult({ answer: "মাইক্রোফোন permission দিন।" });
        }
    });

    voiceForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (conversationOn) stopConversation();
        const audioBlob = recorder && recorder.state === "recording"
            ? await stopRecordingFallback()
            : latestAudio;
        await ask(voiceForm, audioBlob);
        latestAudio = null;
        recordLabel.textContent = "মাইক চাপুন";
    });
}
