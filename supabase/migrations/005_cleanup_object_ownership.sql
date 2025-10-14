-- Drop object_ownership table if it exists (cleanup)
DROP TABLE IF EXISTS public.object_ownership CASCADE;

-- Note: We decided to use canvas_objects.owner field instead of a separate table
-- This migration cleans up any object_ownership table that might have been created
