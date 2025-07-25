import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MicVAD } from "@ricky0123/vad-web";

const blobs = [0, 1, 2, 3];

const blobVariants = {
  animate: (i) => ({
    scaleY: [1, 1.8, 1],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: "easeInOut",
      delay: i * 0.2,
    },
  }),
  idle: {
    scaleY: 1,
  },
};

export default function VoiceBot() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [volumeScale, setVolumeScale] = useState(1);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [greetingReceived, setGreetingReceived] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [speechEndTimeout, setSpeechEndTimeout] = useState(null);
  
  // New states for interruption handling
  const [pendingTTSAudio, setPendingTTSAudio] = useState(null);
  const [wasInterrupted, setWasInterrupted] = useState(false);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const rafRef = useRef(null);

  const vadRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const wsRef = useRef(null);
  const botAudioRef = useRef(null);

  const dummyUserId = "27";

  // Audio management functions
  const cancelBotAudio = () => {
    if (botAudioRef.current) {
      botAudioRef.current.pause();
      botAudioRef.current.currentTime = 0;
      URL.revokeObjectURL(botAudioRef.current.src);
      botAudioRef.current = null;
    }
    setIsSpeaking(false);
  };

  const cleanupAudio = () => {
    // Cleanup current bot audio
    cancelBotAudio();

    // Cleanup pending audio
    if (pendingTTSAudio) {
      URL.revokeObjectURL(pendingTTSAudio);
      setPendingTTSAudio(null);
    }
  };

  const playBotAudio = async (audioUrl) => {
    try {
      const audio = new Audio(audioUrl);
      botAudioRef.current = audio;

      audio.onplay = () => {
        setIsSpeaking(true);
        console.log("🔊 Bot audio started");
      };

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audio.src);
        botAudioRef.current = null;
        setPendingTTSAudio(null);
        console.log("🔇 Bot audio ended");
      };

      audio.onerror = (e) => {
        console.error("🔈 Audio error", e);
        setIsSpeaking(false);
        URL.revokeObjectURL(audio.src);
        setPendingTTSAudio(null);
      };

      await audio.play();
    } catch (error) {
      console.error("🔈 Failed to play bot audio:", error);
      setIsSpeaking(false);
    }
  };

  const handleIncomingAudio = async (audioData) => {
    // If user is currently speaking, discard this audio
    if (userSpeaking) {
      console.log("🚫 Discarding TTS audio - user is speaking");
      return;
    }

    // Cancel any currently playing bot audio
    cancelBotAudio();

    // Cancel any pending audio
    if (pendingTTSAudio) {
      URL.revokeObjectURL(pendingTTSAudio);
      setPendingTTSAudio(null);
    }

    const audioBlob = new Blob([audioData], { type: "audio/wav" });
    const url = URL.createObjectURL(audioBlob);
    
    // Store as pending audio
    setPendingTTSAudio(url);
    
    // Only play if user is not speaking
    if (!userSpeaking) {
      await playBotAudio(url);
    }
  };

  const connectWebSocket = () => {
    if (sessionActive) return;

    setIsConnecting(true);
    setIsConnected(false);
    setGreetingReceived(false);
    setSessionActive(true);

    const ws = new WebSocket("wss://manasdhir04-voice-bot.hf.space/ws/stream");
    //const ws = new WebSocket("ws://localhost:8000/ws/stream");
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      console.log("🔌 WebSocket connected.");
      ws.send(JSON.stringify({ lang_code: selectedLanguage, user_id: dummyUserId }));
    };

    ws.onmessage = async (event) => {
      if (typeof event.data === "string") {
        const msg = JSON.parse(event.data);
        if (msg.type === "transcription") {
          console.log("📝 Transcription:", msg.text);
        } else if (msg.type === "llm_response") {
          console.log("🤖 Bot:", msg.text);
          if (!greetingReceived) setGreetingReceived(true);
        } else if (msg.type === "tts_start") {
          // Don't set speaking immediately - wait for actual audio
          console.log("🎵 TTS audio incoming...");
        } else if (msg.type === "tts_end") {
          setIsSpeaking(false);
          setPendingTTSAudio(null);
        } else if (msg.type === "connection_confirmed") {
          console.log("✅ Connection confirmed:", msg);
          setIsConnecting(false);
          setIsConnected(true);
        }
      } else {
        // Handle binary audio data
        await handleIncomingAudio(event.data);
      }
    };

    ws.onclose = () => {
      console.log("❌ WebSocket disconnected.");
      cleanupWebSocket();
    };

    ws.onerror = (err) => {
      console.error("⚠️ WebSocket error:", err);
      cleanupWebSocket();
    };

    wsRef.current = ws;
  };

  const cleanupWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    cleanupAudio();
    setIsConnecting(false);
    setIsConnected(false);
    setGreetingReceived(false);
    setSessionActive(false);
  };

  const disconnectWebSocket = () => {
    cleanupWebSocket();
    setMicOn(false);
  };

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;

      const dataArray = new Uint8Array(analyser.fftSize);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      const vad = await MicVAD.new({
          source: stream,
  
  // BACKGROUND NOISE LEARNING
  noiseCaptureDuration: 1000,        // Learn background for 1 second
  
  // SPEECH DETECTION THRESHOLDS  
  positiveSpeechThreshold: 0.8,      // Higher = less sensitive to noise
  negativeSpeechThreshold: 0.35,     // Lower = better silence detection
  
        onSpeechStart: () => {
          console.log("🟢 Speech started - interrupting bot");
          if (speechEndTimeout) clearTimeout(speechEndTimeout);
          
          // Check if we're interrupting the bot
          if (isSpeaking || pendingTTSAudio) {
            setWasInterrupted(true);
            setTimeout(() => setWasInterrupted(false), 2000);
          }
          
          setUserSpeaking(true);
          chunksRef.current = [];

          // Cancel any playing bot audio immediately
          cancelBotAudio();

          // Cancel any pending TTS audio
          if (pendingTTSAudio) {
            URL.revokeObjectURL(pendingTTSAudio);
            setPendingTTSAudio(null);
          }

          mediaRecorderRef.current?.start();
        },
        onSpeechEnd: () => {
          console.log("🔴 Speech end detected, waiting for pause timeout...");
          setSpeechEndTimeout(
            setTimeout(() => {
              setUserSpeaking(false);
              mediaRecorderRef.current?.stop();
            }, 0.8)
          );
        },
      });

      await vad.start();
      vadRef.current = vad;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const buffer = reader.result;
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "audio_data" }));
            wsRef.current.send(buffer);
          }
        };
        reader.readAsArrayBuffer(blob);
      };

      const animateLive = () => {
        if (!micOn || !isConnected || !analyserRef.current) return;

        analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
        let sumSquares = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          const val = dataArrayRef.current[i] - 128;
          sumSquares += val * val;
        }
        const rms = Math.sqrt(sumSquares / dataArrayRef.current.length);
        const scale = 1 + Math.min(rms / 30, 1.2);

        if (Math.abs(scale - volumeScale) > 0.02) setVolumeScale(scale);
        rafRef.current = requestAnimationFrame(animateLive);
      };

      animateLive();
    } catch (err) {
      console.error("❌ Mic/VAD error:", err);
      setMicOn(false);
    }
  };

  const stopMic = async () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    if (speechEndTimeout) clearTimeout(speechEndTimeout);

    if (vadRef.current) {
      await vadRef.current.pause();
      await vadRef.current.destroy();
      vadRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    dataArrayRef.current = null;
  };

  useEffect(() => {
    return () => {
      disconnectWebSocket();
      stopMic();
    };
  }, []);

  useEffect(() => {
    if (sessionActive && selectedLanguage) {
      disconnectWebSocket();
      setTimeout(() => connectWebSocket(), 100);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    if (micOn) startMic();
    else stopMic();
    return () => stopMic();
  }, [micOn]);

  return (
    <div className="flex flex-col items-center justify-center h-80 w-full gap-6">
      <div className="flex flex-col items-center gap-2">
        <label htmlFor="language-select" className="text-white text-sm font-medium">
          Select Language:
        </label>
        <select
          id="language-select"
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          disabled={isConnecting}
          className="px-3 py-1 rounded bg-gray-700 text-white border border-gray-600 disabled:opacity-50"
        >
          <option value="english">English</option>
          <option value="hindi">Hindi</option>
          <option value="punjabi">Punjabi</option>
        </select>
        {isConnecting && <p className="text-xs text-gray-400">Connecting...</p>}
        {wasInterrupted && (
          <p className="text-xs text-yellow-400">Bot interrupted - processing your input...</p>
        )}
      </div>

      {isConnecting && (
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          <p className="text-white text-sm">Connecting to voice bot...</p>
        </div>
      )}

      {isConnected && !greetingReceived && (
        <div className="flex flex-col items-center gap-2">
          <div className="animate-pulse bg-white rounded-full h-4 w-4"></div>
          <p className="text-white text-sm">Preparing greeting...</p>
        </div>
      )}

      <div className="relative h-[120px] w-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          {isSpeaking && (
            <motion.div
              key="bot-speaking"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute flex items-end gap-3"
            >
              {blobs.map((b, i) => (
                <motion.div
                  key={b}
                  className="bg-white rounded-full w-[60px] h-[60px]"
                  custom={i}
                  variants={blobVariants}
                  animate="animate"
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {userSpeaking && !isSpeaking && (
            <motion.div
              key="user-speaking"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ scale: volumeScale, opacity: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute bg-white rounded-full h-[100px] w-[100px]"
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!userSpeaking && !isSpeaking && isConnected && greetingReceived && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bg-white rounded-full h-[50px] w-[50px]"
            />
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-4">
        <button
          onClick={sessionActive ? disconnectWebSocket : connectWebSocket}
          disabled={isConnecting}
          className={`text-white px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed ${
            sessionActive ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isConnecting ? "Connecting..." : sessionActive ? "Stop Session" : "Start Session"}
        </button>

        <button
          onClick={() => setMicOn((prev) => !prev)}
          disabled={!isConnected || !greetingReceived}
          className={`text-white px-6 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed ${
            micOn ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {micOn ? "Mute" : "Unmute"}
        </button>
      </div>
    </div>
  );
}
