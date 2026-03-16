import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "e_consultancy",
  password: process.env.DB_PASSWORD || "password",
  port: parseInt(process.env.DB_PORT || "5432"),
});

// Test the connection
pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

// Initialize database schema
export const initializeDatabase = async () => {
  const client = await pool.connect();

  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        profile_picture TEXT,
        role VARCHAR(20) DEFAULT 'patient',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create medical_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS medical_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date_of_birth DATE,
        gender VARCHAR(20),
        blood_type VARCHAR(10),
        height_cm INTEGER,
        weight_kg INTEGER,
        chronic_conditions JSONB DEFAULT '[]'::jsonb,
        current_medications JSONB DEFAULT '[]'::jsonb,
        allergies JSONB DEFAULT '[]'::jsonb,
        family_history JSONB DEFAULT '{}'::jsonb,
        smoking_status VARCHAR(20),
        drinking_status VARCHAR(20),
        exercise_frequency VARCHAR(50),
        emergency_contact JSONB DEFAULT '{}'::jsonb,
        additional_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create medical_reports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS medical_reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        original_name VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        extracted_info JSONB DEFAULT '{}'::jsonb,
        document_type VARCHAR(100) DEFAULT 'general',
        processing_status VARCHAR(20) DEFAULT 'pending',
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create consultations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS consultations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        doctor_id INTEGER REFERENCES users(id),
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        symptoms TEXT NOT NULL,
        diagnosis TEXT,
        prescription TEXT,
        doctor_notes TEXT,
        language_used VARCHAR(10) DEFAULT 'en',
        audio_recording TEXT,
        transcription TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create text chat sessions table for conversation threads
    await client.query(`
      CREATE TABLE IF NOT EXISTS text_chat_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_name VARCHAR(255) NOT NULL DEFAULT 'General Chat',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_text_chat_sessions_user_created
      ON text_chat_sessions(user_id, created_at DESC)
    `);

    // Create text consultations table for chat history persistence
    await client.query(`
      CREATE TABLE IF NOT EXISTS text_consultations (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES text_chat_sessions(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        user_message TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        language_used VARCHAR(20) DEFAULT 'en',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_text_consultations_user_created
      ON text_consultations(user_id, created_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_text_consultations_session_created
      ON text_consultations(session_id, created_at DESC)
    `);

    // Migration: ensure session_id column exists for older schemas
    await client.query(`
      ALTER TABLE text_consultations
      ADD COLUMN IF NOT EXISTS session_id INTEGER REFERENCES text_chat_sessions(id) ON DELETE CASCADE
    `);

    // Migration: create default sessions for users with existing text consultations
    await client.query(`
      INSERT INTO text_chat_sessions (user_id, session_name)
      SELECT DISTINCT tc.user_id, 'General Chat'
      FROM text_consultations tc
      WHERE tc.user_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM text_chat_sessions s WHERE s.user_id = tc.user_id
        )
    `);

    // Migration: attach old messages without session_id to user's oldest session
    await client.query(`
      UPDATE text_consultations tc
      SET session_id = sub.session_id
      FROM (
        SELECT DISTINCT ON (s.user_id)
          s.user_id,
          s.id AS session_id
        FROM text_chat_sessions s
        ORDER BY s.user_id, s.created_at ASC, s.id ASC
      ) sub
      WHERE tc.user_id = sub.user_id
        AND tc.session_id IS NULL
    `);

    // Create voice_consultations table (using old schema for compatibility)
    await client.query(`
      CREATE TABLE IF NOT EXISTS voice_consultations (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id VARCHAR(255) NOT NULL,
        
        -- Original schema columns
        original_message TEXT,
        transcription TEXT,
        detected_language VARCHAR(50),
        medical_response TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        -- Additional columns (for future migration)
        audio_file_id VARCHAR(255),
        audio_cloud_url TEXT,
        audio_filename VARCHAR(500),
        original_filename VARCHAR(500),
        file_size_bytes INTEGER,
        duration_seconds DECIMAL(10,2),
        transcription_confidence DECIMAL(5,4),
        ai_model_used VARCHAR(100) DEFAULT 'gemini-pro',
        patient_age INTEGER,
        patient_gender VARCHAR(20),
        symptoms_category VARCHAR(100),
        urgency_level VARCHAR(20) DEFAULT 'normal',
        processing_status VARCHAR(50) DEFAULT 'completed',
        processing_time_ms INTEGER,
        
        CONSTRAINT valid_urgency CHECK (urgency_level IN ('low', 'normal', 'high', 'emergency')),
        CONSTRAINT valid_gender CHECK (patient_gender IN ('male', 'female', 'other', 'prefer_not_to_say'))
      )
    `);

    // Create indexes for voice_consultations
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_voice_consultations_user_id ON voice_consultations(user_id);
      CREATE INDEX IF NOT EXISTS idx_voice_consultations_timestamp ON voice_consultations(timestamp DESC);
    `);

    // Create sessions table for express-session
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      )
      WITH (OIDS=FALSE);
      
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);
    `);

    // Create appointments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        hospital_id VARCHAR(255) NOT NULL,
        hospital_name VARCHAR(500) NOT NULL,
        specialty VARCHAR(100) NOT NULL,
        patient_name VARCHAR(255) NOT NULL,
        appointment_at TIMESTAMP NOT NULL,
        contact VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create SOS alerts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sos_alerts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        message TEXT NOT NULL,
        severity VARCHAR(20) DEFAULT 'MEDIUM',
        location JSONB DEFAULT '{}'::jsonb,
        has_audio BOOLEAN DEFAULT FALSE,
        audio_file_path TEXT,
        recipients JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(20) DEFAULT 'sent',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for SOS alerts
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sos_alerts_user_id ON sos_alerts(user_id);
      CREATE INDEX IF NOT EXISTS idx_sos_alerts_timestamp ON sos_alerts(timestamp DESC);
    `);

    // Run migrations - add document_type column if it doesn't exist
    try {
      await client.query(`
        ALTER TABLE medical_reports 
        ADD COLUMN IF NOT EXISTS document_type VARCHAR(100) DEFAULT 'general'
      `);
      console.log(
        "✅ Migration: Added document_type column to medical_reports",
      );
    } catch (migrationError) {
      console.log(
        "ℹ️ Migration: document_type column already exists or migration skipped",
      );
    }

    console.log("Database schema initialized successfully");
  } catch (error) {
    console.error("Error initializing database schema:", error);
    throw error;
  } finally {
    client.release();
  }
};

// Export pool getter function
export const getPool = () => pool;

export default pool;
