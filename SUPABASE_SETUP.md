# Cómo Ejecutar init.sql en Supabase

## Paso a Paso

1. **Ve a tu proyecto en Supabase Dashboard**
   - Abre https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Abre el SQL Editor**
   - En el menú lateral izquierdo, busca y haz clic en **"SQL Editor"**
   - O usa la búsqueda rápida (Ctrl+K o Cmd+K) y escribe "SQL Editor"

3. **Crea una nueva query**
   - Haz clic en el botón **"New query"** (o "+ New query")
   - Se abrirá un editor de texto en blanco

4. **Copia el contenido de sql/init.sql**
   - Abre el archivo `sql/init.sql` de tu proyecto
   - Selecciona TODO el contenido (Ctrl+A)
   - Copia (Ctrl+C)

5. **Pega el contenido en Supabase**
   - Regresa al SQL Editor en Supabase
   - Pega el contenido copiado (Ctrl+V)

6. **Ejecuta el script**
   - Haz clic en el botón **"Run"** (o presiona Ctrl+Enter)
   - Espera a que termine la ejecución
   - Deberías ver el mensaje "Success. No rows returned"

7. **Verifica que las tablas se crearon**
   - Ve a **"Table Editor"** en el menú lateral
   - Deberías ver las siguientes tablas:
     - profiles
     - posts
     - likes
     - achievements
     - user_achievements

## ¿Qué hace el script?

- ✅ Crea las tablas principales (profiles, posts, likes, achievements)
- ✅ Configura relaciones entre tablas (foreign keys)
- ✅ Activa Row Level Security (RLS) para proteger los datos
- ✅ Crea políticas de seguridad (quién puede leer/escribir qué)
- ✅ Crea triggers automáticos (contadores de likes, timestamps)
- ✅ Crea función para crear perfil automáticamente al registrarse
- ✅ Inserta logros de ejemplo

## Solución de Problemas

**Si ves errores de "already exists":**
- Es normal si ya ejecutaste el script antes
- Puedes ignorar esos errores

**Si necesitas empezar de cero:**
```sql
-- Ejecuta esto PRIMERO para borrar todo:
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Luego ejecuta el script init.sql completo
```
