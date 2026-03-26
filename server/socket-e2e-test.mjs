import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";
const ROOM_ID = `e2e-room-${Date.now()}`;

const waitFor = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitUntil = async (predicate, timeoutMs = 6000, intervalMs = 100) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true;
    await waitFor(intervalMs);
  }
  return false;
};

function createClient(label, userId, userName, role) {
  const socket = io(SOCKET_URL, {
    transports: ["polling", "websocket"],
    upgrade: true,
    withCredentials: true,
    timeout: 15000,
    reconnection: false,
  });

  const events = {
    connected: false,
    roomJoined: false,
    roomActive: false,
    gotInvite: false,
    gotInviteResponse: false,
    gotChat: false,
  };

  socket.on("connect", () => {
    events.connected = true;
    socket.emit("user:join", { userId, userName, role });
  });

  socket.on("room:joined", () => {
    events.roomJoined = true;
  });

  socket.on("room:status", ({ status }) => {
    if (status === "active") {
      events.roomActive = true;
    }
  });

  socket.on("call:invite", () => {
    events.gotInvite = true;
  });

  socket.on("call:invite:response", () => {
    events.gotInviteResponse = true;
  });

  socket.on("chat:message", ({ message }) => {
    if (message === "e2e-chat") {
      events.gotChat = true;
    }
  });

  socket.on("connect_error", (err) => {
    console.error(`${label} connect_error:`, err.message);
  });

  return { socket, events, label };
}

const patient = createClient("patient", 1001, "E2E Patient", "patient");
const doctor = createClient("doctor", 2001, "E2E Doctor", "doctor");

try {
  await waitFor(1200);

  if (!patient.events.connected || !doctor.events.connected) {
    throw new Error("One or both clients failed to connect");
  }

  patient.socket.emit("call:invite", {
    doctorUserId: 2001,
    roomId: ROOM_ID,
    patientUserId: 1001,
    patientName: "E2E Patient",
    consultationType: "video",
  });

  await waitFor(800);
  if (!doctor.events.gotInvite) {
    throw new Error("Doctor did not receive call invite");
  }

  doctor.socket.emit("call:invite:response", {
    inviterSocketId: patient.socket.id,
    accepted: true,
    roomId: ROOM_ID,
    doctorUserId: 2001,
    doctorName: "E2E Doctor",
  });

  await waitFor(700);
  if (!patient.events.gotInviteResponse) {
    throw new Error("Patient did not receive invite response");
  }

  patient.socket.emit("room:join", {
    roomId: ROOM_ID,
    userId: 1001,
    userName: "E2E Patient",
    isDoctor: false,
  });

  doctor.socket.emit("room:join", {
    roomId: ROOM_ID,
    userId: 2001,
    userName: "E2E Doctor",
    isDoctor: true,
  });

  const joinedOk = await waitUntil(
    () => patient.events.roomJoined && doctor.events.roomJoined,
    8000,
  );
  if (!joinedOk) {
    throw new Error("One or both clients did not receive room:joined");
  }

  const activeOk = await waitUntil(
    () => patient.events.roomActive && doctor.events.roomActive,
    8000,
  );
  if (!activeOk) {
    throw new Error("Room did not become active for both clients");
  }

  patient.socket.emit("chat:message", {
    roomId: ROOM_ID,
    message: "e2e-chat",
    senderName: "E2E Patient",
  });

  const chatOk = await waitUntil(() => doctor.events.gotChat, 5000);
  if (!chatOk) {
    throw new Error("Doctor did not receive chat relay");
  }

  console.log("E2E_SOCKET_TEST_PASS");
  console.log(JSON.stringify({ roomId: ROOM_ID, patient: patient.events, doctor: doctor.events }, null, 2));
} catch (err) {
  console.error("E2E_SOCKET_TEST_FAIL");
  console.error(err.message);
  process.exitCode = 1;
} finally {
  patient.socket.disconnect();
  doctor.socket.disconnect();
  await waitFor(150);
}
