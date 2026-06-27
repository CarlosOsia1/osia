# Paisaje sonoro de El Mundo — guía para poner tus sonidos (S2-A2)

Hoy el ambiente es **sintetizado** por WebAudio (ruido filtrado + osciladores) para que el mundo
suene sin depender de archivos. Cuando quieras sonidos reales, reemplazas capa por capa **sin tocar
código**: solo pones archivos y referencias su ruta. Esta guía te dice qué necesitas y cómo no
equivocarte.

---

## 1. Cómo funciona (modelo de capas)

El ambiente se arma con **capas** que suben y bajan según el momento. La mezcla (cuándo suena cada
una) vive en [`ambientMix.ts`](./ambientMix.ts); tú normalmente solo cambias los **archivos**.

| Capa | Cuándo suena | Qué archivo necesitas |
|---|---|---|
| `wind` | **Siempre** (un poco más de día) | Viento suave, base del bosque |
| `birds` | **DÍA** (sobre todo en bosque) | Pájaros: trinos, canto de día |
| `crickets` | **NOCHE** | Grillos / insectos nocturnos |
| `rain` | Clima: lluvia | Lluvia (sin truenos fuertes) |
| `snow` | Clima: nieve | Viento nevado, casi un "hush" |
| `sand` | Clima: tormenta de arena | Viento con grano/arena |
| `fog` | Clima: niebla | Drone bajo y suave (opcional) |

**Dimensiones que ya están resueltas por la mezcla** (no tienes que grabarlas tú):

- **Día / noche** → de día cantan los **pájaros**, de noche los **grillos**. Automático según la hora.
- **Clima** → al llover/nevar/etc. sube su capa y **se acallan** pájaros, grillos y viento.
- **Estación** → la "vivacidad" escala los **pájaros**: primavera/verano vivos, **invierno apagado**.
  (Lo calcula el driver desde la estación; tú solo das UN sonido de pájaros y el motor lo modula.)

> ¿Quieres sonidos **distintos por estación** (no solo más/menos volumen)? Es una extensión natural:
> se haría agregando capas `birds-spring` / `birds-winter` y eligiendo en `ambientMix`. Por ahora
> con un solo `birds` + la modulación de vivacidad alcanza y suena natural. Si lo quieres, lo armo.

---

## 2. Qué archivos necesito (la lista)

Mínimo para que suene "completo": **`wind`, `birds`, `crickets`, `rain`**. Lo demás suma realismo.

- `wind.ogg` — viento suave, constante. **Loop** de 15–30 s, sin ráfagas bruscas que se noten al repetir.
- `birds.ogg` — pájaros de bosque, mañana/día. Loop de 20–40 s, variado pero sin un canto único que "cante" el corte.
- `crickets.ogg` — grillos de noche. Loop de 15–30 s, parejo.
- `rain.ogg` — lluvia media, **sin truenos** (los truenos como evento van aparte, no en el loop).
- `snow.ogg` — viento nevado, muy suave (la nieve casi no suena).
- `sand.ogg` — viento con grano/arena, más áspero que el viento normal.
- `fog.ogg` — drone bajo, casi subliminal (opcional).

---

## 3. Formato correcto (para que no se note el loop)

- **Formato:** `.ogg` (Vorbis/Opus) preferido — pesa poco y suena bien. `.mp3` sirve; evita `.wav` (pesado).
- **Canales:** **mono** para ambiente (más liviano; el motor lo coloca). Estéreo solo si el sonido lo necesita.
- **Duración:** **15–40 s** y **loopeable sin costura** (que el final empalme con el inicio: edita un crossfade de ~0.5 s en los extremos).
- **Nivel:** normalizado y **suave** (el ambiente acompaña, no invade). Apunta a algo tranquilo, sin picos.
- **Peso:** que cada archivo sea **liviano** (decenas–cientos de KB). Son loops, no canciones.

---

## 4. Dónde ponerlos y cómo activarlos (2 pasos)

1. Copia tus archivos a la carpeta pública:
   ```
   apps/world-client/public/audio/
   ```
   (créala si no existe). Quedarán accesibles como `/audio/<archivo>`.

2. Edita **[`ambientAssets.ts`](./ambientAssets.ts)** y pon la ruta en la capa correspondiente:
   ```ts
   export const AMBIENT_ASSETS = {
     wind: '/audio/wind.ogg',
     birds: '/audio/birds.ogg',
     crickets: '/audio/crickets.ogg',
     rain: '/audio/rain.ogg',
     snow: null,   // null = sigue sintetizada
     sand: null,
     fog: null,
   };
   ```
   Listo. El motor carga el archivo si existe; si la ruta es `null` o el archivo falla, esa capa
   cae a **sintetizada** automáticamente (nunca rompe). Activa el sonido con el botón del HUD.

### Sonidos distintos por ESTACIÓN (opcional)

Una capa puede tener un archivo **distinto por estación** (no solo más/menos volumen). En vez de una
ruta, pon un objeto por estación:
```ts
birds: {
  primavera: '/audio/aves_primavera.ogg',  // dawn chorus, vivo
  verano:    '/audio/aves_verano.ogg',
  otono:     '/audio/aves_otono.ogg',
  invierno:  '/audio/aves_invierno.ogg',    // ralo, frío
},
```
Las estaciones que no pongas caen a sintetizado. La variante se resuelve **cuando enciendes el
sonido** (las estaciones duran ~2 días reales, no cambian a media sesión).

---

## 4.bis Sonidos de EVENTO (truenos, portal, pasos, UI)

Aparte de los loops de ambiente, hay **one-shots**: suenan UNA vez cuando pasa algo. Se configuran en
**[`sfxAssets.ts`](./sfxAssets.ts)** (mismo `public/audio/`, ruta o `null`):
```ts
export const SFX_ASSETS = {
  thunder:  '/audio/thunder.ogg',  // ya enganchado: suena solo en lluvia fuerte
  portal:   null,                  // al cruzar un portal (Fase futura)
  footstep: null,                  // pasos del jugador
  ui:       null,                  // click/confirmación de interfaz
};
```
- **`thunder`** ya está enganchado: si pones el archivo, suena solo durante lluvia fuerte.
- Los demás se disparan con `ambientDriver.playSfx('portal' | 'footstep' | 'ui')` desde su sistema
  (cuando exista el portal, el movimiento, o el click de UI). El registro está listo; agregar un
  evento nuevo = una entrada en `SfxName` + su archivo.

> Los one-shots **NO se sintetizan** (necesitan archivo real): sin archivo, ese evento simplemente
> no suena. Búscalos cortos y secos (un trueno, un "whoosh" de portal, un paso).

---

## 5. Dónde buscar sonidos (y no meter la pata con licencias)

- **[freesound.org](https://freesound.org)** — filtra por licencia **Creative Commons 0 (CC0)** para uso
  libre sin atribución. Términos de búsqueda útiles:
  - viento: `wind loop forest ambient`, `gentle wind loop`
  - pájaros: `forest birds morning loop`, `birdsong ambience`
  - grillos: `crickets night loop`, `night insects ambience`
  - lluvia: `rain loop no thunder`, `light rain ambience`
  - nieve/viento: `snow wind loop`, `cold wind ambience`
  - arena: `sand storm wind`, `desert wind grain`
- **[pixabay.com/sound-effects](https://pixabay.com/sound-effects)** — librería propia, uso libre.
- **Otras CC0/uso libre:** Kenney (kenney.nl), Sonniss (GDC bundles).

**Reglas de licencia (importantes):** usa **CC0 / dominio público / "uso libre comercial"**. Si una pista
es CC-BY, guarda la **atribución** (autor + enlace) en un `apps/world-client/public/audio/CREDITS.md`.
No uses nada con "no comercial" si el proyecto puede monetizarse. Ante la duda, CC0.

---

## 6. Checklist rápido

- [ ] Formato `.ogg`, **mono**, 15–40 s, **loop sin costura** (crossfade en los extremos).
- [ ] Nivel suave y normalizado; nada que reviente.
- [ ] Licencia **CC0/uso libre** (o atribución guardada en `CREDITS.md`).
- [ ] Archivos en `apps/world-client/public/audio/`.
- [ ] Rutas puestas en `ambientAssets.ts`.
- [ ] Probado con el botón de sonido del HUD, de día y de noche, con y sin lluvia.

> ¿Quieres sonidos por estación, un sonido de portal, o SFX de interacción? Todo se engancha al mismo
> registro de capas: agregar una capa = una entrada en `AmbientLayer` + su mezcla + su asset. Pídelo.
