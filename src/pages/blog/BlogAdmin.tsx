import { useState } from 'react';
import { useCreatePost } from '../../hooks/blog';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../components/AuthContext';
import { useNavigate } from 'react-router-dom';

export function BlogAdmin() {
  const { user, logout } = useAuth() || { user: null, logout: () => {} };
  const navigate = useNavigate();
  const createPost = useCreatePost();
  const [showAiGenerator, setShowAiGenerator] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiKeywords, setAiKeywords] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    image_url: '',
    published: false,
    status: 'draft',
  });

  if (!user) {
    return (
      <div className="container py-32 flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Debes iniciar sesión para acceder al panel de administración</div>
      </div>
    );
  }

  const generateSlug = () => {
    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setFormData({ ...formData, slug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert('Debes estar autenticado para crear posts');
      return;
    }

    createPost.mutate(
      {
        title: formData.title,
        slug: formData.slug,
        content: formData.content,
        excerpt: formData.excerpt || undefined,
        image_url: formData.image_url || undefined,
        published: formData.published,
        status: formData.status,
      },
      {
        onSuccess: () => {
          alert('Post creado exitosamente');
          setFormData({
            title: '',
            slug: '',
            content: '',
            excerpt: '',
            image_url: '',
            published: false,
            status: 'draft',
          });
        },
      }
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleAiGenerate = async () => {
    if (!user) {
      alert('Debes iniciar sesión para generar posts con IA');
      return;
    }

    setAiLoading(true);
    setAiError('');

    try {
      const keywordsArray = aiKeywords.split(',').map(k => k.trim()).filter(k => k);

      const response = await fetch(
        'https://rhifvtrzetamrfhflfzw.supabase.co/functions/v1/auto-generate-post',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoaWZ2dHJ6ZXRhbXJmaGZsZnp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDIzOTEsImV4cCI6MjA5MTkxODM5MX0.BDmWZeePQyIqTPquqwNbRmAMYvLu5-DEPL7feIamA-k',
          },
          body: JSON.stringify({
            topic: aiTopic || 'Tecnología y Desarrollo',
            keywords: keywordsArray,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar post');
      }

      const data = await response.json();
      const generatedPost = data.post;

      // Get or create profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .single();

      const authorId = profile?.id || user.id;

      // Generate slug from title with random suffix
      const titleSlug = generatedPost.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const uniqueSlug = `${titleSlug}-${randomSuffix}`;

      // Save the post to Supabase with author_id and SEO metadata
      createPost.mutate(
        {
          title: generatedPost.title,
          slug: uniqueSlug,
          content: generatedPost.content,
          excerpt: generatedPost.excerpt || '',
          image_url: '',
          published: false,
          status: 'draft',
          author_id: authorId,
          seo_metadata: generatedPost.seo_metadata || {
            meta_description: generatedPost.excerpt || '',
            meta_keywords: keywords || '',
          },
        },
        {
          onSuccess: () => {
            // Fill the form with generated content
            setFormData({
              title: generatedPost.title,
              slug: uniqueSlug,
              content: generatedPost.content,
              excerpt: generatedPost.excerpt || '',
              image_url: '',
              published: false,
              status: 'draft',
            });
            alert('Post generado y guardado exitosamente con IA');
            setShowAiGenerator(false);
          },
        }
      );
    } catch (err) {
      console.error('Error en handleAiGenerate:', err);
      setAiError(err instanceof Error ? err.message : 'Error al generar post');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="pb-20">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          {/* Header with gradient background */}
          <div className="mb-12 p-8 rounded-3xl bg-gradient-to-r from-brand-light/20 to-brand-accent/20 border border-brand-light/30">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-brand-light to-brand-accent bg-clip-text text-transparent">
                  Panel de Administración - Blog
                </h1>
                <p className="text-brand-muted">Crear y gestionar posts del blog con IA</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowAiGenerator(!showAiGenerator)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-light to-brand-accent text-white font-semibold hover:opacity-90 transition-all shadow-lg shadow-brand-light/20"
                >
                  ✨ Generar con IA
                </button>
                <button
                  onClick={() => navigate('/blog')}
                  className="px-4 py-2 rounded-xl glass-dark border-white/10 text-white hover:border-brand-light transition-all"
                >
                  Ver Blog
                </button>
                <button
                  onClick={logout}
                  className="px-4 py-2 rounded-xl glass-dark border-red-500/30 text-red-400 hover:border-red-500/50 hover:bg-red-500/10 transition-all"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>

          {/* AI Generator Section */}
          {showAiGenerator && (
            <div className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-brand-light/10 to-brand-accent/10 border border-brand-light/30 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-2xl">🤖</div>
                <h2 className="text-2xl font-bold text-white">Generador de Posts con IA</h2>
              </div>
              {aiError && <div className="p-3 mb-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400">{aiError}</div>}
              <div className="space-y-4">
                <div>
                  <label htmlFor="aiTopic" className="block text-sm font-medium text-white mb-2">
                    📝 Temática del post
                  </label>
                  <input
                    type="text"
                    id="aiTopic"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="Ej: Inteligencia Artificial en el desarrollo web"
                    className="w-full px-4 py-3 rounded-xl glass-dark border-white/10 text-white placeholder-brand-muted focus:border-brand-light focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="aiKeywords" className="block text-sm font-medium text-white mb-2">
                    🏷️ Palabras clave (separadas por comas)
                  </label>
                  <input
                    type="text"
                    id="aiKeywords"
                    value={aiKeywords}
                    onChange={(e) => setAiKeywords(e.target.value)}
                    placeholder="IA, desarrollo, tecnología, web"
                    className="w-full px-4 py-3 rounded-xl glass-dark border-white/10 text-white placeholder-brand-muted focus:border-brand-light focus:outline-none transition-colors"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAiGenerate}
                    className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-light to-brand-accent text-white font-semibold hover:opacity-90 transition-all shadow-lg shadow-brand-light/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={aiLoading}
                  >
                    {aiLoading ? '⏳ Generando...' : '🚀 Generar Post'}
                  </button>
                  <button
                    onClick={() => setShowAiGenerator(false)}
                    className="px-6 py-3 rounded-xl glass-dark border-white/10 text-white hover:border-brand-light transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form Section */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-6 rounded-3xl glass-dark border border-white/10">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-2xl">📰</div>
                  <h2 className="text-2xl font-bold text-white">Información del Post</h2>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-white mb-2">
                    🎯 Título
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                      placeholder="Título del post"
                      className="flex-1 px-4 py-3 rounded-xl glass-dark border-white/10 text-white placeholder-brand-muted focus:border-brand-light focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={generateSlug}
                      className="px-4 py-3 rounded-xl glass-dark border-white/10 text-white hover:border-brand-light transition-all"
                    >
                      🔗 Slug
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="slug" className="block text-sm font-medium text-white mb-2">
                    🔗 Slug (URL)
                  </label>
                  <input
                    type="text"
                    id="slug"
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    required
                    placeholder="url-slug-amigable"
                    className="w-full px-4 py-3 rounded-xl glass-dark border-white/10 text-white placeholder-brand-muted focus:border-brand-light focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="excerpt" className="block text-sm font-medium text-white mb-2">
                    📄 Excerpt (Resumen)
                  </label>
                  <textarea
                    id="excerpt"
                    name="excerpt"
                    value={formData.excerpt}
                    onChange={handleChange}
                    placeholder="Resumen breve del post"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl glass-dark border-white/10 text-white placeholder-brand-muted focus:border-brand-light focus:outline-none transition-colors resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-white mb-2">
                    ✍️ Contenido (Markdown)
                  </label>
                  <textarea
                    id="content"
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    required
                    placeholder="Contenido del post en formato Markdown"
                    rows={10}
                    className="w-full px-4 py-3 rounded-xl glass-dark border-white/10 text-white placeholder-brand-muted focus:border-brand-light focus:outline-none transition-colors resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="image_url" className="block text-sm font-medium text-white mb-2">
                    🖼️ URL de imagen (opcional)
                  </label>
                  <input
                    type="url"
                    id="image_url"
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleChange}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    className="w-full px-4 py-3 rounded-xl glass-dark border-white/10 text-white placeholder-brand-muted focus:border-brand-light focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl glass-dark border-white/10">
                  <input
                    type="checkbox"
                    id="published"
                    name="published"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="w-5 h-5 rounded border-white/10 bg-glass-dark text-brand-light focus:ring-brand-light"
                  />
                  <label htmlFor="published" className="text-sm text-white font-medium">
                    🌐 Publicar inmediatamente
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-brand-light to-brand-accent text-white font-bold text-lg hover:opacity-90 transition-all shadow-xl shadow-brand-light/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={createPost.isPending}
                >
                  {createPost.isPending ? '⏳ Creando...' : '💾 Crear Post'}
                </button>

                {createPost.isError && (
                  <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                    ❌ Error al crear el post: {createPost.error.message}
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
