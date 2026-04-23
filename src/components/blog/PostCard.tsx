import { Link } from 'react-router-dom';

interface PostCardProps {
  title: string;
  slug: string;
  excerpt: string | null;
  image_url: string | null;
  author_name: string | null;
  created_at: string;
}

export function PostCard({
  title,
  slug,
  excerpt,
  image_url,
  author_name,
  created_at,
}: PostCardProps) {
  const formatDate = new Date(created_at).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <article className="group relative overflow-hidden rounded-3xl glass-dark border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col">
      {image_url && (
        <div className="relative h-56 overflow-hidden">
          <img
            src={image_url}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}
      <div className="p-8 flex flex-col flex-grow">
        <h3 className="text-2xl font-semibold text-white mb-3 group-hover:text-brand-light transition-colors">
          <Link to={`/blog/${slug}`}>{title}</Link>
        </h3>
        {excerpt && <p className="text-brand-muted text-sm mb-6 line-clamp-3">{excerpt}</p>}
        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-light/20 flex items-center justify-center text-[10px] font-bold text-brand-light">
              {author_name?.charAt(0) || 'A'}
            </div>
            <span className="text-xs text-brand-muted">{author_name || 'Autor'}</span>
          </div>
          <time dateTime={created_at} className="text-xs text-brand-footer">
            {formatDate}
          </time>
        </div>
      </div>
    </article>
  );
}
