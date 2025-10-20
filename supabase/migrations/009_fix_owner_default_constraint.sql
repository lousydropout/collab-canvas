-- Fix owner default constraint issue
-- The DEFAULT 'all' constraint is overriding explicit owner values
-- We need to remove the default and ensure owner is properly set

-- First, let's see what the current constraint looks like
-- Then remove the default constraint
ALTER TABLE public.canvas_objects ALTER COLUMN owner DROP DEFAULT;

-- Update any existing objects that have owner = 'all' to be owned by their creator
-- This ensures existing objects work correctly
UPDATE public.canvas_objects 
SET owner = created_by 
WHERE owner = 'all' AND created_by IS NOT NULL;

-- For objects where created_by is NULL (shouldn't happen but just in case)
-- Set them to 'all' explicitly
UPDATE public.canvas_objects 
SET owner = 'all' 
WHERE owner = 'all' AND created_by IS NULL;
