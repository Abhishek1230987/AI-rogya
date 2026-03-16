-- ============================================================
-- SQL Query: Check Emergency Contacts for Duplicates
-- Run this in your database to see what IDs are configured
-- ============================================================

-- View 1: All emergency contacts
SELECT 
  user_id,
  emergency_contact,
  jsonb_array_length(
    jsonb_agg(DISTINCT 
      CASE 
        WHEN emergency_contact->>'parent1_telegram_id' IS NOT NULL THEN emergency_contact->>'parent1_telegram_id'
        WHEN emergency_contact->>'parent2_telegram_id' IS NOT NULL THEN emergency_contact->>'parent2_telegram_id'
        WHEN emergency_contact->>'guardian_telegram_id' IS NOT NULL THEN emergency_contact->>'guardian_telegram_id'
      END
    )
  ) as unique_ids_count
FROM medical_history
WHERE emergency_contact IS NOT NULL
ORDER BY user_id;

-- View 2: Check for duplicate IDs
SELECT user_id, emergency_contact
FROM medical_history
WHERE emergency_contact IS NOT NULL;

-- View 3: If you see 6 contacts, it might be multiple rows
SELECT user_id, COUNT(*) as count
FROM medical_history
GROUP BY user_id
HAVING COUNT(*) > 1;

-- ============================================================
-- To FIND if the issue is multiple records per user:
-- ============================================================

SELECT 
  user_id,
  COUNT(*) as record_count,
  jsonb_agg(emergency_contact) as all_emergency_contacts
FROM medical_history
WHERE emergency_contact IS NOT NULL
GROUP BY user_id
HAVING COUNT(*) > 1;

-- ============================================================
-- If multiple records found, you may need to consolidate:
-- DELETE from oldest records and keep latest:
-- ============================================================

-- DELETE FROM medical_history
-- WHERE user_id IN (
--   SELECT user_id
--   FROM (
--     SELECT user_id, id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as rn
--     FROM medical_history
--     WHERE emergency_contact IS NOT NULL
--   ) t
--   WHERE rn > 1
-- );

-- ============================================================
-- Quick check - count emergency contacts
-- ============================================================

SELECT 
  'Total users' as metric,
  COUNT(DISTINCT user_id) as count
FROM medical_history
UNION ALL
SELECT 
  'Total emergency contact records',
  COUNT(*) as count
FROM medical_history
WHERE emergency_contact IS NOT NULL;
