const resultPanels = document.querySelectorAll("[data-result]");

function showResult(data) {
    resultPanels.forEach((panel) => {
        panel.hidden = false;
        const question = panel.querySelector("[data-question]");
        const answer = panel.querySelector("[data-answer]");
        const audio = panel.querySelector("[data-audio]");

        if (question) question.textContent = data.question ? `প্রশ্ন: ${data.question}` : "";
        if (answer) answer.textContent = data.answer || data.error || "";
        if (audio && data.audio_url) {
            audio.src = data.audio_url;
            audio.play().catch(() => {});
        }

        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
}

async function ask(form, audioBlob) {
    const button = form.querySelector("button[type='submit']");
    const original = button ? button.textContent : "";
    const formData = new FormData(form);

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
        showResult(data);
        form.reset();
        resetTopicPicker(form);
        loadStatus();
    } catch (error) {
        showResult({ answer: error.message || "সমস্যা হয়েছে। আবার চেষ্টা করুন।" });
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
    let recorder = null;
    let chunks = [];
    let latestAudio = null;
    let activeStream = null;

    function setRecordingState(isRecording) {
        voiceForm.classList.toggle("is-recording-form", isRecording);
        recordButton.classList.toggle("is-recording", isRecording);
        recordLabel.textContent = isRecording ? "থামুন" : "মাইক চাপুন";
    }

    async function startRecording() {
        activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunks = [];
        latestAudio = null;
        recorder = new MediaRecorder(activeStream);

        recorder.addEventListener("dataavailable", (event) => {
            if (event.data.size > 0) chunks.push(event.data);
        });

        recorder.start();
        setRecordingState(true);
    }

    function stopRecording() {
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
                setRecordingState(false);
                recordLabel.textContent = "পাঠানো হচ্ছে";
                resolve(latestAudio);
            }, { once: true });

            recorder.stop();
        });
    }

    recordButton.addEventListener("click", async () => {
        if (recorder && recorder.state === "recording") {
            const audioBlob = await stopRecording();
            await ask(voiceForm, audioBlob);
            latestAudio = null;
            recordLabel.textContent = "মাইক চাপুন";
            return;
        }

        try {
            await startRecording();
        } catch {
            showResult({ answer: "মাইক্রোফোন permission দিন।" });
        }
    });

    voiceForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const audioBlob = recorder && recorder.state === "recording"
            ? await stopRecording()
            : latestAudio;
        await ask(voiceForm, audioBlob);
        latestAudio = null;
        recordLabel.textContent = "মাইক চাপুন";
    });
}
