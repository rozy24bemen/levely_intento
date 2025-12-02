# 🎮 Sistema de XP Automático - Instrucciones de Instalación

## 📋 Paso 1: Ejecutar el Script SQL en Supabase

1. **Abre tu proyecto en Supabase Dashboard**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto LEVELY

2. **Ve al SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"
   - Haz clic en "+ New Query"

3. **Copia y pega el contenido completo del archivo:**
   ```
   sql/xp-system-upgrade.sql
   ```

4. **Ejecuta el script**
   - Haz clic en el botón "RUN" (▶️)
   - Deberías ver un mensaje de éxito
   - Verifica con las queries de verificación al final del archivo

## ✅ Paso 2: Verificar la Instalación

Ejecuta estas queries en el SQL Editor para verificar que todo se instaló correctamente:

```sql
-- Ver las funciones creadas
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('calculate_level', 'award_xp');

-- Ver los triggers creados
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name IN ('award_post_xp', 'award_like_xp', 'remove_like_xp');
```

**Resultado esperado:**
- 2 funciones: `calculate_level` y `award_xp`
- 3 triggers: `award_post_xp`, `award_like_xp`, `remove_like_xp`

## 🎯 Cómo Funciona el Sistema

### Ganancia Automática de XP

| Acción | XP Ganado | Trigger |
|--------|-----------|---------|
| Crear un post | +10 XP | `award_post_xp` |
| Recibir un like en tu post | +5 XP | `award_like_xp` |
| Alguien quita el like | -5 XP | `remove_like_xp` |

### Sistema de Niveles

- **Fórmula:** `Nivel = floor(XP / 100) + 1`
- **Ejemplos:**
  - 0-99 XP → Nivel 1
  - 100-199 XP → Nivel 2
  - 200-299 XP → Nivel 3
  - 1000+ XP → Nivel 11+

### Notificaciones en Tiempo Real

Las notificaciones aparecerán automáticamente en la esquina superior derecha cuando:
- ✅ Publicas un post (+10 XP)
- ✅ Subes de nivel (modal especial con confetti conceptual)

**Nota:** Las notificaciones de "recibir likes" solo aparecen si estás en línea cuando alguien da like a tu post. Esto es normal porque es un evento del servidor.

## 🧪 Paso 3: Probar el Sistema

### Test Básico

1. **Inicia sesión en la aplicación**
2. **Crea un nuevo post**
   - Deberías ver una notificación: "+10 XP - Publicaste un post"
   - Tu XP debería aumentar automáticamente
3. **Crea 9 posts más (total: 10 posts = 100 XP)**
   - Deberías subir a Nivel 2
   - Aparecerá un modal especial: "¡Subiste a Nivel 2!"

### Test con Otro Usuario

1. **Crea una segunda cuenta o pide a alguien que pruebe**
2. **El otro usuario da like a tu post**
3. **Verifica tu perfil:**
   - Tu XP debería aumentar +5 XP
   - La barra de progreso se actualiza

### Verificar en la Base de Datos

```sql
-- Ver el XP y nivel de todos los usuarios
SELECT username, xp, level 
FROM profiles 
ORDER BY xp DESC;

-- Ver el historial de posts y likes
SELECT 
  p.username,
  (SELECT COUNT(*) FROM posts WHERE author_id = p.id) as posts_count,
  (SELECT COUNT(*) FROM likes l 
   JOIN posts po ON l.post_id = po.id 
   WHERE po.author_id = p.id) as likes_received
FROM profiles p;
```

## 🔄 Paso 4: Recalcular XP de Usuarios Existentes (Opcional)

Si ya tienes usuarios con posts y likes, ejecuta esto para darles el XP retroactivo:

```sql
-- Recalcular XP basado en posts existentes (+10 XP por post)
UPDATE profiles
SET xp = xp + (
  SELECT COUNT(*) * 10
  FROM posts
  WHERE posts.author_id = profiles.id
);

-- Recalcular XP basado en likes recibidos (+5 XP por like)
UPDATE profiles
SET xp = xp + (
  SELECT COUNT(*) * 5
  FROM likes
  JOIN posts ON likes.post_id = posts.id
  WHERE posts.author_id = profiles.id
);

-- Recalcular niveles basados en el nuevo XP
UPDATE profiles
SET level = calculate_level(xp);
```

## 🚀 Paso 5: Desplegar los Cambios

Una vez verificado que todo funciona localmente:

```powershell
# Hacer commit de los cambios
git add .
git commit -m "feat: Sistema de XP automático con notificaciones"
git push origin master
```

Vercel desplegará automáticamente los cambios.

## 🎨 Personalización

### Cambiar la Cantidad de XP

Edita los valores en `sql/xp-system-upgrade.sql`:

```sql
-- Línea 45: XP por crear post
PERFORM award_xp(NEW.author_id, 10, 'post_created');

-- Línea 55: XP por recibir like
PERFORM award_xp(post_author, 5, 'like_received');

-- Línea 66: XP por quitar like
PERFORM award_xp(post_author, -5, 'like_removed');
```

### Cambiar la Fórmula de Niveles

Edita la función `calculate_level()` en el mismo archivo:

```sql
-- Fórmula actual: nivel = floor(xp/100) + 1
-- Ejemplo de fórmula más difícil: nivel = floor(sqrt(xp/10)) + 1
RETURN FLOOR(xp / 100.0) + 1;
```

## ❓ Troubleshooting

### Las notificaciones no aparecen

1. Verifica que `XPNotificationContainer` esté en `app/layout.tsx`
2. Abre la consola del navegador (F12) y busca errores
3. Verifica que las animaciones CSS estén en `app/globals.css`

### El XP no aumenta

1. Verifica que los triggers estén instalados (Query de verificación arriba)
2. Revisa los logs de Supabase en Dashboard → Logs
3. Verifica que las RLS policies permitan INSERT en `posts` y `likes`

### El nivel no se actualiza

1. La función `award_xp()` actualiza el nivel automáticamente
2. Refresca la página para ver los cambios
3. Verifica con: `SELECT username, xp, level FROM profiles;`

## 📝 Notas Importantes

- ✅ **El sistema es completamente automático** - No necesitas código adicional
- ✅ **Funciona a nivel de base de datos** - Más seguro y confiable
- ✅ **Las notificaciones son solo UI** - El XP se otorga aunque no las veas
- ✅ **Compatible con usuarios existentes** - Usa el script de migración
- ⚠️ **Los triggers solo funcionan en acciones nuevas** - Usa el script de migración para datos antiguos

---

**¡Listo! Tu sistema de gamificación está funcionando. Los usuarios ahora ganarán XP automáticamente por participar en LEVELY.** 🎉
