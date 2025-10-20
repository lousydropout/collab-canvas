-- Update the type constraint to allow rectangle, ellipse, and triangle
ALTER TABLE public.canvas_objects DROP CONSTRAINT canvas_objects_type_check;
ALTER TABLE public.canvas_objects ADD CONSTRAINT canvas_objects_type_check CHECK (type IN ('rectangle', 'ellipse', 'triangle'));
