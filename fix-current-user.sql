-- Fix the current user with invalid subscription status
-- User ID from logs: 7a3d5339-9baa-4c2c-abed-6dcd5c36e5f4

-- First, check the current user
SELECT 
    id, 
    phone_number, 
    subscription_status, 
    created_at, 
    updated_at 
FROM users 
WHERE phone_number = '593984074389' 
ORDER BY created_at DESC 
LIMIT 5;

-- Update the user to have valid subscription status
UPDATE users 
SET 
    subscription_status = 'free',
    updated_at = NOW()
WHERE phone_number = '593984074389'
AND subscription_status = 'none';

-- Verify the update
SELECT 
    id, 
    phone_number, 
    subscription_status, 
    created_at, 
    updated_at 
FROM users 
WHERE phone_number = '593984074389' 
ORDER BY created_at DESC 
LIMIT 3;
