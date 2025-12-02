# Configuración de URLs de Autenticación en Supabase

## 🎯 Objetivo
Configurar Supabase para que al confirmar el email, el usuario sea redirigido automáticamente a tu app con la sesión iniciada.

## 📋 Paso 1: Configurar Site URL y Redirect URLs

1. Ve a tu proyecto en Supabase Dashboard
2. Ve a **Authentication → URL Configuration**
3. Configura lo siguiente:

### Site URL (URL principal de tu app)
**Para producción:**
```
https://tu-proyecto.vercel.app
```
(Reemplaza `tu-proyecto` con el nombre real de tu app en Vercel)

**Para desarrollo local:**
```
http://localhost:3000
```

### Redirect URLs (añade AMBAS líneas)
```
https://tu-proyecto.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

💡 **Importante:** Cambia `tu-proyecto` por tu URL real de Vercel

---

## 📧 Paso 2: Personalizar Email Template (Opcional pero Recomendado)

### Opción A: Email Simple (texto plano)

1. Ve a **Authentication → Email Templates**
2. Selecciona **"Confirm signup"**
3. **Subject (Asunto):**
```
Confirma tu cuenta en LEVELY 🚀
```

4. **Body (Cuerpo):**
```html
<h2>¡Bienvenido a LEVELY!</h2>
<p>Gracias por unirte a nuestra comunidad.</p>
<p>Haz clic en el botón para confirmar tu cuenta:</p>
<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Confirmar mi cuenta</a></p>
<p>O copia este enlace: {{ .ConfirmationURL }}</p>
<p><strong>Este enlace expira en 24 horas.</strong></p>
```

### Opción B: Email Profesional (diseño completo)

Copia el contenido del archivo `email-templates/confirmation-email.html` que acabamos de crear.

---

## ✅ Paso 3: Verificar que funciona

Ya creamos el archivo `/app/auth/callback/route.ts` que procesa la confirmación automáticamente.

### Flujo de confirmación:
1. Usuario se registra
2. Recibe email de confirmación
3. Hace clic en el enlace
4. Es redirigido a `/auth/callback`
5. El sistema confirma la cuenta automáticamente
6. Redirección a home con sesión iniciada y mensaje de bienvenida

---

## 🔧 Solución de Problemas

### Error: "Email link is invalid or has expired"
**Causa:** El Site URL no coincide con donde hiciste clic en el link.

**Solución:**
- Si estás en producción, asegúrate de que Site URL sea tu URL de Vercel
- Si estás en local, cambia Site URL a `http://localhost:3000`

### El email no llega
**Solución:**
1. Revisa spam/correo no deseado
2. Verifica que el email esté bien escrito
3. En Supabase Dashboard → Authentication → Users, verifica que el usuario aparezca

### Redirect loop (bucle infinito)
**Solución:**
- Asegúrate de que `/auth/callback` esté en Redirect URLs
- Limpia cookies del navegador
- Verifica que las variables de entorno estén correctas en Vercel

---

## 📝 Notas Finales

- ✅ Ya creamos el callback handler en `app/auth/callback/route.ts`
- ✅ Ya agregamos el mensaje de confirmación en el home
- ✅ Ya mejoramos el manejo de errores en login
- ✅ Recuerda hacer commit y push después de configurar Supabase
