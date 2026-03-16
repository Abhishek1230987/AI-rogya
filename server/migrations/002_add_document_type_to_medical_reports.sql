-- Add document_type column to medical_reports if it doesn't exist
ALTER TABLE medical_reports 
ADD COLUMN IF NOT EXISTS document_type VARCHAR(100) DEFAULT 'general';
