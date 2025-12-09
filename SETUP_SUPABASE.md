# Instrucciones para configurar Supabase

## IMPORTANTE: Debes ejecutar estos comandos SQL en tu proyecto de Supabase

### 1. Ve a tu proyecto en Supabase Dashboard
- Abre https://supabase.com/dashboard
- Selecciona tu proyecto
- Ve a "SQL Editor" en el menú lateral

### 2. Ejecuta los siguientes scripts SQL en orden:

#### A. Sistema de notificaciones (NUEVO - EJECUTAR PRIMERO)
```sql
-- Ejecuta todo el contenido del archivo: sql/notifications_system.sql
```
Este script crea:
- Tabla `notifications` con RLS
- Triggers automáticos para notificaciones de:
  - Ganancia de XP
  - Subida de nivel
  - Nuevos mensajes
  - Me gusta en publicaciones
  - Nuevos seguidores
- Realtime habilitado

#### B. Agregar soporte para imágenes en mensajes
```sql
-- Ejecuta todo el contenido del archivo: sql/add_image_support.sql
```

#### C. Agregar soporte para eliminar mensajes
```sql
-- Ejecuta todo el contenido del archivo: sql/add_delete_support.sql
```

### 3. Verificar que el bucket de Storage fue creado
- Ve a "Storage" en el menú lateral de Supabase
- Deberías ver un bucket llamado "message-images"
- Si no aparece, ejecuta manualmente:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-images', 'message-images', true)
ON CONFLICT (id) DO NOTHING;
```

### 4. Verificar las políticas de Storage
Ve a Storage > message-images > Policies y verifica que existan 3 políticas:
- "Users can upload message images" (INSERT)
- "Anyone can view message images" (SELECT)
- "Users can delete their own message images" (DELETE)

### 5. Una vez completado
Las funcionalidades de imágenes y eliminación de mensajes estarán activas automáticamente.

---

## Notas adicionales:

### Si tienes errores 406 en likes:
Verifica que la tabla `likes` tenga las políticas RLS correctas y que las consultas incluyan los headers apropiados.

### Si los mensajes no aparecen:
1. Verifica que Realtime esté habilitado para la tabla `messages`
2. Ve a Database > Replication y activa la tabla `messages`
3. Ve a Database > Publications y verifica que `supabase_realtime` incluya `messages`
