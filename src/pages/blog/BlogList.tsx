import { useGetPosts } from '../../hooks/blog';
import { PostCard } from '../../components/blog/PostCard';
import SEO from '../../components/SEO';

export function BlogList() {
  const { data: posts, isLoading, error } = useGetPosts();

  if (isLoading) {
    return (
      <div className="container py-32 flex items-center justify-center min-h-screen">
        <div className="text-white text-xl animate-pulse">Cargando artículos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-32 flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Error al cargar posts</div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Blog | NexCommit"
        description="Artículos sobre desarrollo web, automatización de procesos y diseño de productos digitales. Ideas y aprendizajes del equipo de NexCommit para transformar tu operación."
        keywords="desarrollo, automatización, diseño digital, NexCommit, blog"
        canonicalUrl="https://nexcommit.com/blog"
      />
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts?.length === 0 ? (
              <div className="col-span-full text-center py-20 text-brand-muted italic">
                Aún no hay artículos publicados.
              </div>
            ) : (
              posts?.map((post) => (
                <PostCard
                  key={post.id}
                  title={post.title}
                  slug={post.slug}
                  excerpt={post.excerpt}
                  image_url={post.image_url}
                  author_name={post.profiles?.username || null}
                  created_at={post.created_at}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
