import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const API_BASE = 'https://ut8vwhk6.functions.insforge.app';

export default function BlogIndex() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [postsRes, catsRes] = await Promise.all([
          fetch(`${API_BASE}/get-posts`),
          fetch(`${API_BASE}/get-categories`)
        ]);
        setPosts(await postsRes.json());
        setCategories(await catsRes.json());
      } catch (e) {
        console.error('Error fetching blog data:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container py-32 flex items-center justify-center min-h-screen">
        <div className="text-white text-xl animate-pulse">Cargando artículos...</div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="container">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-5xl md:text-6xl font-semibold mb-6 text-white tracking-tight">
            Nuestro <span className="text-gradient">Blog</span>
          </h1>
          <p className="text-lg text-brand-muted">
            Explora nuestros conocimientos sobre desarrollo, automatización y diseño de productos digitales.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <button className="px-4 py-1.5 rounded-full text-xs font-semibold glass-dark border-white/10 text-white hover:border-brand-light transition-colors">
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className="px-4 py-1.5 rounded-full text-xs font-semibold glass-dark border-white/10 text-brand-muted hover:text-white hover:border-brand-light transition-colors"
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.length === 0 ? (
            <div className="col-span-full text-center py-20 text-brand-muted italic">
              Aún no hay artículos publicados.
            </div>
          ) : (
            posts.map(post => (
              <article key={post.id} className="group relative overflow-hidden rounded-3xl glass-dark border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col">
                <div className="relative h-56 overflow-hidden">
                  {post.featured_image ? (
                    <img
                      src={post.featured_image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-brand/20 to-ink-soft/40 flex items-center justify-center text-white/10 text-6xl font-bold">
                      {post.title.charAt(0)}
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider glass-dark border-white/10 text-brand-light">
                      {post.category_name}
                    </span>
                  </div>
                </div>
                <div className="p-8 flex flex-col flex-grow">
                  <h3 className="text-2xl font-semibold text-white mb-3 group-hover:text-brand-light transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-brand-muted text-sm mb-6 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand-light/20 flex items-center justify-center text-[10px] font-bold text-brand-light">
                        {post.author_name?.charAt(0) || 'A'}
                      </div>
                      <span className="text-xs text-brand-muted">{post.author_name}</span>
                    </div>
                    <Link
                      to={`/blog/${post.slug}`}
                      className="text-white text-sm font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                    >
                      Leer más <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
