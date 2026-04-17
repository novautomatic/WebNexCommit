import React, { useState, useEffect } from 'react';
import { Save, Trash2, Plus, Edit3 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../components/AuthContext';

const supabase = createClient(
  'https://rhifvtrzetamrfhflfzw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoaWZ2dHJ6ZXRhbXJmaGZsZnp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDIzOTEsImV4cCI6MjA5MTkxODM5MX0.BDmWZeePQyIqTPquqwNbRmAMYvLu5-DEPL7feIamA-k'
);

export default function NCAdmin() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'comments'
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchAdminData();
  }, []);

  async function fetchAdminData() {
    setLoading(true);
    try {
      // Fetch all posts (including drafts) directly from database
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!inner(username),
          categories(name)
        `)
        .order('published_at', { ascending: false, nullsFirst: false });

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*');

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*');

      if (postsError) throw postsError;
      if (categoriesError) throw categoriesError;

      // Format posts data
      const formattedPosts = (postsData || []).map(post => ({
        ...post,
        author_name: post.profiles?.username,
        category_name: post.categories?.name,
      }));

      setPosts(formattedPosts);
      setCategories(categoriesData || []);
      setComments(commentsData || []);
    } catch (e) {
      console.error('Admin fetch error:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleSavePost = async (e) => {
    e.preventDefault();

    // Check authentication
    if (!user) {
      alert('Error: No hay sesión activa. Por favor inicia sesión nuevamente.');
      return;
    }

    const formData = new FormData(e.target);
    const payload = {
      title: formData.get('title'),
      slug: formData.get('slug'),
      content: formData.get('content'),
      excerpt: formData.get('excerpt'),
      category_id: formData.get('category_id'),
      featured_image: formData.get('featured_image'),
      is_published: formData.get('is_published') === 'true',
      author_id: user.id, // Required field
    };

    try {
      if (editingPost?.id) {
        // Update existing post
        delete payload.author_id; // Don't update author_id on edit
        const { error } = await supabase
          .from('posts')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPost.id);
        if (error) throw error;
      } else {
        // Create new post
        const { error } = await supabase
          .from('posts')
          .insert({
            ...payload,
            published_at: payload.is_published ? new Date().toISOString() : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        if (error) throw error;
      }
      alert('Guardado exitosamente');
      setEditingPost(null);
      fetchAdminData();
    } catch (e) {
      console.error('Error saving post:', e);
      alert(`Error al guardar: ${e.message}`);
    }
  };

  const deletePost = async (id) => {
    if (!confirm('¿Eliminar este post?')) return;
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchAdminData();
    } catch (e) {
      console.error('Error deleting post:', e);
      alert('Error al eliminar');
    }
  };

  if (loading) return <div className="container py-32 text-white text-center">Cargando panel...</div>;

  return (
    <div className="container pb-20">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-semibold text-white">NC Admin</h1>
          <p className="text-brand-muted">Gestión de contenidos NexCommit</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={logout}
            className="px-4 py-2 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-colors text-sm"
          >
            Cerrar Sesión
          </button>
          <button
            onClick={() => setEditingPost({})}
            className="btn btn-brand flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuevo Post
          </button>
        </div>
      </div>

      <div className="flex gap-8 mb-8">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'posts' ? 'glass-dark text-white border-brand-light' : 'text-brand-muted hover:text-white'}`}
        >
          Posts
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'comments' ? 'glass-dark text-white border-brand-light' : 'text-brand-muted hover:text-white'}`}
        >
          Comentarios
        </button>
      </div>

      {activeTab === 'posts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {posts.map(post => (
              <div key={post.id} className="glass-dark p-6 rounded-2xl border-white/5 flex justify-between items-center group">
                <div>
                  <h3 className="text-white font-medium">{post.title}</h3>
                  <p className="text-xs text-brand-muted">{post.category_name} • {post.slug}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingPost(post)} className="p-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deletePost(post.id)} className="p-2 rounded-lg bg-white/5 text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {editingPost && (
            <div className="glass-dark p-8 rounded-3xl border-white/10 sticky top-32">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {editingPost.id ? 'Editar Post' : 'Nuevo Post'}
                </h2>
                <button onClick={() => setEditingPost(null)} className="text-brand-muted hover:text-white">✕</button>
              </div>
              <form onSubmit={handleSavePost} className="space-y-4">
                <input name="title" defaultValue={editingPost?.title} placeholder="Título" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-light transition-colors" required />
                <input name="slug" defaultValue={editingPost?.slug} placeholder="slug-del-articulo" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-light transition-colors" required />
                <select name="category_id" defaultValue={editingPost?.category_id} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-light transition-colors" required>
                  <option value="">Seleccionar Categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <textarea name="content" defaultValue={editingPost?.content} placeholder="Contenido HTML..." rows={6} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-light transition-colors" required />
                <textarea name="excerpt" defaultValue={editingPost?.excerpt} placeholder="Resumen corto..." rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-light transition-colors" />
                <input name="featured_image" defaultValue={editingPost?.featured_image} placeholder="URL Imagen destacada" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-light transition-colors" />
                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                  <input type="checkbox" name="is_published" defaultChecked={editingPost?.is_published !== false} id="pub" />
                  <label htmlFor="pub" className="text-sm text-white">Publicar inmediatamente</label>
                </div>
                <button type="submit" className="w-full btn btn-brand py-3 flex justify-center items-center gap-2">
                  <Save className="w-4 h-4" /> Guardar Cambios
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-20 text-brand-muted italic">No hay comentarios para moderar.</div>
          ) : (
            comments.map(com => (
              <div key={com.id} className="glass-dark p-6 rounded-2xl border-white/5 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-brand-light">{com.user_id}</span>
                    <span className="text-xs text-brand-muted">• {new Date(com.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-white text-sm leading-relaxed">{com.content}</p>
                  <p className="text-[10px] text-brand-footer mt-2 uppercase tracking-widest">Post ID: {com.post_id}</p>
                </div>
                <button
                  onClick={async () => {
                    if(confirm('Eliminar comentario?')) {
                      await supabase
                        .from('comments')
                        .delete()
                        .eq('id', com.id);
                      fetchAdminData();
                    }
                  }}
                  className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
