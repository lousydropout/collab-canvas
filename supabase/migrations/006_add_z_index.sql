-- Add z_index column to canvas_objects table for object layering
-- Migration: 006_add_z_index.sql

-- Add z_index column with default value 0
ALTER TABLE canvas_objects ADD COLUMN z_index INTEGER DEFAULT 0;

-- Update existing objects with sequential z_index values based on creation order
-- This ensures each object gets a unique z_index within its canvas
UPDATE canvas_objects 
SET z_index = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY canvas_id ORDER BY created_at) as row_num
  FROM canvas_objects
) subquery
WHERE canvas_objects.id = subquery.id;

-- Add unique constraint to prevent z_index conflicts within the same canvas
ALTER TABLE canvas_objects ADD CONSTRAINT unique_canvas_z_index UNIQUE (canvas_id, z_index);

-- Create index for efficient ordering by z_index
CREATE INDEX idx_canvas_objects_z_index ON canvas_objects (canvas_id, z_index);

-- Add comment explaining the z_index system
COMMENT ON COLUMN canvas_objects.z_index IS 'Z-index for object layering. Higher values appear on top. Unique per canvas.';
