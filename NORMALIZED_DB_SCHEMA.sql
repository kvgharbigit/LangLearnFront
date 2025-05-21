-- This SQL creates a normalized schema removing redundant fields
-- Run this in your Supabase SQL Editor

-- First drop the view that depends on these tables
DROP VIEW IF EXISTS usage_with_calculations;

-- Then drop tables in reverse order due to dependencies
DROP TABLE IF EXISTS usage;
DROP TABLE IF EXISTS users;

-- Create users table (subscription information only stored here)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    subscription_tier TEXT NOT NULL DEFAULT 'free',
    subscription_start BIGINT NOT NULL,
    billing_cycle_start BIGINT NOT NULL,
    billing_cycle_end BIGINT NOT NULL,
    -- Removed credit_limit field (will derive from subscription_tier)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create usage table (raw usage metrics only)
CREATE TABLE IF NOT EXISTS usage (
    id SERIAL PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    current_period_start BIGINT NOT NULL,
    current_period_end BIGINT NOT NULL,
    -- Raw usage metrics only
    whisper_minutes REAL NOT NULL DEFAULT 0,
    claude_input_tokens BIGINT NOT NULL DEFAULT 0,
    claude_output_tokens BIGINT NOT NULL DEFAULT 0,
    tts_characters BIGINT NOT NULL DEFAULT 0,
    -- Daily usage for historical tracking
    daily_usage JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_id ON usage(user_id);

-- Add a view to provide calculated values for backward compatibility
CREATE OR REPLACE VIEW usage_with_calculations AS
SELECT 
    u.id,
    u.user_id,
    u.current_period_start,
    u.current_period_end,
    u.whisper_minutes,
    u.claude_input_tokens,
    u.claude_output_tokens,
    u.tts_characters,
    u.daily_usage,
    u.created_at,
    u.updated_at,
    -- Calculate costs (these formulas should match your application code)
    (u.whisper_minutes * 0.006) AS whisper_cost,
    (u.claude_input_tokens / 1000000 * 2.5) AS claude_input_cost,
    (u.claude_output_tokens / 1000000 * 7.5) AS claude_output_cost,
    (u.tts_characters / 1000000 * 4.0) AS tts_cost,
    -- Total cost
    (u.whisper_minutes * 0.006) + 
    (u.claude_input_tokens / 1000000 * 2.5) + 
    (u.claude_output_tokens / 1000000 * 7.5) + 
    (u.tts_characters / 1000000 * 4.0) AS total_cost,
    -- Get subscription info from users table
    usr.subscription_tier,
    -- Derive credit_limit from subscription_tier
    CASE 
        WHEN usr.subscription_tier = 'premium' THEN 8.0
        WHEN usr.subscription_tier = 'basic' THEN 3.0
        WHEN usr.subscription_tier = 'gold' THEN 16.0
        ELSE 0.75 -- free tier
    END AS credit_limit,
    -- Calculate percentage used
    CASE 
        WHEN usr.subscription_tier = 'premium' THEN 
            LEAST(
                ((u.whisper_minutes * 0.006) + 
                (u.claude_input_tokens / 1000000 * 2.5) + 
                (u.claude_output_tokens / 1000000 * 7.5) + 
                (u.tts_characters / 1000000 * 4.0)) / 8.0 * 100,
                100
            )
        WHEN usr.subscription_tier = 'basic' THEN 
            LEAST(
                ((u.whisper_minutes * 0.006) + 
                (u.claude_input_tokens / 1000000 * 2.5) + 
                (u.claude_output_tokens / 1000000 * 7.5) + 
                (u.tts_characters / 1000000 * 4.0)) / 3.0 * 100,
                100
            )
        WHEN usr.subscription_tier = 'gold' THEN 
            LEAST(
                ((u.whisper_minutes * 0.006) + 
                (u.claude_input_tokens / 1000000 * 2.5) + 
                (u.claude_output_tokens / 1000000 * 7.5) + 
                (u.tts_characters / 1000000 * 4.0)) / 16.0 * 100,
                100
            )
        ELSE -- free tier
            LEAST(
                ((u.whisper_minutes * 0.006) + 
                (u.claude_input_tokens / 1000000 * 2.5) + 
                (u.claude_output_tokens / 1000000 * 7.5) + 
                (u.tts_characters / 1000000 * 4.0)) / 0.75 * 100,
                100
            )
    END AS percentage_used
FROM 
    usage u
JOIN 
    users usr ON u.user_id = usr.user_id;