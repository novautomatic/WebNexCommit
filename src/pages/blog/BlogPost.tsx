import { useParams, Link } from 'react-router-dom';
import { useGetPostBySlug } from '../../hooks/blog';
import ReactMarkdown from 'react-markdown';
import { Helmet } from 'react-helmet-async';

export function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, error } = useGetPostBySlug(slug || '');

  if (isLoading) {
    return (
      <div className="container py-32 flex items-center justify-center min-h-screen">
        <div className="text-white text-xl animate-pulse">Cargando post...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container py-32 flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Post no encontrado</div>
        <Link to="/blog" className="text-brand-light ml-4">
          Volver al blog
        </Link>
      </div>
    );
  }

  const formatDate = new Date(post.created_at).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <Helmet>
        <title>{post.title} | NexCommit Blog</title>
        <meta name="description" content={post.seo_metadata?.meta_description || post.excerpt || post.content.slice(0, 160)} />
        <meta name="keywords" content={post.seo_metadata?.meta_keywords || 'desarrollo, automatización, diseño digital, NexCommit, blog'} />
        <meta property="og:title" content={post.seo_metadata?.og_title || post.title} />
        <meta property="og:description" content={post.seo_metadata?.og_description || post.seo_metadata?.meta_description || post.excerpt || post.content.slice(0, 160)} />
        <meta property="og:type" content="article" />
        {post.image_url && <meta property="og:image" content={post.image_url} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.seo_metadata?.og_title || post.title} />
        <meta name="twitter:description" content={post.seo_metadata?.og_description || post.seo_metadata?.meta_description || post.excerpt || post.content.slice(0, 160)} />
        {post.image_url && <meta name="twitter:image" content={post.image_url} />}
      </Helmet>
      <div className="pb-20">
        <div className="container">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-brand-muted hover:text-white transition-colors mb-8 group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            Volver al blog
          </Link>

          <article className="max-w-4xl mx-auto">
            {/* Hero Image with gradient overlay */}
            {post.image_url && (
              <div className="relative mb-8 rounded-3xl overflow-hidden">
                <img
                  src={post.image_url}
                  alt={post.title}
                  className="w-full h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              </div>
            )}

            {/* Title with gradient */}
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-brand-light to-brand-accent bg-clip-text text-transparent">
              {post.title}
            </h1>

            {/* Author and date info with better styling */}
            <div className="flex flex-wrap items-center gap-4 mb-8 p-4 rounded-2xl glass-dark border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-light to-brand-accent flex items-center justify-center text-sm font-bold text-white shadow-lg">
                  {post.profiles?.username?.charAt(0) || 'A'}
                </div>
                <div>
                  <div className="text-white font-medium">{post.profiles?.username || 'Autor'}</div>
                  <div className="text-xs text-brand-muted">Autor</div>
                </div>
              </div>
              <div className="w-px h-8 bg-white/20"></div>
              <div className="flex items-center gap-2 text-brand-muted">
                <span className="text-lg">📅</span>
                <time dateTime={post.created_at} className="font-medium">{formatDate}</time>
              </div>
              <div className="w-px h-8 bg-white/20"></div>
              <div className="flex items-center gap-2 text-brand-muted">
                <span className="text-lg">⏱️</span>
                <span className="font-medium">{Math.ceil(post.content.length / 1000)} min lectura</span>
              </div>
            </div>

            {/* Excerpt with better styling */}
            {post.excerpt && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-brand-light/10 to-brand-accent/10 border border-brand-light/30 mb-8">
                <p className="text-xl text-white leading-relaxed font-medium">{post.excerpt}</p>
              </div>
            )}

            {/* Content with improved styling */}
            <div className="prose prose-invert prose-lg max-w-none">
              <div className="prose-headings:text-white prose-headings:font-bold prose-headings:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-brand-muted prose-a:text-brand-light prose-a:no-underline hover:prose-a:underline prose-strong:text-white prose-code:text-brand-light prose-pre:bg-glass-dark prose-pre:border-white/10 prose-blockquote:border-brand-light/30 prose-blockquote:bg-brand-light/10 prose-blockquote:text-white prose-ul:text-brand-muted prose-ol:text-brand-muted prose-li:text-brand-muted prose-li:mb-3">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p style={{ marginBottom: '1.5rem', lineHeight: '2' }}>{children}</p>,
                    li: ({ children }) => <li style={{ marginBottom: '0.5rem' }}>{children}</li>,
                    ul: ({ children }) => <ul style={{ marginBottom: '1.5rem' }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ marginBottom: '1.5rem' }}>{children}</ol>,
                    h2: ({ children }) => <h2 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '2rem', fontWeight: 'bold' }}>{children}</h2>,
                    h3: ({ children }) => <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.5rem', fontWeight: 'bold' }}>{children}</h3>,
                  }}
                >
                  {post.content}
                </ReactMarkdown>
              </div>
            </div>

            {/* Share section */}
            <div className="mt-12 p-6 rounded-2xl glass-dark border border-white/10">
              <h3 className="text-lg font-bold text-white mb-4">📢 Compartir este post</h3>
              <div className="flex gap-2">
                <button className="flex-1 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-all">
                  Twitter
                </button>
                <button className="flex-1 px-4 py-2 rounded-xl bg-blue-600/20 border border-blue-600/30 text-blue-400 hover:bg-blue-600/30 transition-all">
                  LinkedIn
                </button>
                <button className="flex-1 px-4 py-2 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-all">
                  WhatsApp
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
