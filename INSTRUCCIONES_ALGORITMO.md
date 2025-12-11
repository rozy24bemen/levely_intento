# 🎯 Sistema de Recomendaciones - Instrucciones de Instalación

## 📋 Paso 1: Ejecutar el Script SQL en Supabase

1. **Abre tu proyecto en Supabase Dashboard**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto LEVELY

2. **Ve al SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"
   - Haz clic en "+ New Query"

3. **Copia y pega el contenido completo del archivo:**
   ```
   sql/recommendation-system.sql
   ```

4. **Ejecuta el script**
   - Haz clic en el botón "RUN" (▶️)
   - Deberías ver un mensaje de éxito
   - El script creará las tablas y funciones necesarias

## ✅ Paso 2: Verificar la Instalación

Ejecuta estas queries en el SQL Editor para verificar que todo se instaló correctamente:

```sql
-- Ver las tablas creadas
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('user_interactions', 'post_scores', 'short_scores')
ORDER BY table_name;

-- Ver las funciones creadas
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'calculate_personalized_posts_feed',
    'calculate_personalized_shorts_feed',
    'track_user_interaction',
    'recalculate_content_scores'
  )
ORDER BY routine_name;
```

**Resultado esperado:**
- 3 tablas: `user_interactions`, `post_scores`, `short_scores`
- 4 funciones: las listadas arriba

## 🎮 Cómo Funciona el Sistema

### Tracking Automático de Interacciones

El sistema ahora trackea automáticamente:

| Acción | Se Registra | Peso |
|--------|-------------|------|
| Ver post/short | Después de 2 segundos | 1.0 |
| Dar like | Al hacer click | 3.0 |
| Comentar | Al abrir comentarios | 5.0 |
| Compartir | Al compartir | 7.0 |
| Tiempo de visualización | Al salir del contenido | 2.0 |

### Algoritmo de Recomendación

#### Para Posts (Feed "Para Ti"):
```
Score = (Engagement × 0.4) + (Recency × 0.3) + (Following Bonus × 0.2) + (Interest × 0.1)

Donde:
- Engagement = likes × 3 + comments × 5 + (video bonus = 10)
- Recency = decaimiento exponencial basado en tiempo
- Following Bonus = 50 si sigues al autor
- Interest = 5 × número de likes que le diste a ese autor
```

#### Para Shorts:
```
Score = (Engagement × 0.5) + (Recency × 0.25) + (Following × 0.15) + (Interest × 0.1)

Engagement = likes × 4 + comments × 6 + views × 0.5
```

### Características Implementadas

✅ **Feed con Tabs:**
- **"Para Ti"**: Contenido personalizado según algoritmo
- **"Siguiendo"**: Posts de usuarios que sigues (feed tradicional)

✅ **Shorts Personalizados:**
- Videos recomendados basados en tus interacciones
- No se repiten videos vistos en últimos 3 días

✅ **Tracking Invisible:**
- Todo el tracking se hace en background
- No afecta la experiencia del usuario
- Se trackea tiempo de visualización de videos

## 🧪 Paso 3: Probar el Sistema

### Test Inicial

1. **Inicia sesión en la aplicación**
2. **Navega por el feed principal**
   - Verás dos tabs: "Para Ti" y "Siguiendo"
   - "Para Ti" mostrará posts recomendados
3. **Interactúa con posts:**
   - Dale like a algunos posts
   - Comenta en algunos
   - Abre posts de ciertos autores
4. **Espera unos minutos y recarga**
   - El algoritmo aprenderá de tus interacciones
   - Verás contenido más personalizado

### Test de Shorts

1. **Ve a la sección Shorts**
2. **Mira algunos videos completos**
3. **Dale like a los que te gusten**
4. **Salta (scroll) los que no te gusten**
5. **La próxima vez que entres:**
   - Verás shorts similares a los que te gustaron
   - No verás los que saltaste recientemente

## 🔄 Mantenimiento (Opcional)

### Recalcular Scores Periódicamente

Para mejor performance, puedes ejecutar esto diariamente (via cron job o manualmente):

```sql
-- Recalcular todos los scores de posts y shorts
SELECT recalculate_content_scores();
```

Esto precalcula los scores para que las queries sean más rápidas.

### Ver Estadísticas de Interacciones

```sql
-- Ver interacciones por usuario
SELECT 
  p.username,
  ui.interaction_type,
  COUNT(*) as count
FROM user_interactions ui
JOIN profiles p ON ui.user_id = p.id
WHERE ui.created_at > NOW() - INTERVAL '7 days'
GROUP BY p.username, ui.interaction_type
ORDER BY count DESC;

-- Ver posts más populares
SELECT 
  p.content,
  ps.total_score,
  p.likes_count,
  p.comments_count
FROM posts p
JOIN post_scores ps ON p.id = ps.post_id
ORDER BY ps.total_score DESC
LIMIT 10;
```

## 📊 Métricas del Sistema

El sistema considera:

### Para Usuarios Nuevos:
- Muestra contenido reciente y popular
- No filtra por interacciones (aún no tienen)
- Prioriza posts con media (imágenes/videos)

### Para Usuarios Activos:
- Aprende de sus likes y comentarios
- Prioriza autores con los que interactúan
- Balancea contenido de seguidos con descubrimiento

### Filtros Automáticos:
- ❌ No muestra tus propios posts en "Para Ti"
- ❌ No repite posts vistos en últimos 7 días
- ❌ No repite shorts vistos en últimos 3 días
- ✅ Prioriza contenido de usuarios que sigues
- ✅ Prioriza contenido de autores con los que interactúas

## 🚀 Próximas Mejoras (Futuras)

- **Infinite Scroll**: Cargar más contenido al scrollear
- **Categorías/Tags**: Clasificar contenido por temas
- **Análisis de Texto**: Entender contenido de posts para mejores recomendaciones
- **Collaborative Filtering**: "Usuarios como tú también disfrutaron..."
- **A/B Testing**: Probar diferentes pesos en el algoritmo

## ❓ Troubleshooting

### El feed "Para Ti" está vacío

1. Verifica que la función SQL se haya creado correctamente
2. El usuario debe tener al menos algunos posts en la BD
3. Si es usuario nuevo, dale like a algunos posts primero

### Los shorts no se recomiendan bien

1. El sistema necesita datos de interacciones
2. Dale like a shorts que te gusten
3. Mira varios shorts completos (se trackea watch time)

### Las interacciones no se registran

1. Verifica en la consola del navegador si hay errores
2. Revisa que la función `track_user_interaction` exista en Supabase
3. Verifica las políticas RLS en la tabla `user_interactions`

## 📝 Notas Importantes

- ✅ **El sistema es completamente automático** - No requiere configuración adicional
- ✅ **Funciona a nivel de base de datos** - Más seguro y escalable
- ✅ **Compatible con tu arquitectura actual** - No rompe nada existente
- ✅ **Se puede desactivar** - Solo cambia los tabs por el feed tradicional
- ✅ **Privacy-friendly** - Solo trackea interacciones, no datos personales

---

**¿Necesitas ayuda?** Revisa los logs de Supabase en Dashboard → Logs para ver errores.
