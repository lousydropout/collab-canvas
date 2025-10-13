-- Fix delete policy to allow deleting any object on the canvas
-- This is safe because we're dealing with a shared collaborative canvas

-- Drop the restrictive delete policy
DROP POLICY IF EXISTS "Users can delete objects they created" ON public.canvas_objects;

-- Create a more permissive delete policy for collaborative canvas
CREATE POLICY "Authenticated users can delete any canvas objects" 
  ON public.canvas_objects FOR DELETE 
  TO authenticated
  USING (true);

-- Also update the update policy to be more permissive
DROP POLICY IF EXISTS "Users can update objects they created or objects owned by 'all'" ON public.canvas_objects;

CREATE POLICY "Authenticated users can update any canvas objects" 
  ON public.canvas_objects FOR UPDATE 
  TO authenticated
  USING (true);
