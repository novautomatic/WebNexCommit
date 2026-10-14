-- Post del blog: creador de páginas web gratis con IA (/crea-tu-web).
-- Sirve para que Google (y su resumen con IA) asocie "crear página web gratis"
-- con NexCommit. Idempotente: si el slug ya existe, actualiza el contenido.

DO $do$
DECLARE
  v_slug  text := 'crear-pagina-web-gratis-con-ia';
  v_title text := 'Cómo crear la página web de tu negocio gratis con IA en 2 minutos';
  v_excerpt text := 'NexCommit tiene un creador de páginas web gratis con inteligencia artificial: cuentas qué hace tu negocio, eliges tu link nexcommit.com/tu-empresa y en minutos tienes una landing page o una tienda online que puedes ajustar por chat.';
  v_image text := 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1640&auto=format&fit=crop';
  v_content text := $md$
Tener página web ya no debería ser un trámite largo ni caro para empezar. Por eso en **NexCommit** creamos un **creador de páginas web gratis con inteligencia artificial**: le cuentas qué hace tu negocio y en unos 2 minutos tienes una página publicada en internet, lista para compartir.

Puedes probarlo ahora en **[nexcommit.com/crea-tu-web](https://www.nexcommit.com/crea-tu-web)**.

## ¿Qué es el creador de páginas de NexCommit?

Es una herramienta gratuita, sin tarjeta, que usa IA para armar la página de tu negocio. La IA escribe los textos, elige los colores y busca fotos de tu rubro. Tu página queda publicada en tu propio link, del tipo **nexcommit.com/tu-empresa**, para que la veas en el celular y la mandes por WhatsApp o redes sociales.

Puedes elegir entre dos tipos de página:

- **Landing page**: una página para presentar tu negocio y que tus clientes te contacten por WhatsApp.
- **Tienda online**: muestra hasta 10 productos con carrito y recibe los pedidos por WhatsApp. Incluye un panel para administrarla.

## Cómo crear tu página gratis, paso a paso

1. **Déjanos tus datos.** Nombre, empresa, correo y celular. Te enviamos un código al correo para confirmar que eres tú.
2. **Cuéntanos de tu negocio.** Tu rubro, tu ciudad, qué haces y qué ofreces, y cómo te contactan (WhatsApp, Instagram, dirección, horario). Elige tu link y sube tu logo si tienes uno.
3. **Publícala y compártela.** La IA arma tu página en segundos. Después puedes pedirle cambios conversando con el asistente por chat: textos, colores, servicios o datos de contacto, y ves el resultado al instante.

Un consejo: mientras más claro describas tu negocio, mejor queda. Escribir, por ejemplo, "cafetería de especialidad con pastelería casera, desayunos y espacio para trabajar" le da a la IA mucho más con qué trabajar que solo "cafetería".

## ¿De verdad es gratis?

Sí. La página de prueba no cuesta nada y no pedimos tarjeta. Queda publicada **5 días** para que la revises y la compartas. Hay una página de prueba por persona (por correo y por celular), porque cada una usa recursos reales: inteligencia artificial, fotos y hosting.

## ¿Y después de los 5 días?

La página de prueba es tu punto de partida. Si te gusta, nuestro equipo la toma como base y la convierte en tu **página definitiva**: diseño a medida, tu propio dominio (por ejemplo, tuempresa.cl) y todo lo que tu negocio necesite, como pagos online con Webpay o Mercado Pago, un chatbot con IA para WhatsApp o una tienda más completa.

## ¿Para quién sirve?

- Emprendimientos que todavía no tienen página y quieren ver cómo se vería.
- Negocios locales (cafeterías, peluquerías, talleres, servicios a domicilio) que hoy solo venden por Instagram o WhatsApp.
- Quien quiere probar una idea rápido antes de invertir en un sitio completo.

## Tus datos

Usamos tus datos para crear tu página y contactarte sobre ella. Las ofertas de NexCommit solo te llegan si marcas la casilla para recibirlas. Puedes pedir acceso, corrección o eliminación de tus datos cuando quieras; el detalle está en nuestra [política de privacidad](https://www.nexcommit.com/privacy).

## Crea tu página ahora

Toma 2 minutos: **[crea gratis la página web de tu negocio con IA](https://www.nexcommit.com/crea-tu-web)**. Y si prefieres que alguien te ayude desde el principio, conoce nuestros [servicios de desarrollo web](https://www.nexcommit.com/servicios) o escríbenos por WhatsApp.
$md$;
  v_seo jsonb := jsonb_build_object(
    'og_title', 'Crea la página web de tu negocio gratis con IA',
    'meta_description', 'Crea gratis la página web de tu negocio con inteligencia artificial en NexCommit: landing page o tienda online en tu link nexcommit.com/tu-empresa, editable por chat.',
    'meta_keywords', 'crear página web gratis, página web con IA, crear página web gratis con inteligencia artificial, creador de páginas web, tienda online gratis, NexCommit'
  );
BEGIN
  IF EXISTS (SELECT 1 FROM public.posts WHERE slug = v_slug) THEN
    UPDATE public.posts
       SET title = v_title, excerpt = v_excerpt, content = v_content, image_url = v_image,
           seo_metadata = v_seo, status = 'published', published = true, updated_at = now()
     WHERE slug = v_slug;
  ELSE
    INSERT INTO public.posts (title, slug, content, excerpt, image_url, status, published, seo_metadata)
    VALUES (v_title, v_slug, v_content, v_excerpt, v_image, 'published', true, v_seo);
  END IF;

  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261014170000', 'post_creador_gratis')
    ON CONFLICT DO NOTHING;
  END IF;
END
$do$;

-- Verificación:
-- SELECT slug, title, published, status, length(content) AS largo, created_at
--   FROM public.posts WHERE slug = 'crear-pagina-web-gratis-con-ia';
