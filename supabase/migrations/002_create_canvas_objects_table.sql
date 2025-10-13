-- Create canvas_objects table for storing rectangles
CREATE TABLE public.canvas_objects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  canvas_id TEXT NOT NULL DEFAULT 'default',
  type TEXT NOT NULL CHECK (type = 'rectangle'),
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  width NUMERIC NOT NULL CHECK (width > 0),
  height NUMERIC NOT NULL CHECK (height > 0),
  color TEXT NOT NULL DEFAULT '#000000',
  rotation NUMERIC NOT NULL DEFAULT 0,
  owner TEXT NOT NULL DEFAULT 'all',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.canvas_objects ENABLE row level security;

-- Create policies for canvas_objects
CREATE POLICY "Canvas objects are viewable by authenticated users" 
  ON public.canvas_objects FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert canvas objects" 
  ON public.canvas_objects FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update objects they created or objects owned by 'all'" 
  ON public.canvas_objects FOR UPDATE 
  TO authenticated
  USING (auth.uid() = created_by OR owner = 'all');

CREATE POLICY "Users can delete objects they created" 
  ON public.canvas_objects FOR DELETE 
  TO authenticated
  USING (auth.uid() = created_by);

-- Create indexes for performance
CREATE INDEX idx_canvas_objects_canvas_id ON public.canvas_objects(canvas_id);
CREATE INDEX idx_canvas_objects_owner ON public.canvas_objects(owner);
CREATE INDEX idx_canvas_objects_created_by ON public.canvas_objects(created_by);
CREATE INDEX idx_canvas_objects_updated_at ON public.canvas_objects(updated_at);

-- Create trigger for automatic updated_at
CREATE TRIGGER on_canvas_objects_updated
  BEFORE UPDATE ON public.canvas_objects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
