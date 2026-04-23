# Guía de Integración: Blog con Generación de Posts con IA (Gemini)

Esta guía explica cómo integrar un blog completo con generación automática de posts usando la API gratuita de Gemini en un proyecto React existente.

## Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Configuración de Supabase](#configuración-de-supabase)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Implementación del Blog](#implementación-del-blog)
5. [Edge Function con Gemini](#edge-function-con-gemini)
6. [Integración en Frontend](#integración-en-frontend)
7. [Estilos CSS](#estilos-css)
8. [Configuración de Rutas](#configuración-de-rutas)
9. [Consideraciones Importantes](#consideraciones-importantantes)
10. [Solución de Problemas](#solución-de-problemas)

---

## Requisitos Previos

### Cuentas y Servicios

- **Cuenta de Supabase**: [https://supabase.com](https://supabase.com)
- **Google AI Studio**: [https://aistudio.google.com](https://aistudio.google.com) (para obtener API key de Gemini)
- **Proyecto React existente** con Vite

### Dependencias Necesarias

```bash
npm install @supabase/supabase-js @tanstack/react-query react-router-dom
```

---

## Configuración de Supabase

### 1. Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Copia la URL y la anon key del proyecto

### 2. Crear Tabla `posts`

Ejecuta este SQL en el SQL Editor de Supabase:

```sql
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

-- Crear índice para búsquedas por slug
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_published ON posts(published);
CREATE INDEX idx_posts_status ON posts(status);
```

### 3. Configurar Row Level Security (RLS)

```sql
-- Habilitar RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede ver posts publicados
CREATE POLICY "Posts públicos son visibles para todos"
ON posts FOR SELECT
USING (published = true);

-- Política: Usuarios autenticados pueden ver todos sus posts
CREATE POLICY "Autores pueden ver sus posts"
ON posts FOR SELECT
USING (auth.uid() = author_id);

-- Política: Solo usuarios autenticados pueden crear posts
CREATE POLICY "Solo usuarios autenticados pueden crear posts"
ON posts FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- Política: Autores pueden actualizar sus posts
CREATE POLICY "Autores pueden actualizar sus posts"
ON posts FOR UPDATE
USING (auth.uid() = author_id);

-- Política: Autores pueden eliminar sus posts
CREATE POLICY "Autores pueden eliminar sus posts"
ON posts FOR DELETE
USING (auth.uid() = author_id);
```

### 4. Crear Usuario de Administración

1. Ve a Authentication → Users
2. Crea un nuevo usuario con email y contraseña
3. Este usuario será el administrador del blog

---

## Estructura del Proyecto

Crea la siguiente estructura de archivos en tu proyecto React:

```
src/
├── components/
│   ├── LoginForm.tsx              # Formulario de autenticación
│   └── blog/
│       └── PostCard.tsx          # Tarjeta de post para lista
├── hooks/
│   └── blog/
│       ├── index.ts              # Export de hooks
│       ├── useGetPosts.ts        # Hook para obtener posts
│       ├── useGetPostBySlug.ts   # Hook para obtener post por slug
│       └── useCreatePost.ts      # Hook para crear posts
├── lib/
│   └── supabaseClient.ts         # Cliente de Supabase
├── pages/
│   └── blog/
│       ├── Blog.css              # Estilos del blog
│       ├── BlogList.tsx          # Lista de posts
│       ├── BlogPost.tsx          # Vista individual de post
│       └── BlogAdmin.tsx         # Panel de administración
├── types/
│   └── database.types.ts         # Tipos TypeScript de Supabase
└── App.tsx                       # Rutas del blog
```

---

## Implementación del Blog

### 1. Cliente de Supabase

**Archivo**: `src/lib/supabaseClient.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const supabaseUrl = 'https://tu-proyecto.supabase.co'
const supabaseAnonKey = 'tu-anon-key-de-supabase'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

### 2. Generar Tipos de Supabase

```bash
npx supabase gen types typescript --project-id tu-project-id > src/types/database.types.ts
```

### 3. Hooks de React Query

**Archivo**: `src/hooks/blog/index.ts`

```typescript
export { useGetPosts } from './useGetPosts'
export { useGetPostBySlug } from './useGetPostBySlug'
export { useCreatePost } from './useCreatePost'
```

**Archivo**: `src/hooks/blog/useGetPosts.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'

export function useGetPosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:author_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('published', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}
```

**Archivo**: `src/hooks/blog/useGetPostBySlug.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'

export function useGetPostBySlug(slug: string) {
  return useQuery({
    queryKey: ['post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!slug,
  })
}
```

**Archivo**: `src/hooks/blog/useCreatePost.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient'
import type { TablesInsert } from '../../types/database.types'

type PostInsert = TablesInsert<'posts'>

export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (post: Omit<PostInsert, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('posts')
        .insert(post)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}
```

### 4. Componente LoginForm

**Archivo**: `src/components/LoginForm.tsx`

```typescript
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import '../pages/blog/Blog.css'

interface LoginFormProps {
  onLoginSuccess?: (token: string) => void
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      const accessToken = data.session?.access_token
      if (accessToken) {
        setIsAuthenticated(true)
        onLoginSuccess?.(accessToken)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsAuthenticated(false)
    onLoginSuccess?.('')
  }

  return (
    <div className="login-container">
      <h2>Iniciar Sesión</h2>
      {!isAuthenticated ? (
        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="login-error">{error}</div>}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      ) : (
        <div className="token-display">
          <h3>✅ Sesión iniciada correctamente</h3>
          <button onClick={handleLogout} className="btn btn-outline">
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
```

### 5. Componente PostCard

**Archivo**: `src/components/blog/PostCard.tsx`

```typescript
import { Link } from 'react-router-dom'

interface PostCardProps {
  post: {
    id: string
    title: string
    excerpt: string
    slug: string
    created_at: string
    image_url?: string
  }
}

export function PostCard({ post }: PostCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <article className="post-card">
      {post.image_url && (
        <img src={post.image_url} alt={post.title} className="post-card-image" />
      )}
      <div className="post-card-content">
        <h3 className="post-card-title">
          <Link to={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        <p className="post-card-excerpt">{post.excerpt}</p>
        <div className="post-card-meta">
          <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
        </div>
      </div>
    </article>
  )
}
```

### 6. Página BlogList

**Archivo**: `src/pages/blog/BlogList.tsx`

```typescript
import { useGetPosts } from '../../hooks/blog'
import { PostCard } from '../../components/blog/PostCard'
import './Blog.css'

export function BlogList() {
  const { data: posts, isLoading, error } = useGetPosts()

  if (isLoading) return <div className="blog-container">Cargando posts...</div>
  if (error) return <div className="blog-container">Error al cargar posts</div>

  return (
    <div className="blog-container">
      <h1 className="blog-title">Blog</h1>
      <div className="posts-grid">
        {posts?.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}
```

### 7. Página BlogPost

**Archivo**: `src/pages/blog/BlogPost.tsx`

```typescript
import { useParams } from 'react-router-dom'
import { useGetPostBySlug } from '../../hooks/blog'
import './Blog.css'

export function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const { data: post, isLoading, error } = useGetPostBySlug(slug || '')

  if (isLoading) return <div className="blog-container">Cargando post...</div>
  if (error) return <div className="blog-container">Error al cargar post</div>
  if (!post) return <div className="blog-container">Post no encontrado</div>

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="blog-container">
      <article className="blog-post">
        <h1 className="blog-post-title">{post.title}</h1>
        <div className="blog-post-meta">
          <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
        </div>
        {post.image_url && (
          <img src={post.image_url} alt={post.title} className="blog-post-image" />
        )}
        <div className="blog-post-content">
          {post.content.split('\n').map((paragraph, index) => {
            if (paragraph.startsWith('# ')) {
              return <h2 key={index}>{paragraph.slice(2)}</h2>
            }
            if (paragraph.startsWith('## ')) {
              return <h3 key={index}>{paragraph.slice(3)}</h3>
            }
            if (paragraph.startsWith('- ')) {
              return <li key={index}>{paragraph.slice(2)}</li>
            }
            if (paragraph.trim()) {
              return <p key={index}>{paragraph}</p>
            }
            return null
          })}
        </div>
      </article>
    </div>
  )
}
```

### 8. Página BlogAdmin

**Archivo**: `src/pages/blog/BlogAdmin.tsx`

```typescript
import { useState } from 'react'
import { useCreatePost } from '../../hooks/blog'
import { supabase } from '../../lib/supabaseClient'
import { LoginForm } from '../../components/LoginForm'
import './Blog.css'

export function BlogAdmin() {
  const [jwtToken, setJwtToken] = useState('')
  const [showAiGenerator, setShowAiGenerator] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [aiKeywords, setAiKeywords] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    image_url: '',
    published: false,
  })
  const createPost = useCreatePost()

  const handleAiGenerate = async () => {
    if (!jwtToken) {
      alert('Debes iniciar sesión para generar posts con IA')
      return
    }

    setAiLoading(true)
    setAiError('')

    try {
      const keywordsArray = aiKeywords.split(',').map(k => k.trim()).filter(k => k)
      
      const response = await fetch(
        'https://tu-proyecto.supabase.co/functions/v1/auto-generate-post',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer tu-anon-key`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: aiTopic || 'Tecnología y Aprendizaje de Idiomas',
            keywords: keywordsArray,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al generar post')
      }

      const data = await response.json()
      
      setFormData({
        title: data.post.title,
        slug: data.post.slug,
        content: data.post.content,
        excerpt: data.post.excerpt || '',
        image_url: '',
        published: false,
      })

      alert('Post generado exitosamente con IA')
      setShowAiGenerator(false)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Error al generar post')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    createPost.mutate(formData, {
      onSuccess: () => {
        alert('Post creado exitosamente')
        setFormData({
          title: '',
          slug: '',
          content: '',
          excerpt: '',
          image_url: '',
          published: false,
        })
      },
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="blog-container">
      <h1 className="blog-title">Panel de Administración - Blog</h1>
      
      {/* Autenticación */}
      <div className="blog-section">
        <h2>Autenticación</h2>
        <LoginForm onLoginSuccess={setJwtToken} />
      </div>

      {/* Generador de IA */}
      {jwtToken && (
        <div className="blog-section">
          <h2>Generador de Posts con IA</h2>
          {!showAiGenerator ? (
            <button onClick={() => setShowAiGenerator(true)} className="btn btn-primary">
              ✨ Generar Post con IA
            </button>
          ) : (
            <div className="ai-generator-form">
              <div className="form-group">
                <label htmlFor="aiTopic">Temática del post</label>
                <input
                  type="text"
                  id="aiTopic"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Ej: La importancia de estudiar idiomas"
                />
              </div>
              <div className="form-group">
                <label htmlFor="aiKeywords">Palabras clave (separadas por comas)</label>
                <input
                  type="text"
                  id="aiKeywords"
                  value={aiKeywords}
                  onChange={(e) => setAiKeywords(e.target.value)}
                  placeholder="Ej: idiomas, educación, aprendizaje"
                />
              </div>
              {aiError && <div className="blog-error">{aiError}</div>}
              <button onClick={handleAiGenerate} className="btn btn-primary" disabled={aiLoading}>
                {aiLoading ? 'Generando...' : 'Generar Post'}
              </button>
              <button onClick={() => setShowAiGenerator(false)} className="btn btn-outline">
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Formulario Manual */}
      {jwtToken && (
        <div className="blog-section">
          <h2>Crear Post Manualmente</h2>
          <form className="blog-admin-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">Título</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Título del post"
              />
            </div>
            <div className="form-group">
              <label htmlFor="slug">Slug</label>
              <input
                type="text"
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                required
                placeholder="url-slug-amigable"
              />
            </div>
            <div className="form-group">
              <label htmlFor="excerpt">Excerpt</label>
              <textarea
                id="excerpt"
                name="excerpt"
                value={formData.excerpt}
                onChange={handleChange}
                placeholder="Resumen breve del post"
                rows={3}
              />
            </div>
            <div className="form-group">
              <label htmlFor="content">Contenido (Markdown)</label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                required
                placeholder="Contenido del post en formato Markdown"
                rows={10}
              />
            </div>
            <div className="form-group">
              <label htmlFor="image_url">URL de imagen (opcional)</label>
              <input
                type="url"
                id="image_url"
                name="image_url"
                value={formData.image_url}
                onChange={handleChange}
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            </div>
            <div className="form-group checkbox-group">
              <input
                type="checkbox"
                id="published"
                name="published"
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
              />
              <label htmlFor="published">Publicar inmediatamente</label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={createPost.isPending}>
              {createPost.isPending ? 'Creando...' : 'Crear Post'}
            </button>
          </form>
          {createPost.isError && (
            <div className="blog-error">
              Error al crear el post: {createPost.error.message}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## Edge Function con Gemini

### 1. Crear Edge Function

Crea el archivo `supabase/functions/auto-generate-post/index.ts`:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface PostGenerationRequest {
  topic?: string;
  keywords?: string[];
}

interface GeneratedPost {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  seo_metadata: {
    meta_description: string;
    meta_keywords: string;
    og_title?: string;
    og_description?: string;
  };
}

Deno.serve(async (req: Request) => {
  // Manejar CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  try {
    // Validar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      )
    }

    // Obtener API Key de Gemini desde variables de entorno
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Parsear el cuerpo de la solicitud
    const body: PostGenerationRequest = await req.json();
    const { topic = 'Tecnología y Aprendizaje de Idiomas', keywords = [] } = body;

    // System prompt optimizado para SEO y generación de contenido enriquecido
    const systemPrompt = `Eres un experto en creación de contenido para un blog sobre Tecnología y Aprendizaje de Idiomas. Tu tarea es generar artículos de alta calidad optimizados para SEO.

INSTRUCCIONES:
1. Genera un artículo completo y bien estructurado en formato Markdown
2. El contenido debe ser original, informativo y valioso para el lector
3. Incluye encabezados (H2, H3), listas, y elementos de formato Markdown
4. Optimiza el contenido para motores de búsqueda con palabras clave naturales
5. Crea un excerpt atractivo que resuma el artículo en 1-2 oraciones
6. Genera metadatos SEO efectivos

FORMATO DE RESPUESTA JSON:
{
  "title": "Título SEO-friendly (60-70 caracteres)",
  "slug": "url-slug-amigable-en-minusculas-con-guiones",
  "content": "Contenido completo en Markdown con encabezados, listas, negritas, etc.",
  "excerpt": "Resumen breve y atractivo del artículo (150-160 caracteres)",
  "seo_metadata": {
    "meta_description": "Descripción meta para SEO (150-160 caracteres)",
    "meta_keywords": "palabra1, palabra2, palabra3",
    "og_title": "Título optimizado para Open Graph (opcional, usa title si no se proporciona)",
    "og_description": "Descripción para redes sociales (opcional, usa meta_description si no se proporciona)"
  }
}

TEMÁTICA PRINCIPAL: ${topic}
PALABRAS CLAVE SUGERIDAS: ${keywords.join(', ') || 'tecnología, aprendizaje, idiomas, educación, IA'}`;

    // Llamada a la API de Gemini 2.0 Flash
    let geminiResponse: Response;
    try {
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: systemPrompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            }
          })
        }
      );
    } catch (fetchError) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to call Gemini API', 
          details: fetchError instanceof Error ? fetchError.message : String(fetchError),
          step: 'fetch'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error('Gemini API error:', errorData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate content with Gemini', 
          details: errorData,
          status: geminiResponse.status,
          statusText: geminiResponse.statusText
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates[0].content.parts[0].text;
    
    // Limpiar el formato markdown si está presente
    let cleanText = generatedText;
    if (generatedText.includes('```json')) {
      cleanText = generatedText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (generatedText.includes('```')) {
      cleanText = generatedText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    
    // Parsear la respuesta JSON de Gemini
    let generatedPost: GeneratedPost;
    try {
      generatedPost = JSON.parse(cleanText);
    } catch {
      console.error('Failed to parse Gemini response as JSON:', cleanText);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON response from Gemini' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Validar campos requeridos
    if (!generatedPost.title || !generatedPost.slug || !generatedPost.content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields in generated post' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Completar metadatos opcionales si no están presentes
    if (!generatedPost.seo_metadata) {
      generatedPost.seo_metadata = {
        meta_description: generatedPost.excerpt || '',
        meta_keywords: keywords.join(', ') || 'tecnología, aprendizaje, idiomas'
      };
    }
    if (!generatedPost.seo_metadata.og_title) {
      generatedPost.seo_metadata.og_title = generatedPost.title;
    }
    if (!generatedPost.seo_metadata.og_description) {
      generatedPost.seo_metadata.og_description = generatedPost.seo_metadata.meta_description;
    }

    // Insertar el post en Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase credentials not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const supabaseResponse = await fetch(
      `${supabaseUrl}/rest/v1/posts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          title: generatedPost.title,
          slug: generatedPost.slug,
          content: generatedPost.content,
          excerpt: generatedPost.excerpt,
          status: 'draft',
          published: false,
          seo_metadata: generatedPost.seo_metadata,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    );

    if (!supabaseResponse.ok) {
      const errorData = await supabaseResponse.text();
      console.error('Supabase insert error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to insert post into database', details: errorData }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const insertedPost = await supabaseResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Post generated and saved successfully',
        post: insertedPost[0]
      }),
      { status: 201, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
```

### 2. Configurar Deno

Crea el archivo `supabase/functions/auto-generate-post/deno.json`:

```json
{
  "compilerOptions": {
    "allowJs": true,
    "lib": ["deno.window"],
    "strict": true
  },
  "imports": {
    "supabase": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

### 3. Configurar Secrets en Supabase

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Navega a **Edge Functions** → **Settings**
4. Agrega las siguientes variables de entorno:

| Variable | Valor |
|----------|------|
| `GEMINI_API_KEY` | Tu API key de Google AI Studio |
| `SUPABASE_URL` | URL de tu proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de tu proyecto |

### 4. Deshabilitar JWT Verification

1. En **Edge Functions**, haz clic en la función `auto-generate-post`
2. Ve a **Settings**
3. Deshabilita **JWT Verification** (cámbiala a `false`)

### 5. Desplegar la Edge Function

```bash
npx supabase login
npx supabase functions deploy auto-generate-post
```

---

## Integración en Frontend

### 1. Configurar React Query Provider

En tu `main.tsx` o `App.tsx`:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

// En tu componente App:
<QueryClientProvider client={queryClient}>
  <BrowserRouter>
    <Routes>
      {/* tus rutas */}
    </Routes>
  </BrowserRouter>
</QueryClientProvider>
```

---

## Estilos CSS

**Archivo**: `src/pages/blog/Blog.css`

```css
.blog-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.blog-title {
  font-size: 2rem;
  margin-bottom: 2rem;
  color: #333;
}

.blog-section {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.blog-section h2 {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: #333;
}

/* Login Form Styles */
.login-container {
  max-width: 400px;
  margin: 0 auto;
}

.login-container h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #333;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-error {
  background: #fee;
  color: #c33;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.token-display {
  text-align: center;
}

.token-display h3 {
  color: #28a745;
  margin-bottom: 1rem;
}

/* AI Generator Styles */
.ai-generator-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Blog Admin Form Styles */
.blog-admin-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 0.9rem;
}

.form-group input,
.form-group textarea {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.checkbox-group {
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.checkbox-group label {
  margin: 0;
  font-weight: normal;
}

/* Button Styles */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-block;
  text-align: center;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
}

.btn-outline {
  background: transparent;
  color: #007bff;
  border: 2px solid #007bff;
}

.btn-outline:hover:not(:disabled) {
  background: #007bff;
  color: white;
}

.btn-full {
  width: 100%;
}

/* Error Styles */
.blog-error {
  background: #fee;
  color: #c33;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
  border-left: 4px solid #c33;
}

/* Posts Grid */
.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
}

/* Post Card */
.post-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.post-card:hover {
  transform: translateY(-4px);
}

.post-card-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.post-card-content {
  padding: 1.5rem;
}

.post-card-title {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
}

.post-card-title a {
  color: #333;
  text-decoration: none;
}

.post-card-title a:hover {
  color: #007bff;
}

.post-card-excerpt {
  color: #666;
  margin-bottom: 1rem;
  line-height: 1.6;
}

.post-card-meta {
  color: #999;
  font-size: 0.875rem;
}

/* Blog Post */
.blog-post {
  max-width: 800px;
  margin: 0 auto;
}

.blog-post-title {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #333;
}

.blog-post-meta {
  color: #666;
  margin-bottom: 2rem;
}

.blog-post-image {
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.blog-post-content {
  line-height: 1.8;
  color: #333;
}

.blog-post-content h2 {
  font-size: 1.75rem;
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: #333;
}

.blog-post-content h3 {
  font-size: 1.5rem;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: #333;
}

.blog-post-content p {
  margin-bottom: 1rem;
}

.blog-post-content ul {
  margin-bottom: 1rem;
  padding-left: 2rem;
}

.blog-post-content li {
  margin-bottom: 0.5rem;
}
```

---

## Configuración de Rutas

En tu `App.tsx`, agrega las rutas del blog:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { BlogList } from './pages/blog/BlogList'
import { BlogPost } from './pages/blog/BlogPost'
import { BlogAdmin } from './pages/blog/BlogAdmin'

// En tu componente App:
<BrowserRouter>
  <Routes>
    {/* tus rutas existentes */}
    <Route path="/blog" element={<BlogList />} />
    <Route path="/blog/:slug" element={<BlogPost />} />
    <Route path="/blog/admin" element={<BlogAdmin />} />
  </Routes>
</BrowserRouter>
```

---

## Consideraciones Importantes

### 1. Modelo de Gemini

- **Modelo recomendado**: `gemini-2.0-flash` (más estable en capa gratuita)
- **No usar**: `responseFormat` en el payload (no es válido en la API)
- **Limpiar formato**: Gemini devuelve JSON envuelto en ```json ... ```, limpiar antes de parsear

### 2. Rate Limits de Gemini (Capa Gratuita)

- **15 solicitudes/minuto**
- **1,500 solicitudes/día**
- Si recibes error 429, espera ~20 segundos antes de reintentar

### 3. CORS

- Es necesario para llamadas desde el navegador
- La Edge Function debe manejar solicitudes OPTIONS
- Headers CORS en todas las respuestas

### 4. JWT Verification

- Deshabilitar en Edge Function o usar service role key
- Usar anon key en el frontend para simplificar

### 5. Seguridad

- Nunca exponer API keys en el código frontend
- Usar variables de entorno en Edge Functions
- Configurar RLS en Supabase para proteger datos

---

## Solución de Problemas

### Error 405 Method Not Allowed

**Causa**: La Edge Function no maneja solicitudes OPTIONS (CORS)

**Solución**: Agregar manejo de OPTIONS en la Edge Function

### Error 401 Unauthorized

**Causa**: JWT verification está habilitado pero el token no es válido

**Solución**: Deshabilitar JWT verification en la Edge Function

### Error 400 Bad Request - responseFormat

**Causa**: `responseFormat` no es un campo válido en la API de Gemini

**Solución**: Eliminar el campo `responseFormat` del payload

### Error 429 Quota Exceeded

**Causa**: Se excedió el límite de tasa de Gemini

**Solución**: Esperar ~20 segundos antes de reintentar

### Error 503 Service Unavailable

**Causa**: El modelo de Gemini está experimentando alta demanda

**Solución**: Intentar con un modelo diferente (ej: `gemini-2.0-flash` en lugar de `gemini-2.5-flash`)

### Error Invalid JSON response

**Causa**: Gemini devuelve JSON envuelto en bloques de código markdown

**Solución**: Limpiar el formato markdown antes de parsear JSON

---

## Migración a Groq (Recomendado)

Debido a limitaciones de cuota en Gemini y requisitos de créditos en xAI, se recomienda usar **Groq** como proveedor de IA. Groq ofrece una API gratuita y compatible con OpenAI.

### Por qué migrar a Groq

- **Gemini**: Límites de cuota estrictos (15 req/min, 1500 req/día)
- **xAI**: Requiere compra de créditos
- **Groq**: API gratuita, compatible con OpenAI, alta velocidad

### Configuración de Groq

1. **Obtener API Key**:
   - Ve a [https://console.groq.com/](https://console.groq.com/)
   - Crea una cuenta gratuita
   - Genera una API key en la sección de API Keys

2. **Actualizar Edge Function**:

   ```typescript
   // Cambiar el endpoint y el modelo
   const groqResponse = await fetch(
     'https://api.groq.com/openai/v1/chat/completions',
     {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${GROQ_API_KEY}`,
       },
       body: JSON.stringify({
         model: 'llama-3.3-70b-versatile',
         messages: [
           { role: 'system', content: systemPrompt },
           { role: 'user', content: 'Generate the blog post' }
         ],
         temperature: 0.7,
         max_tokens: 8192,
       })
     }
   )
   ```

3. **Configurar variable de entorno**:
   - En Supabase Edge Functions Settings
   - Agregar `GROQ_API_KEY` con tu API key de Groq

4. **Actualizar frontend**:
   - Cambiar el modelo en BlogAdmin.tsx a `llama-3.3-70b-versatile`

---

## Problemas Comunes y Soluciones (Implementación Real)

### Problema 1: Modelo descomisionado

**Error**: `The model llama-3.1-70b-versatile has been decommissioned`

**Causa**: Groq descontinuó el modelo `llama-3.1-70b-versatile`

**Solución**: Actualizar al modelo actual `llama-3.3-70b-versatile` en:
- Edge Function (línea de model)
- Frontend (BlogAdmin.tsx)

### Problema 2: Post no visible en /blog

**Causa**: La Edge Function estaba en modo temporal, solo devolvía contenido sin insertar en Supabase

**Solución**: Activar la lógica de inserción en Supabase en la Edge Function

### Problema 3: Foreign key constraint (author_id)

**Error**: `insert or update on table "posts" violates foreign key constraint "posts_author_id_fkey"`

**Causa**: Faltaba el `author_id` durante la inserción en Supabase

**Solución inicial**: Intentar extraer `user_id` del JWT token en la Edge Function
**Problema**: Requiere configurar `SUPABASE_JWT_SECRET` en Edge Functions

**Solución final**: 
- Recibir `user_id` directamente del body de la solicitud en la Edge Function
- Enviar `user_id` desde el frontend después de autenticar al usuario

```typescript
// Edge Function
const body: PostGenerationRequest = await req.json();
const { topic, keywords, user_id } = body;

// Frontend
const { data: { user } } = await supabase.auth.getUser()
body: JSON.stringify({
  topic: aiTopic,
  keywords: keywordsArray,
  user_id: user.id,
})
```

### Problema 4: Error 500 Internal Server Error

**Causa**: Variables de entorno mal configuradas en Edge Functions

**Solución**: Agregar logging detallado en la Edge Function para identificar el error específico

```typescript
if (!supabaseResponse.ok) {
  const errorData = await supabaseResponse.text();
  console.error('Supabase error:', errorData);
  console.error('Status:', supabaseResponse.status);
  return new Response(
    JSON.stringify({ 
      error: 'Failed to insert post in Supabase', 
      details: errorData,
      status: supabaseResponse.status,
      statusText: supabaseResponse.statusText,
      step: 'supabase_insert'
    }),
    { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
  );
}
```

### Problema 5: Incapacidad para editar SUPABASE_URL en Supabase

**Causa**: Supabase no permite editar ciertas variables de entorno predefinidas

**Solución**: Hardcodear la URL directamente en la Edge Function

```typescript
const SUPABASE_URL = 'https://wetylukxmckpydsmcveb.supabase.co';
```

### Problema 6: Nombre de variable con prefijo SUPABASE_

**Error**: `Name must not start with the SUPABASE_ prefix`

**Causa**: Supabase Edge Functions no permite variables con el prefijo `SUPABASE_`

**Solución**: Cambiar el nombre de la variable sin el prefijo

```typescript
// Antes
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Después
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY');
```

Configurar en Edge Functions Settings: `SERVICE_ROLE_KEY` (sin prefijo)

### Problema 7: Error de inserción en Supabase desde Edge Function

**Causa**: Dificultad con configuración de variables de entorno y service role key

**Solución**: Cambiar el enfoque - Edge Function solo genera contenido, Frontend guarda en Supabase

```typescript
// Edge Function - Solo generar y devolver
return new Response(
  JSON.stringify({
    success: true,
    message: 'Post generated successfully',
    post: generatedPost
  }),
  { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
);

// Frontend - Guardar en Supabase
createPost.mutate({
  title: generatedPost.title,
  slug: generatedPost.slug,
  content: generatedPost.content,
  excerpt: generatedPost.excerpt || null,
  image_url: null,
  published: false,
  author_id: authorId
})
```

### Problema 8: Perfil no existe

**Error**: `insert or update on table "posts" violates foreign key constraint "posts_author_id_fkey"`

**Causa**: El usuario autenticado no tiene un registro en la tabla `profiles`

**Solución**: Crear el perfil automáticamente si no existe

```typescript
// Get or create profile
let { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('id', user.id)
  .single()

// Create profile if it doesn't exist
if (!profile) {
  const { error: insertError } = await supabase
    .from('profiles')
    .insert({ id: user.id })
    .select()
    .single()
  
  if (insertError) {
    throw new Error('Error al crear perfil de usuario')
  }
  
  profile = { id: user.id }
}
```

### Problema 9: Slug duplicado

**Error**: `duplicate key value violates unique constraint "posts_slug_key"`

**Causa**: La IA genera el mismo slug para posts similares

**Solución**: Agregar timestamp al slug para garantizar unicidad

```typescript
const timestamp = Date.now()
const uniqueSlug = `${generatedPost.slug}-${timestamp}`

createPost.mutate({
  title: generatedPost.title,
  slug: uniqueSlug,
  // ...
})
```

### Problema 10: Renderizado de Markdown

**Causa**: El contenido generado por IA está en formato Markdown pero se muestra como texto plano

**Solución**: Instalar y usar `react-markdown`

```bash
npm install react-markdown
```

```typescript
import ReactMarkdown from 'react-markdown'

// En BlogPost.tsx
<div className="blog-post-content">
  <ReactMarkdown>{post.content}</ReactMarkdown>
</div>
```

### Problema 11: Falta de enlace Blog en navegación

**Causa**: El menú de navegación no incluía el enlace al blog

**Solución**: Agregar enlace Blog al menú de navegación en App.tsx

```typescript
<nav className="nav">
  <a href="#cursos">Cursos</a>
  <a href="#nosotros">Nosotros</a>
  <a href="/blog">Blog</a>
  <a href="#contacto">Contacto</a>
</nav>
```

---

## Recomendaciones Finales

1. **Usar Groq** como proveedor de IA (gratuito y estable)
2. **Edge Function solo genera**, Frontend guarda en Supabase (evita problemas de configuración)
3. **Crear perfil automáticamente** si no existe
4. **Usar timestamp en slug** para evitar duplicados
5. **Renderizar Markdown** con react-markdown
6. **Agregar Blog a navegación** principal
7. **Hardcodear SUPABASE_URL** si no se puede configurar
8. **Evitar prefijo SUPABASE_** en variables de entorno

---

## Comandos Útiles

```bash
# Instalar dependencias
npm install @supabase/supabase-js @tanstack/react-query react-router-dom

# Generar tipos de Supabase
npx supabase gen types typescript --project-id tu-project-id > src/types/database.types.ts

# Login en Supabase CLI
npx supabase login

# Desplegar Edge Function
npx supabase functions deploy auto-generate-post

# Ver logs de Edge Function
npx supabase functions logs auto-generate-post
```

---

## Flujo Completo de Uso

1. **Usuario visita `/blog/admin`**
2. **Inicia sesión** con Supabase Auth (email/password)
3. **JWT token** se guarda en estado
4. **Genera post con IA**:
   - Ingresa temática y palabras clave
   - Llama a Edge Function
   - Edge Function llama a Gemini API
   - Gemini genera contenido optimizado SEO
   - Edge Function inserta en Supabase con `status: 'draft'`
   - Formulario se llena con contenido generado
5. **Edita y publica** manualmente si es necesario
6. **Post aparece** en `/blog` cuando `published: true`

---

## Resumen

Esta guía proporciona una implementación completa de un blog con generación automática de posts usando la API gratuita de Gemini. La integración incluye:

- ✅ Backend con Supabase (base de datos + Edge Functions)
- ✅ Frontend con React + React Query
- ✅ Autenticación con Supabase Auth
- ✅ Generación de contenido con Gemini 2.0 Flash
- ✅ Optimización SEO automática
- ✅ Sistema de posts con estado (draft/published)
- ✅ Panel de administración
- ✅ Estilos CSS completos

Para implementar en otro proyecto, sigue los pasos en orden y adapta los nombres de archivos y rutas según tu estructura existente.
