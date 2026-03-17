import React, { Suspense, useState } from 'react';
import { Globe, RefreshCw, Database, ArrowRight } from 'lucide-react';
import Hero3D from './Hero3D';
import './index.css';

const services = [
  {
    icon: Globe,
    tone: 'tone-deep',
    title: 'Sitios web que convierten',
    description:
      'Disenamos y lanzamos tu web a medida: rapida, responsive y pensada para que tus visitas se vuelvan clientes.',
    benefit: 'Beneficio: +15% leads',
    cta: 'Presencia profesional',
  },
  {
    icon: RefreshCw,
    tone: 'tone-brand',
    title: 'Procesos autonomos',
    description:
      'Conectamos tus herramientas y automatizamos flujos para que tu operacion gane velocidad y reduzca friccion.',
    benefit: 'Beneficio: -30% tiempo adm.',
    cta: 'Optimiza tus flujos',
  },
  {
    icon: Database,
    tone: 'tone-sky',
    title: 'Apps y datos',
    description:
      'Desarrollamos apps web y bases de datos seguras para agenda, inventarios, reportes y operaciones criticas.',
    benefit: 'Beneficio: 100% control',
    cta: 'Operacion ordenada',
  },
];

const scrollToServices = () => {
  document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
};

function BrandAsset({ sources, alt, className }) {
  const [sourceIndex, setSourceIndex] = useState(0);

  const handleError = () => {
    setSourceIndex((currentIndex) => {
      if (currentIndex >= sources.length - 1) {
        return currentIndex;
      }

      return currentIndex + 1;
    });
  };

  return <img src={sources[sourceIndex]} alt={alt} className={className} onError={handleError} />;
}

function BrandLogo({ compact = false }) {
  const sources = compact
    ? ['/nexcommit-icon-v2.png']
    : ['/nexcommit-logo-inverse-v2.png'];

  return (
    <BrandAsset
      sources={sources}
      alt="NexCommit"
      className={compact ? 'brand-mark' : 'brand-logo'}
    />
  );
}

function App() {
  return (
    <div className="app-shell w-full min-h-screen">
      <nav
        className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 md:px-8 py-5 border-b"
        style={{
          backgroundColor: 'rgba(5, 20, 34, 0.72)',
          borderColor: 'rgba(119, 165, 210, 0.12)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }}
      >
        <a href="#top" aria-label="Ir al inicio">
          <BrandLogo />
        </a>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-brand-muted">
          <a href="#services" className="hover:text-white transition-colors duration-200">
            Servicios
          </a>
          <a
            href="https://wa.me/56929237511?text=Hola!%20Vengo%20desde%20la%20web%20de%20NexCommit%20y%20me%20gustar%C3%ADa%20m%C3%A1s%20informaci%C3%B3n."
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors duration-200"
          >
            Contacto
          </a>
        </div>
      </nav>

      <section id="top" className="relative w-full min-h-screen overflow-hidden flex items-center">
        <div className="hero-grid absolute inset-0 z-0 pointer-events-none" />

        <div
          className="absolute inset-y-0 right-0 z-0 pointer-events-none"
          style={{
            width: '62%',
            background:
              'radial-gradient(ellipse at center, rgba(35, 136, 218, 0.18) 0%, rgba(98, 198, 244, 0.08) 35%, transparent 72%)',
            filter: 'blur(60px)',
          }}
        />

        <div
          className="absolute z-0 pointer-events-none hero-canvas"
          style={{
            top: 0,
            right: '-2%',
            width: '56%',
            height: '100%',
          }}
        >
          <Suspense fallback={null}>
            <Hero3D />
          </Suspense>
        </div>

        <div className="relative z-10 w-full h-full flex flex-col justify-center pointer-events-none">
          <div className="container pt-32 md:pt-24">
            <div className="max-w-2xl animate-fade-in pointer-events-auto">
              <div className="eyebrow mb-6">
                <BrandLogo compact />
                <span>Tecnologia a medida para crecer con foco comercial</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-semibold mb-5 leading-tight text-white">
                Convertimos ideas en{' '}
                <span className="text-gradient">plataformas con identidad</span>
              </h1>

              <p className="text-lg md:text-xl mb-10 max-w-xl font-normal animate-fade-in delay-100 text-brand-muted">
                Integramos diseno, automatizacion y desarrollo a medida para que tu negocio avance con una marca coherente y una operacion mas solida.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 animate-fade-in delay-200">
                <button className="btn btn-brand group" onClick={scrollToServices}>
                  Nuestros servicios
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <a
                  href="https://wa.me/56929237511?text=Hola!%20Vengo%20desde%20la%20web%20de%20NexCommit%20y%20me%20gustar%C3%ADa%20m%C3%A1s%20informaci%C3%B3n."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                >
                  Contactar
                </a>
              </div>
            </div>
          </div>
        </div>

        <button
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 animate-bounce cursor-pointer pointer-events-auto"
          onClick={scrollToServices}
          aria-label="Ir a servicios"
        >
          <div className="scroll-indicator">
            <div className="scroll-indicator__dot" />
          </div>
        </button>
      </section>

      <section id="services" className="py-28 md:py-32 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="container relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold mb-6 text-white tracking-tight">
              Servicios disenados para <span className="text-gradient">escalar</span>
            </h2>
            <p className="text-lg text-brand-muted">
              La paleta, el logo y el sistema visual ya pueden vivir de forma consistente dentro de una experiencia moderna y comercial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map(({ icon: Icon, tone, title, description, benefit, cta }) => (
              <div key={title} className={`service-card glass-dark ${tone} p-10 rounded-3xl group`}>
                <div className="service-icon w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110 duration-500">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-white">{title}</h3>
                <p className="mb-8 min-h-[88px] leading-relaxed text-brand-muted">{description}</p>
                <div className="service-pill inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-6">
                  {benefit}
                </div>
                <div className="service-link flex items-center gap-2 text-sm font-semibold transition-colors">
                  {cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-28 md:py-32 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-full w-full pointer-events-none cta-glow" />

        <div className="container relative z-10 text-center">
          <div className="max-w-4xl mx-auto p-10 md:p-12 rounded-[32px] glass-dark border-white/5 shadow-2xl">
            <div className="flex justify-center mb-8">
              <BrandLogo compact />
            </div>
            <h2 className="text-4xl md:text-5xl font-semibold text-white mb-6 tracking-tight">
              Listo para alinear tu <span className="text-gradient">marca y producto</span>?
            </h2>
            <p className="text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed text-brand-muted">
              El sitio ya admite la identidad de NexCommit. El siguiente paso es terminar de aterrizar los assets definitivos para dejar la marca consistente en web, favicon y piezas futuras.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://wa.me/56929237511?text=Hola!%20Vengo%20desde%20la%20web%20de%20NexCommit%20y%20me%20gustar%C3%ADa%20m%C3%A1s%20informaci%C3%B3n."
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-brand group px-10 py-4"
              >
                Hablar con un experto
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="#services" className="btn btn-ghost px-10 py-4">
                Ver servicios
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-16 border-t border-white/5">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <a href="#top" aria-label="Ir al inicio">
              <BrandLogo />
            </a>
            <div className="flex items-center gap-8 text-sm font-medium text-brand-muted">
              <a href="#services" className="hover:text-white transition-colors">
                Servicios
              </a>
              <a
                href="https://wa.me/56929237511?text=Hola!%20Vengo%20desde%20la%20web%20de%20NexCommit%20y%20me%20gustar%C3%ADa%20m%C3%A1s%20informaci%C3%B3n."
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                WhatsApp
              </a>
              <a href="#" className="hover:text-white transition-colors">
                LinkedIn
              </a>
            </div>
          </div>
          <div className="text-center text-sm border-t border-white/5 pt-8 text-brand-footer">
            <p>&copy; {new Date().getFullYear()} NexCommit. Todos los derechos reservados.</p>
            <p className="mt-2 text-xs italic opacity-70">Mas que un proyecto, una alianza.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
