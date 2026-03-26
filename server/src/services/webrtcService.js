// WebRTC Video Call Service with Socket.IO
import { Server } from "socket.io";

let io;
const rooms = new Map(); // Store active rooms and participants
const userSockets = new Map(); // Map userId to socketId
const userProfiles = new Map(); // Map userId to { userId, userName, role, socketId, connectedAt }

const emitOnlineUsers = () => {
  io.emit("users:online", Array.from(userProfiles.values()));
};

const getOnlineDoctors = () =>
  Array.from(userProfiles.values()).filter(
    (profile) => profile.role === "doctor",
  );

/**
 * Initialize Socket.IO server for WebRTC signaling
 */
export const initializeSocketIO = (httpServer) => {
  const allowedOrigins = [
    process.env.CLIENT_URL || "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
  ];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Socket.IO CORS blocked for origin: ${origin}`));
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    console.log(`✅ New socket connection: ${socket.id}`);

    // User joins with their user ID
    socket.on("user:join", ({ userId, userName, role = "patient" }) => {
      socket.userId = userId;
      socket.userName = userName;
      socket.userRole = role;
      userSockets.set(userId, socket.id);
      userProfiles.set(userId, {
        userId,
        userName,
        role,
        socketId: socket.id,
        connectedAt: new Date().toISOString(),
      });

      console.log(`👤 User ${userName} (${userId}) connected`);

      // Send latest presence to all connected users
      emitOnlineUsers();
      socket.emit("doctors:online", getOnlineDoctors());
    });

    socket.on("doctors:online:get", () => {
      socket.emit("doctors:online", getOnlineDoctors());
    });

    socket.on(
      "call:invite",
      ({
        doctorUserId,
        roomId,
        patientUserId,
        patientName,
        consultationType,
      }) => {
        const doctorSocketId = userSockets.get(doctorUserId);

        if (!doctorSocketId) {
          socket.emit("call:invite:error", {
            message: "Selected doctor is currently offline.",
          });
          return;
        }

        io.to(doctorSocketId).emit("call:invite", {
          roomId,
          patientUserId,
          patientName,
          consultationType: consultationType || "video",
          inviterSocketId: socket.id,
          invitedAt: new Date().toISOString(),
        });
      },
    );

    socket.on(
      "call:invite:response",
      ({
        inviterSocketId,
        accepted,
        roomId,
        doctorUserId,
        doctorName,
        reason,
      }) => {
        io.to(inviterSocketId).emit("call:invite:response", {
          accepted,
          roomId,
          doctorUserId,
          doctorName,
          reason: reason || null,
        });
      },
    );

    // Create or join a video call room
    socket.on("room:join", async ({ roomId, userId, userName, isDoctor }) => {
      try {
        socket.join(roomId);

        // Initialize room if it doesn't exist
        if (!rooms.has(roomId)) {
          rooms.set(roomId, {
            id: roomId,
            participants: new Map(),
            createdAt: new Date(),
            status: "waiting",
          });
        }

        const room = rooms.get(roomId);

        // Add participant to room
        room.participants.set(socket.id, {
          userId,
          userName,
          isDoctor,
          socketId: socket.id,
          joinedAt: new Date(),
        });

        console.log(
          `🎥 ${userName} joined room ${roomId} (${room.participants.size} participants)`,
        );

        // Notify others in the room
        socket.to(roomId).emit("user:joined", {
          userId,
          userName,
          isDoctor,
          socketId: socket.id,
          participantCount: room.participants.size,
        });

        // Send current participants to the new joiner
        const participants = Array.from(room.participants.values()).filter(
          (p) => p.socketId !== socket.id,
        );

        socket.emit("room:joined", {
          roomId,
          participants,
          participantCount: room.participants.size,
        });

        // Update room status
        if (room.participants.size >= 2) {
          room.status = "active";
          io.to(roomId).emit("room:status", { status: "active" });
        }
      } catch (error) {
        console.error("Error joining room:", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // WebRTC Signaling - Send offer to peer
    socket.on("webrtc:offer", ({ offer, roomId, targetSocketId }) => {
      console.log(`📤 Sending offer from ${socket.id} to ${targetSocketId}`);

      io.to(targetSocketId).emit("webrtc:offer", {
        offer,
        senderSocketId: socket.id,
        senderUserId: socket.userId,
        senderUserName: socket.userName,
      });
    });

    // WebRTC Signaling - Send answer to peer
    socket.on("webrtc:answer", ({ answer, targetSocketId }) => {
      console.log(`📥 Sending answer from ${socket.id} to ${targetSocketId}`);

      io.to(targetSocketId).emit("webrtc:answer", {
        answer,
        senderSocketId: socket.id,
      });
    });

    // WebRTC Signaling - ICE candidate exchange
    socket.on("webrtc:ice-candidate", ({ candidate, targetSocketId }) => {
      io.to(targetSocketId).emit("webrtc:ice-candidate", {
        candidate,
        senderSocketId: socket.id,
      });
    });

    // Toggle audio/video
    socket.on("media:toggle", ({ roomId, mediaType, enabled }) => {
      const room = rooms.get(roomId);
      if (room && room.participants.has(socket.id)) {
        const participant = room.participants.get(socket.id);
        participant[`${mediaType}Enabled`] = enabled;

        // Notify others in the room
        socket.to(roomId).emit("media:toggled", {
          userId: socket.userId,
          mediaType,
          enabled,
        });
      }
    });

    // Send chat message in room
    socket.on("chat:message", ({ roomId, message, senderName }) => {
      const timestamp = new Date().toISOString();

      io.to(roomId).emit("chat:message", {
        message,
        senderName,
        senderId: socket.userId,
        timestamp,
      });
    });

    // Leave room
    socket.on("room:leave", ({ roomId }) => {
      handleUserLeaveRoom(socket, roomId);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);

      // Remove from user sockets map
      if (socket.userId) {
        userSockets.delete(socket.userId);
        userProfiles.delete(socket.userId);
        emitOnlineUsers();
      }

      // Remove from all rooms
      rooms.forEach((room, roomId) => {
        if (room.participants.has(socket.id)) {
          handleUserLeaveRoom(socket, roomId);
        }
      });
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });

  console.log("✅ Socket.IO server initialized for WebRTC");
  return io;
};

/**
 * Handle user leaving a room
 */
const handleUserLeaveRoom = (socket, roomId) => {
  const room = rooms.get(roomId);

  if (room && room.participants.has(socket.id)) {
    const participant = room.participants.get(socket.id);
    room.participants.delete(socket.id);

    console.log(`👋 ${participant.userName} left room ${roomId}`);

    // Notify others in the room
    socket.to(roomId).emit("user:left", {
      userId: participant.userId,
      userName: participant.userName,
      participantCount: room.participants.size,
    });

    socket.leave(roomId);

    // Clean up empty rooms
    if (room.participants.size === 0) {
      rooms.delete(roomId);
      console.log(`🗑️ Room ${roomId} deleted (empty)`);
    } else {
      // Update room status
      room.status = room.participants.size >= 2 ? "active" : "waiting";
      io.to(roomId).emit("room:status", { status: room.status });
    }
  }
};

/**
 * Get active rooms
 */
export const getActiveRooms = () => {
  const activeRooms = [];
  rooms.forEach((room, roomId) => {
    activeRooms.push({
      id: roomId,
      participantCount: room.participants.size,
      status: room.status,
      createdAt: room.createdAt,
    });
  });
  return activeRooms;
};

/**
 * Get room details
 */
export const getRoomDetails = (roomId) => {
  const room = rooms.get(roomId);
  if (!room) return null;

  return {
    id: roomId,
    participants: Array.from(room.participants.values()),
    participantCount: room.participants.size,
    status: room.status,
    createdAt: room.createdAt,
  };
};

/**
 * Force disconnect user from room
 */
export const disconnectUserFromRoom = (roomId, userId) => {
  const room = rooms.get(roomId);
  if (!room) return false;

  for (const [socketId, participant] of room.participants.entries()) {
    if (participant.userId === userId) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit("room:kicked", { reason: "Disconnected by admin" });
        socket.leave(roomId);
        room.participants.delete(socketId);
        return true;
      }
    }
  }
  return false;
};

export const getIO = () => io;
