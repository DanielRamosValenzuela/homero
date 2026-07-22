# Homero

Harness interno de frontend para Falabella Seguros. Homero prepara repositorios
para trabajar con GitHub Copilot en VS Code y Claude Code usando Tomaco, Figma,
contratos, mocks y verificación con Playwright.

## Requisitos

- Git
- Node.js y `pnpm`
- Un repositorio frontend con `package.json`
- Figma aprobado y un contrato backend, ejemplos o cURLs para cada feature

## Instalar en un repositorio

Ejecuta estos comandos desde la raíz del repositorio frontend:

```powershell
pnpm add -D github:DanielRamosValenzuela/homero#v0.1.0
pnpm exec homero init --target . --client both --project-name mi-proyecto
pnpm exec homero discover --target .
pnpm exec homero validate --target . --client both
```

`--client both` instala la configuración para Copilot en VS Code y Claude Code.
Usa `copilot` o `claude` si solo necesitas uno.

## Instalar Playwright

Homero usa Playwright para que la IA valide los flujos en un navegador real.
Primero revisa qué se instalará:

```powershell
pnpm exec homero setup playwright --target . --dry-run
```

Luego instala Playwright:

```powershell
pnpm exec homero setup playwright --target .
```

Este comando agrega `@playwright/test`, `@playwright/cli` y
`@axe-core/playwright` como dependencias de desarrollo, e instala Chromium.

## Crear un feature

Antes de crear un feature, el árbol Git debe estar limpio. Homero crea una rama
local, pero no hace commits, push, pull requests ni merge.

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

El comando crea una rama como `feature/FEAT-042-cotizador-de-vida` y estos
archivos:

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

- criterios de aceptación;
- preguntas abiertas resueltas;
- mocks de desarrollo, si consume backend;
- estados de carga, éxito, vacío y error;
- Figma y versión aprobados.

Después valida el feature:

```powershell
pnpm exec homero feature check --target . --id FEAT-042
```

El comando bloquea el trabajo si faltan Figma, contrato, mocks, criterios,
evidencia o si no estás en la rama del feature.

## Pedir trabajo a la IA

Abre Copilot o Claude Code dentro del repositorio y usa una instrucción como:

```text
Trabaja el feature FEAT-042 usando features/FEAT-042/feature.json.
Antes de editar, ejecuta homero feature check --target . --id FEAT-042.
Usa Tomaco, respeta el Figma aprobado y deja evidencia de Playwright CLI.
```

Para cambios visuales, Tomaco y Figma son obligatorios. Si el backend no está
listo, la IA debe usar mocks de desarrollo registrados; nunca mocks como fallback
de producción.

## Verificar el feature

La IA debe guardar screenshots y snapshots de Playwright CLI bajo:

```text
features/FEAT-042/evidence/
```

Cuando termine, ejecuta:

```powershell
pnpm exec homero verify --target . --id FEAT-042
```

Homero ejecuta lint, typecheck, tests y E2E según `homero.config.json`. Si pasan,
genera un receipt bajo `features/FEAT-042/receipts/` para revisión humana.

## Comandos

| Comando | Uso |
| --- | --- |
| `homero init` | Instala Homero y los adapters de IA. |
| `homero discover` | Registra el contexto del proyecto. |
| `homero validate` | Valida la instalación de Homero. |
| `homero setup playwright` | Instala Playwright localmente. |
| `homero feature create` | Crea una rama y los artefactos del feature. |
| `homero feature check` | Valida que el feature esté listo para trabajar. |
| `homero verify` | Ejecuta verificaciones y genera el receipt. |
| `homero generate form` | Genera un formulario repetitivo por país. |

Usa `pnpm exec homero <comando> --help` para ver los argumentos disponibles.

## Desarrollo local

Dentro de este repositorio:

```powershell
npm run homero -- init --target C:\ruta\al\repo --client both --project-name mi-proyecto
npm run validate:self
```
