-- Enable realtime for canvas_objects table
ALTER PUBLICATION supabase_realtime ADD TABLE public.canvas_objects;

-- Optional: Enable realtime for profiles table for presence features
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
