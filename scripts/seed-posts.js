/**
 * Script para crear posts de prueba en el blog
 * Ejecutar desde el panel de administración NCAdmin o vía consola del navegador
 *
 * Uso en consola del navegador (en nexcommit.com/ncadmin):
 * 1. Copiar y pegar este script en la consola
 * 2. Esperar a que se ejecuten las peticiones
 * 3. Recargar la página para ver los posts
 */

const API_BASE = 'https://ut8vwhk6.functions.insforge.app';

const samplePosts = [
  {
    title: "Introducción a React 19 y sus nuevas características",
    slug: "intro-react-19-caracteristicas",
    excerpt: "Explora las novedades de React 19: Actions, useOptimistic, useFormStatus y más mejoras que cambian la forma de construir aplicaciones.",
    content: `
      <h2>¿Qué hay de nuevo en React 19?</h2>
      <p>React 19 introduce cambios significativos en cómo manejamos el estado y las operaciones asíncronas.</p>

      <h3>1. React Actions</h3>
      <p>Las Actions permiten manejar operaciones asíncronas directamente desde los componentes de UI, simplificando el código de formularios y mutaciones de datos.</p>

      <h3>2. useOptimistic Hook</h3>
      <p>Este nuevo hook permite mostrar actualizaciones optimistas de forma declarativa, mejorando la percepción de rendimiento de tu aplicación.</p>

      <h3>3. useFormStatus y useFormAction</h3>
      <p>Nuevos hooks para manejar el estado de formularios sin necesidad de props drilling excesivo.</p>

      <h2>Conclusión</h2>
      <p>React 19 representa un paso hacia un desarrollo más intuitivo y menos boilerplate.</p>
    `,
    category_id: 1,
    featured_image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800"
  },
  {
    title: "Guía completa de Tailwind CSS para principiantes",
    slug: "guia-completa-tailwind-css-principiantes",
    excerpt: "Aprende a utilizar Tailwind CSS desde cero. Clases utilitarias, configuración, personalización y mejores prácticas para estilizar tus proyectos React.",
    content: `
      <h2>¿Por qué Tailwind CSS?</h2>
      <p>Tailwind CSS es un framework de CSS utilitario-first que acelera el desarrollo frontend.</p>

      <h3>Ventajas principales:</h3>
      <ul>
        <li>Desarrollo rápido sin salir del HTML</li>
        <li>Sistema de diseño consistente</li>
        <li>Personalización extensiva mediante tailwind.config.js</li>
        <li>Tree-shipping automático con PurgeCSS</li>
      </ul>

      <h2>Configuración básica</h2>
      <p>Instala Tailwind vía npm y configura tu archivo CSS principal con las directivas @tailwind.</p>

      <h2>Conclusión</h2>
      <p>Tailwind CSS es ideal para proyectos que necesitan iteración rápida y consistencia visual.</p>
    `,
    category_id: 2,
    featured_image: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800"
  },
  {
    title: "Automatización de workflows con herramientas modernas",
    slug: "automatizacion-workflows-herramientas-modernas",
    excerpt: "Descubre cómo automatizar tareas repetitivas usando herramientas como GitHub Actions, Zapier y scripts personalizados para mejorar tu productividad.",
    content: `
      <h2>La importancia de automatizar</h2>
      <p>La automatización libera tiempo valioso para enfocarse en tareas de mayor valor.</p>

      <h3>Herramientas recomendadas:</h3>
      <ul>
        <li><strong>GitHub Actions:</strong> CI/CD integrado en tu repositorio</li>
        <li><strong>Zapier/Make:</strong> Conecta aplicaciones sin código</li>
        <li><strong>Scripts personalizados:</strong> Python, Node.js para tareas específicas</li>
      </ul>

      <h2>Ejemplo: Deploy automático</h2>
      <p>Configura un workflow que se ejecute en cada push a main y despliegue tu aplicación.</p>

      <h2>Conclusión</h2>
      <p>La automatización es una inversión que paga dividendos en productividad.</p>
    `,
    category_id: 3,
    featured_image: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800"
  }
];

async function seedPosts() {
  console.log('🌱 Sembrando posts de prueba...');

  // Nota: Necesitas estar autenticado como admin para que esto funcione
  for (const post of samplePosts) {
    try {
      const response = await fetch(`${API_BASE}/create-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Post creado:', data.title);
      } else {
        const error = await response.json();
        console.error('❌ Error creando post:', post.title, error);
      }
    } catch (e) {
      console.error('❌ Error de red:', e);
    }
  }

  console.log('🎉 Proceso de seed completado!');
  console.log('📝 Recarga la página para ver los nuevos posts.');
}

// Ejecutar
seedPosts();
