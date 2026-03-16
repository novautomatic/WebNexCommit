import React, { Suspense } from 'react';
import { Globe, RefreshCw, Database, ArrowRight } from 'lucide-react';
import Hero3D from './Hero3D';
import './index.css';

function App() {
  return (
    <div className="w-full min-h-screen" style={{ backgroundColor: '#080B14' }}>
      {/* Navbar — Dark premium, glassmorphism sutil */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-8 py-5 border-b border-white/5"
        style={{
          backgroundColor: 'rgba(8, 11, 20, 0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="text-2xl font-bold tracking-tight">
          <span style={{ color: '#3B82F6' }}>Nex</span>
          <span style={{ color: '#FFFFFF' }}>Commit</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: '#A0AEC0' }}>
          <a href="#services" className="hover:text-white transition-colors duration-200">Servicios</a>
          <a href="https://wa.me/56929237511" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-200">Contacto</a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full h-screen overflow-hidden flex items-center" style={{ backgroundColor: '#080B14' }}>

        {/* Grid de puntos técnicos — profundidad sutil */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            opacity: 0.5,
          }}
        />

        {/* Luz ambiental radial azul detrás del objeto 3D */}
        <div
          className="absolute z-0 pointer-events-none"
          style={{
            top: '0%',
            right: '0%',
            width: '60%',
            height: '100%',
            background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        {/* Objeto 3D — React Three Fiber (fondo transparente, alta calidad) */}
        <div
          className="absolute z-0 pointer-events-none"
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

        {/* Hero Content */}
        <div className="relative z-10 w-full h-full flex flex-col justify-center pointer-events-none" style={{ paddingLeft: '10%' }}>
          <div className="max-w-xl animate-fade-in pointer-events-auto">
            <h1
              className="text-5xl md:text-7xl font-bold mb-5 leading-tight"
              style={{
                color: '#FFFFFF',
                textShadow: '0 0 40px rgba(59, 130, 246, 0.25)',
              }}
            >
              Más que un proyecto, <br/>
              <span style={{ color: '#3B82F6' }}>una alianza</span>
            </h1>
            <p
              className="text-xl mb-10 max-w-md font-normal animate-fade-in delay-100"
              style={{ color: '#A0AEC0' }}
            >
              Desarrollamos tecnología que impulsa tu negocio. Desde sitios web hasta aplicaciones a la medida.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in delay-200">
              {/* CTA Principal — Verde saturado brillante */}
              <button
                className="btn group border-none"
                style={{
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#059669'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#10B981'}
                onClick={() => document.getElementById('services').scrollIntoView({ behavior: 'smooth' })}
              >
                Nuestros Servicios
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              {/* CTA Secundario — Glassmorphism real */}
              <a
                href="https://wa.me/56929237511"
                target="_blank"
                rel="noopener noreferrer"
                className="btn flex items-center justify-center"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  color: '#FFFFFF',
                }}
              >
                Contactar
              </a>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 animate-bounce cursor-pointer pointer-events-auto"
          onClick={() => document.getElementById('services').scrollIntoView({ behavior: 'smooth' })}
        >
          <div
            className="w-8 h-12 rounded-full flex justify-center p-2"
            style={{
              border: '2px solid rgba(255,255,255,0.25)',
              backgroundColor: 'rgba(8, 11, 20, 0.5)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.6)' }} />
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24" style={{ backgroundColor: 'var(--color-neutral-light)', color: 'var(--color-neutral-dark)' }}>
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: 'var(--color-primary)' }}>Servicios diseñados para escalar</h2>
            <p className="text-lg text-gray-600">
              Automatiza tu operación, capta más clientes y toma el control de tus datos con nuestras soluciones a medida.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Service 1 */}
            <div className="p-8 rounded-2xl glass-light transition-transform hover:-translate-y-2 duration-300 border hover:border-[var(--color-secondary)]">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                <Globe className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Sitios web que convierten</h3>
              <p className="text-gray-600 mb-6 min-h-[80px]">
                Diseñamos y lanzamos tu web a medida: rápida, responsive y pensada para que tus visitas se vuelvan clientes.
              </p>
              <div className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-4" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-secondary)' }}>
                Beneficio: +15% leads
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>Presencia profesional que vende &rarr;</p>
            </div>

            {/* Service 2 */}
            <div className="p-8 rounded-2xl glass-light transition-transform hover:-translate-y-2 duration-300 border hover:border-[var(--color-secondary)]">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--color-secondary)', color: 'white' }}>
                <RefreshCw className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Procesos que trabajan solos</h3>
              <p className="text-gray-600 mb-6 min-h-[80px]">
                Olvídate de tareas repetitivas: conectamos tus herramientas y automatizamos flujos para que ganes tiempo y reduzcas errores.
              </p>
              <div className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-4" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-secondary)' }}>
                Beneficio: -30% tiempo adm.
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>Menos horas muertas, más resultados &rarr;</p>
            </div>

            {/* Service 3 */}
            <div className="p-8 rounded-2xl glass-light transition-transform hover:-translate-y-2 duration-300 border hover:border-[var(--color-secondary)]">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--color-neutral-dark)', color: 'white' }}>
                <Database className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Apps a la medida + Datos</h3>
              <p className="text-gray-600 mb-6 min-h-[80px]">
                Desarrollamos apps web y bases de datos seguras, hechas para tu operación: agenda, inventarios o reportes en un solo lugar.
              </p>
              <div className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-4" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-secondary)' }}>
                Beneficio: 100% control
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>Tu operación, ordenada y escalable &rarr;</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden" style={{ backgroundColor: 'var(--color-primary)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(var(--color-neutral-light) 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
        <div className="container relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">¿Listo para escalar tu negocio?</h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10">Agenda una llamada de descubrimiento gratuita y conversemos sobre tus objetivos tecnológicos.</p>
          <a href="https://wa.me/56929237511?text=Hola,%20quisiera%20m%C3%A1s%20informaci%C3%B3n" target="_blank" rel="noopener noreferrer" className="btn btn-primary inline-flex items-center justify-center" style={{ backgroundColor: 'var(--color-neutral-dark)', color: 'white', border: 'none' }}>
            Contacto
          </a>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8" style={{ backgroundColor: 'var(--color-neutral-dark)' }}>
        <div className="container text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} NexCommit. Todos los derechos reservados.</p>
          <p className="mt-2">Más que un proyecto, una alianza.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
