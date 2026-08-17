# 🤖 Homero

Harness de frontend para Falabella Seguros. Le hablás a Claude Code o GitHub
Copilot en lenguaje natural; por dentro, Homero convierte cada pedido en un
feature con contrato ejecutable, un plan que vos revisás antes de que se
escriba código, y verificación automática con Playwright — usando Tomaco y
Figma como fuente de verdad, no la memoria del modelo.

## 🧭 Cómo se usa

No es un CLI que operás vos a mano — instalás una vez y de ahí en más le
hablás a tu IA.

**1. Instalar** (una vez, parado en la raíz del repo):

```powershell
npx github:DanielRamosValenzuela/homero
```

**2. Primera vez en el repo**, pedile a tu IA:

> `/homero-discover`

Te pregunta el stack y el contexto de negocio real (framework, países,
contrato de backend) y arma `docs/homero/`.

**3. Para planear una pantalla**, pasale el Figma:

> `/homero-plan implementa esta pantalla: https://www.figma.com/design/...`

Lee el diseño, arma el feature (rama + contrato), y escribe el plan con los
componentes de Tomaco, tokens y estilos pixel-perfect exactos de cada
pantalla. **Se detiene ahí** — no toca código todavía. Revisá
`specs/<id>/plan.md`.

**4. Cuando el plan te convence**:

> `/homero-implement FEAT-042`

Implementa, corre lint/typecheck/test/e2e y se verifica solo (máximo 2
intentos), y nunca se auto-aprueba: termina en `needs-review` para que vos
revises y mergees la rama a mano.

`/homero` hace 3 y 4 juntos, pero pausa igual en el checkpoint del plan por
default — decile explícitamente "sin pausar" si querés que no se detenga.
Para retomar un feature en otra sesión (o con el otro cliente de IA):
`"Trabaja el feature FEAT-042"` — todo el estado vive en disco
(`features/<id>/state.json`), no en la conversación.

¿Tu cliente de IA no soporta comandos/agentes personalizados, o preferís
manejar los comandos vos? La mecánica completa (comandos crudos, arquitectura
de agentes, generación del catálogo de Tomaco) está en
[`docs/usage.md`](./docs/usage.md).

## 🛡️ Guardrails (no negociables)

Estas reglas viven en `docs/homero/constitution.md` y se aplican vía gates de
código (`homero feature check` falla si no se cumplen) o vía instrucciones
que todo agente Homero lee antes de trabajar:

| Gate | Qué garantiza |
| --- | --- |
| 🎨 Tomaco obligatorio | Toda UI usa el design system; nada de CSS/Tailwind crudo sin excepción registrada |
| 🖼️ Figma aprobado | URL, node y versión quedan registrados en cada `feature.json` |
| 📐 Plan pixel-perfect | Componentes de Tomaco, tokens y estilos exactos por pantalla — un plan sin eso no pasa el gate |
| ⏸️ Checkpoint humano | El plan se detiene para revisión antes de implementar, salvo que pidas explícitamente lo contrario |
| 📜 Contrato de backend | `contract-first` / `contract-draft` / excepción explícita — nunca un mock inventado en silencio |
| ❓ Preguntas específicas, no genéricas | El error de validación exacto por campo y el comportamiento de cada elemento interactivo deben confirmarse |
| 🧪 Evidencia Playwright CLI | Screenshots y snapshots reales antes de pasar a `needs-review` |
| 🔒 Solo humanos mergean | Homero nunca commitea, pushea, ni se autoaprueba |

## ⚙️ Requisitos

Git, Node.js ≥18, `pnpm`, un repo frontend con `package.json`, y un Figma
aprobado + contrato de backend (o ejemplos/cURLs) por feature.

## 📚 Más

- Uso detallado, comandos crudos, y cómo funciona por dentro: [`docs/usage.md`](./docs/usage.md)
- Arquitectura de Homero: [`docs/architecture.md`](./docs/architecture.md)
- Qué cambia entre versiones: [`CHANGELOG.md`](./CHANGELOG.md)

## 📄 Licencia

MIT — ver [`LICENSE`](./LICENSE).
