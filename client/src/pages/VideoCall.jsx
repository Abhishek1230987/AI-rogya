import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import Peer from "simple-peer/simplepeer.min.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { SOCKET_URL } from "../config/api";

const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const randomRoomId = () =>
  `consult-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`;

export default function VideoCall() {
  const { user, loading: authLoading } = useAuth();

  const params = new URLSearchParams(window.location.search);
  const initialRoom = params.get("room") || "";
  const initialRole = user?.role === "doctor" ? "doctor" : "patient";

  const [socket, setSocket] = useState(null);
  const [roomIdInput, setRoomIdInput] = useState(initialRoom);
  const [activeRoomId, setActiveRoomId] = useState("");
  const [role, setRole] = useState(
    initialRole === "doctor" ? "doctor" : "patient",
  );
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [roomStatus, setRoomStatus] = useState("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [mediaStatus, setMediaStatus] = useState("requesting");
  const [error, setError] = useState("");
  const [onlineDoctors, setOnlineDoctors] = useState([]);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [inviteMessage, setInviteMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");

  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peersRef = useRef(new Map());
  const pendingSignalsRef = useRef(new Map());

  const cleanPeer = useCallback((socketId) => {
    const peer = peersRef.current.get(socketId);
    if (peer) {
      try {
        peer.destroy();
      } catch (err) {
        console.error("Peer cleanup error:", err);
      }
      peersRef.current.delete(socketId);
    }
  }, []);

  const createPeer = useCallback(
    ({ targetSocketId, initiator, localStream, roomId }) => {
      cleanPeer(targetSocketId);

      const peerOptions = {
        initiator,
        trickle: false,
        config: ICE_CONFIG,
      };

      if (localStream) {
        peerOptions.stream = localStream;
      }

      let peer;
      try {
        peer = new Peer(peerOptions);
      } catch (err) {
        console.error("Failed to initialize WebRTC peer:", err);
        setError(
          "WebRTC peer initialization failed. Refresh this page and rejoin the room.",
        );
        return null;
      }

      peer.on("signal", (signalData) => {
        if (signalData.type === "offer") {
          socket?.emit("webrtc:offer", {
            offer: signalData,
            roomId,
            targetSocketId,
          });
        } else if (signalData.type === "answer") {
          socket?.emit("webrtc:answer", {
            answer: signalData,
            targetSocketId,
          });
        } else if (signalData.candidate) {
          socket?.emit("webrtc:ice-candidate", {
            candidate: signalData,
            targetSocketId,
          });
        }
      });

      peer.on("stream", (incomingStream) => {
        setRemoteStream(incomingStream);
      });

      peer.on("error", (peerError) => {
        console.error("WebRTC peer error:", peerError);
        setError("Video connection issue detected. Please rejoin the room.");
      });

      peer.on("close", () => {
        peersRef.current.delete(targetSocketId);
      });

      peersRef.current.set(targetSocketId, peer);

      const pending = pendingSignalsRef.current.get(targetSocketId);
      if (pending && pending.length > 0) {
        pending.forEach((signal) => {
          try {
            peer.signal(signal);
          } catch (err) {
            console.warn("Failed to apply queued signal:", err?.message || err);
          }
        });
        pendingSignalsRef.current.delete(targetSocketId);
      }

      return peer;
    },
    [cleanPeer, socket],
  );

  const applyOrQueueSignal = useCallback((socketId, signalData) => {
    const peer = peersRef.current.get(socketId);
    if (peer) {
      try {
        peer.signal(signalData);
      } catch (err) {
        console.warn("Peer signal apply error:", err?.message || err);
      }
      return;
    }

    const existing = pendingSignalsRef.current.get(socketId) || [];
    existing.push(signalData);
    pendingSignalsRef.current.set(socketId, existing);
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;

    const newSocket = io(SOCKET_URL, {
      transports: ["polling", "websocket"],
      upgrade: true,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [authLoading, user]);

  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const fullMedia = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(fullMedia);
        setMediaStatus("av");
      } catch (fullMediaError) {
        console.warn("Full AV media unavailable:", fullMediaError);

        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
          setStream(audioOnly);
          setMediaStatus("audio");
          setIsCameraOff(true);
        } catch (audioOnlyError) {
          console.warn("Audio-only media unavailable:", audioOnlyError);
          setMediaStatus("none");
          setError(
            "Could not access camera/mic in this tab. You can still join for signaling and receive remote stream.",
          );
        }
      } finally {
        setLoadingMedia(false);
      }
    };

    initializeMedia();

    return () => {
      peersRef.current.forEach((peer) => {
        try {
          peer.destroy();
        } catch (_) {
          // no-op
        }
      });
      peersRef.current.clear();
    };
  }, []);

  const retryMediaAccess = useCallback(async () => {
    try {
      const refreshedStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(refreshedStream);
      setMediaStatus("av");
      setIsCameraOff(false);
      setError("");
    } catch (mediaError) {
      console.error("Retry media access error:", mediaError);
      setError(
        "Still unable to access camera/mic. Check browser permissions and close other apps using camera.",
      );
    }
  }, []);

  useEffect(() => {
    if (myVideoRef.current && stream) {
      myVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current
        .play()
        .catch(() => console.log("Remote autoplay blocked until user interaction"));
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!stream) return;

    peersRef.current.forEach((peer) => {
      stream.getTracks().forEach((track) => {
        try {
          peer.addTrack(track, stream);
        } catch (err) {
          // Ignore duplicate track attachment errors.
        }
      });
    });
  }, [stream]);

  useEffect(() => {
    if (!socket || !user) return;

    socket.on("connect", () => {
      socket.emit("user:join", {
        userId: user.id,
        userName: user.name || user.email || "User",
        role,
      });
      socket.emit("doctors:online:get");
    });

    socket.on("users:online", (users) => {
      const doctors = (users || []).filter(
        (u) => u.role === "doctor" && u.userId !== user.id,
      );
      setOnlineDoctors(doctors);
    });

    socket.on("doctors:online", (doctors) => {
      setOnlineDoctors((doctors || []).filter((d) => d.userId !== user.id));
    });

    socket.on("call:invite", (invite) => {
      setPendingInvite(invite);
    });

    socket.on("call:invite:error", ({ message }) => {
      setInviteMessage(message || "Doctor is currently unavailable.");
    });

    socket.on(
      "call:invite:response",
      ({ accepted, roomId, doctorName, reason }) => {
        if (accepted) {
          setInviteMessage(
            `${doctorName || "Doctor"} accepted the call. Joining room...`,
          );
          setRoomIdInput(roomId);
          setTimeout(() => {
            joinRoomById(roomId);
          }, 150);
        } else {
          setInviteMessage(
            reason || `${doctorName || "Doctor"} declined the call request.`,
          );
        }
      },
    );

    socket.on(
      "room:joined",
      ({ roomId, participants: existingParticipants }) => {
        setActiveRoomId(roomId);
        setInviteMessage("");
        setParticipants(existingParticipants || []);
        setRoomStatus("waiting");

        (existingParticipants || []).forEach((participant) => {
          const peer = createPeer({
            targetSocketId: participant.socketId,
            initiator: true,
            localStream: stream,
            roomId,
          });
          if (!peer) {
            console.warn(
              "Skipping peer setup because constructor failed for",
              participant.socketId,
            );
          }
        });
      },
    );

    socket.on("user:joined", ({ socketId, participantCount, userName }) => {
      setRoomStatus(participantCount >= 2 ? "active" : "waiting");
      setParticipants((prev) => {
        if (prev.some((p) => p.socketId === socketId)) return prev;
        return [...prev, { socketId, userName }];
      });
    });

    socket.on("webrtc:offer", ({ offer, senderSocketId, senderUserName }) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.socketId === senderSocketId)) return prev;
        return [
          ...prev,
          { socketId: senderSocketId, userName: senderUserName },
        ];
      });

      const existingPeer = peersRef.current.get(senderSocketId);
      if (existingPeer) {
        try {
          existingPeer.signal(offer);
        } catch (err) {
          console.warn("Failed to apply offer to existing peer:", err?.message || err);
        }
        return;
      }

      const peer = createPeer({
        targetSocketId: senderSocketId,
        initiator: false,
        localStream: stream,
        roomId: activeRoomId || roomIdInput,
      });

      if (!peer) {
        return;
      }

      try {
        peer.signal(offer);
      } catch (err) {
        console.warn("Failed to apply initial offer:", err?.message || err);
      }
    });

    socket.on("webrtc:answer", ({ answer, senderSocketId }) => {
      applyOrQueueSignal(senderSocketId, answer);
    });

    socket.on("webrtc:ice-candidate", ({ candidate, senderSocketId }) => {
      applyOrQueueSignal(senderSocketId, candidate);
    });

    socket.on("user:left", ({ userId, userName, participantCount }) => {
      setParticipants((prev) =>
        prev.filter((p) => p.userId !== userId && p.userName !== userName),
      );
      setRoomStatus(participantCount >= 2 ? "active" : "waiting");

      peersRef.current.forEach((_, key) => {
        if (key) {
          cleanPeer(key);
        }
      });
      setRemoteStream(null);
    });

    socket.on("room:status", ({ status }) => {
      setRoomStatus(status);
      if (status === "active") {
        setInviteMessage("");
      }
    });

    socket.on("room:kicked", ({ reason }) => {
      setError(reason || "You were removed from this consultation room.");
      setActiveRoomId("");
      setRoomStatus("idle");
      setParticipants([]);
      peersRef.current.forEach((_, key) => cleanPeer(key));
      setRemoteStream(null);
    });

    socket.on("error", (socketError) => {
      setError(socketError?.message || "Socket connection error.");
    });

    socket.on("connect_error", (connectError) => {
      setError(
        `Socket connect failed: ${connectError?.message || "transport error"}`,
      );
    });

    socket.on("disconnect", (reason) => {
      if (reason !== "io client disconnect") {
        setError(`Socket disconnected: ${reason}`);
      }
    });

    socket.on("chat:message", (payload) => {
      setMessages((prev) => [...prev, payload]);
    });

    return () => {
      socket.off("connect");
      socket.off("users:online");
      socket.off("doctors:online");
      socket.off("call:invite");
      socket.off("call:invite:error");
      socket.off("call:invite:response");
      socket.off("room:joined");
      socket.off("user:joined");
      socket.off("webrtc:offer");
      socket.off("webrtc:answer");
      socket.off("webrtc:ice-candidate");
      socket.off("user:left");
      socket.off("room:status");
      socket.off("room:kicked");
      socket.off("chat:message");
      socket.off("error");
      socket.off("connect_error");
      socket.off("disconnect");
    };
  }, [
    activeRoomId,
    applyOrQueueSignal,
    cleanPeer,
    createPeer,
    role,
    roomIdInput,
    socket,
    stream,
    user,
  ]);

  const joinRoomById = (roomId) => {
    const nextRoom = (roomId || "").trim();

    if (!socket) {
      setError("Socket is not ready yet.");
      return;
    }

    if (!nextRoom) {
      setError("Enter a consultation room ID.");
      return;
    }

    setError("");
    socket.emit("room:join", {
      roomId: nextRoom,
      userId: user.id,
      userName: user.name || user.email || "User",
      isDoctor: role === "doctor",
    });
  };

  const joinRoom = () => {
    joinRoomById(roomIdInput);
  };

  const inviteDoctor = (doctor) => {
    if (!socket) {
      setError("Socket is not connected.");
      return;
    }

    const roomId = randomRoomId();
    setRoomIdInput(roomId);
    setInviteMessage(`Calling Dr. ${doctor.userName}...`);

    socket.emit("call:invite", {
      doctorUserId: doctor.userId,
      roomId,
      patientUserId: user.id,
      patientName: user.name || user.email || "Patient",
      consultationType: "video",
    });
  };

  const respondToInvite = (accepted) => {
    if (!socket || !pendingInvite) return;

    socket.emit("call:invite:response", {
      inviterSocketId: pendingInvite.inviterSocketId,
      accepted,
      roomId: pendingInvite.roomId,
      doctorUserId: user.id,
      doctorName: user.name || user.email || "Doctor",
      reason: accepted ? null : "Doctor is unavailable right now.",
    });

    if (accepted) {
      setRole("doctor");
      setRoomIdInput(pendingInvite.roomId);
      joinRoomById(pendingInvite.roomId);
    }

    setPendingInvite(null);
  };

  const leaveRoom = () => {
    if (socket && activeRoomId) {
      socket.emit("room:leave", { roomId: activeRoomId });
    }

    peersRef.current.forEach((_, key) => cleanPeer(key));
    setActiveRoomId("");
    setParticipants([]);
    setRoomStatus("idle");
    setRemoteStream(null);
    setMessages([]);
    pendingSignalsRef.current.clear();
  };

  const sendChatMessage = () => {
    const text = messageInput.trim();
    if (!text || !activeRoomId || !socket) return;

    const senderName = user?.name || user?.email || "User";
    socket.emit("chat:message", {
      roomId: activeRoomId,
      message: text,
      senderName,
    });

    setMessageInput("");
  };

  const generateRoom = () => {
    const next = randomRoomId();
    setRoomIdInput(next);
  };

  const copyRoomId = async () => {
    if (!roomIdInput) return;
    try {
      await navigator.clipboard.writeText(roomIdInput);
    } catch (err) {
      console.error("Clipboard write failed:", err);
      setError("Could not copy room ID. Copy it manually.");
    }
  };

  const toggleMute = () => {
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;
    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!audioTrack.enabled);
  };

  const toggleCamera = () => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;
    videoTrack.enabled = !videoTrack.enabled;
    setIsCameraOff(!videoTrack.enabled);
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  if (authLoading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Live Doctor Video Consultation
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Join the same room ID from doctor and patient accounts to start a
          secure WebRTC call.
        </p>
      </motion.div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {inviteMessage && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
          {inviteMessage}
        </div>
      )}

      {pendingInvite && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex flex-wrap items-center gap-3">
          <span>
            Incoming consultation from {pendingInvite.patientName}. Room{" "}
            {pendingInvite.roomId}
          </span>
          <button
            onClick={() => respondToInvite(true)}
            className="px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Accept
          </button>
          <button
            onClick={() => respondToInvite(false)}
            className="px-3 py-1.5 rounded bg-rose-600 text-white hover:bg-rose-700"
          >
            Decline
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            placeholder="Enter consultation room ID"
            className="md:col-span-2 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={user?.role !== "doctor"}
            className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          >
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={generateRoom}
            className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-800"
          >
            Generate Room
          </button>
          <button
            onClick={copyRoomId}
            className="px-4 py-2 rounded-lg bg-slate-600 text-white hover:bg-slate-700"
          >
            Copy Room ID
          </button>
          <button
            onClick={joinRoom}
            disabled={loadingMedia || Boolean(activeRoomId)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loadingMedia
              ? "Preparing media..."
              : activeRoomId
                ? "Joined"
                : "Join Room"}
          </button>
          <button
            onClick={leaveRoom}
            disabled={!activeRoomId}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            Leave Room
          </button>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-300">
          Room status: <span className="font-semibold">{roomStatus}</span>
          {activeRoomId ? ` | Active room: ${activeRoomId}` : ""}
          {participants.length > 0
            ? ` | Participants: ${participants.length + 1}`
            : ""}
          {mediaStatus === "av" ? " | Media: camera + mic" : ""}
          {mediaStatus === "audio" ? " | Media: audio only" : ""}
          {mediaStatus === "none" ? " | Media: unavailable" : ""}
        </div>

        {mediaStatus === "none" && (
          <button
            onClick={retryMediaAccess}
            className="w-fit px-3 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700 text-sm"
          >
            Retry Camera/Mic Access
          </button>
        )}

        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        </div>
      </div>

      {role !== "doctor" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 md:p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Online Doctors
          </h2>
          {onlineDoctors.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              No doctors are online right now.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {onlineDoctors.map((doctor) => (
                <div
                  key={doctor.userId}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      Dr. {doctor.userName}
                    </p>
                    <p className="text-xs text-emerald-600">Online</p>
                  </div>
                  <button
                    onClick={() => inviteDoctor(doctor)}
                    className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Call Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
            Your Video
          </h2>
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            <video
              ref={myVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={toggleMute}
              className={`px-3 py-2 rounded-lg text-white ${isMuted ? "bg-orange-600" : "bg-emerald-600"}`}
            >
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <button
              onClick={toggleCamera}
              className={`px-3 py-2 rounded-lg text-white ${isCameraOff ? "bg-orange-600" : "bg-indigo-600"}`}
            >
              {isCameraOff ? "Camera On" : "Camera Off"}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
            Remote Video
          </h2>
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-300">
                Waiting for doctor/patient to join this room
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Conversation</h2>

        <div className="h-44 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/40 space-y-2">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-500">No messages yet.</p>
          ) : (
            messages.map((msg, idx) => (
              <div key={`${msg.timestamp || "t"}-${idx}`}>
                <p className="text-xs text-gray-500">{msg.senderName || "User"}</p>
                <p className="text-sm text-gray-800 dark:text-gray-200">{msg.message}</p>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendChatMessage();
              }
            }}
            disabled={!activeRoomId}
            placeholder={activeRoomId ? "Type a message" : "Join a room to chat"}
            className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
          <button
            onClick={sendChatMessage}
            disabled={!activeRoomId || !messageInput.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
        For internet networks behind strict NAT/firewalls, add a TURN server for
        guaranteed remote connectivity.
      </div>
    </div>
  );
}
