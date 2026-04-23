import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface PostGenerationRequest {
  topic?: string;
  keywords?: string[];
}

interface GeneratedPost {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  seo_metadata: {
    meta_description: string;
    meta_keywords: string;
    og_title?: string;
    og_description?: string;
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    // Validate HTTP method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Get Groq API Key from environment variables
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Parse request body
    const body: PostGenerationRequest = await req.json();
    const { topic = 'Tecnología y Desarrollo', keywords = [] } = body;

    // System prompt for Groq
    const systemPrompt = `Eres un experto en creación de contenido para blogs. Tu tarea es generar artículos de alta calidad optimizados para SEO.

INSTRUCCIONES:
1. Genera un artículo completo y bien estructurado en formato Markdown
2. El contenido debe ser original, informativo y valioso para el lector
3. Incluye encabezados (H2, H3), listas, y elementos de formato Markdown
4. Optimiza el contenido para motores de búsqueda con palabras clave naturales
5. Crea un excerpt atractivo que resuma el artículo en 1-2 oraciones
6. Escribe en español
7. Genera metadatos SEO completos

FORMATO DE RESPUESTA JSON:
{
  "title": "Título SEO-friendly (60-70 caracteres)",
  "slug": "url-slug-amigable-en-minusculas-con-guiones",
  "content": "Contenido completo en Markdown con encabezados, listas, negritas, etc.",
  "excerpt": "Resumen breve y atractivo del artículo (150-160 caracteres)",
  "seo_metadata": {
    "meta_description": "Descripción meta para SEO (150-160 caracteres)",
    "meta_keywords": "palabra1, palabra2, palabra3",
    "og_title": "Título optimizado para Open Graph (opcional, usa title si no se proporciona)",
    "og_description": "Descripción para redes sociales (opcional, usa meta_description si no se proporciona)"
  }
}

TEMÁTICA PRINCIPAL: ${topic}
PALABRAS CLAVE SUGERIDAS: ${keywords.join(', ') || 'tecnología, desarrollo, IA'}`;

    // Call Groq API (OpenAI compatible)
    const groqResponse = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'Eres un experto en creación de contenido para blogs. Siempre responde en formato JSON válido.',
            },
            {
              role: 'user',
              content: systemPrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 8192,
          response_format: { type: 'json_object' },
        }),
      }
    );

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate content with Groq', details: errorText }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    const groqData = await groqResponse.json();
    const generatedText = groqData.choices[0].message.content;

    // Clean markdown format if present
    let cleanText = generatedText;
    if (generatedText.includes('```json')) {
      cleanText = generatedText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (generatedText.includes('```')) {
      cleanText = generatedText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    // Parse the JSON response from Groq
    let post: GeneratedPost;
    try {
      post = JSON.parse(cleanText);
    } catch {
      console.error('Failed to parse Groq response as JSON:', cleanText);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON response from Groq' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Validate required fields
    if (!post.title || !post.slug || !post.content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields in generated post', post }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    return new Response(
      JSON.stringify({ post }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch (error) {
    console.error('Error in auto-generate-post function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
});
