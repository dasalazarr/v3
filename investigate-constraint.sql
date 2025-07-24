-- Investigate the subscription_status constraint issue
-- This will help us understand why 'free' is being rejected

-- 1. Check the current constraint definition
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'users_subscription_status_check';

-- 2. Check the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'subscription_status';

-- 3. Check if there are any existing users and their statuses
SELECT 
    subscription_status, 
    COUNT(*) as count
FROM users 
GROUP BY subscription_status 
ORDER BY count DESC;

-- 4. Try to understand what values are actually allowed
-- This will show us the enum values if it's an enum type
SELECT 
    t.typname,
    e.enumlabel
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%subscription%' OR t.typname LIKE '%status%'
ORDER BY t.typname, e.enumsortorder;

-- 5. Check the actual table definition
SELECT 
    pg_get_tabledef('users'::regclass) as table_definition;
