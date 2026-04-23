-- Fix RLS policy to allow authenticated users to create posts
-- Drop existing policy
DROP POLICY IF EXISTS "Only authenticated users can create posts" ON posts;

-- Create new policy that only requires authentication
CREATE POLICY "Only authenticated users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
