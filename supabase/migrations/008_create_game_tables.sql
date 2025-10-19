-- Create game_sessions table
-- Note: canvas_id references the canvas_id field in canvas_objects, but since it's not unique,
-- we'll use a different approach by referencing the id field instead
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  canvas_id TEXT NOT NULL, -- References canvas_objects.canvas_id (not unique)
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_state JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create realtime_events table for game events
CREATE TABLE IF NOT EXISTS realtime_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  canvas_id TEXT NOT NULL, -- References canvas_objects.canvas_id (not unique)
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_canvas_id ON game_sessions(canvas_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_realtime_events_canvas_id ON realtime_events(canvas_id);
CREATE INDEX IF NOT EXISTS idx_realtime_events_user_id ON realtime_events(user_id);
CREATE INDEX IF NOT EXISTS idx_realtime_events_event_type ON realtime_events(event_type);
CREATE INDEX IF NOT EXISTS idx_realtime_events_created_at ON realtime_events(created_at);

-- Enable RLS
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for game_sessions
CREATE POLICY "Users can view their own game sessions" ON game_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own game sessions" ON game_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own game sessions" ON game_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own game sessions" ON game_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for realtime_events
CREATE POLICY "Users can view events for canvases they have access to" ON realtime_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM canvas_objects 
      WHERE canvas_objects.canvas_id = realtime_events.canvas_id 
      AND canvas_objects.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create events for canvases they have access to" ON realtime_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM canvas_objects 
      WHERE canvas_objects.canvas_id = realtime_events.canvas_id 
      AND canvas_objects.created_by = auth.uid()
    )
  );

-- Enable realtime for the new tables
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE realtime_events;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for game_sessions updated_at
CREATE TRIGGER update_game_sessions_updated_at 
  BEFORE UPDATE ON game_sessions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
