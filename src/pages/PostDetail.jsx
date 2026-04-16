import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rhifvtrzetamrfhflfzw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoaWZ2dHJ6ZXRhbXJmaGZsZnp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDIzOTEsImV4cCI6MjA5MTkxODM5MX0.BDmWZeePQyIqTPquqwNbRmAMYvLu5-DEPL7feIamA-k'
);

export default function PostDetail() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles!inner(username),
            categories(name)
          `)
          .eq('slug', slug)
          .eq('is_published', true)
          .single();

        if (error) throw error;

        // Format the post data to match expected structure
        const formattedPost = {
          ...data,
          author_name: data.profiles?.username,
          category_name: data.categories?.name,
        };

        setPost(formattedPost);
      } catch (e) {
        console.error('Error fetching post:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="pt-32 pb-20 flex items-center justify-center min-h-screen">
        <div className="text-white text-xl animate-pulse">Cargando artículo...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="pt-32 pb-20 container text-center">
        <h1 className="text-4xl font-semibold text-white mb-4">Artículo no encontrado</h1>
        <Link to="/blog" className="btn btn-ghost">Volver al blog</Link>
      </div>
    );
  }

  return (
    <div className="pb-20 container max-w-4xl">
      <Link to="/blog" className="inline-flex items-center gap-2 text-brand-muted hover:text-white transition-colors mb-12 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Volver al blog
      </Link>

      <header className="mb-12">
        <div className="flex gap-2 mb-6">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider glass-dark border-white/10 text-brand-light">
            {post.category_name}
          </span>
        </div>
        <h1 className="text-4xl md:text-6xl font-semibold text-white mb-8 leading-tight">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-6 text-sm text-brand-muted">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{post.author_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{new Date(post.published_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            <span>{post.category_name}</span>
          </div>
        </div>
      </header>

      {post.featured_image && (
        <div className="relative h-[400px] w-full rounded-3xl overflow-hidden mb-12 glass-dark border-white/5">
          <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="prose prose-invert max-w-none">
        <div
          className="text-lg leading-relaxed text-brand-muted whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>
    </div>
  );
}
