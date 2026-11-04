# PantherSound · Luz y Sonido

Sistema de gestión de contratos para eventos, con login, roles, pagos, fotos, PDF y reportes.

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **Backend:** Supabase (Auth, PostgreSQL con RLS, Storage)
- **Hosting:** Cloudflare Pages (exportación estática, 100 % gratis)
- **Funciones:** PDF de contrato, comprobantes/fotos, calendario, reportes y exportación a Excel/CSV

## Roles

| Rol | Permisos |
| --- | --- |
| `admin` | Todo: usuarios, catálogos, contratos, pagos, cancelar y eliminar. |
| `vendedor` | Crear/editar sus contratos, registrar pagos y cancelar sus contratos. |
| `consulta` | Solo lectura de todos los contratos y reportes. |

## Requisitos

- Node.js 20 o superior
- Cuenta de [Supabase](https://supabase.com) (plan Free)
- Cuenta de [Cloudflare](https://cloudflare.com) (Pages Free)
- Repositorio en GitHub

## Desarrollo local

```bash
npm install
cp .env.example .env.local
# Edita .env.local con la URL y la anon key de tu proyecto Supabase
npm run dev
```

Abre <http://localhost:3000>.

Comandos útiles:

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript sin emitir
npm run build      # Genera el sitio estático en out/
```

## Configurar Supabase

### 1. Crear el proyecto

Crea un proyecto en Supabase y guarda:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

La `anon key` es pública; la seguridad depende de las políticas RLS incluidas en la migración. **Nunca** expongas la `service_role key` en el frontend.

### 2. Ejecutar la migración

En el **SQL Editor** de Supabase, pega y ejecuta el contenido de:

```
supabase/migrations/0001_init.sql
```

Esto crea tablas, roles, políticas RLS, la vista de totales, triggers de folio/auditoría, el bucket privado `contracts`, catálogos iniciales y la función `keepalive()`.

### 3. Crear el primer administrador

Opción A — desde el Dashboard:

1. Ve a **Authentication → Users → Add user** y crea `cervantesbv@gmail.com` con contraseña.
2. En el SQL Editor ejecuta:

```sql
select public.bootstrap_admin('cervantesbv@gmail.com');
```

Opción B — con el script (usa la `service_role key`, solo en tu máquina):

```bash
SUPABASE_URL="https://tu-proyecto.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="..." \
ADMIN_EMAIL="cervantesbv@gmail.com" \
ADMIN_PASSWORD="una-contraseña-segura" \
ADMIN_NAME="Administrador" \
node scripts/create-admin.mjs
```

### 4. Desplegar la función de administración de usuarios

La creación/edición de usuarios se hace con una Edge Function que usa la `service_role` del lado del servidor.

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase functions deploy admin-users
```

No necesitas configurar secretos extra: Supabase inyecta `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` automáticamente.

### 5. Configurar URLs de autenticación

En **Authentication → URL Configuration**:

- **Site URL:** `https://panthersound.pages.dev`
- **Redirect URLs:**
  - `https://panthersound.pages.dev/**`
  - `http://localhost:3000/**` (para desarrollo)

Así funcionan la recuperación y el restablecimiento de contraseña.

## Desplegar en Cloudflare Pages

1. Sube el proyecto a GitHub.
2. En Cloudflare → **Workers & Pages → Create → Pages → Connect to Git**.
3. Selecciona el repositorio y configura:
   - **Framework preset:** Next.js (Static HTML Export)
   - **Build command:** `npm run build`
   - **Build output directory:** `out`
   - **Node version:** 20 o 22 (variable `NODE_VERSION`)
4. Agrega las variables de entorno de producción:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Despliega. El sitio quedará en `https://panthersound.pages.dev` (o el subdominio que elijas).

> El proyecto usa `output: "export"` y `trailingSlash: true`. Todas las rutas se prerenderizan; los detalles usan query params (`/contratos/ver/?id=...`), por lo que no hacen falta reglas de servidor.

### Logo

Coloca tu logo en `public/logo.png`. Si no existe, los PDF usan un recuadro con la palabra «LOGO».

## Mantenimiento gratuito

### Keep-alive (evita la pausa del plan Free)

Supabase pausa proyectos Free tras 7 días sin actividad. El workflow `.github/workflows/keepalive.yml` llama a la función `keepalive()` cada 2 días.

Agrega en GitHub → **Settings → Secrets and variables → Actions**:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Puedes ejecutarlo manualmente desde **Actions → Supabase keep-alive → Run workflow**.

### Respaldos

El workflow `.github/workflows/backup.yml` genera un respaldo semanal con `pg_dump` y lo guarda como artefacto de GitHub durante 30 días.

Agrega el secreto:

- `SUPABASE_DB_URL`: cadena de conexión de **Session pooler** (incluye la contraseña de la base de datos y `?sslmode=require`).

Para restaurar:

```bash
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname "$SUPABASE_DB_URL" supabase-backup-AAAA-MM-DD.dump
```

> El plan Free de Supabase no incluye respaldos automáticos. Descarga los artefactos importantes periódicamente.

## Estructura

```
app/
  (auth)/          Login, recuperar y restablecer contraseña
  (app)/           Dashboard, clientes, catálogos, contratos, calendario,
                   reportes y usuarios
components/        UI compartida, formulario y PDF del contrato
lib/               Supabase, auth, API, tipos y utilidades
supabase/
  migrations/      Esquema completo, RLS, storage y datos iniciales
  functions/       Edge Function admin-users
scripts/           Bootstrap del primer administrador
```

## Notas

- Los montos se guardan en pesos mexicanos (MXN) y se formatean con `Intl.NumberFormat`.
- Los contratos cancelados se muestran en gris en el calendario; pagados en verde; pendientes/parciales en amarillo.
- El folio se genera automáticamente con el trigger `set_contract_folio`.
- La auditoría registra cambios en contratos, pagos, clientes y perfiles.
- Si el proyecto crece, se puede migrar el frontend a un servidor Next.js sin cambiar la base de datos.
