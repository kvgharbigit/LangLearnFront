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
    transcription_minutes REAL NOT NULL DEFAULT 0,
    llm_input_tokens BIGINT NOT NULL DEFAULT 0,
    llm_output_tokens BIGINT NOT NULL DEFAULT 0,
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
    u.transcription_minutes,
    u.llm_input_tokens,
    u.llm_output_tokens,
    u.tts_characters,
    u.daily_usage,
    u.created_at,
    u.updated_at,
    -- Calculate costs with OpenAI GPT-4.1 Nano pricing
    (u.transcription_minutes * 0.006) AS transcription_cost,
    (u.llm_input_tokens / 1000000 * 0.1) AS llm_input_cost,
    (u.llm_output_tokens / 1000000 * 0.4) AS llm_output_cost,
    (u.tts_characters / 1000000 * 4.0) AS tts_cost,
    -- Total cost with OpenAI GPT-4.1 Nano pricing
    (u.transcription_minutes * 0.006) + 
    (u.llm_input_tokens / 1000000 * 0.1) +
    (u.llm_output_tokens / 1000000 * 0.4) +
    (u.tts_characters / 1000000 * 4.0) AS total_cost,
    -- Get subscription info from users table
    usr.subscription_tier,
    -- Derive credit_limit from subscription_tier
    CASE 
        WHEN usr.subscription_tier = 'premium' THEN 7.50
        WHEN usr.subscription_tier = 'basic' THEN 2.50
        WHEN usr.subscription_tier = 'gold' THEN 15.00
        ELSE 0.50 -- free tier
    END AS credit_limit,
    -- Calculate percentage used using the derived credit_limit
    LEAST(
        ((u.transcription_minutes * 0.006) + 
        (u.llm_input_tokens / 1000000 * 0.1) + 
        (u.llm_output_tokens / 1000000 * 0.4) + 
        (u.tts_characters / 1000000 * 4.0)) / 
        CASE 
            WHEN usr.subscription_tier = 'premium' THEN 7.50
            WHEN usr.subscription_tier = 'basic' THEN 2.50
            WHEN usr.subscription_tier = 'gold' THEN 15.00
            ELSE 0.50 -- free tier
        END * 100,
        100
    ) AS percentage_used
FROM 
    usage u
JOIN 
    users usr ON u.user_id = usr.user_id;