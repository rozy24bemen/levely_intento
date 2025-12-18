# Memoria de Desarrollo - LEVELY

**Fecha de inicio:** Diciembre 2025  
**Proyecto:** Sistema de Chat Grupal y Mejoras Generales

---

## 📋 Índice
1. [Errores Iniciales de Deploy](#errores-iniciales-de-deploy)
2. [Sistema de Monedas](#sistema-de-monedas)
3. [Sistema de Chat Grupal](#sistema-de-chat-grupal)
4. [Mejoras en Tienda de Mascotas](#mejoras-en-tienda-de-mascotas)
5. [Scripts SQL Creados](#scripts-sql-creados)
6. [Problemas y Soluciones](#problemas-y-soluciones)
7. [Estado Actual](#estado-actual)

---

## 🔴 Errores Iniciales de Deploy

### Problema 1: TypeScript en ConversationsList.tsx
**Error:** `Property 'other_user' does not exist on type 'Conversation | GroupConversation'`

**Causa:** El código intentaba acceder a `conversation.other_user` sin verificar primero si era una conversación regular o grupal.

**Solución:**
```typescript
// ANTES: Acceso directo sin type guard
conversation.other_user.username

// DESPUÉS: Con type assertion después de verificación
if ("is_group" in conversation && conversation.is_group) {
  // Es grupo
} else {
  const regularConversation = conversation as Conversation
  regularConversation.other_user.username
}
```

**Archivo modificado:** `components/ConversationsList.tsx` (línea 394)

---

### Problema 2: TypeScript en pets/page.tsx
**Error:** `Expected 1 arguments, but got 2`

**Causa:** La función `updateMissionProgress` se llamaba con 2 argumentos cuando solo acepta 1.

**Solución:**
```typescript
// ANTES
updateMissionProgress('feed_pet', userId)

// DESPUÉS
updateMissionProgress('feed_pet')
```

**Archivo modificado:** `app/pets/page.tsx` (línea 830)

---

## 💰 Sistema de Monedas

### Script SQL: add-coins-to-users.sql
**Propósito:** Dar a todos los usuarios 10,000 monedas iniciales para testing.

```sql
UPDATE public.profiles SET coins = 10000;
```

**Nota:** Requiere que `currency-system.sql` se ejecute primero para crear la columna `coins`.

**Estado:** ✅ Script creado y listo para ejecutar

---

## 👥 Sistema de Chat Grupal

### Estructura de Base de Datos

#### Tabla: `groups`
```sql
- id: UUID (PK)
- name: TEXT
- owner_id: UUID (FK → profiles)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### Tabla: `group_members`
```sql
- id: UUID (PK)
- group_id: UUID (FK → groups)
- user_id: UUID (FK → profiles)
- joined_at: TIMESTAMPTZ
- UNIQUE(group_id, user_id)
```

#### Tabla: `group_messages`
```sql
- id: UUID (PK)
- group_id: UUID (FK → groups)
- sender_id: UUID (FK → profiles)
- content: TEXT
- media_url: TEXT
- media_type: TEXT
- created_at: TIMESTAMPTZ
```

### Función: create_group()

**Firma:**
```sql
create_group(
  p_name TEXT,
  p_owner_id UUID,
  p_member_ids UUID[]
) RETURNS UUID
```

**Funcionalidad:**
1. Crea el grupo con el nombre y owner especificados
2. Añade automáticamente al owner como miembro
3. Itera sobre `p_member_ids` y añade cada miembro al grupo
4. Retorna el UUID del grupo creado

**Uso desde TypeScript:**
```typescript
const { data, error } = await supabase.rpc('create_group', {
  p_name: groupName.trim(),
  p_owner_id: currentUserId,
  p_member_ids: memberIds
})
```

---

## 🐾 Mejoras en Tienda de Mascotas

### Animaciones Implementadas

1. **Animación Flotante de Comida**
```typescript
animate={{ y: [0, -10, 0] }}
transition={{ 
  duration: 2, 
  repeat: Infinity, 
  ease: "easeInOut" 
}}
```

2. **Entrada Escalonada**
```typescript
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: index * 0.1 }}
```

3. **Efecto Hover**
```typescript
whileHover={{ scale: 1.05, y: -5 }}
```

4. **Popup de Compra Mejorado**
- Animación spring para entrada
- Muestra costo del item
- Feedback visual al comprar

**Archivo modificado:** `app/pets/page.tsx`

---

## 📄 Scripts SQL Creados

### 1. groups-system.sql (163 líneas)
**Contenido:**
- Creación de tablas: `groups`, `group_members`, `group_messages`
- Índices para optimización de consultas
- Políticas RLS (Row Level Security)
- Función `create_group()` con SECURITY DEFINER

**Historial de cambios:**
- ✅ Versión inicial con tablas y función
- ✅ Fix: Cambio de `group_conversations` → `groups`
- ✅ Fix: Política RLS para evitar recursión infinita
- ✅ Fix: Políticas RLS con EXISTS para mejor rendimiento

### 2. add-coins-to-users.sql
**Contenido:**
- UPDATE simple para dar 10,000 monedas a todos los usuarios

**Dependencias:** Requiere `currency-system.sql` ejecutado primero

---

## 🔧 Problemas y Soluciones

### Problema 1: Infinite Recursion en RLS
**Error:** `infinite recursion detected in policy for relation group_members`

**Causa Original:**
```sql
CREATE POLICY "Users can view group members"
  USING (
    auth.uid() = user_id OR 
    auth.uid() IN (SELECT user_id FROM group_members WHERE ...)
  );
```
La política consultaba la misma tabla que estaba protegiendo, causando recursión.

**Primera Solución (temporal):**
```sql
USING (true)
```
Permitía ver todos los miembros sin restricción.

**Solución Final:**
```sql
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid()
  )
)
```
Usa EXISTS con alias de tabla para evitar recursión.

---

### Problema 2: Parámetros Incorrectos en RPC
**Error:** `Could not find the function public.create_group(member_ids, owner)`

**Causa:** Nombres de parámetros no coincidían entre SQL y TypeScript.

**Solución:**
- SQL define: `p_name`, `p_owner_id`, `p_member_ids`
- TypeScript debe usar exactamente los mismos nombres:
```typescript
supabase.rpc('create_group', { 
  p_name: groupName.trim(),
  p_owner_id: currentUserId, 
  p_member_ids: memberIds 
})
```

---

### Problema 3: Nombre de Tabla Incorrecto
**Error:** Referencias a `group_conversations` en lugar de `groups`

**Archivos afectados:**
- `components/ConversationsList.tsx`
- `components/ChatWindow.tsx`

**Solución:** Cambio global de `.from('group_conversations')` → `.from('groups')`

---

### Problema 4: Mensajes de Grupo sin Nombre de Remitente
**Error:** Mensajes se enviaban pero sin mostrar quién los envió en tiempo real.

**Causa:** La suscripción en tiempo real recibía el mensaje pero no enriquecía el objeto con el `sender_username`.

**Solución en ChatWindow.tsx:**
```typescript
.on('postgres_changes', { 
  event: 'INSERT', 
  table: 'group_messages', 
  filter: `group_id=eq.${groupId}` 
}, async (payload) => {
  const newMsg = payload.new as any
  
  // Cargar perfil del remitente
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('id', newMsg.sender_id)
    .single()
  
  // Enriquecer mensaje con username
  const enrichedMsg = {
    ...newMsg,
    sender_username: senderProfile?.username
  }
  
  setMessages(prev => [...prev, enrichedMsg])
})
```

---

### Problema 5: Grupos No Aparecen para Usuarios Invitados
**Error:** Al crear un grupo, solo el creador lo ve. Los miembros invitados no ven el grupo ni con recarga.

**Diagnóstico:** Políticas RLS demasiado restrictivas o con subconsultas problemáticas.

**Solución Aplicada:**
```sql
-- Política para ver grupos (mejorada)
CREATE POLICY "Users can view their groups"
  ON public.groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_members.group_id = groups.id 
      AND group_members.user_id = auth.uid()
    )
  );
```

**Estado Actual:** 🔄 En debugging
- Agregados logs de console para rastrear:
  - Creación de grupo: 🎯
  - Resultado de creación: ✅
  - Miembros después de creación: 👥
  - Group memberships al cargar: 🔍
  - Group IDs encontrados: 📋
  - Grupos cargados: 👥

---

## 🚀 Sistema en Tiempo Real

### Suscripciones Configuradas

#### En ConversationsList.tsx
```typescript
// Mensajes 1:1
.on('postgres_changes', { event: 'INSERT', table: 'messages' })

// Mensajes de grupo
.on('postgres_changes', { event: 'INSERT', table: 'group_messages' })

// Nuevos grupos
.on('postgres_changes', { event: 'INSERT', table: 'groups' })

// Nuevos miembros
.on('postgres_changes', { event: 'INSERT', table: 'group_members' })
```

#### En ChatWindow.tsx
```typescript
// Para mensajes 1:1
.on('postgres_changes', { 
  event: 'INSERT', 
  table: 'messages',
  filter: `conversation_id=eq.${conversationId}`
})

// Para mensajes de grupo (con enriquecimiento)
.on('postgres_changes', { 
  event: 'INSERT', 
  table: 'group_messages',
  filter: `group_id=eq.${groupId}`
}, async (payload) => {
  // Cargar username del remitente
  // Agregar a mensajes con deduplicación
})
```

---

## 💻 Componentes Clave

### CreateGroupModal.tsx (181 líneas)
**Funcionalidades:**
- ✅ Input para nombre personalizado del grupo (máx 50 caracteres)
- ✅ Búsqueda de usuarios en tiempo real
- ✅ Selección de hasta 2 usuarios adicionales (máx 3 miembros total)
- ✅ Validación: nombre requerido
- ✅ Limpieza de formulario después de crear
- ✅ Redirección automática al chat del grupo creado
- 🔄 Logs de debug para verificar creación

### ConversationsList.tsx (394 líneas)
**Funcionalidades:**
- ✅ Carga de conversaciones 1:1
- ✅ Carga de conversaciones grupales
- ✅ Type guards para diferenciar tipos de conversación
- ✅ Suscripciones en tiempo real a 4 tablas
- ✅ Contador de mensajes no leídos
- ✅ Ordenamiento por última actividad
- 🔄 Logs de debug para group memberships y groups

### ChatWindow.tsx (518 líneas)
**Funcionalidades:**
- ✅ Interfaz unificada para chats 1:1 y grupales
- ✅ Envío de mensajes con insert directo a `group_messages`
- ✅ Carga de historial de mensajes con usernames
- ✅ Suscripción en tiempo real con enriquecimiento de datos
- ✅ Display de nombre de remitente en mensajes de grupo
- ✅ Scroll automático a nuevo mensaje

---

## 📊 Estado Actual

### ✅ Completado
- [x] Fix de errores TypeScript de deploy
- [x] Creación de scripts SQL para monedas y grupos
- [x] Implementación de función `create_group()`
- [x] Eliminación de recursión infinita en RLS
- [x] Agregado de input para nombre de grupo personalizado
- [x] Implementación completa de tiempo real para mensajes de grupo
- [x] Enriquecimiento de mensajes con sender_username
- [x] Actualizaciones en tiempo real de lista de conversaciones
- [x] Animaciones mejoradas en tienda de mascotas
- [x] Cambio completo de `group_conversations` → `groups`

### 🔄 En Proceso
- [ ] Debugging: Grupos no aparecen para usuarios invitados
- [ ] Verificación de ejecución correcta de `create_group()`
- [ ] Validación de políticas RLS en producción

### ⏳ Pendiente
- [ ] Ejecutar `groups-system.sql` actualizado en Supabase
- [ ] Probar creación de grupos con logs de console
- [ ] Verificar que los miembros vean sus grupos
- [ ] Fix del error 500 al enviar mensajes en grupo
- [ ] Testing completo del flujo de grupos

### 🐛 Problemas Conocidos

#### Problema Activo 1: Grupos No Visibles
**Descripción:** Al crear un grupo, los usuarios invitados no lo ven en su lista de mensajes.

**Posibles causas:**
1. Políticas RLS bloqueando lectura de `groups` o `group_members`
2. La función `create_group()` no está insertando correctamente en `group_members`
3. El frontend no está cargando correctamente después de la creación

**Próximos pasos:**
1. Ejecutar SQL actualizado en Supabase
2. Crear grupo y revisar logs en console (F12)
3. Verificar en Supabase Table Editor:
   - Que el grupo existe en `groups`
   - Que todos los miembros están en `group_members`
4. Probar políticas RLS manualmente en SQL Editor

#### Problema Activo 2: Error 500 al Enviar Mensajes
**Descripción:** `Failed to load resource: the server responded with a status of 500`

**Hipótesis:** Probablemente relacionado con políticas RLS de `group_messages` o con el envío del mensaje antes de que el usuario tenga acceso al grupo.

**Pendiente:** Investigar después de resolver Problema 1.

---

## 📝 Commits Importantes

1. **Fix TypeScript errors**
   - Corregidos errores en ConversationsList.tsx y pets/page.tsx
   - Deploy exitoso después de esto

2. **Add group chat functionality**
   - Creados scripts SQL completos
   - Implementada UI para crear grupos

3. **Fix: Infinite recursion in RLS policies**
   - Cambio de política a `USING (true)` temporalmente

4. **Add: Custom group names**
   - Input field para nombres personalizados
   - Validación de nombre requerido

5. **Add: Real-time group messages with sender names**
   - Enriquecimiento de mensajes en tiempo real
   - Display de sender_username en UI

6. **Fix: Corregir políticas RLS de grupos**
   - Uso de EXISTS en lugar de IN/subconsultas
   - Mejora de rendimiento y corrección de lógica

7. **Debug: Agregar logs para identificar problema**
   - Console.logs estratégicos en creación y carga
   - Preparación para debugging profundo

---

## 🎯 Objetivos Futuros

### Corto Plazo
1. Resolver problema de visibilidad de grupos
2. Permitir envío de mensajes sin error 500
3. Probar flujo completo end-to-end

### Mediano Plazo
1. Agregar/remover miembros de grupos existentes
2. Cambiar nombre de grupo
3. Abandonar grupo
4. Notificaciones de nuevos mensajes grupales
5. Fotos de perfil en headers de grupo

### Largo Plazo
1. Mensajes con media (imágenes, archivos)
2. Reacciones a mensajes
3. Mensajes de voz
4. Videollamadas grupales
5. Encuestas en grupos

---

## 📚 Recursos y Referencias

### Documentación Consultada
- Supabase RLS Policies: https://supabase.com/docs/guides/auth/row-level-security
- Supabase Real-time: https://supabase.com/docs/guides/realtime
- PostgreSQL Arrays: https://www.postgresql.org/docs/current/arrays.html
- TypeScript Type Guards: https://www.typescriptlang.org/docs/handbook/2/narrowing.html

### Archivos Clave del Proyecto
- `sql/groups-system.sql` - Schema completo de grupos
- `sql/add-coins-to-users.sql` - Script de monedas
- `components/CreateGroupModal.tsx` - UI creación de grupos
- `components/ConversationsList.tsx` - Lista de chats
- `components/ChatWindow.tsx` - Interfaz de mensajería
- `app/pets/page.tsx` - Tienda de mascotas con animaciones

---

## 🔍 Notas Técnicas

### Decisiones de Diseño

**¿Por qué SECURITY DEFINER en create_group()?**
- Permite que la función ejecute con permisos del creador de la función
- Necesario para insertar en `group_members` sin que RLS bloquee
- Evita tener que dar permisos de INSERT a todos los usuarios

**¿Por qué EXISTS en lugar de IN para RLS?**
- EXISTS es más eficiente para verificación de existencia
- Evita problemas de recursión al usar alias de tabla
- Mejor rendimiento con índices

**¿Por qué insert directo en group_messages en lugar de RPC?**
- Más simple y directo para operaciones básicas
- Las políticas RLS ya validan permisos
- Reduce latencia al eliminar round-trip extra

**¿Por qué enriquecer mensajes en el cliente en lugar del servidor?**
- Real-time subscriptions no permiten JOINs complejos
- Cliente puede cachear perfiles para reducir requests
- Más flexible para UI personalizada

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────┐
│              Frontend (Next.js)                 │
│                                                 │
│  ┌────────────┐  ┌─────────────┐  ┌──────────┐│
│  │Conversations│  │ ChatWindow  │  │ Create   ││
│  │   List     │  │             │  │ Group    ││
│  └────────────┘  └─────────────┘  └──────────┘│
│         │               │               │       │
│         └───────────────┼───────────────┘       │
│                         │                       │
└─────────────────────────┼───────────────────────┘
                          │
                    Supabase API
                          │
┌─────────────────────────┼───────────────────────┐
│                         │                       │
│              PostgreSQL Database                │
│                                                 │
│  ┌────────┐  ┌─────────────┐  ┌──────────────┐│
│  │ groups │  │group_members│  │group_messages││
│  └────────┘  └─────────────┘  └──────────────┘│
│      │              │                  │        │
│      └──────────────┼──────────────────┘        │
│                     │                           │
│           ┌─────────┴────────┐                  │
│           │   RLS Policies   │                  │
│           └──────────────────┘                  │
│                     │                           │
│           ┌─────────┴────────┐                  │
│           │  Real-time Subs  │                  │
│           └──────────────────┘                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📞 Contacto y Soporte

**Desarrollador:** GitHub Copilot + Usuario  
**Repositorio:** rozy24bemen/levely_intento  
**Rama Principal:** master

---

*Última actualización: 18 de Diciembre, 2025*
*Versión del documento: 1.0*
