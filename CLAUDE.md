# Car3D

Visor web 3D de carros por partes: modelo en estilo líneas (wireframe/aristas), navegable con touch desde el celular. No es solo "ver el carro completo": se puede ver el carro entero, un sistema (motor, suspensión, frenos...), un ensamble o una pieza individual, y ver el motor funcionando. Cada pieza es independiente y detallable, de lo más grande a lo más pequeño. Empieza con el carro del autor; la arquitectura debe soportar muchos carros a futuro.

Repo: https://github.com/AndresG2412/Car3D

## Carro actual (único por ahora)

- **Chevrolet Sail 2013, sedán, 1.4 L, 4 cilindros, 4 tiempos.**
- Válvulas: **16 (4 por cilindro)** según el autor. *Por verificar con la tarjeta de propiedad/manual: el Sail 1.4 suele ser 8V.*
- Medidas provisionales (Sail sedán India, no verificadas para Colombia): 4249 × 1690 × 1503 mm, distancia entre ejes 2465 mm. Llantas y medidas definitivas: pendientes del autor. Patrón de pernos 4x100.
- Referencia visual: fotos de un render del Sail (solo para proporciones; no copiar geometría de modelos comerciales). No existe modelo 3D ni planos gratuitos del Sail; se genera por código.

## Restricciones

- **Todo gratuito**: herramientas, librerías y hosting en plan free. No proponer servicios de pago.
- **Mobile-first**: el uso principal es touch en celular (orbitar, pellizcar para zoom, dos dedos para desplazar). El rendimiento en móviles de gama media manda sobre el realismo.
- Idioma de la conversación y la documentación: español. Código e identificadores: inglés.

## Stack decidido

| Capa | Elección | Por qué |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Rutas por carro (`/cars/[slug]`), proyecto grande y escalable, deploy gratis en Vercel |
| 3D | **three.js + React Three Fiber (R3F) + @react-three/drei** | Estándar de facto, controles táctiles listos, ecosistema grande |
| Estado | **Zustand** | Selección de pieza, modo de vista, capas, animación |
| UI | **Tailwind CSS** | Paneles/overlays rápidos |
| Modelo | **Generado por código (paramétrico)**; GLB opcional después | No hay modelo gratuito del Sail; las piezas salen de las medidas |
| Modelado auxiliar | **Blender** (gratis) + **gltf-transform** | Solo si se importan piezas modeladas a mano (carrocería, etc.) |
| Datos | JSON local (`data/cars/`) ahora; **Supabase** después (Postgres + MCP disponible, plan free) | Fichas técnicas relacionales; migrar el mismo esquema |
| Hosting | **Vercel (free)** | Sin costo |

## Skills instaladas

- **anatomy** (`wheresryan22/anatomy`, MIT): genera ilustraciones isométricas interactivas que explican cómo funciona una máquina. Es opcional y secundaria: el visor principal es R3F, no esta skill. Uso previsto: mini-explicaciones animadas de mecanismos (rótula, freno de disco, amortiguador) en un modo educativo. Requiere Node 20.10+ y Chrome para sus verificaciones.

## Conceptos clave del diseño

- **Jerarquía de tres niveles** por carro: **sistema → ensamble → pieza** (ej. motor → bloque con pistones → pistón 2). Cada nodo del catálogo apunta a un grupo del modelo.
- **Convención de nombres**: `sistema.subsistema.pieza` (ej. `engine.valvetrain.intake_valve_1`, `suspension.front_left.ball_joint`).
- **Catálogo por carro** en JSON (`data/cars/<slug>.json`): especificaciones (medidas, motor, rines, puertas) + árbol de sistemas/ensambles/piezas con id, nombre, descripción y padre. El visor es data-driven: el modelo se deriva de las especificaciones.
- **Modos de vista**: carro completo · por sistema (aislar uno, ocultar el resto) · por ensamble · pieza individual · vista explosionada · corte (planos de recorte para ver el interior).
- **Motor funcionando**: animación calculada con la cinemática biela-manivela, usando el ángulo del cigüeñal como reloj. Mueve pistones, bielas, válvulas y árbol(es) de levas con el orden de encendido real. Controles: reproducir/pausar, velocidad y deslizador para recorrer el ciclo de 4 tiempos (admisión, compresión, explosión, escape) resaltando la etapa. Parámetros desde la ficha: cilindrada, cilindros, diámetro y carrera, válvulas por cilindro.
- **Estilo líneas**: `EdgesGeometry` (aristas nítidas) y/o `wireframe`; líneas gruesas con `Line2`/`LineMaterial` si hace falta legibilidad en móvil.
- **Interacción**: tocar una pieza → cámara vuela a ella, se atenúa el resto, panel con información.
- **Rendimiento**: `frameloop="demand"` cuando no hay animación ni interacción, `dpr` ≤ 2, instancing para piezas repetidas (tornillos, pernos, válvulas), carga progresiva por sistema.

## Estructura prevista

```
Car3D/
├── CLAUDE.md
├── README.md
├── src/
│   ├── app/                 # rutas Next (/, /cars/[slug])
│   ├── components/viewer/   # Canvas, controles, resaltado, cortes
│   ├── components/ui/       # árbol de piezas, modos de vista, controles de animación
│   ├── generators/          # generadores paramétricos (engine, wheel, suspension, body)
│   ├── store/               # Zustand
│   └── lib/                 # cinemática, catálogo, utilidades
├── data/cars/               # ficha + catálogo JSON por carro
├── public/models/<slug>/    # GLB (solo si se importan piezas hechas en Blender)
└── docs/                    # notas de modelado, licencias y referencias
```

## Convenciones de trabajo

- Commits pequeños y descriptivos; rama `main`.
- No subir GLB crudos pesados ni archivos `.blend` al repo (ver `.gitignore`).
- Registrar en `docs/` las fuentes y licencias de cualquier recurso externo.
- Probar en móvil real o emulación touch antes de dar algo por terminado.
- Mantener este archivo actualizado cuando cambien decisiones de stack, estructura o datos del carro.
- Por indicación del autor, avanzar solo con los pasos que pida en cada momento, sin adelantar ni planificar pasos extra.
