import React from 'react';
import Spline from '@splinetool/react-spline';
import { Globe, RefreshCw, Database, ArrowRight } from 'lucide-react';
import './index.css';

function App() {
  return (
    <div className="w-full min-h-screen">
      {/* Navbar (Hacemos la barra más transparente quitando la clase glass pesada o usando bg-transparent/blur suave) */}
      <nav className="fixed top-0 left-0 w-full z-50 padding-4 flex justify-between items-center px-8 py-6 bg-black/10 backdrop-blur-sm border-b border-white/5">
        <div className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
          Nex<span style={{ color: 'var(--color-neutral-light)' }}>Commit</span>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full h-screen overflow-hidden flex items-center bg-[#a2b5c3]">
        {/*
          Cálculo Matemático Perfecto:
          - Usar width/height iguales en % (130%) preserva la relación de aspecto exacta de la pantalla (16:9),
            garantizando que la cámara de Spline no mutile los cubos.
          - Con transform: scale(0.85) desde el 'center center', el tamaño visual de la lona pasa a ser 110.5% (fuera de la pantalla).
          - Esto empuja el logo de Spline (derecha) y el ratón de scroll (abajo) fuera de los límites de la pantalla,
            dejando los cubos pequeños (85% de su tamaño nativo) nítidos en el centro.
        */}
        <div 
          className="absolute z-0 pointer-events-auto" 
          style={{ 
            top: '-15%', 
            left: '-15%', 
            width: '130%', 
            height: '130%', 
            transform: 'scale(0.85) translateX(2%)',
            transformOrigin: 'center center'
          }}
        >
          <Spline scene="https://prod.spline.design/c0CbD41iKHlfGcNq/scene.splinecode" />
        </div>
        
        {/* Máscara de desenfoque pura para el texto indeseado ("Build an AI..."). 
            Cubrimos desde la izq hasta el centro para fundir el texto con el fondo, dejando los cubos de la derecha intactos. */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none" 
          style={{ 
            backdropFilter: 'blur(50px)',
            WebkitBackdropFilter: 'blur(50px)',
            backgroundColor: 'rgba(162, 181, 195, 0.4)',
            maskImage: 'linear-gradient(to right, black 0%, black 55%, transparent 75%)',
            WebkitMaskImage: 'linear-gradient(to right, black 0%, black 55%, transparent 75%)'
          }}
        ></div>
        
        {/* Overlay transparente para un pelín más de legibilidad sin opacar el 3D */}
        <div className="absolute inset-0 bg-black/10 z-0 pointer-events-none mix-blend-multiply"></div>

        {/* Hero Content */}
        {/* Usamos pointer-events-none para que el ratón pueda interactuar con el 3D a través de los espacios vacíos */}
        <div className="container relative z-10 w-full h-full flex flex-col justify-center pointer-events-none">
          <div className="max-w-2xl px-4 animate-fade-in pointer-events-auto">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight text-white drop-shadow-xl">
              Más que un proyecto, <br/>
              <span className="text-gradient drop-shadow-md">una alianza</span>
            </h1>
            <p className="text-xl text-gray-100 mb-8 max-w-lg delay-100 animate-fade-in drop-shadow-lg font-medium">
              Desarrollamos tecnología que impulsa tu negocio. Desde sitios web hasta aplicaciones a la medida.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 delay-200 animate-fade-in">
              <button className="btn btn-primary group border-none shadow-lg" onClick={() => document.getElementById('services').scrollIntoView({ behavior: 'smooth' })}>
                Nuestros Servicios
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <a href="https://wa.me/56929237511" target="_blank" rel="noopener noreferrer" className="btn btn-secondary border-white/30 bg-white/10 hover:bg-white/20 text-white shadow-lg backdrop-blur-sm flex items-center justify-center">
                Contactar
              </a>
            </div>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 animate-bounce cursor-pointer pointer-events-auto" onClick={() => document.getElementById('services').scrollIntoView({ behavior: 'smooth' })}>
          <div className="w-8 h-12 rounded-full border-2 border-white/50 flex justify-center p-2 bg-black/20 backdrop-blur-sm shadow-md">
            <div className="w-1.5 h-3 bg-white rounded-full"></div>
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
