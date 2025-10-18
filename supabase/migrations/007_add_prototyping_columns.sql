-- Migration: 007_add_prototyping_columns.sql
-- Add prototyping columns to canvas_objects table
-- These columns are nullable and can be dropped without data loss

-- Add new columns to existing canvas_objects table
ALTER TABLE canvas_objects ADD COLUMN node_type TEXT DEFAULT 'shape';
ALTER TABLE canvas_objects ADD COLUMN component_type TEXT;
ALTER TABLE canvas_objects ADD COLUMN content TEXT;
ALTER TABLE canvas_objects ADD COLUMN styles JSONB DEFAULT '{}';
ALTER TABLE canvas_objects ADD COLUMN events JSONB DEFAULT '{}';
ALTER TABLE canvas_objects ADD COLUMN metadata JSONB DEFAULT '{}';

-- Add indexes for new columns
CREATE INDEX idx_canvas_objects_node_type ON canvas_objects(node_type);
CREATE INDEX idx_canvas_objects_component_type ON canvas_objects(component_type) WHERE component_type IS NOT NULL;

-- Add comments explaining the new columns
COMMENT ON COLUMN canvas_objects.node_type IS 'Type of node: shape (existing), component (UI element), or container (layout)';
COMMENT ON COLUMN canvas_objects.component_type IS 'Specific component type: button, input, text, container, image, link';
COMMENT ON COLUMN canvas_objects.content IS 'Text content for components (button text, placeholder text, etc.)';
COMMENT ON COLUMN canvas_objects.styles IS 'CSS-like styling properties stored as JSON';
COMMENT ON COLUMN canvas_objects.events IS 'Event handlers and interactions stored as JSON';
COMMENT ON COLUMN canvas_objects.metadata IS 'Additional component metadata and configuration';

-- Update existing data to set node_type
UPDATE canvas_objects SET node_type = 'shape' WHERE node_type IS NULL;

-- Rollback instructions (commented out):
-- ALTER TABLE canvas_objects DROP COLUMN IF EXISTS node_type;
-- ALTER TABLE canvas_objects DROP COLUMN IF EXISTS component_type;
-- ALTER TABLE canvas_objects DROP COLUMN IF EXISTS content;
-- ALTER TABLE canvas_objects DROP COLUMN IF EXISTS styles;
-- ALTER TABLE canvas_objects DROP COLUMN IF EXISTS events;
-- ALTER TABLE canvas_objects DROP COLUMN IF EXISTS metadata;
-- DROP INDEX IF EXISTS idx_canvas_objects_node_type;
-- DROP INDEX IF EXISTS idx_canvas_objects_component_type;

