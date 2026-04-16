import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Plus, Edit3, MessageSquare, LogOut } from 'lucide-react';

const API_BASE = 'https://ut8vwhk6.functions.insforge.app';

export default function NCAdmin() {
  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'comments'
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState(null);
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAdminData();
  }, []);

  async function fetchAdminData() {
    setLoading(true);
    try {
      const [postsRes, catsRes, commsRes] = await Promise.all([
        fetch(`${API_BASE}/get-posts`), // In real scenario, we'd have a get-all-posts (including drafts)
        fetch(`${API_BASE}/get-categories`),
        fetch(`${API_BASE}/get-comments`) // Need to create this function
      ]);
      setPosts(await postsRes.json());
      setCategories(await catsRes.json());
      // Comments might fail until we deploy get-comments, so we catch it
      try { setComments(await commsRes.json()); } catch(e) {}
    } catch (e) {
      console.error('Admin fetch error:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleSavePost = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      title: formData.get('title'),
      slug: formData.get('slug'),
      content: formData.get('content'),
      excerpt: formData.get('excerpt'),
      category_id: formData.get('category_id'),
      featured_image: formData.get('featured_image'),
      is_published: formData.get('is_published') === 'true',
    };

    const method = editingPost ? 'PUT' : 'POST';
    const endpoint = editingPost ? '/update-post' : '/create-post';
    if (editingPost) payload.id = editingPost.id;

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        alert('Guardado exitosamente');
        setEditingPost(null);
        fetchAdminData();
      }
    } catch (e) {
      alert('Error al guardar');
    }
  };

  const deletePost = async (id) => {
    if (!confirm('¿Eliminar este post?')) return;
    try {
      await fetch(`${API_BASE}/delete-post`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchAdminData();
    } catch (e) { alert('Error al eliminar'); }
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
                  onClick={async () => { if(confirm('Eliminar comentario?')) { await fetch(`${API_BASE}/delete-comment`, { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: com.id}) }); fetchAdminData(); } }}
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
