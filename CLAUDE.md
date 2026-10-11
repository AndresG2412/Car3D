# Car3D

Visor web 3D de carros: modelo en estilo líneas (wireframe/aristas), navegable con touch desde el celular, donde cada pieza (carrocería, rines, rótulas, suspensión, etc.) es una parte independiente que se puede aislar y detallar, de lo más grande a lo más pequeño. Empieza con el carro del autor; la arquitectura debe soportar muchos carros a futuro.

Repo: https://github.com/AndresG2412/Car3D

## Restricciones

- **Todo gratuito**: herramientas, librerías y hosting en plan free. No proponer servicios de pago.
- **Mobile-first**: el uso principal es touch en celular (orbitar, pellizcar para zoom, dos dedos para desplazar). El rendimiento en móviles de gama media manda sobre el realismo.
- Idioma de la conversación y la documentación: español. Código e identificadores: inglés.

## Stack decidido

| Capa | Elección | Por qué |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Rutas por carro (`/cars/[slug]`), proyecto grande y escalable, deploy gratis en Vercel |
| 3D | **three.js + React Three Fiber (R3F) + @react-three/drei** | Estándar de facto, controles táctiles listos, ecosistema grande |
| Estado | **Zustand** | Selección de pieza, capas visibles, modo explosión |
| UI | **Tailwind CSS** | Paneles/overlays rápidos |
| Formato de modelo | **glTF / GLB** | Jerarquía de nodos con nombres = piezas; carga eficiente |
| Optimización | **gltf-transform** (Draco/Meshopt, dedupe, instancing) | Reducir peso para móvil |
| Modelado | **Blender** (gratis) | Crear/limpiar/nombrar piezas y exportar GLB |
| Hosting | **Vercel (free)**; modelos en `public/` al inicio, luego Cloudflare R2 / Supabase Storage (tier gratis) | Sin costo |

## Conceptos clave del diseño

- **Una pieza = un nodo con nombre** en el GLB. Convención: `sistema.subsistema.pieza` (ej. `suspension.front_left.ball_joint`). Los nombres enlazan con el catálogo.
- **Catálogo por carro** en JSON (`data/cars/<slug>.json`): id, nombre, sistema, nodo del GLB, descripción, padre. El visor es data-driven: agregar un carro = GLB + JSON, sin tocar código.
- **Estilo líneas**: `EdgesGeometry` (aristas nítidas) y/o `wireframe`; líneas gruesas con `Line2`/`LineMaterial` si hace falta legibilidad en móvil.
- **Detalle de grande a pequeño**: tocar una pieza → cámara vuela a ella (CameraControls/`Bounds`), se atenúa el resto, panel con info. Capas por sistema (carrocería, suspensión, frenos, rines, motor), vista explosionada, y LOD para piezas pequeñas.
- **Rendimiento**: `frameloop="demand"` cuando no hay interacción, `dpr` limitado (≤2), instancing para piezas repetidas (tornillos, pernos), GLB comprimidos, carga progresiva por sistema.

## Estructura prevista

```
Car3D/
├── CLAUDE.md
├── README.md
├── src/
│   ├── app/                 # rutas Next (/, /cars/[slug])
│   ├── components/viewer/   # Canvas, controles, modelo, resaltado
│   ├── components/ui/       # paneles, lista de piezas, capas
│   ├── store/               # Zustand
│   └── lib/                 # utilidades (parseo de nodos, catálogo)
├── data/cars/               # catálogo JSON por carro
├── public/models/<slug>/    # GLB optimizados
└── docs/                    # notas de modelado y pipeline
```

## Pipeline de modelos

1. Fuente: modelado propio en Blender (con planos/fotos/medidas) o modelo con licencia libre (CC) como base. Respetar y registrar licencias en `docs/`.
2. Blender: separar por piezas, nombrar con la convención, aplicar transformaciones, origen de cada pieza en su punto lógico.
3. Exportar GLB → optimizar con gltf-transform → `public/models/<slug>/`.
4. Escribir/actualizar `data/cars/<slug>.json`.

## Fases

1. **Setup**: scaffold Next + R3F + Tailwind, deploy en Vercel.
2. **Visor base**: cargar un GLB de prueba, orbit táctil, estilo líneas.
3. **Piezas**: selección, aislar, fly-to, panel de info, capas.
4. **Modelo real**: modelar mi carro por sistemas (carrocería → rines → suspensión → frenos → detalles finos).
5. **Multi-carro**: selector/galería, catálogo data-driven.
6. **Pulido**: rendimiento móvil, PWA (instalable), vista explosionada.

## Convenciones de trabajo

- Commits pequeños y descriptivos; rama `main`.
- No subir GLB crudos pesados ni archivos `.blend` al repo (usar `.gitignore`; guardar fuentes fuera o en almacenamiento gratis).
- Probar siempre en móvil real o emulación touch antes de dar una fase por terminada.
- Mantener este archivo actualizado cuando cambien decisiones de stack o estructura.
