-- Update the type constraint to allow both rectangle and ellipse
ALTER TABLE public.canvas_objects DROP CONSTRAINT canvas_objects_type_check;
ALTER TABLE public.canvas_objects ADD CONSTRAINT canvas_objects_type_check CHECK (type IN ('rectangle', 'ellipse'));
