# Actualización manual del cliente

El cliente de Tauri es un WebView (esencialmente un Chrome sin barra de URL) que apunta al servidor. La mayoría de los cambios que hagas al ERP cada 2 semanas son del lado del servidor — los clientes los ven automáticamente sin tocarlos.

Esta guía es para cuando **sí necesitás redistribuir un cliente nuevo** a los PCs del taller.

## Cuándo hay que actualizar el cliente

Solo cuando algo cambió del lado nativo (no del servidor):

- Cambió la URL o IP del servidor (mudanza, DHCP)
- Cambiaste el puerto (3000 → otro)
- Cambiaste el comportamiento del descubrimiento UDP
- Patch de seguridad de Tauri o WebView2
- Cambios en la ventana nativa (título, tamaño, branding)
- Agregaste un comando nativo nuevo (imprimir directo, archivo local, etc.)

**NO necesitás actualizar el cliente cuando:**

- Cambias UI, pantallas, formularios (es Next.js, server-side)
- Agregás columnas a la base de datos (Prisma migration, server-side)
- Cambiás lógica de negocio, endpoints API (server-side)
- Cambiás PDFs, exports, reportes (server-side)

En la práctica, con un ERP con UI + lógica de negocio, el 95% de los cambios cada 2 semanas son server-side.

## Generar el instalador nuevo

Tenés dos caminos para producir el `.msi`:

### Opción A: GitHub Actions (recomendado)

El workflow de CI que armamos ya buildea todas las plataformas. Solo taggeás y descargás.

1. Commiteá los cambios que justifican la actualización del cliente
2. Tag con versionado semántico:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```
3. Esperá a que termine el workflow `Build desktop installers` en GitHub Actions (3-5 min)
4. Andá a la página del run → sección "Artifacts" → bajá `metalu-v0.2.0-x86_64-pc-windows-msvc` (o el artefacto del cliente)
5. Descomprimí el `.zip` — adentro está `Metalu Cliente_0.2.0_x64_en-US.msi`

Esta es la opción más confiable porque GitHub Actions corre en runners Windows con el toolchain MSVC preinstalado.

### Opción B: Build local en una máquina Windows

Si tenés un PC Windows disponible:

```cmd
:: En el PC Windows, con Node 20 + Rust instalados
git clone <repo>
cd metalu
npm ci
npm run build
cd src-tauri
set METALU_BUILD_TARGET=client
npm run tauri build -- --target x86_64-pc-windows-msvc
```

El `.msi` queda en `src-tauri\target\x86_64-pc-windows-msvc\release\bundle\msi\`.

### Opción C: Cross-compile desde Mac

Técnicamente posible pero **no lo recomiendo** — requiere instalar el toolchain MSVC (linker, WiX, WebView2 SDK) en macOS, lo cual es frágil y no soportado oficialmente por Microsoft. Si igual querés intentarlo:

```bash
rustup target add x86_64-pc-windows-msvc
brew install mingw-w64
# Después: complicadísimo de hacer funcionar. Andá a Opción A.
```

Si te trabás acá, perdés horas. Usá GitHub Actions.

## Distribuir a cada PC

Una vez que tenés el `.msi`, tres opciones de distribución:

### Carpeta compartida en el server PC (recomendado)

1. Copiá el `.msi` a una carpeta compartida del server PC (ej: `C:\Updates\`)
2. Compartila en red con permisos de lectura para los usuarios del taller
3. En cada PC cliente: abrí el Explorador de Windows → navegá a `\\<server-ip>\Updates\`
4. Doble click en el `.msi`

### USB

1. Copiá el `.msi` a un USB
2. Llevá el USB a cada PC
3. Doble click desde el USB

### Anydesk / RDP

1. Abrí sesión remota en cada PC
2. Transferí el archivo desde tu Mac
3. Instalá remotamente

## Instalar en cada PC

1. **Doble click en el `.msi`**
2. Windows te muestra el cartelón amarillo de SmartScreen: "Windows protected your PC"
   - Esto es normal — el instalador no tiene cert de firma digital (decidiste no pagar uno)
   - Click en **"More info"**
   - Click en **"Run anyway"**
3. Wizard de instalación: **Next → Install → Finish**
4. La versión vieja se reemplaza automáticamente (Windows installer maneja la actualización in-place)
5. El ícono "Metalu Cliente" sigue en el escritorio

**Tiempo por PC: ~2 minutos.** Para 5 PCs: ~10-15 minutos total.

## Verificar que funcionó

En cada PC, después de instalar:

1. Doble click en "Metalu Cliente" del escritorio
2. Debería abrir la ventana nativa con el título "Metalu Cliente"
3. Si es primera instalación: aparece el modal "Buscar server" → click → descubre el server automáticamente por UDP
4. Si ya estaba configurado: abre directamente y muestra el login
5. Logueate con tu usuario → debería entrar al dashboard sin errores

Si algo falla, mirá [docs/operations/TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Rollback

Si la versión nueva rompe algo en producción:

1. La versión anterior quedó instalada hasta este momento
2. Reconstruí la versión vieja:
   ```bash
   git checkout v0.1.0   # tag de la versión que funcionaba
   git tag v0.1.0-hotfix # opcional: tag nuevo para el rollback
   git push origin v0.1.0-hotfix
   ```
3. Esperá el CI → descargá el `.msi` viejo
4. Redistribuí a los PCs que se hayan actualizado

**Tip importante:** antes de redistribuir una versión nueva a todos los PCs, instalala primero en UNO solo y verificá que todo funcione durante 24-48 horas. Recién después redistribuí al resto.

## Frecuencia esperada

En la práctica, con un ERP de taller:

- **Cambios cada 2 semanas**: 95% server-side, no tocan al cliente. Workflow: `git pull` en el server + restart → 30 segundos
- **Actualizaciones del cliente**: cada 3-6 meses, solo cuando hay cambios nativos
- **Tiempo total por release de cliente**: ~20-30 minutos para los 5 PCs (incluyendo el CI build de 5 min)

Por eso el flujo manual es totalmente viable para 2-5 PCs. El cert EV (~USD 300-500/año) se justifica a partir de 20+ PCs, no antes.

## Referencia rápida

```bash
# 1. Tag para disparar el CI
git tag v0.2.0 && git push origin v0.2.0

# 2. Bajar artefacto del workflow (GitHub UI)

# 3. Copiar .msi a carpeta compartida del server

# 4. En cada PC: explorador → \\server\Updates\ → doble click → More info → Run anyway
```