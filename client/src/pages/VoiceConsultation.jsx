import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import VoiceRecorder from "../components/VoiceRecorder";
import { API_ENDPOINTS, API_URL } from "../config/api";
import {
  ChatBubbleLeftRightIcon,
  MicrophoneIcon,
  DocumentTextIcon,
  ClockIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SpeakerWaveIcon,
  StopCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  HeartIcon,
  BeakerIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/solid";
import Toast from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";

export default function VoiceConsultation() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [currentConsultation, setCurrentConsultation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [isSubmittingText, setIsSubmittingText] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSynthesis, setSpeechSynthesis] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isClearing, setIsClearing] = useState(false);
  const [lastDeletedLocal, setLastDeletedLocal] = useState(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null);
  const narrationCancelledRef = useRef(false);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setSpeechSynthesis(window.speechSynthesis);
    }
  }, []);

  // Load consultation history on component mount
  useEffect(() => {
    loadConsultationHistory();
  }, [user]);

  const loadConsultationHistory = async () => {
    if (!user) {
      console.log("⚠️ No user, skipping history load");
      return;
    }

    console.log("📥 Loading consultation history from database...");

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (!token) {
        console.error("❌ No auth token found");
        return;
      }

      console.log(
        "🔑 Token found, fetching from:",
        API_ENDPOINTS.VOICE_HISTORY,
      );

      const response = await fetch(API_ENDPOINTS.VOICE_HISTORY, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("📡 Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ History loaded successfully:", data);

        if (data.success) {
          console.log(`📊 Found ${data.consultations.length} consultations`);
          setConsultationHistory(data.consultations);
        } else {
          console.error("❌ Response success was false:", data);
        }
      } else {
        const errorText = await response.text();
        console.error(
          "❌ Failed to load consultation history:",
          response.status,
          errorText,
        );
      }
    } catch (error) {
      console.error("❌ Error loading consultation history:", error);
    }
  };

  // Delete a single consultation by id (immediate)
  const handleDeleteConsultation = async (id) => {
    // Immediately perform delete (local or server)
    await requestDeleteConsultation(id);
  };

  const requestDeleteConsultation = async (id) => {
    // If the item is a locally-created placeholder (e.g. id is a timestamp number), remove it locally
    const localItem = consultationHistory.find((c) => c.id === id);
    if (localItem && (typeof id === "number" || /^\d+$/.test(String(id)))) {
      // remove locally without calling the server and show undo option
      setConsultationHistory((prev) => prev.filter((c) => c.id !== id));
      if (currentConsultation && currentConsultation.id === id)
        setCurrentConsultation(null);
      setLastDeletedLocal(localItem);
      setShowUndoToast(true);
      // auto-dismiss after 6 seconds
      setTimeout(() => {
        setShowUndoToast(false);
        setLastDeletedLocal(null);
      }, 6000);
      return;
    }

    setConfirmOpen(false);
    setDeletingId(id);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      console.log("🗑️ Deleting consultation", id, "token present:", !!token);
      const res = await fetch(`${API_URL}/api/voice/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      console.log("🗑️ Delete response status:", res.status);
      if (!res.ok) {
        const text = await res.text().catch(() => null);
        console.error("Failed to delete consultation:", res.status, text);
        alert("Failed to delete consultation. See console for details.");
        return;
      }

      // update UI (refresh from server to ensure counts sync)
      await loadConsultationHistory();
      // also clear currentConsultation if it was the deleted one
      if (currentConsultation && currentConsultation.id === id) {
        setCurrentConsultation(null);
      }
    } catch (err) {
      console.error("Error deleting consultation:", err);
      alert("Error deleting consultation. See console for details.");
    } finally {
      setDeletingId(null);
    }
  };

  // Clear all consultations for the user
  const handleClearConsultations = async () => {
    // use modal prompt
    setConfirmMessage("Are you sure you want to delete ALL consultations?");
    setConfirmAction(() => async () => {
      setIsClearing(true);
      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        const res = await fetch(`${API_URL}/api/voice`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const text = await res.text().catch(() => null);
          console.error("Failed to clear consultations:", res.status, text);
          // show error toast
          setShowUndoToast(false);
          alert("Failed to clear consultations. See console for details.");
          return;
        }

        // refresh from server (should be empty)
        await loadConsultationHistory();
        setCurrentConsultation(null);
      } catch (err) {
        console.error("Error clearing consultations:", err);
        alert("Error clearing consultations. See console for details.");
      } finally {
        setIsClearing(false);
      }
    });
    setConfirmOpen(true);
  };

  const handleAudioRecorded = (audioBlob) => {
    console.log("Audio recorded:", audioBlob);
  };

  const startDoctorVideoCall = () => {
    const roomId = `consult-${Math.random().toString(36).slice(2, 8)}`;
    window.location.assign(`/video-call?room=${roomId}&role=patient`);
  };

  const handleTranscriptionReceived = (
    originalMessage,
    transcription,
    medicalResponse,
    detectedLanguage = "en",
    sections = null,
  ) => {
    const consultation = {
      id: Date.now(),
      timestamp: new Date(),
      originalMessage: originalMessage || transcription,
      transcription: transcription,
      response: medicalResponse,
      sections: sections,
      detectedLanguage: detectedLanguage,
      audioUrl: null,
    };

    setConsultationHistory((prev) => [consultation, ...prev]);
    setCurrentConsultation(consultation);
  };

  // Handle text input submission
  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!textInput.trim() || isSubmittingText) return;

    setIsSubmittingText(true);

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await fetch(API_ENDPOINTS.VOICE_TEXT_CONSULTATION, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: textInput.trim(),
          language:
            i18n?.language || localStorage.getItem("selectedLanguage") || "en",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          handleTranscriptionReceived(
            textInput.trim(),
            textInput.trim(),
            data.medicalResponse,
            i18n?.language || localStorage.getItem("selectedLanguage") || "en",
            data.sections || null,
          );
          setTextInput("");

          // Reload consultation history from database after successful save
          setTimeout(() => {
            loadConsultationHistory();
          }, 500);
        }
      } else {
        console.error("Text consultation failed");
      }
    } catch (error) {
      console.error("Error submitting text consultation:", error);
    } finally {
      setIsSubmittingText(false);
    }
  };

  const formatTime = (date) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) {
        return "Invalid date";
      }
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(dateObj);
    } catch (error) {
      console.error("Error formatting time:", error);
      return "Invalid date";
    }
  };

  const handleViewDetails = (consultation) => {
    setSelectedHistoryItem(consultation);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedHistoryItem(null);
  };

  const getNarrationText = (item) => {
    if (!item) return "";

    if (typeof item === "string") {
      return item.trim();
    }

    const sectionParts = [];
    if (item.sections?.assessment) {
      sectionParts.push(`Assessment: ${item.sections.assessment}`);
    }
    if (
      Array.isArray(item.sections?.possibleCauses) &&
      item.sections.possibleCauses.length > 0
    ) {
      sectionParts.push(
        `Possible causes: ${item.sections.possibleCauses.join(", ")}`,
      );
    }
    if (
      Array.isArray(item.sections?.recommendations) &&
      item.sections.recommendations.length > 0
    ) {
      sectionParts.push(
        `Recommendations: ${item.sections.recommendations.join(", ")}`,
      );
    }

    return (
      item.response ||
      (sectionParts.length > 0 ? sectionParts.join(". ") : "") ||
      item.transcription ||
      item.originalMessage ||
      ""
    ).trim();
  };

  const splitTextForSpeech = (text, maxChunkLength = 220) => {
    const sanitized = String(text || "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!sanitized) return [];

    const sentences = sanitized.split(/(?<=[.!?।])\s+/);
    const chunks = [];
    let current = "";

    for (const sentence of sentences) {
      if (!sentence) continue;

      if ((current + " " + sentence).trim().length <= maxChunkLength) {
        current = (current + " " + sentence).trim();
        continue;
      }

      if (current) {
        chunks.push(current);
      }

      if (sentence.length <= maxChunkLength) {
        current = sentence.trim();
      } else {
        for (let i = 0; i < sentence.length; i += maxChunkLength) {
          chunks.push(sentence.slice(i, i + maxChunkLength).trim());
        }
        current = "";
      }
    }

    if (current) {
      chunks.push(current);
    }

    return chunks.filter(Boolean);
  };

  // Narration Functions for Text-to-Speech
  const detectLanguageFromText = (text) => {
    // Detect language based on script with more specific patterns
    if (/[\u0900-\u097F]/.test(text)) {
      // Check if it's Marathi or Hindi by looking for specific characters
      if (
        /[\u0902\u0903]/.test(text) ||
        text.includes("ण") ||
        text.includes("ळ")
      ) {
        return "mr-IN"; // Marathi has specific characters
      }
      return "hi-IN"; // Hindi/Devanagari
    }
    if (/[\u0980-\u09FF]/.test(text)) return "bn-IN"; // Bengali
    if (/[\u0B80-\u0BFF]/.test(text)) return "ta-IN"; // Tamil
    if (/[\u0C00-\u0C7F]/.test(text)) return "te-IN"; // Telugu
    if (/[\u0A80-\u0AFF]/.test(text)) return "gu-IN"; // Gujarati
    if (/[\u0C80-\u0CFF]/.test(text)) return "kn-IN"; // Kannada
    if (/[\u0B00-\u0B7F]/.test(text)) return "or-IN"; // Odia
    if (/[\u0600-\u06FF]/.test(text)) return "ur-IN"; // Urdu (Arabic script)
    return "en-US"; // Default to English
  };

  // Map language codes to voice locales for narration
  const getVoiceLocale = (langCode) => {
    const localeMap = {
      en: "en-US",
      hi: "hi-IN",
      bn: "bn-IN",
      ta: "ta-IN",
      te: "te-IN",
      gu: "gu-IN",
      kn: "kn-IN",
      mr: "mr-IN",
      or: "or-IN",
      ur: "ur-IN",
      as: "as-IN",
      mai: "hi-IN", // Maithili uses Hindi voice
    };
    return localeMap[langCode] || "en-US";
  };

  const handleNarration = async (text) => {
    const narrationText = getNarrationText(text);

    if (!narrationText) {
      alert("No text available to read aloud yet.");
      return;
    }

    if (!speechSynthesis) {
      alert("Text-to-speech is not supported in your browser");
      return;
    }

    // Stop any ongoing speech
    if (isSpeaking) {
      narrationCancelledRef.current = true;
      speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Use user's selected language from i18n first, fallback to text detection
    const selectedLangCode =
      i18n?.language || localStorage.getItem("selectedLanguage") || "en";
    const language = getVoiceLocale(selectedLangCode);
    console.log(
      "🌍 Selected language:",
      selectedLangCode,
      "→ Locale:",
      language,
    );

    // Get available voices (wait for them to load)
    let voices = speechSynthesis.getVoices();

    // If voices not loaded yet, wait for them
    if (voices.length === 0) {
      await new Promise((resolve) => {
        speechSynthesis.onvoiceschanged = () => {
          voices = speechSynthesis.getVoices();
          resolve();
        };
        // Timeout after 1 second
        setTimeout(resolve, 1000);
      });
    }

    console.log("🎤 Available voices:", voices.length);

    // Find the best matching voice for the language
    let selectedVoice = null;

    // Try exact match first (e.g., "hi-IN")
    selectedVoice = voices.find((voice) => voice.lang === language);

    // Try language code match (e.g., "hi")
    if (!selectedVoice) {
      const langCode = language.split("-")[0];
      selectedVoice = voices.find((voice) => voice.lang.startsWith(langCode));
    }

    // Try to find Google voices (better quality)
    if (!selectedVoice) {
      const langCode = language.split("-")[0];
      selectedVoice = voices.find(
        (voice) =>
          voice.name.toLowerCase().includes("google") &&
          voice.lang.startsWith(langCode),
      );
    }

    // Log voice selection
    if (selectedVoice) {
      console.log(
        "✅ Selected voice:",
        selectedVoice.name,
        "-",
        selectedVoice.lang,
      );
    } else {
      console.warn("⚠️ No voice found for", language, "- using default");

      // Show warning to user
      const langName =
        {
          "hi-IN": "Hindi",
          "bn-IN": "Bengali",
          "ta-IN": "Tamil",
          "te-IN": "Telugu",
          "gu-IN": "Gujarati",
          "kn-IN": "Kannada",
          "mr-IN": "Marathi",
          "or-IN": "Odia",
          "ur-IN": "Urdu",
          "as-IN": "Assamese",
        }[language] || "this language";

      // Check if we should try server-side TTS
      if (language !== "en-US") {
        const useServerTTS = confirm(
          `Your browser doesn't have a ${langName} voice installed.\n\n` +
            `Would you like to use high-quality cloud text-to-speech instead?\n\n` +
            `(This will send the text to our server for narration)`,
        );

        if (useServerTTS) {
          await handleServerNarration(narrationText, selectedLangCode);
          return;
        }
      }
    }

    // Create speech utterance
    const chunks = splitTextForSpeech(narrationText);
    if (chunks.length === 0) {
      alert("No readable text found for narration.");
      return;
    }

    narrationCancelledRef.current = false;
    setIsSpeaking(true);
    console.log(`🔊 Narration started with ${chunks.length} chunk(s)`);

    const speakChunk = (index) => {
      if (narrationCancelledRef.current || index >= chunks.length) {
        setIsSpeaking(false);
        narrationCancelledRef.current = false;
        console.log("✅ Finished speaking");
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = language;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => {
        speakChunk(index + 1);
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        narrationCancelledRef.current = false;
        console.error("❌ Speech error:", event.error);

        if (language !== "en-US" && event.error !== "canceled") {
          const retry = confirm(
            `Browser text-to-speech failed.\n\n` +
              `Would you like to try cloud-based narration instead?`,
          );
          if (retry) {
            handleServerNarration(narrationText, language);
          }
        }
      };

      speechSynthesis.speak(utterance);
    };

    speakChunk(0);
  };

  // Server-side TTS using Google Cloud (fallback for Indian languages)
  const handleServerNarration = async (text, language) => {
    try {
      setIsSpeaking(true);
      console.log("🌩️ Using server-side TTS for:", language);

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/narration/speak`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text, language }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        // Store audio reference in state so we can stop it later
        setCurrentAudio(audio);

        audio.onplay = () => {
          console.log("🔊 Playing server-generated audio");
        };

        audio.onended = () => {
          setIsSpeaking(false);
          setCurrentAudio(null);
          URL.revokeObjectURL(audioUrl);
          console.log("✅ Server audio finished");
        };

        audio.onerror = (error) => {
          setIsSpeaking(false);
          setCurrentAudio(null);
          URL.revokeObjectURL(audioUrl);
          console.error("❌ Audio playback error:", error);
          alert("Failed to play audio. Please try again.");
        };

        await audio.play();
      } else {
        throw new Error("Server TTS not available");
      }
    } catch (error) {
      setIsSpeaking(false);
      setCurrentAudio(null);
      console.error("❌ Server-side TTS error:", error);
      alert(
        "Cloud narration is currently unavailable.\n\n" +
          "Please try:\n" +
          "1. Using Chrome browser for better voice support\n" +
          "2. Updating your browser to the latest version\n" +
          "3. Installing language voice packs on your device",
      );
    }
  };

  const stopNarration = () => {
    console.log("🛑 Stopping narration...");
    narrationCancelledRef.current = true;

    // Stop browser-based TTS
    if (speechSynthesis && isSpeaking) {
      speechSynthesis.cancel();
      console.log("✅ Stopped browser TTS");
    }

    // Stop server-based audio playback
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      console.log("✅ Stopped server audio");
    }

    setIsSpeaking(false);
  };

  // Stop narration when component unmounts
  useEffect(() => {
    return () => {
      narrationCancelledRef.current = true;
      if (speechSynthesis) {
        speechSynthesis.cancel();
      }
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, [speechSynthesis, currentAudio]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900">
      {/* Professional Header with Medical Theme */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <MicrophoneIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  AI Medical Consultation
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center mt-1">
                  <ShieldCheckIcon className="h-4 w-4 mr-1 text-green-500" />
                  Powered by Advanced AI • HIPAA Compliant
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <div className="text-center">
                <div className="flex items-center text-blue-600 dark:text-blue-400 font-semibold">
                  <BeakerIcon className="h-5 w-5 mr-1" />
                  <span className="text-lg">{consultationHistory.length}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Consultations
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={startDoctorVideoCall}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                  title="Start live doctor video call"
                >
                  Live Doctor Call
                </button>
                <button
                  onClick={handleClearConsultations}
                  disabled={isClearing}
                  className={`text-xs ${
                    isClearing ? "bg-red-400" : "bg-red-500 hover:bg-red-600"
                  } text-white px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1`}
                  title="Clear all consultations"
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  <span>{isClearing ? "Clearing..." : "Clear All"}</span>
                </button>
              </div>
              <div className="text-center">
                <div className="flex items-center text-green-600 dark:text-green-400 font-semibold">
                  <HeartIcon className="h-5 w-5 mr-1" />
                  <span className="text-lg">Active</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Status
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Input Section */}
          <div className="lg:col-span-4 space-y-6">
            {/* Voice Recorder Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700"
            >
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <MicrophoneIcon className="h-5 w-5 mr-2" />
                  {t("voice.title")}
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  {t("voice.subtitle")}
                </p>
              </div>
              <div className="p-6">
                <VoiceRecorder
                  onAudioRecorded={handleAudioRecorded}
                  onTranscriptionReceived={handleTranscriptionReceived}
                />
              </div>
            </motion.div>

            {/* Text Input Alternative */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700"
            >
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
                  {t("voice.textInput")}
                </h2>
                <p className="text-purple-100 text-sm mt-1">
                  {t("voice.textPlaceholder")}
                </p>
              </div>
              <div className="p-6">
                <form onSubmit={handleTextSubmit} className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder={t("voice.textPlaceholder")}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-gray-900 dark:text-white bg-white dark:bg-gray-900 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      rows={4}
                      disabled={isSubmittingText}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400 dark:text-gray-500">
                      {textInput.length}/500
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!textInput.trim() || isSubmittingText}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 font-semibold shadow-md hover:shadow-lg"
                  >
                    {isSubmittingText ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        {t("voice.processing")}
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-5 w-5" />
                        {t("voice.aiResponse")}
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>

            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <CheckCircleIcon className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                {t("voice.howItWorks")}
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-2 mt-0.5">
                    1
                  </span>
                  <span>{t("voice.step1")}</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-2 mt-0.5">
                    2
                  </span>
                  <span>{t("voice.step2")}</span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-2 mt-0.5">
                    3
                  </span>
                  <span>{t("voice.step3")}</span>
                </li>
              </ul>
            </motion.div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-6">
            {/* Current Consultation Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700"
            >
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  {t("voice.aiResponse")}
                </h2>
                <p className="text-green-100 text-sm mt-1">
                  {t("voice.medicalAnalysis")}
                </p>
              </div>

              <div className="p-6">
                <AnimatePresence mode="wait">
                  {currentConsultation ? (
                    <motion.div
                      key={currentConsultation.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-6"
                    >
                      {/* Your Query */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-100 dark:border-blue-800">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                            <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                            {t("voice.yourQuery")}
                          </h3>
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium">
                            {formatTime(currentConsultation.timestamp)}
                          </span>
                        </div>
                        <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                          "{currentConsultation.transcription}"
                        </p>
                      </div>

                      {/* AI Response */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border-2 border-green-200 dark:border-green-800">
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center text-lg">
                            <BeakerIcon className="h-6 w-6 mr-2 text-green-600 dark:text-green-400" />
                            Medical Analysis
                          </h3>
                          <div className="flex items-center space-x-2">
                            {/* Narration Button */}
                            <button
                              onClick={() =>
                                isSpeaking
                                  ? stopNarration()
                                  : handleNarration(currentConsultation)
                              }
                              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
                                isSpeaking
                                  ? "bg-red-500 hover:bg-red-600 text-white"
                                  : "bg-blue-500 hover:bg-blue-600 text-white"
                              } shadow-md hover:shadow-lg transform hover:scale-105`}
                              title={isSpeaking ? "Stop Reading" : "Read Aloud"}
                            >
                              {isSpeaking ? (
                                <>
                                  <StopCircleIcon className="h-5 w-5 mr-2" />
                                  <span className="hidden sm:inline">Stop</span>
                                </>
                              ) : (
                                <>
                                  <SpeakerWaveIcon className="h-5 w-5 mr-2" />
                                  <span className="hidden sm:inline">
                                    Read Aloud
                                  </span>
                                </>
                              )}
                            </button>

                            <div className="flex items-center bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-xs font-semibold">
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              AI Verified
                            </div>
                          </div>
                        </div>

                        {/* Speaking Indicator */}
                        {isSpeaking && (
                          <div className="mb-4 flex items-center bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-lg">
                            <div className="flex space-x-1 mr-3">
                              <div className="w-1 h-4 bg-blue-600 rounded-full animate-pulse"></div>
                              <div className="w-1 h-4 bg-blue-600 rounded-full animate-pulse delay-75"></div>
                              <div className="w-1 h-4 bg-blue-600 rounded-full animate-pulse delay-150"></div>
                            </div>
                            <span className="text-sm font-medium">
                              🔊 Reading aloud...
                            </span>
                          </div>
                        )}

                        <div className="prose prose-sm max-w-none">
                          {currentConsultation.sections ? (
                            // Render structured sections
                            <div className="space-y-4">
                              {currentConsultation.sections.assessment && (
                                <div>
                                  <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-2">
                                    📋 Assessment:
                                  </h4>
                                  <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                                    {currentConsultation.sections.assessment}
                                  </p>
                                </div>
                              )}
                              {currentConsultation.sections.possibleCauses &&
                                currentConsultation.sections.possibleCauses
                                  .length > 0 && (
                                  <div>
                                    <h4 className="font-bold text-green-600 dark:text-green-400 mb-2">
                                      🔍 Possible Causes:
                                    </h4>
                                    <ul className="text-sm space-y-1 ml-4 text-gray-800 dark:text-gray-200">
                                      {currentConsultation.sections.possibleCauses.map(
                                        (cause, idx) => (
                                          <li key={idx} className="list-disc">
                                            {cause}
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}
                              {currentConsultation.sections
                                .recommendedSelfCare &&
                                currentConsultation.sections.recommendedSelfCare
                                  .length > 0 && (
                                  <div>
                                    <h4 className="font-bold text-orange-600 dark:text-orange-400 mb-2">
                                      💊 Recommended Self-Care:
                                    </h4>
                                    <ol className="text-sm space-y-1 ml-4 text-gray-800 dark:text-gray-200">
                                      {currentConsultation.sections.recommendedSelfCare.map(
                                        (care, idx) => (
                                          <li
                                            key={idx}
                                            className="list-decimal"
                                          >
                                            {care}
                                          </li>
                                        ),
                                      )}
                                    </ol>
                                  </div>
                                )}
                              {currentConsultation.sections.warningSigns &&
                                currentConsultation.sections.warningSigns
                                  .length > 0 && (
                                  <div>
                                    <h4 className="font-bold text-red-600 dark:text-red-400 mb-2">
                                      ⚠️ Warning Signs:
                                    </h4>
                                    <ul className="text-sm space-y-1 ml-4 text-gray-800 dark:text-gray-200">
                                      {currentConsultation.sections.warningSigns.map(
                                        (sign, idx) => (
                                          <li key={idx} className="list-disc">
                                            {sign}
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}
                              {currentConsultation.sections.whenToSeeDoctor && (
                                <div>
                                  <h4 className="font-bold text-purple-600 dark:text-purple-400 mb-2">
                                    🏥 When to See a Doctor:
                                  </h4>
                                  <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                                    {
                                      currentConsultation.sections
                                        .whenToSeeDoctor
                                    }
                                  </p>
                                </div>
                              )}
                              {currentConsultation.sections.importantForYou && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border-l-4 border-yellow-400">
                                  <h4 className="font-bold text-yellow-700 dark:text-yellow-300 mb-2">
                                    📝 Important for You:
                                  </h4>
                                  <p className="text-sm leading-relaxed text-yellow-800 dark:text-yellow-200">
                                    {
                                      currentConsultation.sections
                                        .importantForYou
                                    }
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            // Render plain text response
                            <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line text-base">
                              {currentConsultation.response}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-16"
                    >
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ChatBubbleLeftRightIcon className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Ready to Assist You
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                        Record your voice or type your medical concerns to
                        receive personalized AI-powered health guidance
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Consultation History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700"
            >
              <div className="bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-800 dark:to-black px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  Previous Consultations
                </h2>
                <p className="text-gray-300 dark:text-gray-400 text-sm mt-1">
                  Your consultation history
                </p>
              </div>

              <div className="p-6">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <AnimatePresence>
                    {consultationHistory.length > 0 ? (
                      consultationHistory.map((consultation, index) => (
                        <motion.div
                          key={consultation.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className="group relative bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              {formatTime(consultation.timestamp)}
                            </span>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                Question
                              </h4>
                              <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                                {consultation.transcription}
                              </p>
                            </div>

                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                                AI Response
                              </h4>
                              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                {consultation.response}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                              <CheckCircleIcon className="h-4 w-4 mr-1 text-green-500 dark:text-green-400" />
                              Analysis Complete
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewDetails(consultation)}
                                className="text-xs bg-blue-500 dark:bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors flex items-center space-x-1"
                              >
                                <DocumentTextIcon className="h-4 w-4" />
                                <span>{t("voice.viewDetails")}</span>
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteConsultation(consultation.id)
                                }
                                disabled={deletingId === consultation.id}
                                className={`text-xs ${
                                  deletingId === consultation.id
                                    ? "bg-red-400"
                                    : "bg-red-500 hover:bg-red-600"
                                } text-white px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1`}
                                title="Delete consultation"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                      >
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                          <ClockIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 font-medium">
                          No consultations yet
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Your consultation history will appear here
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Professional Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 dark:border-amber-600 rounded-lg p-6"
        >
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 dark:text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
                {t("disclaimer.title")}
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                {t("disclaimer.text")}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedHistoryItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
            onClick={closeDetailModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <DocumentTextIcon className="h-6 w-6 mr-2" />
                    Consultation Details
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {formatTime(selectedHistoryItem.timestamp)}
                  </p>
                </div>
                <button
                  onClick={closeDetailModal}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Your Question */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                      <ChatBubbleLeftRightIcon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {t("voice.yourQuery")}
                    </h3>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 leading-relaxed pl-11">
                    {selectedHistoryItem.transcription ||
                      selectedHistoryItem.originalMessage}
                  </p>
                </div>

                {/* AI Analysis */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                        <SparklesIcon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {t("voice.aiResponse")}
                      </h3>
                    </div>

                    {/* Narration Button in Modal */}
                    <button
                      onClick={() =>
                        isSpeaking
                          ? stopNarration()
                          : handleNarration(selectedHistoryItem)
                      }
                      className={`flex items-center px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                        isSpeaking
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-blue-500 hover:bg-blue-600 text-white"
                      } shadow-md hover:shadow-lg`}
                      title={isSpeaking ? "Stop Reading" : "Read Aloud"}
                    >
                      {isSpeaking ? (
                        <>
                          <StopCircleIcon className="h-4 w-4 mr-1" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <SpeakerWaveIcon className="h-4 w-4 mr-1" />
                          <span>Read Aloud</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Speaking Indicator in Modal */}
                  {isSpeaking && (
                    <div className="mb-3 flex items-center bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-3 py-2 rounded-lg ml-11">
                      <div className="flex space-x-1 mr-2">
                        <div className="w-1 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                        <div className="w-1 h-3 bg-blue-600 rounded-full animate-pulse delay-75"></div>
                        <div className="w-1 h-3 bg-blue-600 rounded-full animate-pulse delay-150"></div>
                      </div>
                      <span className="text-xs font-medium">
                        🔊 Reading aloud...
                      </span>
                    </div>
                  )}

                  <div className="text-gray-800 dark:text-gray-200 leading-relaxed pl-11 space-y-3">
                    {selectedHistoryItem.response
                      .split("\n")
                      .map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))}
                  </div>
                </div>

                {/* Metadata */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 border border-gray-200 dark:border-gray-600">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Consultation Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Date</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {new Date(
                          selectedHistoryItem.timestamp,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Time</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {new Date(
                          selectedHistoryItem.timestamp,
                        ).toLocaleTimeString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">
                        Language
                      </p>
                      <p className="text-gray-900 dark:text-white font-medium uppercase">
                        {selectedHistoryItem.detectedLanguage || "EN"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Status</p>
                      <p className="text-green-600 dark:text-green-400 font-medium flex items-center">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Complete
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={closeDetailModal}
                    className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setCurrentConsultation(selectedHistoryItem);
                      closeDetailModal();
                    }}
                    className="px-6 py-2.5 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors font-medium"
                  >
                    Set as Current
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Undo toast for local deletions */}
      {showUndoToast && lastDeletedLocal && (
        <Toast
          message="Deleted consultation"
          actionLabel="Undo"
          onAction={() => {
            setConsultationHistory((prev) => [lastDeletedLocal, ...prev]);
            setCurrentConsultation(lastDeletedLocal);
            setShowUndoToast(false);
            setLastDeletedLocal(null);
          }}
          onClose={() => {
            setShowUndoToast(false);
            setLastDeletedLocal(null);
          }}
        />
      )}
    </div>
  );
}
