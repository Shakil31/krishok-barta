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
        button.textContent = "অপেক্ষা করুন...";
    }

    try {
        const response = await fetch("/api/ask", {
            method: "POST",
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Request failed");
        showResult(data);
        form.reset();
        loadStatus();
    } catch (error) {
        showResult({ answer: error.message || "সমস্যা হয়েছে।" });
    } finally {
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

    recordButton.addEventListener("click", async () => {
        if (recorder && recorder.state === "recording") {
            recorder.stop();
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            chunks = [];
            recorder = new MediaRecorder(stream);
            recorder.addEventListener("dataavailable", (event) => {
                if (event.data.size > 0) chunks.push(event.data);
            });
            recorder.addEventListener("stop", () => {
                latestAudio = new Blob(chunks, { type: "audio/webm" });
                stream.getTracks().forEach((track) => track.stop());
                recordButton.classList.remove("is-recording");
                recordLabel.textContent = "রেকর্ড হয়েছে";
            });
            recorder.start();
            recordButton.classList.add("is-recording");
            recordLabel.textContent = "থামুন";
        } catch {
            showResult({ answer: "মাইক্রোফোন permission দিন।" });
        }
    });

    voiceForm.addEventListener("submit", (event) => {
        event.preventDefault();
        ask(voiceForm, latestAudio);
        latestAudio = null;
        recordLabel.textContent = "মাইক চাপুন";
    });
}
