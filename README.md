# Homero

Homero es un harness interno para equipos frontend que trabajan con IA.

No existe solo para instalar archivos. Existe para dejar al repo listo para que
Copilot o Claude trabajen con mejor contexto, pidan los insumos correctos y
guien el desarrollo frontend de forma repetible.

La idea central es esta:

```text
CLI = estructura
IA = significado
```

Instala Homero una vez en el repo. Usa el CLI para dejar estructura y reglas.
Usa la IA para discovery, aclaracion, Figma, contratos, spec, plan y
implementacion.


## Instalacion recomendada

Para trabajo real en equipo, instala Homero como `devDependency` en el repo
destino.

```powershell
pnpm add -D github:DanielRamosValenzuela/homero#v0.1.0
```

Luego ejecútalo localmente:

```powershell
pnpm exec homero init --target . --client copilot --project-name mi-proyecto
```

Esto es mejor que usar `npx` o `pnpm dlx` todos los dias porque:

- deja explicita la version instalada
- se siente nativo dentro del repo
- funciona mejor para uso repetido en equipo
- evita que el flujo diario dependa de ejecuciones efimeras

## Uso efimero solo para pruebas

`pnpm dlx` o `npx` sigue siendo util para:

- demos rapidas
- probar el instalador
- validar el bootstrap en un repo temporal

Ejemplo:

```powershell
pnpm dlx github:DanielRamosValenzuela/homero init --target . --client copilot --project-name mi-proyecto
```

No es el flujo recomendado para el trabajo cotidiano.

## Flujo recomendado

1. Instalar Homero en el repo.
2. Ejecutar `init` una vez.
3. Ejecutar `discover` para dejar el contexto inicial.
4. Usar la IA sobre `docs/homero/` para completar discovery y preparar el feature.
5. Implementar con la IA usando Figma, contratos y mocks ya registrados.
6. Ejecutar `validate` para asegurar que el harness sigue consistente.
7. Usar `generate form` solo para patrones repetidos.

## Comandos disponibles

```text
homero init --target <repo> --client <copilot|claude|both> [--project-name <name>] [--force]
homero discover --target <repo> [--defaults] [--force]
homero validate --target <repo> [--client <copilot|claude|both>]
homero generate form --target <repo> --name <FormName> --country <cl|pe|co> [--force]
```

## Cuando usar CLI y cuando usar IA

Usa el CLI para trabajo estructural y deterministico:

- `init`
- `discover`
- `validate`
- `generate form`

Usa la IA para trabajo semantico:

- completar discovery
- aclarar negocio y validaciones
- interpretar Figma
- aterrizar contratos o cURLs a mocks y supuestos
- escribir spec, plan y tasks
- implementar con contexto real del repo

## Ejemplo practico 1: bootstrap de un repo nuevo

```powershell
pnpm add -D github:DanielRamosValenzuela/homero#v0.1.0
pnpm exec homero init --target . --client copilot --project-name health-policy-contract-ui-any-health-web
pnpm exec homero discover --target . --force
```

Luego, en la IA:

```text
Lee docs/homero y ayudame a completar el discovery del producto.
Hazme preguntas una a una antes de proponer cambios.
```

## Ejemplo practico 2: levantar Figma antes de implementar

Con Homero ya instalado, comparte el Figma y pide esto:

```text
Este es el Figma del paso. Antes de proponer codigo, dime que estados UI faltan,
que componentes deberiamos mapear a Tomaco y que dudas UX hay que aclarar.
```

Lo esperado es que la IA no implemente de inmediato. Primero deberia:

- confirmar el node correcto
- enumerar estados UI faltantes
- mapear componentes al design system
- marcar dudas de comportamiento que Figma no responde

## Ejemplo practico 3: levantar contratos y mocks

Si solo tienes cURLs, examples o Postman, usa a la IA asi:

```text
Estos cURLs y ejemplos son la referencia backend. Conviertelos en un contrato
draft, enumera los mocks necesarios y marca lo que aun hay que confirmar con backend.
```

Lo esperado es que la IA:

- registre la fuente del contrato en `docs/homero/contracts.md`
- proponga la estrategia de mocks
- enumere estados success, empty, validation error, business error y server error
- deje claros los supuestos pendientes

## Ejemplo practico 4: preparar un feature antes de codificar

```text
Con docs/homero, este Figma y estos contratos, crea la spec del feature,
luego un plan tecnico y despues una lista de tareas ordenadas.
```

El objetivo es que la IA no salte directo a codigo. Primero debe dejar claro:

- que se construye y por que
- que archivos deberian cambiar
- que patrones del repo reutilizara
- que validaciones y mocks necesita

## Ejemplo practico 5: generar un formulario repetido

Cuando el trabajo sea estructural y repetido, usa el generador:

```powershell
pnpm exec homero generate form --target . --name UserInfoForm --country cl
```

Esto sirve para acelerar estructura. No reemplaza discovery, Figma ni reglas de negocio.

## Ejemplo practico 6: validar el harness

```powershell
pnpm exec homero validate --target . --client copilot
```

Usalo cuando:

- terminas de instalar Homero
- actualizas archivos base del harness
- quieres comprobar que el repo mantiene el contrato esperado

## Que instala Homero

Homero instala o gestiona:

- `AGENTS.md`
- `CLAUDE.md`
- `homero.config.json`
- `docs/homero/`
- `specs/_template/`
- instrucciones de Copilot bajo `.github/`
- agentes de Copilot bajo `.github/agents/`
- adapters de Claude bajo `.claude/`
- `scripts/homero/new-form.mjs`
- `mcp.example.json`

## Como debe trabajar la IA dentro del repo

Para features no triviales, la IA debe seguir este flujo:

```text
discover -> specify -> plan -> tasks -> implement -> verify -> converge
```

Y antes de implementar debe levantar, cuando aplique:

1. objetivo del usuario y estado de exito
2. pais o variante
3. Figma correcto
4. contrato backend o insumo equivalente
5. estados mock requeridos

Si falta una de esas piezas y bloquea el trabajo, la IA debe preguntar antes de
inventar.

## Desarrollo local de Homero

Si estas trabajando dentro de este repo, puedes ejecutar el CLI directamente:

```powershell
node .\packages\cli\bin\homero.mjs init --target D:\path\to\repo --client copilot --project-name mi-proyecto
node .\packages\cli\bin\homero.mjs discover --target D:\path\to\repo --force
node .\packages\cli\bin\homero.mjs validate --target D:\path\to\repo --client copilot
node .\packages\cli\bin\homero.mjs generate form --target D:\path\to\repo --name UserInfoForm --country cl
```

Self-test del repo:

```powershell
npm run validate:self
```
