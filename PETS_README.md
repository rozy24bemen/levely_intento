# 🐾 Sistema de Mascotas - LEVELY

## 📋 Resumen

Sistema de mascotas que otorga bonificaciones de XP al usuario mientras navega por la plataforma. Las mascotas se obtienen abriendo cajas misteriosas, pueden subir de nivel y cada una otorga diferentes bonificaciones según su rareza y nivel.

## 🎯 Características

### Mascotas Disponibles

#### 🌟 Comunes (60% probabilidad)
- 🐱 **Gato** - Felino
- 🐶 **Perro** - Canino
- 🐰 **Conejo** - Roedor

#### 💎 Raras (25% probabilidad)
- 🐼 **Panda** - Oso
- 🦁 **León** - Felino

#### ⚡ Épicas (12% probabilidad)
- 🐯 **Tigre** - Felino
- 🦄 **Unicornio** - Mítico

#### 🔥 Legendarias (3% probabilidad)
- 🐉 **Dragón** - Legendario
- 🔥 **Fénix** - Legendario

### Sistema de Bonificación XP

Las mascotas otorgan bonos de XP automáticos basados en:

**Bonificación Base por Rareza:**
- Común: +5% XP
- Raro: +10% XP
- Épico: +15% XP
- Legendario: +25% XP

**Bonificación por Nivel:**
- +1% XP adicional por cada nivel de la mascota

**Ejemplo:** Un Dragón (Legendario) nivel 10 otorga: 25% + 10% = **35% XP bonus**

### Experiencia de Mascota

Las mascotas ganan experiencia compartida con el usuario:
- **La mascota activa recibe la MISMA cantidad de XP que gana el usuario** (incluyendo el bonus)
- Ejemplo: Si ganas 10 XP y tienes +30% bonus = 13 XP → Tu mascota también gana 13 XP
- Al alcanzar el XP máximo, la mascota sube de nivel automáticamente
- Cada nivel aumenta el requisito de XP en 50 puntos
- Nivel 1: 100 XP requerido
- Nivel 2: 150 XP requerido
- Nivel 3: 200 XP requerido
- Y así sucesivamente...

### Colección de Mascotas

- 📚 **Todas las mascotas disponibles se muestran en la colección**
- 🔒 **Mascotas bloqueadas** aparecen con candado y borrosas
- ✨ **Ordenadas por rareza**: Común → Raro → Épico → Legendario
- 📊 **Contador de progreso**: X/9 mascotas desbloqueadas
- 🎁 Las mascotas bloqueadas muestran "Abre cajas para desbloquear"

## 🚀 Instalación

### 1. Ejecutar Scripts SQL en Supabase

Ejecuta los siguientes scripts en el SQL Editor de Supabase **en este orden**:

#### Script 1: Base de datos de mascotas
```
sql/pets-system.sql
```
Este script crea:
- Tabla `pets`
- Índices para performance
- Políticas RLS
- Función para asegurar solo 1 mascota activa
- Función para level-up automático

#### Script 2: Integración con sistema XP
```
sql/pet-xp-bonus.sql
```
Este script:
- Crea función `get_pet_xp_bonus()` 
- Actualiza función `award_xp()` para aplicar bonos
- Otorga XP a mascotas automáticamente

### 2. Verificar Instalación

Después de ejecutar los scripts, verifica que todo funcione:

```sql
-- Ver tu bonus actual
SELECT get_pet_xp_bonus(auth.uid()) AS "My Pet Bonus";

-- Ver tus mascotas
SELECT * FROM pets WHERE user_id = auth.uid();
```

## 💻 Uso

### Página de Mascotas

Ve a `/pets` para:
- ✨ Abrir cajas misteriosas (5 clics para abrir)
- 🎁 Desbloquear nuevas mascotas
- ⭐ Ver tus mascotas y sus stats
- 🎯 Seleccionar mascota activa
- ⚡ Entrenar mascotas (+50 XP)

### Mascota Flotante

- Aparece en la esquina inferior derecha cuando tienes una mascota activa
- Muestra animación flotante constante
- Hover para ver stats y bonus actual
- Siempre visible (excepto en página de Shorts)

### Navbar

- Nuevo botón "Mascotas" con ícono de corazón
- Acceso rápido a la página de mascotas

## 📦 Componentes Creados

### 1. `contexts/PetContext.tsx`
Context de React para manejar el estado global de mascotas:
- `pets`: Array de todas las mascotas del usuario
- `activePet`: Mascota actualmente activa
- `setActivePet()`: Cambiar mascota activa
- `addPet()`: Agregar nueva mascota
- `addExperience()`: Dar XP a una mascota
- `getXPBonus()`: Calcular bonus actual

### 2. `app/pets/page.tsx`
Página principal de mascotas con:
- Animación de caja misteriosa interactiva
- Sistema de partículas y efectos visuales
- Modal de nueva mascota con confetti
- Grid de todas las mascotas
- Info de mascota activa

### 3. `components/FloatingPet.tsx`
Componente flotante que muestra:
- Mascota activa con animación
- Badge de nivel
- Tooltip con stats al hacer hover
- Barra de progreso de XP
- Bonus actual

## 🎨 Animaciones

Todas las animaciones usan **Framer Motion** (`motion` library):

### Caja Misteriosa
1. **5 clics requeridos** - Cada clic genera:
   - Shake/vibración de la caja
   - 20 partículas de colores
   - Anillos circulares expansivos
   - Indicador de progreso

2. **Apertura final** - Al 5to clic:
   - Explosión de 100 partículas
   - Rotación de 720 grados
   - Scale up y desvanecimiento
   - Modal con confetti (50 piezas)

### Mascota Flotante
- Movimiento vertical constante (bounce)
- Glow effect pulsante
- Tooltip animado con spring physics
- Badge rotante de nivel

## 🔧 Configuración Técnica

### Base de Datos

**Tabla: `pets`**
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users
name TEXT
type TEXT
rarity TEXT (common|rare|epic|legendary)
emoji TEXT
color TEXT
level INTEGER DEFAULT 1
experience INTEGER DEFAULT 0
max_experience INTEGER DEFAULT 100
is_active BOOLEAN DEFAULT false
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**Índices:**
- `idx_pets_user_id` - Lookup por usuario
- `idx_pets_is_active` - Filtro de mascota activa
- `idx_pets_created_at` - Ordenamiento

**Triggers:**
- `on_pet_activate` - Asegura solo 1 mascota activa
- `on_pet_experience_update` - Level-up automático

### RLS Policies

Todas las operaciones requieren autenticación y solo permiten acceso a las propias mascotas del usuario.

## 📊 Flujo del Sistema

### 1. Usuario Abre Caja
```
Usuario hace 5 clics → Genera rareza aleatoria → 
Selecciona mascota de esa rareza → Guarda en DB → 
Muestra modal de celebración
```

### 2. Usuario Gana XP
```
Acción genera XP (post, like, etc.) → 
award_xp() obtiene bonus de mascota → 
Aplica multiplicador (ej: 10 XP + 30% = 13 XP) → 
Actualiza perfil con XP final → 
Da MISMA cantidad (13 XP) a mascota activa → 
Trigger verifica level-up de mascota
```

### 3. Mascota Sube de Nivel
```
XP mascota >= max_experience → 
Trigger incrementa level → 
Resta max_experience del XP actual → 
Aumenta max_experience en 50 → 
Actualiza bonus del usuario
```

## 🎮 Interacciones del Usuario

### En la Página de Mascotas
1. **Abrir Caja** - Click en botón "Abrir Caja"
2. **5 Clics** - Click en la caja 5 veces para abrir
3. **Ver Mascota Nueva** - Modal automático con animación
4. **Seleccionar Mascota** - Click en "Seleccionar" en cualquier mascota
5. **Entrenar** - Click en "Entrenar" para dar +50 XP

### En Toda la Plataforma
- Mascota flotante siempre visible (excepto Shorts)
- Hover sobre mascota flotante para ver stats
- Bonus se aplica automáticamente a todo XP ganado

## 🐛 Troubleshooting

### La mascota no aparece flotante
✅ Verifica que tengas una mascota activa en `/pets`
✅ Check que PetProvider esté en el layout
✅ Asegúrate de no estar en `/shorts`

### El bonus no se aplica
✅ Ejecuta `sql/pet-xp-bonus.sql` en Supabase
✅ Verifica que `award_xp()` esté actualizada
✅ Check que tengas una mascota activa

### No puedo abrir cajas
✅ Verifica que estés autenticado
✅ Check RLS policies en tabla pets
✅ Revisa console para errores

## 📈 Próximas Mejoras Posibles

- 🎁 Sistema de cooldown para cajas (1 caja cada X horas)
- 🏆 Evoluciones especiales de mascotas
- 🤝 Trading de mascotas entre usuarios
- 🎯 Misiones especiales para mascotas
- 💰 Tienda de mascotas premium
- 🌟 Skins/accesorios para mascotas
- 📊 Estadísticas detalladas de mascotas
- 🏅 Tabla de líderes de coleccionistas

## 🎉 ¡Listo!

El sistema de mascotas está completamente funcional. Los usuarios pueden:
- ✅ Abrir cajas y desbloquear mascotas
- ✅ Seleccionar mascota activa
- ✅ Recibir bonos de XP automáticos
- ✅ Entrenar y subir de nivel sus mascotas
- ✅ Ver su mascota flotante mientras navegan
- ✅ Coleccionar todas las raridades

¡Disfruta del sistema de mascotas! 🐾
