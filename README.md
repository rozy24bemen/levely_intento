# LEVELY

Red social con sistema de niveles y logros.

## 🚀 Configuración Inicial

### 1. Configurar Supabase

1. Ve a [Supabase](https://supabase.com) y crea un nuevo proyecto
2. En la sección **SQL Editor**, ejecuta el script `sql/init.sql`
3. Ve a **Authentication → Providers** y habilita **Email** como proveedor
4. Ve a **Settings → API** y copia:
   - `Project URL`
   - `anon public` key

### 2. Configurar Variables de Entorno

Edita el archivo `.env.local` y añade tus credenciales de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=tu-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Ejecutar en Local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 📦 Estructura del Proyecto

```
levely_intento/
├── app/
│   ├── page.tsx              # Feed principal
│   ├── login/page.tsx        # Autenticación
│   └── layout.tsx
├── components/
│   ├── PostCard.tsx          # Tarjeta de post
│   └── CreatePostForm.tsx    # Formulario para publicar
├── lib/
│   └── supabase/
│       ├── browserClient.ts  # Cliente Supabase para navegador
│       ├── serverClient.ts   # Cliente Supabase para servidor
│       └── middleware.ts     # Middleware de autenticación
├── sql/
│   └── init.sql              # Script de inicialización de BD
├── middleware.ts             # Middleware de Next.js
└── .env.local                # Variables de entorno
```

## ✨ Funcionalidades Implementadas

- ✅ Registro e inicio de sesión con email/contraseña
- ✅ Crear posts (texto)
- ✅ Visualizar feed de posts
- ✅ Sistema de likes
- ✅ Perfiles de usuario con niveles
- ✅ Base de datos con tablas: profiles, posts, likes, achievements
- ✅ Row Level Security (RLS) configurado

## 🔜 Próximos Pasos

1. **Desplegar en Vercel:**
   - Conecta tu repositorio GitHub
   - Añade las variables de entorno en Vercel
   - Deploy automático

2. **Funcionalidades futuras:**
   - Sistema de XP y niveles automático
   - Logros desbloqueables
   - Subir imágenes en posts
   - Página de perfil de usuario
   - Secciones temáticas/comunidades
   - Comentarios en posts

## 🛠️ Tecnologías

- **Next.js 15** (App Router, Server Components)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (PostgreSQL, Auth, Storage)
- **Lucide React** (Iconos)

## 📝 Notas

- El script SQL crea automáticamente un perfil cuando un usuario se registra
- Los likes actualizan automáticamente el contador mediante triggers
- RLS protege los datos según las políticas definidas


```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
