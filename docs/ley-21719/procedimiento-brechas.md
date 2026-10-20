# Qué hacer si se filtran datos

**Vigente desde:** 19 de octubre de 2026 · **Obligatorio desde:** 1 de diciembre de 2026

El **art. 14 sexies** de la Ley 21.719 obliga a reportar a la Agencia de Protección de Datos
Personales, «por los medios más expeditos posibles y sin dilaciones indebidas», toda vulneración de
las medidas de seguridad que cause la destrucción, filtración, pérdida o alteración de datos
personales, o un acceso no autorizado a ellos, **cuando exista un riesgo razonable** para los
titulares. Además, hay que **registrar** esas comunicaciones.

La ley no fija un número de horas. **NexCommit trabaja con 72 horas** desde que alguien se da cuenta,
no desde que termina la investigación.

## Qué cuenta como brecha

- Una tabla o función que quedó abierta a `anon` o `authenticated` por un `GRANT` o una política mal
  puesta. Este proyecto tiene un caso real: `fix-rls-policy.sql`, en la raíz del repo, dejaba que
  cualquier sesión creara posts.
- Una condición de seguridad que con `NULL` deja pasar: `IF NOT (a OR NULL)` no lanza el error. Se
  encontraron y corrigieron dos antes de publicar el portal; siempre se escribe con `coalesce(...)`.
- Una clave expuesta: la `service_role` de Supabase, `AVISOS_TAREAS_SECRET`, `OPENAI_API_KEY`, la
  contraseña de aplicación de Gmail o el token de GitHub. **Una clave expuesta ya es una brecha**,
  aunque nadie la haya usado.
- Un correo con datos de un cliente que llegó a otro cliente.
- Un archivo del bucket `tareas-clientes` accesible por alguien que no debía.
- Una exportación (CSV, JSON, captura) que terminó donde no debía, incluido el repo, **que es público**.
- La pérdida de datos sin respaldo.

Si hay duda, se trata como brecha.

## Las primeras 72 horas

1. **Contener.** Revocar la clave en el panel del proveedor y actualizarla en la bóveda
   (`BOVEDA-CRECETEC`), corregir el permiso o apagar la función. Anotar la hora de cada acción.
2. **Medir el alcance.** Qué datos, cuántas personas (con un `SELECT count(*)` y fecha de corte),
   desde cuándo y hasta cuándo, y si alguien accedió: revisar los logs de Supabase (API y Auth) y de
   Vercel. «No hay evidencia de acceso» es una respuesta válida; «no revisamos», no.
3. **Avisar a la Agencia** con lo que se sepa. Un aviso incompleto a tiempo, completado después,
   cumple; uno completo tarde, no. **Verificar el canal oficial de la Agencia el día que ocurra**: al
   19 de octubre de 2026 no estaba confirmado.
4. **Avisar a las personas** cuando el riesgo sea alto (credenciales, datos de salud, cualquier cosa
   que permita suplantar o dañar), en lenguaje claro. Se puede usar
   `tcliente_enviar('aviso_brecha', …)` agregando la plantilla al back, o un correo manual.
5. **Registrar.** Un documento fechado en la carpeta privada de NexCommit, **no en este repo**, con:
   qué pasó, la línea de tiempo, los datos y personas afectadas, qué se hizo, cuándo se avisó a la
   Agencia y a los titulares, y qué se cambió para que no se repita.

## Plantilla de aviso a los afectados

> **Asunto:** Aviso importante sobre tus datos en NexCommit
>
> Hola {nombre}:
>
> El {fecha} detectamos que {qué pasó, en una frase}. Esto pudo exponer {qué datos tuyos}. No
> encontramos evidencia de que alguien los haya usado / Sabemos que {lo que se sabe}.
>
> Lo que ya hicimos: {contención}. Lo que te recomendamos: {cambiar tu contraseña en
> nexcommit.com/mi-espacio, estar atento a correos que se hagan pasar por nosotros…}.
>
> Informamos de esto a la Agencia de Protección de Datos Personales. Si tienes dudas, escríbenos a
> nexcommit@gmail.com.
>
> Equipo NexCommit
