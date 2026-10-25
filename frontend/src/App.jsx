
import { useRef, useState, useEffect } from "react";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("speech");
  const [inputMode, setInputMode] = useState("upload");
  const [audioFile, setAudioFile] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [recordingError, setRecordingError] = useState("");
  const [isListening, setIsListening] = useState(false);

  const fileInput = useRef(null);
  const mediaRecorder = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (mediaRecorder.current?.state === "recording") {
        mediaRecorder.current.stop();
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const handleFile = (event) => {
    const file = event.target.files?.[0];

    if (file) {
      setAudioFile(file);
      setRecordingUrl("");
      setRecordingError("");
    }
  };

  const startRecording = async () => {
    try {
      setRecordingError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Microphone access is unavailable. Open this site on localhost or HTTPS."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (blob.size > 0) {
          setRecordingUrl(URL.createObjectURL(blob));
          setAudioFile(null);
        }

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      setRecordingError(
        error.message || "Could not access your microphone."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
    }
  };

  const startLiveSpeechRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setRecordingError(
        "Live speech recognition is not supported in this browser. Try Chrome or use audio upload."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          finalText += text + " ";
        } else {
          interimText += text;
        }
      }

      setTranscript((previous) => {
        const existing = previous.trimEnd();
        const newFinal = finalText.trim();

        if (!newFinal) {
          return existing;
        }

        return `${existing}${existing ? " " : ""}${newFinal}`;
      });

      if (interimText) {
        setRecordingError(`Listening: "${interimText}"`);
      } else {
        setRecordingError("");
      }
    };

    recognition.onerror = (event) => {
      setRecordingError(
        event.error === "not-allowed"
          ? "Microphone permission was denied. Allow microphone access in your browser."
          : `Speech recognition error: ${event.error}`
      );
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
      setRecordingError("");
    } catch {
      setRecordingError("Could not start speech recognition. Please try again.");
    }
  };

  const stopLiveSpeechRecognition = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const speakText = () => {
    if (!transcript.trim()) {
      alert("Please enter your message first.");
      return;
    }

    if (!("speechSynthesis" in window)) {
      alert("Speech playback is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(transcript);
    speech.lang = "en-IN";
    speech.rate = 0.9;

    window.speechSynthesis.speak(speech);
  };

  return (
    <div className="app">
      <header className="navbar">
        <a className="brand" href="#home">
          <span className="brand-icon">V</span>
          <span className="brand-name">VoxAssist</span>
        </a>

        <span className="navbar-caption">
          COMMUNICATION, MADE EASIER
        </span>
      </header>

      <main id="home">
        <section className="hero">
          <p className="tagline">AI-POWERED ASSISTIVE COMMUNICATION</p>

          <h1>
            Your Voice.
            <br />
            <span>Your Words. Your Way.</span>
          </h1>

          <p className="description">
            Speak, upload a recording, or type your message.
            Choose the way that works best for you.
          </p>

          <button
            className="main-button"
            onClick={() =>
              document
                .getElementById("workspace")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Get Started →
          </button>
        </section>

        <section className="workspace" id="workspace">
          <div className="workspace-heading">
            <p className="tagline">YOUR PERSONAL WORKSPACE</p>
            <h2>How would you like to communicate?</h2>
            <p>Choose an input method below.</p>
          </div>

          <div className="tabs">
            <button
              className={activeTab === "speech" ? "tab selected" : "tab"}
              onClick={() => setActiveTab("speech")}
            >
              Speech to Text
            </button>

            <button
              className={activeTab === "text" ? "tab selected" : "tab"}
              onClick={() => setActiveTab("text")}
            >
              Text to Speech
            </button>
          </div>

          {activeTab === "speech" ? (
            <>
              <div className="input-options">
                <button
                  className={
                    inputMode === "upload"
                      ? "input-option active-option"
                      : "input-option"
                  }
                  onClick={() => {
                    setInputMode("upload");
                    setRecordingError("");
                  }}
                >
                  <span className="option-icon">↑</span>
                  <span>
                    <strong>Upload Audio</strong>
                    <small>Choose a recording from your device</small>
                  </span>
                </button>

                <button
                  className={
                    inputMode === "record"
                      ? "input-option active-option"
                      : "input-option"
                  }
                  onClick={() => {
                    setInputMode("record");
                    setRecordingError("");
                  }}
                >
                  <span className="option-icon">●</span>
                  <span>
                    <strong>Record Audio</strong>
                    <small>Record your voice using a microphone</small>
                  </span>
                </button>

                <button
                  className={
                    inputMode === "live"
                      ? "input-option active-option"
                      : "input-option"
                  }
                  onClick={() => {
                    setInputMode("live");
                    setRecordingError("");
                  }}
                >
                  <span className="option-icon">〰</span>
                  <span>
                    <strong>Speak Live</strong>
                    <small>See recognized words as you speak</small>
                  </span>
                </button>
              </div>

              <div className="workspace-grid">
                <div className="panel">
                  {inputMode === "upload" && (
                    <>
                      <h3>Upload an audio file</h3>
                      <p>Select a recording from your device.</p>

                      <button
                        className="upload-box"
                        onClick={() => fileInput.current?.click()}
                      >
                        <span className="upload-icon">↑</span>
                        <strong>
                          {audioFile
                            ? audioFile.name
                            : "Choose an audio file"}
                        </strong>
                        <span>Click to browse your device</span>
                        <small>MP3 · WAV · M4A · WEBM</small>
                      </button>

                      <input
                        ref={fileInput}
                        type="file"
                        accept="audio/*"
                        hidden
                        onChange={handleFile}
                      />

                      {audioFile && (
                        <audio
                          key={audioFile.name}
                          className="audio-player"
                          controls
                          src={URL.createObjectURL(audioFile)}
                        />
                      )}
                    </>
                  )}

                  {inputMode === "record" && (
                    <>
                      <h3>Record your voice</h3>
                      <p>
                        Allow microphone access, then start recording.
                      </p>

                      <div className="record-card">
                        <div
                          className={
                            isRecording
                              ? "microphone-circle recording"
                              : "microphone-circle"
                          }
                        >
                          {isRecording ? "●" : "🎙"}
                        </div>

                        <strong>
                          {isRecording
                            ? "Recording in progress..."
                            : "Ready when you are"}
                        </strong>

                        <p>
                          {isRecording
                            ? "Speak at your own pace."
                            : "Your recording will be available to replay."}
                        </p>

                        {!isRecording ? (
                          <button
                            className="main-button"
                            onClick={startRecording}
                          >
                            Start Recording
                          </button>
                        ) : (
                          <button
                            className="stop-record-button"
                            onClick={stopRecording}
                          >
                            Stop Recording
                          </button>
                        )}
                      </div>

                      {recordingUrl && (
                        <div className="recorded-result">
                          <strong>Your recording</strong>
                          <audio
                            className="audio-player"
                            controls
                            src={recordingUrl}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {inputMode === "live" && (
                    <>
                      <h3>Speak live</h3>
                      <p>
                        Your browser will attempt to recognize your speech.
                      </p>

                      <div className="record-card">
                        <div
                          className={
                            isListening
                              ? "microphone-circle recording"
                              : "microphone-circle"
                          }
                        >
                          〰
                        </div>

                        <strong>
                          {isListening
                            ? "Listening to your speech..."
                            : "Ready to listen"}
                        </strong>

                        <p>
                          You can review and edit the recognized words
                          before using them.
                        </p>

                        {!isListening ? (
                          <button
                            className="main-button"
                            onClick={startLiveSpeechRecognition}
                          >
                            Start Speaking
                          </button>
                        ) : (
                          <button
                            className="stop-record-button"
                            onClick={stopLiveSpeechRecognition}
                          >
                            Stop Listening
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {recordingError && (
                    <p className="notice" role="status">
                      {recordingError}
                    </p>
                  )}

                  <p className="notice">
                    Review recognized text carefully. Live recognition
                    depends on browser support and may use an online service.
                  </p>
                </div>

                <div className="panel">
                  <h3>Review your message</h3>
                  <p>
                    Edit the text to make sure it expresses what you mean.
                  </p>

                  <textarea
                    value={transcript}
                    onChange={(event) => setTranscript(event.target.value)}
                    placeholder="Your recognized words will appear here. You can also type directly..."
                    aria-label="Editable transcript"
                  />

                  <div className="character-count">
                    {transcript.length} characters
                  </div>

                  <button
                    className="main-button full-button"
                    onClick={() => setActiveTab("text")}
                  >
                    Continue to Text to Speech →
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="panel speech-panel">
              <h3>Give your words a voice</h3>
              <p>Type your message and play it aloud.</p>

              <textarea
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                placeholder="Type the message you want spoken aloud..."
                aria-label="Text to speak"
              />

              <div className="speech-actions">
                <button className="main-button" onClick={speakText}>
                  ▶ Play Message
                </button>

                <button
                  className="stop-record-button"
                  onClick={() => window.speechSynthesis?.cancel()}
                >
                  Stop
                </button>

                <button
                  className="stop-record-button"
                  onClick={() => setTranscript("")}
                >
                  Clear Text
                </button>
              </div>

              <p className="notice">
                Text-to-speech uses your browser's available voice.
                A dedicated speech-generation backend can be added later.
              </p>
            </div>
          )}
        </section>

        <section className="about">
          <h2>Communication on your terms.</h2>
          <p>
            VoxAssist aims to help people communicate in the way that
            works best for them, while keeping control of their own words.
          </p>
        </section>
      </main>

      <footer className="footer">
        <strong>VoxAssist</strong>
        <span>Accessible communication, on your terms.</span>
      </footer>
    </div>
  );
}

export default App;
