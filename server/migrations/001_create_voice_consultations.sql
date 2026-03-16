-- Migration: Create Voice Consultations Table
-- Run this if the voice_consultations table doesn't exist

-- Create the voice_consultations table
CREATE TABLE IF NOT EXISTS voice_consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Audio file information
    audio_file_id VARCHAR(255) UNIQUE NOT NULL,
    audio_cloud_url TEXT NOT NULL,
    audio_filename VARCHAR(500) NOT NULL,
    original_filename VARCHAR(500),
    file_size_bytes INTEGER,
    duration_seconds DECIMAL(10,2),
    
    -- Transcription data
    original_text TEXT,
    translated_text TEXT,
    detected_language VARCHAR(50),
    transcription_confidence DECIMAL(5,4),
    
    -- AI Response
    ai_response TEXT NOT NULL,
    ai_model_used VARCHAR(100) DEFAULT 'gemini-pro',
    
    -- Patient context
    patient_age INTEGER,
    patient_gender VARCHAR(20),
    symptoms_category VARCHAR(100),
    urgency_level VARCHAR(20) DEFAULT 'normal',
    
    -- Processing metadata
    processing_status VARCHAR(50) DEFAULT 'completed',
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_urgency CHECK (urgency_level IN ('low', 'normal', 'high', 'emergency')),
    CONSTRAINT valid_gender CHECK (patient_gender IN ('male', 'female', 'other', 'prefer_not_to_say'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_voice_consultations_user_id ON voice_consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_consultations_created_at ON voice_consultations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_consultations_urgency ON voice_consultations(urgency_level);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_voice_consultation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_voice_consultation_timestamp
    BEFORE UPDATE ON voice_consultations
    FOR EACH ROW
    EXECUTE FUNCTION update_voice_consultation_timestamp();

-- Verify the table was created
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'voice_consultations'
    ) THEN
        RAISE NOTICE ' voice_consultations table created successfully';
    ELSE
        RAISE EXCEPTION ' Failed to create voice_consultations table';
    END IF;
END $$;
