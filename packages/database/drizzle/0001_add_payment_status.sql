ALTER TABLE "users" ADD COLUMN "payment_status" text DEFAULT 'free';
ALTER TABLE "users" ADD COLUMN "premium_activated_at" timestamp;
