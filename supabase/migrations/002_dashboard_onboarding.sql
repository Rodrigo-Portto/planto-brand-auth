ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS dashboard_onboarded_at timestamptz;
