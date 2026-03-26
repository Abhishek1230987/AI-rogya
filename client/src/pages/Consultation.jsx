import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { API_ENDPOINTS } from "../config/api";
import {
  PaperAirplaneIcon,
  UserCircleIcon,
  XMarkIcon,
  PlusCircleIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";

const HISTORY_PAGE_SIZE = 20;

export default function Consultation() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [chatMode, setChatMode] = useState("continue");
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const storageKey = user?.id
    ? `consultation_messages_user_${user.id}`
    : "consultation_messages_guest";

  const normalizeMessage = (message, fallbackIdPrefix = "msg") => ({
    id:
      message.id ||
      `${fallbackIdPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: message.type,
    content: message.content,
    timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
  });

  const loadMessagesFromStorage = () => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((msg) => normalizeMessage(msg, "local"));
    } catch (error) {
      console.warn("Failed to load consultation messages from storage:", error);
      return [];
    }
  };

  const saveMessagesToStorage = (nextMessages) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextMessages));
    } catch (error) {
      console.warn("Failed to save consultation messages to storage:", error);
    }
  };

  const fetchSessions = async () => {
    if (!token) return [];

    setIsLoadingSessions(true);
    try {
      const response = await fetch(API_ENDPOINTS.CONSULTATION_SESSIONS, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return [];
      const data = await response.json();
      if (!data?.success || !Array.isArray(data.sessions)) return [];
      return data.sessions;
    } catch (error) {
      console.warn("Failed to fetch chat sessions:", error);
      return [];
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const createSession = async (name = "") => {
    if (!token) return null;

    try {
      const response = await fetch(API_ENDPOINTS.CONSULTATION_SESSIONS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionName: name }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data?.session || null;
    } catch (error) {
      console.warn("Failed to create chat session:", error);
      return null;
    }
  };

  const renameSession = async (sessionId, sessionName) => {
    if (!token || !sessionId) return null;

    try {
      const response = await fetch(
        `${API_ENDPOINTS.CONSULTATION_SESSIONS}/${sessionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionName }),
        },
      );

      if (!response.ok) return null;
      const data = await response.json();
      return data?.session || null;
    } catch (error) {
      console.warn("Failed to rename chat session:", error);
      return null;
    }
  };

  const deleteSession = async (sessionId) => {
    if (!token || !sessionId) return false;

    try {
      const response = await fetch(
        `${API_ENDPOINTS.CONSULTATION_SESSIONS}/${sessionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      return response.ok;
    } catch (error) {
      console.warn("Failed to delete chat session:", error);
      return false;
    }
  };

  const fetchHistoryPage = async ({
    offset = 0,
    sessionId = null,
    limit = HISTORY_PAGE_SIZE,
  }) => {
    if (!token) {
      return {
        session: null,
        messages: [],
        pagination: { hasMore: false, offset: 0 },
      };
    }

    try {
      const query = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });

      if (sessionId) {
        query.set("sessionId", String(sessionId));
      }

      const response = await fetch(
        `${API_ENDPOINTS.CONSULTATION_HISTORY}?${query.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        return {
          session: null,
          messages: [],
          pagination: { hasMore: false, offset },
        };
      }

      const data = await response.json();
      if (!data?.success || !Array.isArray(data.messages)) {
        return {
          session: null,
          messages: [],
          pagination: { hasMore: false, offset },
        };
      }

      return {
        session: data.session || null,
        messages: data.messages.map((msg) => normalizeMessage(msg, "server")),
        pagination: data.pagination || { hasMore: false, offset },
      };
    } catch (error) {
      console.warn("Failed to fetch consultation history:", error);
      return {
        session: null,
        messages: [],
        pagination: { hasMore: false, offset },
      };
    }
  };

  const loadInitialHistory = async (requestedSessionId = null) => {
    setIsLoadingHistory(true);
    try {
      if (token) {
        const {
          session,
          messages: serverMessages,
          pagination,
        } = await fetchHistoryPage({
          offset: 0,
          sessionId: requestedSessionId,
        });

        if (session?.id) {
          setActiveSessionId(session.id);
        }

        setMessages(serverMessages);
        saveMessagesToStorage(serverMessages);
        setHasMoreHistory(Boolean(pagination?.hasMore));
        setHistoryOffset(HISTORY_PAGE_SIZE);
        return;
      }

      const localMessages = loadMessagesFromStorage();
      setMessages(localMessages);
      setHasMoreHistory(false);
      setHistoryOffset(localMessages.length);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const initializeSessionsAndHistory = async () => {
    if (!token) {
      const localMessages = loadMessagesFromStorage();
      setMessages(localMessages);
      setSessions([]);
      setActiveSessionId(null);
      setHasMoreHistory(false);
      setHistoryOffset(localMessages.length);
      return;
    }

    const sessionList = await fetchSessions();
    setSessions(sessionList);
    const firstSessionId = sessionList[0]?.id || null;
    setActiveSessionId(firstSessionId);
    await loadInitialHistory(firstSessionId);
  };

  const loadOlderHistory = async () => {
    if (!token || !activeSessionId || !hasMoreHistory || isLoadingHistory) {
      return;
    }

    setIsLoadingHistory(true);
    try {
      const { messages: olderMessages, pagination } = await fetchHistoryPage({
        offset: historyOffset,
        sessionId: activeSessionId,
      });

      if (olderMessages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const uniqueOlder = olderMessages.filter(
            (m) => !existingIds.has(m.id),
          );
          const next = [...uniqueOlder, ...prev];
          saveMessagesToStorage(next);
          return next;
        });
      }

      setHistoryOffset((prev) => prev + HISTORY_PAGE_SIZE);
      setHasMoreHistory(Boolean(pagination?.hasMore));
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleStartNewChat = async () => {
    setChatMode("new");

    if (!token) {
      setMessages([]);
      setActiveSessionId(null);
      setHasMoreHistory(false);
      setHistoryOffset(0);
      return;
    }

    const newSession = await createSession();
    if (newSession?.id) {
      const refreshedSessions = await fetchSessions();
      setSessions(refreshedSessions);
      setActiveSessionId(newSession.id);
      setMessages([]);
      setHasMoreHistory(false);
      setHistoryOffset(0);
    }
  };

  const handleContinuePreviousChat = async () => {
    setChatMode("continue");
    await initializeSessionsAndHistory();
  };

  useEffect(() => {
    initializeSessionsAndHistory();
  }, [token, storageKey]);

  useEffect(() => {
    if (!token) {
      saveMessagesToStorage(messages);
    }
  }, [messages, token, storageKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSessionChange = async (event) => {
    const selected = Number.parseInt(event.target.value, 10);
    if (!Number.isFinite(selected)) return;
    setChatMode("continue");
    setActiveSessionId(selected);
    await loadInitialHistory(selected);
  };

  const handleRenameActiveSession = async () => {
    if (!token || !activeSessionId) return;

    const currentName =
      sessions.find((session) => session.id === activeSessionId)
        ?.session_name || "";
    const nextName = window.prompt("Rename this chat thread:", currentName);

    if (!nextName || !nextName.trim()) return;

    const trimmedName = nextName.trim();
    const renamed = await renameSession(activeSessionId, trimmedName);
    if (!renamed) return;

    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              session_name: renamed.session_name || trimmedName,
              updated_at: renamed.updated_at || session.updated_at,
            }
          : session,
      ),
    );

    const refreshedSessions = await fetchSessions();
    if (refreshedSessions.length > 0) {
      setSessions(refreshedSessions);
    }
  };

  const handleDeleteActiveSession = async () => {
    if (!token || !activeSessionId) return;

    const confirmed = window.confirm(t("consultation.confirmDeleteThread"));
    if (!confirmed) return;

    const deleted = await deleteSession(activeSessionId);
    if (!deleted) return;

    const refreshedSessions = await fetchSessions();
    setSessions(refreshedSessions);
    const nextSessionId = refreshedSessions[0]?.id || null;
    setActiveSessionId(nextSessionId);

    if (nextSessionId) {
      await loadInitialHistory(nextSessionId);
    } else {
      setMessages([]);
      setHasMoreHistory(false);
      setHistoryOffset(0);
    }
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    const userMessage = textInput.trim();
    setTextInput("");
    addMessage("user", userMessage);
    setIsProcessing(true);

    try {
      const response = await fetch(API_ENDPOINTS.CONSULTATION_CHAT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message: userMessage,
          language:
            i18n?.language || localStorage.getItem("selectedLanguage") || "en",
          sessionId: activeSessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      if (data?.sessionId && data.sessionId !== activeSessionId) {
        setActiveSessionId(data.sessionId);
      }

      setTimeout(() => {
        addMessage(
          "ai",
          data.response ||
            "I understand your concern. Could you please provide more specific details about your symptoms?",
          data.sections,
        );
      }, 400);

      if (token) {
        const refreshedSessions = await fetchSessions();
        setSessions(refreshedSessions);
      }
    } catch (error) {
      console.error("Error getting consultation:", error);
      setTimeout(() => {
        addMessage(
          "ai",
          "I'm here to help. Please describe your symptoms in detail, and I'll provide guidance.",
        );
      }, 400);
    } finally {
      setIsProcessing(false);
    }
  };

  const addMessage = (type, content, sections = null) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        content,
        sections,
        timestamp: new Date(),
      },
    ]);
  };

  const clearStoredHistory = async () => {
    setMessages([]);
    localStorage.removeItem(storageKey);
    setHistoryOffset(0);
    setHasMoreHistory(false);

    if (token) {
      try {
        const qs = activeSessionId
          ? `?sessionId=${encodeURIComponent(String(activeSessionId))}`
          : "";
        await fetch(`${API_ENDPOINTS.CONSULTATION_HISTORY}${qs}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.warn("Failed to clear consultation history on server:", error);
      }
    }
  };

  const activeSessionName = useMemo(() => {
    const found = sessions.find((session) => session.id === activeSessionId);
    return found?.session_name || "General Chat";
  }, [sessions, activeSessionId]);

  const sessionSelectKey = useMemo(
    () =>
      sessions
        .map((session) => `${session.id}:${session.session_name}`)
        .join("|"),
    [sessions],
  );

  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 rounded-t-xl p-6 text-white shadow-lg"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                <ChatBubbleLeftRightIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {t("consultation.title")}
                </h1>
                <p className="text-blue-100 text-sm">
                  {t("consultation.subtitle")}
                </p>
              </div>
            </div>

            {messages.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearStoredHistory}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm transition-colors flex items-center gap-2"
              >
                <XMarkIcon className="w-4 h-4" />
                {t("consultation.clearCurrentThread")}
              </motion.button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleContinuePreviousChat}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                chatMode === "continue"
                  ? "bg-white text-blue-700"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {t("consultation.continueChat")}
            </button>
            <button
              type="button"
              onClick={handleStartNewChat}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                chatMode === "new"
                  ? "bg-white text-blue-700"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {t("consultation.startNewChat")}
            </button>

            {token && (
              <div className="flex items-center gap-2 ml-2">
                <span className="text-xs text-blue-100">
                  {t("consultation.thread")}:
                </span>
                <select
                  key={sessionSelectKey}
                  value={activeSessionId || ""}
                  onChange={handleSessionChange}
                  disabled={isLoadingSessions || sessions.length === 0}
                  className="bg-white text-gray-900 text-xs rounded-md px-2 py-1 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-white/70 disabled:opacity-60"
                >
                  {sessions.map((session) => (
                    <option
                      key={session.id}
                      value={session.id}
                      className="bg-white text-gray-900"
                    >
                      {session.session_name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleRenameActiveSession}
                  disabled={!activeSessionId || isLoadingSessions}
                  className="inline-flex items-center justify-center rounded-md p-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-50"
                  title={t("consultation.renameThread")}
                >
                  <PencilSquareIcon className="w-4 h-4 text-white" />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteActiveSession}
                  disabled={!activeSessionId || isLoadingSessions}
                  className="inline-flex items-center justify-center rounded-md p-1.5 bg-white/20 hover:bg-red-500/70 disabled:opacity-50"
                  title={t("common.delete")}
                >
                  <TrashIcon className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            <span className="text-xs text-blue-100 ml-1">
              {token
                ? `${t("consultation.active")}: ${activeSessionName}`
                : t("consultation.guestMode")}
            </span>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-6 overflow-y-auto">
        {token && chatMode === "continue" && hasMoreHistory && (
          <div className="max-w-4xl mx-auto mb-4 flex justify-center">
            <button
              type="button"
              onClick={loadOlderHistory}
              disabled={isLoadingHistory}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60"
            >
              <ArrowPathIcon
                className={`w-4 h-4 ${isLoadingHistory ? "animate-spin" : ""}`}
              />
              {t("consultation.loadOlderMessages")}
            </button>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center h-full text-center"
            >
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 p-8 rounded-full mb-6">
                <PlusCircleIcon className="w-16 h-16 text-blue-600 dark:text-blue-400 stroke-[2.5]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t("consultation.title")}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
                {t("consultation.subtitle")}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
                {[
                  t("consultation.sampleQueries.headache"),
                  t("consultation.sampleQueries.flu"),
                  t("consultation.sampleQueries.advice"),
                ].map((suggestion, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTextInput(suggestion)}
                    className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm hover:shadow-md"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                  className={`flex gap-3 ${
                    message.type === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.type === "ai" && (
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                        <ChatBubbleLeftRightIcon className="w-5 h-5" />
                      </div>
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-2xl px-6 py-4 shadow-md ${
                      message.type === "user"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {message.type === "ai" && message.sections ? (
                      // Render structured sections
                      <div className="space-y-4">
                        {message.sections.assessment && (
                          <div>
                            <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-2">
                              📋 Assessment:
                            </h4>
                            <p className="text-sm leading-relaxed">
                              {message.sections.assessment}
                            </p>
                          </div>
                        )}
                        {message.sections.possibleCauses &&
                          message.sections.possibleCauses.length > 0 && (
                            <div>
                              <h4 className="font-bold text-green-600 dark:text-green-400 mb-2">
                                🔍 Possible Causes:
                              </h4>
                              <ul className="text-sm space-y-1 ml-4">
                                {message.sections.possibleCauses.map(
                                  (cause, idx) => (
                                    <li key={idx} className="list-disc">
                                      {cause}
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}
                        {message.sections.recommendedSelfCare &&
                          message.sections.recommendedSelfCare.length > 0 && (
                            <div>
                              <h4 className="font-bold text-orange-600 dark:text-orange-400 mb-2">
                                💊 Recommended Self-Care:
                              </h4>
                              <ol className="text-sm space-y-1 ml-4">
                                {message.sections.recommendedSelfCare.map(
                                  (care, idx) => (
                                    <li key={idx} className="list-decimal">
                                      {care}
                                    </li>
                                  ),
                                )}
                              </ol>
                            </div>
                          )}
                        {message.sections.warningSigns &&
                          message.sections.warningSigns.length > 0 && (
                            <div>
                              <h4 className="font-bold text-red-600 dark:text-red-400 mb-2">
                                ⚠️ Warning Signs:
                              </h4>
                              <ul className="text-sm space-y-1 ml-4">
                                {message.sections.warningSigns.map(
                                  (sign, idx) => (
                                    <li key={idx} className="list-disc">
                                      {sign}
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}
                        {message.sections.whenToSeeDoctor && (
                          <div>
                            <h4 className="font-bold text-purple-600 dark:text-purple-400 mb-2">
                              🏥 When to See a Doctor:
                            </h4>
                            <p className="text-sm leading-relaxed">
                              {message.sections.whenToSeeDoctor}
                            </p>
                          </div>
                        )}
                        {message.sections.importantForYou && (
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border-l-4 border-yellow-400">
                            <h4 className="font-bold text-yellow-700 dark:text-yellow-300 mb-2">
                              📝 Important for You:
                            </h4>
                            <p className="text-sm leading-relaxed text-yellow-800 dark:text-yellow-200">
                              {message.sections.importantForYou}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Render plain text message
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}
                    <p
                      className={`text-xs mt-2 ${
                        message.type === "user"
                          ? "text-blue-200"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {message.type === "user" && (
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 shadow-lg">
                        <UserCircleIcon className="w-8 h-8" />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </AnimatePresence>

        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 max-w-4xl mx-auto mt-4"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
            </div>
            <div className="bg-white rounded-2xl px-6 py-4 shadow-md border border-gray-200">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 rounded-b-xl shadow-lg"
      >
        <form onSubmit={handleTextSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={t("consultation.chatPlaceholder")}
              disabled={isProcessing}
              className="flex-1 px-6 py-4 rounded-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none transition-colors disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />

            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={!textInput.trim() || isProcessing}
              className="flex-shrink-0 p-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PaperAirplaneIcon className="w-6 h-6" />
            </motion.button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            {t("consultation.disclaimer")}
          </p>
        </form>
      </motion.div>
    </div>
  );
}
