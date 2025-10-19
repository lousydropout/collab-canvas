-- Remove z_index unique constraint and allow null values
-- Migration: 009_remove_z_index_constraint.sql

-- Drop the unique constraint
ALTER TABLE canvas_objects DROP CONSTRAINT IF EXISTS unique_canvas_z_index;

-- Drop the z_index index since we're not using it for ordering anymore
DROP INDEX IF EXISTS idx_canvas_objects_z_index;

-- Allow z_index to be null
ALTER TABLE canvas_objects ALTER COLUMN z_index DROP NOT NULL;

-- Set existing z_index values to null since we're not using them
UPDATE canvas_objects SET z_index = NULL WHERE z_index IS NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN canvas_objects.z_index IS 'Z-index for object layering (currently unused, can be null)';
