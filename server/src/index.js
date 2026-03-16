import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import { createServer } from "http";
import fileUpload from "express-fileupload";
import { initializeDatabase, getPool } from "./config/database.js";
import passport from "./config/passport.js";
import authRoutes from "./routes/auth.js";
import consultationRoutes from "./routes/consultation.js";
import medicalRoutes from "./routes/medical.js";
import videoCallRoutes from "./routes/videoCall.js";
import voiceConsultationRoutes from "./routes/voiceConsultation.js";
import hospitalRoutes from "./routes/hospitals.js";
import appointmentsRoutes from "./routes/appointments.js";
import narrationRoutes from "./routes/narration.js";
import sosRoutes from "./routes/sos.js";
import medicalReportsV2 from "./routes/medical-reports-v2.js";
import { initializeSocketIO } from "./services/webrtcService.js";

// Suppress gRPC DNS resolver warnings from Google Cloud services
process.env.GRPC_DNS_RESOLVER = "native";

// Suppress MetadataLookupWarning from gRPC
const originalWarning = process.emitWarning;
process.emitWarning = function (message, type, code, ctor) {
  if (
    type === "MetadataLookupWarning" ||
    (message && message.includes("MetadataLookup"))
  ) {
    return; // Suppress this warning
  }
  return originalWarning.apply(process, arguments);
};

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
let dbAvailable = false;

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Middleware
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || "http://localhost:5173",
      "http://localhost:5174", // Alternative port
      "http://localhost:5175", // Alternative port
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

// Request logging for debugging
app.use((req, res, next) => {
  if (req.path === "/api/medical/upload-report") {
    console.log("\n📨 [INCOMING] POST /api/medical/upload-report");
    console.log("📋 Headers:", {
      "content-type": req.get("content-type"),
      "content-length": req.get("content-length"),
      authorization: req.get("authorization") ? "Bearer ..." : "None",
    });
    console.log("📊 URL:", req.originalUrl);
  }
  next();
});

// File upload middleware for SOS audio
app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    abortOnLimit: true,
    responseOnLimit: "File size exceeded",
  }),
);

// Static files - serve uploaded files
app.use("/uploads", express.static("uploads"));

// Routes
app.use((req, res, next) => {
  if (dbAvailable) {
    return next();
  }

  if (!req.path.startsWith("/api/")) {
    return next();
  }

  if (req.path === "/api/consultation/chat") {
    return next();
  }

  return res.status(503).json({
    success: false,
    message:
      "Database is currently unavailable. Please try again after PostgreSQL is running.",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/consultation", consultationRoutes);
app.use("/api/medical", medicalRoutes);
app.use("/api/medical-reports", medicalReportsV2);
app.use("/api/video", videoCallRoutes);
app.use("/api/voice", voiceConsultationRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/narration", narrationRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/sos", sosRoutes);

// Express error handler middleware - catches all errors
app.use((err, req, res, next) => {
  console.error("🚨 Express Error Handler:", err.message);
  console.error("   Path:", req.path);
  console.error("   Method:", req.method);

  // Don't send response if already sent
  if (res.headersSent) {
    console.log("   (Response already sent)");
    return next(err);
  }

  // Handle Multer/Busboy errors gracefully
  if (err.message && err.message.includes("Unexpected end of form")) {
    console.log("⚠️ Upload stream interrupted");
    return res.status(400).json({
      success: false,
      message: "Upload interrupted - please try again",
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: dbAvailable ? "ok" : "degraded",
    database: dbAvailable ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// Initialize Socket.IO for WebRTC
const io = initializeSocketIO(httpServer);

// Catch uncaught exceptions BEFORE starting server
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
  console.error("Stack:", error.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled rejection at:", promise, "reason:", reason);
});

// Start server and initialize database (optionally skip DB init for fast dev startups)
const PORT = process.env.PORT || 5000;
const SKIP_DB_INIT = String(process.env.SKIP_DB_INIT).toLowerCase() === "true";
const ALLOW_START_WITHOUT_DB =
  String(process.env.ALLOW_START_WITHOUT_DB).toLowerCase() === "true" ||
  process.env.NODE_ENV !== "production";

function startServer() {
  const server = httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server successfully running on port ${PORT}`);
    console.log(`✅ Health check available at http://localhost:${PORT}/health`);
    console.log(`✅ Server is listening and ready to accept connections`);
  });

  server.on("error", (error) => {
    console.error("❌ Server listen error:", error);
    if (error && error.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is already in use`);
    }
    process.exit(1);
  });
}

if (SKIP_DB_INIT) {
  console.log(
    "⚠️ SKIP_DB_INIT is true — skipping database initialization and starting server immediately (dev mode)",
  );
  dbAvailable = false;
  startServer();
} else {
  initializeDatabase()
    .then(() => {
      // Attach pool to app for routes to use
      const pool = getPool();
      app.set("pool", pool);
      dbAvailable = true;
      console.log("✅ Database pool attached to app");
      startServer();
    })
    .catch((error) => {
      console.error("❌ Server startup failed:", error);
      console.error("Stack:", error.stack);

      if (ALLOW_START_WITHOUT_DB) {
        console.warn(
          "⚠️ Starting server in DEGRADED mode without database. Only non-DB endpoints will work.",
        );
        dbAvailable = false;
        startServer();
        return;
      }

      process.exit(1);
    });
}
