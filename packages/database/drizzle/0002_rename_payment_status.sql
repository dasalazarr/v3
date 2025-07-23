-- Fix subscription_status constraint to match application schema
-- Drop the old constraint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_subscription_status_check";

-- Add the new constraint with correct values
ALTER TABLE "users" ADD CONSTRAINT "users_subscription_status_check" 
CHECK ("subscription_status" IN ('free', 'pending_payment', 'premium', 'past_due', 'canceled'));

-- Update any existing 'none' values to 'free' for consistency
UPDATE "users" SET "subscription_status" = 'free' WHERE "subscription_status" = 'none';

-- Update any existing 'active' values to 'premium' for consistency  
UPDATE "users" SET "subscription_status" = 'premium' WHERE "subscription_status" = 'active';
