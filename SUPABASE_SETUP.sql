-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own workout history" ON workout_history;
DROP POLICY IF EXISTS "Users can insert own workout history" ON workout_history;
DROP POLICY IF EXISTS "Users can update own workout history" ON workout_history;

-- Drop tables with CASCADE
DROP TABLE IF EXISTS workout_history CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table with EXACT structure
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  gender TEXT,
  total_x_p INT DEFAULT 0,
  level INT DEFAULT 1,
  streak INT DEFAULT 0,
  onboarded BOOLEAN DEFAULT false,
  mode TEXT,
  fitness_level TEXT,
  body_analysis JSONB,
  weekly_plan JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create workout_history table
CREATE TABLE workout_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INT,
  reps INT,
  weight FLOAT,
  duration INT,
  notes TEXT,
  date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workout_history_user_id ON workout_history(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_history_date ON workout_history(date);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for workout_history
CREATE POLICY "Users can view own workout history" ON workout_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workout history" ON workout_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workout history" ON workout_history FOR UPDATE USING (auth.uid() = user_id);
