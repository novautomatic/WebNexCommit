-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (user profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_is_published ON posts(is_published);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
-- Profiles: Anyone can read profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Categories: Anyone can read categories
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

-- Posts: Anyone can read published posts
CREATE POLICY "Published posts are viewable by everyone"
  ON posts FOR SELECT
  USING (is_published = true);

-- Comments: Anyone can read comments
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  USING (true);

-- Insert sample categories
INSERT INTO categories (name, slug, description) VALUES
('Tecnología', 'tecnologia', 'Artículos sobre tecnología e innovación'),
('Negocios', 'negocios', 'Artículos sobre negocios y emprendimiento'),
('Lifestyle', 'lifestyle', 'Artículos sobre estilo de vida y bienestar')
ON CONFLICT (slug) DO NOTHING;

-- Insert profiles for the created users
INSERT INTO profiles (username, email) VALUES
('Fabian Tobar', 'fabianignacio.tm@gmail.com'),
('JP Pizarro', 'jpa.pizarro@gmail.com'),
('Stephania Bilbao', 'stephaniabilbao@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Insert sample posts
INSERT INTO posts (title, slug, excerpt, content, author_id, category_id, is_published, published_at) VALUES
(
  'El Futuro de la Inteligencia Artificial en los Negocios',
  'futuro-ia-negocios',
  'Descubre cómo la IA está transformando el mundo empresarial y cómo puedes aprovecharla.',
  'La inteligencia artificial está revolucionando la forma en que las empresas operan...',
  (SELECT id FROM profiles WHERE email = 'jpa.pizarro@gmail.com' LIMIT 1),
  (SELECT id FROM categories WHERE slug = 'negocios' LIMIT 1),
  true,
  NOW()
),
(
  '5 Tips para Mejorar tu Productividad',
  'tips-productividad',
  'Aprende técnicas probadas para aumentar tu eficiencia y alcanzar tus objetivos.',
  'La productividad no es solo trabajar más horas, sino trabajar de manera más inteligente...',
  (SELECT id FROM profiles WHERE email = 'stephaniabilbao@gmail.com' LIMIT 1),
  (SELECT id FROM categories WHERE slug = 'lifestyle' LIMIT 1),
  true,
  NOW()
),
(
  'Las Últimas Tendencias en Tecnología 2024',
  'tendencias-tecnologia-2024',
  'Explora las innovaciones tecnológicas que están marcando el rumbo del futuro.',
  'El panorama tecnológico de 2024 está lleno de emocionantes desarrollos...',
  (SELECT id FROM profiles WHERE email = 'fabianignacio.tm@gmail.com' LIMIT 1),
  (SELECT id FROM categories WHERE slug = 'tecnologia' LIMIT 1),
  true,
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- Update existing posts to have author_id if they don't have one
UPDATE posts
SET author_id = (
  CASE
    WHEN title LIKE '%Inteligencia Artificial%' THEN (SELECT id FROM profiles WHERE email = 'jpa.pizarro@gmail.com' LIMIT 1)
    WHEN title LIKE '%Productividad%' THEN (SELECT id FROM profiles WHERE email = 'stephaniabilbao@gmail.com' LIMIT 1)
    WHEN title LIKE '%Tecnología%' THEN (SELECT id FROM profiles WHERE email = 'fabianignacio.tm@gmail.com' LIMIT 1)
  END
)
WHERE author_id IS NULL;
