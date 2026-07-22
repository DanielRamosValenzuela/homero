# Homero

Harness interno de frontend para Falabella Seguros. Prepara un repositorio para
trabajar con GitHub Copilot o Claude Code usando Tomaco, Figma, contratos,
mocks y verificación con Playwright.

## Requisitos

- Git
- Node.js y `pnpm`
- Un repositorio frontend con `package.json`
- Figma aprobado y un contrato backend (o ejemplos/cURLs) para cada feature

## Instalar

```powershell
pnpm add -D github:DanielRamosValenzuela/homero#v0.1.0
pnpm exec homero init --target . --client both --project-name mi-proyecto
pnpm exec homero discover --target .
pnpm exec homero validate --target . --client both
```

`--client both` instala la configuración para Copilot y Claude Code. Usa
`copilot` o `claude` si solo necesitas uno.

## Instalar Playwright

Homero usa Playwright para que la IA valide los flujos en un navegador real.

```powershell
pnpm exec homero setup playwright --target . --dry-run   # revisa qué se instalará
pnpm exec homero setup playwright --target .             # instala
```

Agrega `@playwright/test`, `@playwright/cli` y `@axe-core/playwright` como
dependencias de desarrollo, e instala Chromium.

## Crear un feature

El árbol Git debe estar limpio antes de crear un feature.

```powershell
pnpm exec homero feature create `
  --target . `
  --id FEAT-042 `
  --name "Cotizador de vida" `
  --figma "https://www.figma.com/design/...?..." `
  --figma-version "approved-v3" `
  --contract-mode contract-draft `
  --contract-source "docs/contracts/quote.openapi.yaml"
```

Esto crea la rama `feature/FEAT-042-cotizador-de-vida` en un **worktree
separado** (una carpeta hermana de tu repo, normalmente
`../.homero-worktrees/<repo>/FEAT-042`) — tu checkout actual no cambia de
rama. El comando imprime la ruta exacta; muévete ahí para trabajar:

```powershell
cd ..\.homero-worktrees\mi-repo\FEAT-042
```

Ahí encontrarás:

```text
features/FEAT-042/
  feature.json
  evidence/playwright-cli.json
specs/FEAT-042-cotizador-de-vida/
  spec.md
  plan.md
  tasks.md
```

Completa `features/FEAT-042/feature.json` antes de pedir implementación:
criterios de aceptación, preguntas abiertas resueltas, mocks de desarrollo (si
consume backend), estados de carga/éxito/vacío/error, y Figma + versión
aprobados. Luego valida:

```powershell
pnpm exec homero feature check --target . --id FEAT-042
```

Bloquea el trabajo si falta Figma, contrato, mocks, criterios, evidencia, o si
no estás parado en la rama del feature.

## Trabajar el feature

Abre Copilot o Claude Code **dentro del worktree del feature** y pide el
trabajo:

```text
Trabaja el feature FEAT-042 usando features/FEAT-042/feature.json.
Usa Tomaco, respeta el Figma aprobado y deja evidencia de Playwright CLI.
```

Si usaste `--client claude` o `--client both`, el agente `homero-coordinator`
ya sabe seguir el loop de tareas por su cuenta. Si prefieres manejarlo tú
mismo (o tu cliente de IA no soporta agentes personalizados), estos son los
comandos:

```powershell
# 1. Agrega las tareas del feature (una vez)
pnpm exec homero task add --target . --id FEAT-042 --title "Armar formulario"
pnpm exec homero task add --target . --id FEAT-042 --title "Agregar validaciones"

# 2. Pide la próxima tarea
pnpm exec homero run --target . --id FEAT-042

# 3. Ciérrala cuando termines...
pnpm exec homero task verify --target . --id FEAT-042 --task T-001 --summary "Formulario armado con Tomaco"

# ...o registra el bloqueo si no pudiste
pnpm exec homero task block --target . --id FEAT-042 --task T-001 --reason "Falta el contrato de backend"

# Repite el paso 2 hasta que no queden tareas
```

`homero run` corta el loop si se supera `runtime.maxIterations` en
`homero.config.json`; `task block` bloquea una tarea de forma definitiva tras
`runtime.maxAttemptsPerTask` intentos. Ninguno de estos comandos llama a un
modelo de IA — son solo el libro de progreso (`features/FEAT-042/state.json` +
`events.ndjson`) que cualquier cliente de IA lee y actualiza entre pasos, lo
que permite retomar el trabajo si una sesión se corta a mitad de camino. Para
ver el estado en cualquier momento:

```powershell
pnpm exec homero task status --target . --id FEAT-042
```

## Verificar el feature

La IA debe guardar screenshots y snapshots de Playwright CLI bajo
`features/FEAT-042/evidence/`. Cuando termine:

```powershell
pnpm exec homero verify --target . --id FEAT-042
```

Ejecuta lint, typecheck, tests y E2E según `homero.config.json`. Si pasan,
genera un receipt bajo `features/FEAT-042/receipts/` para revisión humana.

## Comandos

| Comando | Uso |
| --- | --- |
| `homero init` | Instala Homero y los adapters de IA. |
| `homero discover` | Registra el contexto del proyecto. |
| `homero validate` | Valida la instalación de Homero. |
| `homero setup playwright` | Instala Playwright localmente. |
| `homero feature create` | Crea el worktree, la rama y los artefactos del feature. |
| `homero feature check` | Valida que el feature esté listo para trabajar. |
| `homero task add` | Agrega una tarea de seguimiento al feature. |
| `homero run` | Devuelve la próxima tarea o acción del loop. |
| `homero task verify` | Marca una tarea como completada. |
| `homero task block` | Registra un intento fallido de una tarea. |
| `homero task status` | Muestra fase, iteraciones, tareas y últimos eventos. |
| `homero verify` | Ejecuta verificaciones y genera el receipt. |
| `homero generate form` | Genera un formulario repetitivo por país. |

Usa `pnpm exec homero <comando> --help` para ver los argumentos disponibles.

## Desarrollo local

Dentro de este repositorio:

```powershell
npm run homero -- init --target C:\ruta\al\repo --client both --project-name mi-proyecto
npm run validate:self
```
