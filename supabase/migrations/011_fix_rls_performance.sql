-- Fix RLS performance issues by wrapping auth.uid() calls in SELECT statements
-- and adding explicit role targeting

-- Drop existing policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Canvas objects are viewable by authenticated users" ON public.canvas_objects;
DROP POLICY IF EXISTS "Authenticated users can insert canvas objects" ON public.canvas_objects;
DROP POLICY IF EXISTS "Users can update objects they created or objects owned by 'all'" ON public.canvas_objects;
DROP POLICY IF EXISTS "Users can delete objects they created" ON public.canvas_objects;

-- Recreate profiles policies with performance optimizations
CREATE POLICY "Profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  TO authenticated
  USING ((select auth.uid()) = id);

-- Recreate canvas_objects policies with performance optimizations
CREATE POLICY "Canvas objects are viewable by authenticated users" 
  ON public.canvas_objects FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert canvas objects" 
  ON public.canvas_objects FOR INSERT 
  TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Users can update objects they created or objects owned by 'all'" 
  ON public.canvas_objects FOR UPDATE 
  TO authenticated
  USING ((select auth.uid()) = created_by OR owner = 'all');

CREATE POLICY "Users can delete objects they created" 
  ON public.canvas_objects FOR DELETE 
  TO authenticated
  USING ((select auth.uid()) = created_by);
