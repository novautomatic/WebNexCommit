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
      <section id="services" className="py-32 relative" style={{ backgroundColor: '#080B14' }}>
        {/* Sutil resplandor de fondo para separar secciones */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        <div className="container relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight">
              Servicios diseñados para <span style={{ color: '#3B82F6' }}>escalar</span>
            </h2>
            <p className="text-lg" style={{ color: '#A0AEC0' }}>
              Automatiza tu operación, capta más clientes y toma el control de tus datos con nuestras soluciones a medida.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Service 1 */}
            <div className="p-10 rounded-3xl glass-dark group">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110 duration-500" 
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <Globe className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Sitios web que convierten</h3>
              <p className="mb-8 min-h-[80px] leading-relaxed" style={{ color: '#A0AEC0' }}>
                Diseñamos y lanzamos tu web a medida: rápida, responsive y pensada para que tus visitas se vuelvan clientes.
              </p>
              <div className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-6" 
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                Beneficio: +15% leads
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold transition-colors group-hover:text-[#3B82F6]" style={{ color: '#60A5FA' }}>
                Presencia profesional <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Service 2 */}
            <div className="p-10 rounded-3xl glass-dark group">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110 duration-500" 
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <RefreshCw className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Procesos autónomos</h3>
              <p className="mb-8 min-h-[80px] leading-relaxed" style={{ color: '#A0AEC0' }}>
                Olvídate de tareas repetitivas: conectamos tus herramientas y automatizamos flujos para que ganes tiempo.
              </p>
              <div className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-6" 
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                Beneficio: -30% tiempo adm.
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold transition-colors group-hover:text-[#10B981]" style={{ color: '#34D399' }}>
                Optimiza tus flujos <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Service 3 */}
            <div className="p-10 rounded-3xl glass-dark group">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110 duration-500" 
                style={{ backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                <Database className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Apps & Datos</h3>
              <p className="mb-8 min-h-[80px] leading-relaxed" style={{ color: '#A0AEC0' }}>
                Desarrollamos apps web y bases de datos seguras, hechas para tu operación: agenda, inventarios o reportes.
              </p>
              <div className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-6" 
                style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', color: '#22D3EE', border: '1px solid rgba(6, 182, 212, 0.1)' }}>
                Beneficio: 100% control
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold transition-colors group-hover:text-[#06B6D4]" style={{ color: '#22D3EE' }}>
                Tu operación ordenada <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden" style={{ backgroundColor: '#080B14' }}>
        {/* Resplandor radial de fondo — azul muy sutil para dar volumen */}
        <div 
          className="absolute inset-x-0 top-0 h-full w-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% -20%, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
          }}
        />
        
        <div className="container relative z-10 text-center">
          <div className="max-w-3xl mx-auto p-12 rounded-[32px] glass-dark border-white/5 shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              ¿Listo para escalar tu <span style={{ color: '#3B82F6' }}>negocio</span>?
            </h2>
            <p className="text-xl max-w-2xl mx-auto mb-12 leading-relaxed" style={{ color: '#A0AEC0' }}>
              Agenda una llamada de descubrimiento gratuita y conversemos sobre tus objetivos tecnológicos.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="https://wa.me/56929237511?text=Hola,%20quisiera%20m%C3%A1s%20informaci%C3%B3n" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-primary px-10 py-4 group"
                style={{ 
                  backgroundColor: '#10B981', 
                  color: 'white', 
                  border: 'none',
                  boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#059669'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#10B981'}
              >
                Hablar con un experto
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a 
                href="#services" 
                className="btn px-10 py-4"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                  color: 'white', 
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                Ver servicios
              </a>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-16 border-t border-white/5" style={{ backgroundColor: '#080B14' }}>
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
            <div className="text-2xl font-bold tracking-tight">
              <span style={{ color: '#3B82F6' }}>Nex</span>
              <span style={{ color: '#FFFFFF' }}>Commit</span>
            </div>
            <div className="flex items-center gap-8 text-sm font-medium" style={{ color: '#A0AEC0' }}>
              <a href="#services" className="hover:text-white transition-colors">Servicios</a>
              <a href="https://wa.me/56929237511" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp</a>
              <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            </div>
          </div>
          <div className="text-center text-sm border-t border-white/5 pt-8" style={{ color: '#4B5563' }}>
            <p>&copy; {new Date().getFullYear()} NexCommit. Todos los derechos reservados.</p>
            <p className="mt-2 text-xs italic opacity-60">Más que un proyecto, una alianza.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
