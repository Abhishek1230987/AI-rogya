import { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExclamationTriangleIcon,
  MicrophoneIcon,
  StopIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { API_ENDPOINTS } from "../config/api";

const SOSNavbarButton = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [customMessage, setCustomMessage] = useState("");
  const [severity, setSeverity] = useState("HIGH");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [location, setLocation] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      setError("Microphone access denied");
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        streamRef.current.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        resolve(audioBlob);
      };

      mediaRecorder.stop();
    });
  };

  const getCurrentLocation = () => {
    return new Promise((resolve) => {
      if ("geolocation" in navigator) {
        const options = {
          enableHighAccuracy: true,
          timeout: 5000, // 5 second timeout
          maximumAge: 0, // Don't use cached location
        };

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            const location = {
              latitude,
              longitude,
              accuracy,
              address: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(
                4
              )}`,
            };
            setLocation(location);
            console.log("✅ Location obtained:", location);
            resolve(location);
          },
          (err) => {
            console.warn("⚠️ Location access error:", err.message);
            resolve(null);
          },
          options
        );
      } else {
        console.warn("Geolocation not supported");
        resolve(null);
      }
    });
  };

  const sendSOS = async (includeAudio = false) => {
    try {
      setIsLoading(true);
      setError("");
      setSuccess("");

      // Get location
      const geoLocation = await getCurrentLocation();

      const formData = new FormData();
      formData.append(
        "message",
        customMessage || "Emergency assistance needed"
      );
      formData.append("severity", severity);
      formData.append(
        "location",
        JSON.stringify(geoLocation || { address: "Not available" })
      );

      // Add audio if recording was made
      if (includeAudio && audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        formData.append("audio", audioBlob, "sos-audio.wav");
      }

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/api/sos/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response not ok:", response.status, errorText);
        throw new Error(
          `Server error: ${response.status} - ${errorText.substring(0, 200)}`
        );
      }

      // Get response text first to debug
      const responseText = await response.text();
      console.log("Server response:", responseText);

      // Parse JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        throw new Error(
          `Invalid JSON response: ${responseText.substring(0, 500)}`
        );
      }

      if (data.success) {
        setSuccess(
          `✅ SOS Alert sent to ${
            data.details?.successfulRecipients || 0
          } contact(s)`
        );
        setCustomMessage("");
        setSeverity("HIGH");
        audioChunksRef.current = [];
        setRecordingTime(0);

        setTimeout(() => {
          setShowSOSModal(false);
        }, 2000);
      } else {
        setError(data.message || "Failed to send SOS alert");
      }
    } catch (err) {
      console.error("SOS sending error:", err);
      setError(
        "Error sending SOS: " + (err.message || "Unknown error occurred")
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* SOS Button in Navbar */}
      <motion.button
        onClick={() => setShowSOSModal(true)}
        className="relative flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-red-500/50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Send Emergency SOS Alert"
      >
        <ExclamationTriangleIcon className="h-5 w-5 animate-pulse" />
        <span className="hidden sm:inline text-sm">SOS</span>
      </motion.button>

      {/* SOS Modal */}
      <AnimatePresence>
        {showSOSModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-lg shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Send SOS Alert
                  </h2>
                </div>
                <button
                  onClick={() => setShowSOSModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Severity Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Severity Level
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        value: "LOW",
                        label: "Low",
                        color: "bg-yellow-100 text-yellow-700",
                      },
                      {
                        value: "MEDIUM",
                        label: "Medium",
                        color: "bg-orange-100 text-orange-700",
                      },
                      {
                        value: "HIGH",
                        label: "High",
                        color: "bg-red-100 text-red-700",
                      },
                      {
                        value: "CRITICAL",
                        label: "Critical",
                        color: "bg-red-900 text-red-50",
                      },
                    ].map((level) => (
                      <button
                        key={level.value}
                        onClick={() => setSeverity(level.value)}
                        className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all ${
                          severity === level.value
                            ? `${level.color} ring-2 ring-offset-2`
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Message (Optional)
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) =>
                      setCustomMessage(e.target.value.slice(0, 500))
                    }
                    placeholder="Describe your emergency..."
                    maxLength={500}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {customMessage.length}/500 characters
                  </p>
                </div>

                {/* Voice Recording */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Voice Message (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        isRecording ? stopRecording() : startRecording()
                      }
                      disabled={isLoading}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                        isRecording
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                      } disabled:opacity-50`}
                    >
                      {isRecording ? (
                        <>
                          <StopIcon className="h-4 w-4" />
                          Stop ({recordingTime}s)
                        </>
                      ) : (
                        <>
                          <MicrophoneIcon className="h-4 w-4" />
                          {audioChunksRef.current.length > 0
                            ? "Re-record"
                            : "Record"}
                        </>
                      )}
                    </button>
                    {audioChunksRef.current.length > 0 && !isRecording && (
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                        ✓ Voice recorded ({recordingTime}s)
                      </span>
                    )}
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm">
                    {success}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowSOSModal(false)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={() => sendSOS(audioChunksRef.current.length > 0)}
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      Send SOS
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SOSNavbarButton;
