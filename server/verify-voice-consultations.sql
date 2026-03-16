-- Quick Database Verification Script
-- Run this to check if voice consultations are being saved properly

-- 1. Check if table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'voice_consultations'
        ) THEN '✅ voice_consultations table exists'
        ELSE '❌ voice_consultations table NOT FOUND - Run migration first!'
    END as table_status;

-- 2. Check table structure
\d voice_consultations

-- 3. Count total consultations
SELECT COUNT(*) as total_consultations FROM voice_consultations;

-- 4. Show recent consultations (last 5)
SELECT 
    id,
    user_id,
    LEFT(original_text, 50) as question,
    LEFT(ai_response, 50) as response,
    detected_language,
    created_at
FROM voice_consultations
ORDER BY created_at DESC
LIMIT 5;

-- 5. Consultations by user
SELECT 
    user_id,
    COUNT(*) as consultation_count,
    MAX(created_at) as last_consultation
FROM voice_consultations
GROUP BY user_id
ORDER BY consultation_count DESC;

-- 6. Check for any errors or incomplete records
SELECT 
    id,
    user_id,
    created_at,
    CASE 
        WHEN original_text IS NULL THEN 'Missing original_text'
        WHEN ai_response IS NULL THEN 'Missing ai_response'
        WHEN audio_file_id IS NULL THEN 'Missing audio_file_id'
        ELSE 'OK'
    END as status
FROM voice_consultations
WHERE original_text IS NULL 
   OR ai_response IS NULL 
   OR audio_file_id IS NULL;

-- 7. Test insert (optional - uncomment to test)
/*
INSERT INTO voice_consultations (
    user_id,
    audio_file_id,
    audio_cloud_url,
    audio_filename,
    original_filename,
    original_text,
    translated_text,
    detected_language,
    transcription_confidence,
    ai_response,
    symptoms_category,
    urgency_level
) VALUES (
    1,  -- Replace with actual user ID
    'test-' || gen_random_uuid()::text,
    '',
    'test-consultation',
    'test-consultation',
    'I have a headache and fever',
    'I have a headache and fever',
    'en',
    1.0,
    'Based on your symptoms of headache and fever, this could indicate a viral infection...',
    'general',
    'normal'
) RETURNING id, created_at;
*/

-- 8. Clean up test data (optional - uncomment to remove test entries)
/*
DELETE FROM voice_consultations 
WHERE audio_file_id LIKE 'test-%';
*/
