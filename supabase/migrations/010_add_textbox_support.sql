-- Add textbox support to canvas_objects table
-- This migration adds text-specific fields and updates the type constraint

-- Add text-specific columns to canvas_objects table
ALTER TABLE public.canvas_objects 
ADD COLUMN text_content TEXT DEFAULT '',
ADD COLUMN font_size NUMERIC DEFAULT 16,
ADD COLUMN font_family TEXT DEFAULT 'Arial',
ADD COLUMN font_weight TEXT DEFAULT 'normal',
ADD COLUMN text_align TEXT DEFAULT 'left';

-- Update the type constraint to include 'textbox'
ALTER TABLE public.canvas_objects 
DROP CONSTRAINT canvas_objects_type_check;

ALTER TABLE public.canvas_objects 
ADD CONSTRAINT canvas_objects_type_check 
CHECK (type IN ('rectangle', 'ellipse', 'triangle', 'textbox'));

-- Add constraints for text formatting fields
ALTER TABLE public.canvas_objects 
ADD CONSTRAINT canvas_objects_font_size_check 
CHECK (font_size > 0 AND font_size <= 200);

ALTER TABLE public.canvas_objects 
ADD CONSTRAINT canvas_objects_font_weight_check 
CHECK (font_weight IN ('normal', 'bold', 'lighter', 'bolder', '100', '200', '300', '400', '500', '600', '700', '800', '900'));

ALTER TABLE public.canvas_objects 
ADD CONSTRAINT canvas_objects_text_align_check 
CHECK (text_align IN ('left', 'center', 'right', 'justify'));

-- Add constraint for textbox minimum dimensions
ALTER TABLE public.canvas_objects 
ADD CONSTRAINT canvas_objects_textbox_minimum_size_check 
CHECK (
  type != 'textbox' OR 
  (type = 'textbox' AND width >= 50 AND height >= 20)
);

-- Create index for text content search (for future AI search functionality)
CREATE INDEX idx_canvas_objects_text_content ON public.canvas_objects USING gin(to_tsvector('english', text_content)) 
WHERE type = 'textbox' AND text_content != '';

-- Add comment explaining textbox fields
COMMENT ON COLUMN public.canvas_objects.text_content IS 'The text content of textbox objects';
COMMENT ON COLUMN public.canvas_objects.font_size IS 'Font size in pixels (1-200)';
COMMENT ON COLUMN public.canvas_objects.font_family IS 'Font family name';
COMMENT ON COLUMN public.canvas_objects.font_weight IS 'Font weight (normal, bold, etc.)';
COMMENT ON COLUMN public.canvas_objects.text_align IS 'Text alignment (left, center, right, justify)';



