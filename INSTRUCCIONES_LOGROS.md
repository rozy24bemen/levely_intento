# 🏆 Sistema de Logros - Instrucciones de Instalación

## 📋 Paso 1: Ejecutar el Script SQL en Supabase

1. **Abre tu proyecto en Supabase Dashboard**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto LEVELY

2. **Ve al SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"
   - Haz clic en "+ New Query"

3. **Copia y pega el contenido completo del archivo:**
   ```
   sql/achievements-system.sql
   ```

4. **Ejecuta el script**
   - Haz clic en el botón "RUN" (▶️)
   - Deberías ver un mensaje de éxito
   - El script insertará 20 logros predefinidos

## ✅ Paso 2: Verificar la Instalación

Ejecuta estas queries en el SQL Editor:

```sql
-- Ver todos los logros creados
SELECT slug, title, xp_reward, trigger_type, trigger_value
FROM public.achievements
ORDER BY 
  CASE trigger_type
    WHEN 'post_count' THEN 1
    WHEN 'like_received_count' THEN 2
    WHEN 'level' THEN 3
    ELSE 4
  END,
  trigger_value;

-- Ver funciones creadas
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%achievement%'
ORDER BY routine_name;

-- Ver triggers creados
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%achievement%';
```

**Resultado esperado:**
- 20 logros insertados
- 4 funciones de achievement
- 4 triggers activados

## 🏆 Logros Disponibles

### 🎯 Logros Iniciales
| Icono | Nombre | Descripción | XP | Condición |
|-------|--------|-------------|-----|-----------|
| 📝 | ¡Primer Paso! | Publica tu primer post | +50 XP | 1 post |
| ✨ | Identificación Completa | Completa tu biografía | +25 XP | Bio llena |
| ❤️ | Popular | Recibe tu primer like | +10 XP | 1 like |

### ✍️ Hitos de Posts
| Icono | Nombre | Descripción | XP | Condición |
|-------|--------|-------------|-----|-----------|
| ✍️ | Escritor Activo | Publica 10 posts | +100 XP | 10 posts |
| 📚 | Creador de Contenido | Publica 25 posts | +200 XP | 25 posts |
| 🌟 | Influencer | Publica 50 posts | +500 XP | 50 posts |
| 👑 | Leyenda de LEVELY | Publica 100 posts | +1000 XP | 100 posts |

### 💜 Hitos de Likes
| Icono | Nombre | Descripción | XP | Condición |
|-------|--------|-------------|-----|-----------|
| 💙 | Bien Recibido | Recibe 10 likes en total | +75 XP | 10 likes |
| 💜 | Muy Querido | Recibe 50 likes en total | +250 XP | 50 likes |
| ⭐ | Estrella de la Comunidad | Recibe 100 likes en total | +500 XP | 100 likes |
| 🏆 | Ídolo de LEVELY | Recibe 500 likes en total | +1500 XP | 500 likes |

### 🎖️ Hitos de Nivel
| Icono | Nombre | Descripción | XP | Condición |
|-------|--------|-------------|-----|-----------|
| 🎖️ | Veterano | Alcanza nivel 5 | +100 XP | Nivel 5 |
| 🥇 | Experto | Alcanza nivel 10 | +300 XP | Nivel 10 |
| 🎯 | Maestro | Alcanza nivel 25 | +1000 XP | Nivel 25 |
| 💎 | Legendario | Alcanza nivel 50 | +2500 XP | Nivel 50 |

### 🌟 Logros Especiales
| Icono | Nombre | Descripción | XP | Condición |
|-------|--------|-------------|-----|-----------|
| 🌅 | Madrugador | Publica antes de las 6 AM | +50 XP | Post <6 AM |
| 🌙 | Noctámbulo | Publica después de las 12 AM | +50 XP | Post >12 AM |
| 🔥 | Consistencia | Publica durante 7 días seguidos | +200 XP | 7 días streak |

## 🎮 Cómo Funciona

### Desbloqueo Automático
Los logros se desbloquean **automáticamente** mediante triggers de base de datos:

1. **Al crear un post** → Se verifica:
   - Número de posts del usuario (1, 10, 25, 50, 100)
   - Hora del post (madrugador/noctámbulo)

2. **Al recibir un like** → Se verifica:
   - Número total de likes recibidos (1, 10, 50, 100, 500)

3. **Al subir de nivel** → Se verifica:
   - Nivel alcanzado (5, 10, 25, 50)

4. **Al actualizar la bio** → Se verifica:
   - Bio completa (no vacía)

### Recompensas
- **XP Bonus:** Cada logro otorga XP adicional automáticamente
- **Notificación Modal:** Aparece un modal especial cuando desbloqueas un logro
- **Badge en Perfil:** Los logros aparecen en tu perfil (desbloqueados/bloqueados)

## 🎨 UI Implementada

### 1. Grid de Logros en Perfil
- Tarjetas con icono, título, descripción
- Estado visual: desbloqueado (dorado) vs bloqueado (gris con candado)
- Barra de progreso con porcentaje
- Fecha de desbloqueo

### 2. Modal de Logro Desbloqueado
- Aparece automáticamente al desbloquear
- Fondo degradado dorado/naranja
- Icono del logro + trofeo
- Muestra XP bonus ganado
- Auto-dismiss después de 5 segundos

### 3. Sistema de Notificaciones
- Integrado con el sistema de XP existente
- Eventos personalizados: `achievement-unlocked`
- Helper function: `notifyAchievementUnlock()`

## 🧪 Paso 3: Probar el Sistema

### Test Básico - Primer Post

1. **Inicia sesión**
2. **Completa tu biografía** (si no la tienes)
   - Ve a tu perfil → Editar
   - Añade algo en la bio
   - Deberías desbloquear: **"Identificación Completa"** (+25 XP)
3. **Crea tu primer post**
   - Deberías desbloquear: **"¡Primer Paso!"** (+50 XP)
   - Aparecerá un modal dorado con el logro
4. **Ve a tu perfil**
   - Verás el grid de logros
   - 2 logros desbloqueados (dorados)
   - 18 logros bloqueados (grises con candado)

### Test de Likes

1. **Crea otra cuenta o pide a alguien que pruebe**
2. **El otro usuario da like a tu post**
3. **Refresca tu perfil**
   - Deberías desbloquear: **"Popular"** (+10 XP)
   - Verás 3 logros desbloqueados

### Test de Milestones

```sql
-- SOLO PARA TESTING: Simular 10 posts (no usar en producción)
DO $$
DECLARE
  i INTEGER;
  user_id_param UUID := 'TU_USER_ID_AQUI'; -- Reemplaza con tu ID
BEGIN
  FOR i IN 1..10 LOOP
    INSERT INTO posts (author_id, content)
    VALUES (user_id_param, 'Post de prueba ' || i);
  END LOOP;
END $$;
```

Después de ejecutar esto, deberías desbloquear **"Escritor Activo"** (+100 XP).

## 🔧 Personalización

### Añadir Nuevos Logros

```sql
-- Ejemplo: Logro por 200 likes
INSERT INTO public.achievements (slug, title, description, xp_reward, icon, trigger_type, trigger_value)
VALUES ('likes_200', 'Súper Estrella', 'Recibe 200 likes en total', 750, '🌟', 'like_received_count', 200);

-- Luego actualiza la función check_like_achievements() para incluir el nuevo milestone
```

### Cambiar Recompensas de XP

```sql
-- Actualizar XP de un logro existente
UPDATE public.achievements
SET xp_reward = 100
WHERE slug = 'first_post';
```

### Crear Logros Secretos

```sql
-- Logro sin descripción visible
INSERT INTO public.achievements (slug, title, description, xp_reward, icon, trigger_type, trigger_value)
VALUES ('secret_code', '???', NULL, 500, '🔐', 'special', 0);
```

## 🚀 Paso 4: Desplegar

Una vez verificado que todo funciona:

```powershell
git add .
git commit -m "feat: Sistema de logros con 20 achievements y notificaciones"
git push origin master
```

## ❓ Troubleshooting

### Los logros no se desbloquean

1. Verifica que los triggers estén activos:
```sql
SELECT trigger_name, event_object_table, trigger_schema
FROM information_schema.triggers
WHERE trigger_name LIKE '%achievement%';
```

2. Revisa los logs de Supabase Dashboard → Logs

3. Verifica las RLS policies de `achievements` y `user_achievements`

### El modal de logro no aparece

1. Abre la consola del navegador (F12)
2. Busca errores de JavaScript
3. Verifica que `XPNotificationContainer` esté en `layout.tsx`
4. Las animaciones CSS deben estar en `globals.css`

### Los logros no aparecen en el perfil

1. Verifica que el SQL se ejecutó correctamente
2. Comprueba que hay logros en la tabla:
```sql
SELECT COUNT(*) FROM public.achievements;
-- Debería retornar 20
```

3. Verifica las RLS policies:
```sql
-- Los logros deben ser visibles para todos
SELECT * FROM public.achievements LIMIT 1;
```

## 📊 Estadísticas

Ver logros más desbloqueados:

```sql
SELECT 
  a.title,
  a.icon,
  COUNT(ua.id) as unlock_count
FROM achievements a
LEFT JOIN user_achievements ua ON ua.achievement_id = a.id
GROUP BY a.id, a.title, a.icon
ORDER BY unlock_count DESC;
```

Ver usuarios con más logros:

```sql
SELECT 
  p.username,
  COUNT(ua.id) as achievements_count,
  p.level,
  p.xp
FROM profiles p
LEFT JOIN user_achievements ua ON ua.user_id = p.id
GROUP BY p.id, p.username, p.level, p.xp
ORDER BY achievements_count DESC, p.xp DESC
LIMIT 10;
```

---

**¡Sistema de logros listo! Los usuarios ahora tienen objetivos claros y recompensas visuales por su participación en LEVELY.** 🏆✨
