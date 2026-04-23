-- Migration SQL for Blog System (Nomadlexis style)
-- This script creates/updates the blog tables to match the new structure

-- Drop existing tables if they exist (data will be lost as per user request)
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table (if not using Supabase auth profiles)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table (new structure matching Nomadlexis)
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published BOOLEAN DEFAULT false,
  seo_metadata JSONB,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_published ON posts(published);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- RLS Policies for posts
-- Public can read published posts
CREATE POLICY "Published posts are viewable by everyone"
  ON posts FOR SELECT
  USING (published = true);

-- Authors can view all their posts
CREATE POLICY "Authors can view their posts"
  ON posts FOR SELECT
  USING (auth.uid()::text = (SELECT id::text FROM profiles WHERE email = auth.email() LIMIT 1));

-- Only authenticated users can create posts
CREATE POLICY "Only authenticated users can create posts"
  ON posts FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    author_id = (SELECT id FROM profiles WHERE email = auth.email() LIMIT 1)
  );

-- Authors can update their posts
CREATE POLICY "Authors can update their posts"
  ON posts FOR UPDATE
  USING (
    author_id = (SELECT id FROM profiles WHERE email = auth.email() LIMIT 1)
  );

-- Authors can delete their posts
CREATE POLICY "Authors can delete their posts"
  ON posts FOR DELETE
  USING (
    author_id = (SELECT id FROM profiles WHERE email = auth.email() LIMIT 1)
  );

-- RLS Policies for comments
-- Public can read comments
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  USING (true);

-- Only authenticated users can create comments
CREATE POLICY "Only authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can delete their own comments
CREATE POLICY "Users can delete their comments"
  ON comments FOR DELETE
  USING (
    user_id = (SELECT id FROM profiles WHERE email = auth.email() LIMIT 1)
  );

-- Insert sample profiles (matching existing users)
INSERT INTO profiles (username, email) VALUES
('Fabian Tobar', 'fabianignacio.tm@gmail.com'),
('JP Pizarro', 'jpa.pizarro@gmail.com'),
('Stephania Bilbao', 'stephaniabilbao@gmail.com')
ON CONFLICT (email) DO NOTHING;
