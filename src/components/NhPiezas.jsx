// Piezas del diseño de la home (clases nh-* de src/pages/home.css), compartidas
// con las landings de Google Ads (/lp/:slug) para que se vean igual.
import { useEffect, useRef, useState } from 'react';
import { Lock, MessageCircle, Search } from 'lucide-react';
import { WhatsAppLink } from './ContactButtons';
import { PLAZOS, PLAZOS_MAX_WEEKS, SEARCH_QUERIES, SHOWCASE } from '../data/HOME';

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Search pill that types what buyers search for. Starts with a full query so the prerendered HTML is complete. */
export function SearchTyper({ queries = SEARCH_QUERIES }) {
  const [text, setText] = useState(queries[0]);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let qi = 0;
    let ci = queries[0].length;
    let deleting = true;
    let timer;
    const tick = () => {
      const word = queries[qi];
      if (deleting) {
        ci -= 1;
        setText(word.slice(0, ci));
        if (ci <= 0) {
          deleting = false;
          qi = (qi + 1) % queries.length;
        }
        timer = setTimeout(tick, 28);
      } else {
        ci += 1;
        setText(queries[qi].slice(0, ci));
        if (ci >= queries[qi].length) {
          deleting = true;
          timer = setTimeout(tick, 2200);
        } else {
          timer = setTimeout(tick, 55);
        }
      }
    };
    timer = setTimeout(tick, 2200);
    return () => clearTimeout(timer);
  }, [queries]);

  return (
    <div className="nh-search">
      <Search aria-hidden="true" />
      <span className="q">{text}</span>
      <span className="nh-caret" aria-hidden="true" />
    </div>
  );
}

// Second of the hero video where "NEXCOMMIT.COM" appears on screen.
const PUBLISHED_AT = 6.8;

/**
 * Browser mock playing the NexCommit video (muted, looped): sites being built
 * on screen. The status chip follows the video: "Programando…" while pages are
 * built, "Publicado" once NEXCOMMIT.COM shows, plus an example WhatsApp toast.
 */
export function BuildingBrowser() {
  const videoRef = useRef(null);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    if (prefersReducedMotion()) {
      video.pause();
      return;
    }
    video.play().catch(() => {
      /* autoplay blocked: the poster stays visible */
    });
  }, []);

  const onTime = (e) => setPublished(e.currentTarget.currentTime >= PUBLISHED_AT);

  return (
    <div className="nh-stage">
      <div className="nh-browser">
        <div className="nh-chrome">
          <div className="nh-dots"><i /><i /><i /></div>
          <div className="nh-url"><Lock aria-hidden="true" /><span>nexcommit.com</span></div>
        </div>
        <div className="nh-viewport">
          <video
            ref={videoRef}
            className="nh-video"
            src="/home/nexcommit-hero.mp4"
            poster="/home/nexcommit-hero-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-label="Video: NexCommit diseña y programa sitios web"
            onTimeUpdate={onTime}
          />
          <div className={`nh-status ${published ? 'is-done' : ''}`}>
            <i />
            <span>{published ? 'Publicado' : 'Programando…'}</span>
          </div>
        </div>
      </div>
      <div className={`nh-toast ${published ? 'is-on' : ''}`} role="status">
        <div className="av"><MessageCircle aria-hidden="true" /></div>
        <div>
          <small><span>Nuevo mensaje desde la web</span><span>ejemplo</span></small>
          <p>Hola! Vengo desde la web y quiero cotizar mi página</p>
        </div>
      </div>
    </div>
  );
}

function ShowcaseCard({ project, hidden = false }) {
  return (
    <a
      className="nh-card"
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
    >
      <div className="mini"><i /><i /><i /></div>
      <div className="img">
        <img src={project.img} alt={hidden ? '' : `Sitio de ${project.name}`} loading="lazy" width="960" height="600" />
      </div>
      <div className="meta"><b>{project.name}</b><span>{project.kind}</span></div>
    </a>
  );
}

/** Endless carousel of published client sites. */
export function ShowcaseMarquee() {
  return (
    <div className="nh-marquee" tabIndex={0} aria-label="Carrusel de proyectos">
      <div className="nh-track">
        {SHOWCASE.map((p) => <ShowcaseCard key={p.name} project={p} />)}
        {SHOWCASE.map((p) => <ShowcaseCard key={`dup-${p.name}`} project={p} hidden />)}
      </div>
    </div>
  );
}

/** Weeks-to-launch chart; each row opens WhatsApp with its topic. `prefix` names the placement. */
export function PlazosChart({ prefix }) {
  const ticks = [];
  for (let t = 0; t <= PLAZOS_MAX_WEEKS; t += 2) ticks.push(t);
  return (
    <div className="nh-plazos">
      <div className="nh-plazos-inner">
        <div className="nh-scale" aria-hidden="true">
          <span />
          <div className="nh-ticks">
            {ticks.map((t) => (
              <span key={t} style={{ left: `${(t / PLAZOS_MAX_WEEKS) * 100}%` }}>{t}</span>
            ))}
          </div>
          <span style={{ textAlign: 'right' }}>semanas</span>
        </div>
        {PLAZOS.map((s) => (
          <WhatsAppLink key={s.slug} topic={s.topic} placement={`${prefix}_plazos_${s.slug}`} className="nh-row">
            <div>
              <h3>{s.name}</h3>
              <p>{s.desc}</p>
            </div>
            {s.from == null ? (
              <span className="nh-pill-free">plazo según canales e integraciones</span>
            ) : (
              <div className="nh-lane">
                <div className="nh-fill" style={{ width: `${(s.to / PLAZOS_MAX_WEEKS) * 100}%` }}>
                  {s.to > s.from && <div className="soft" style={{ left: `${(s.from / s.to) * 100}%` }} />}
                </div>
              </div>
            )}
            <div className="nh-when">{s.label}<small>Cotizar →</small></div>
          </WhatsAppLink>
        ))}
      </div>
    </div>
  );
}
