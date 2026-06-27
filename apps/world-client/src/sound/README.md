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
| `birds` | **DÍA**, solo en biomas con aves (bosque sí, **desierto NO**) | Pájaros: trinos, canto de día |
| `crickets` | **NOCHE**, solo donde hay insectos (bosque/desierto sí, **tundra NO** por el frío) | Grillos / insectos nocturnos |
| `rain` | Clima: lluvia | Lluvia (sin truenos fuertes) |
| `snow` | Clima: nieve | Viento nevado, casi un "hush" |
| `sand` | Clima: tormenta de arena | Viento con grano/arena |
| `fog` | Clima: niebla | Drone bajo y suave (opcional) |

**Dimensiones que ya están resueltas por la mezcla** (no tienes que grabarlas tú):

- **Día / noche** → de día cantan los **pájaros**, de noche los **grillos**. Automático según la hora.
- **Clima** → al llover/**nevar**/arena/niebla sube su capa y **se callan** pájaros y grillos (nadie
  canta bajo tormenta). Sí, la **nieve** también los calla.
- **Bioma** → realismo: en el **desierto NO hay aves**; en la **tundra NO hay grillos** (frío). Se
  ajusta en `BIOME_SOUND_LIFE` (en `ambientMix.ts`): agregar/tunear un bioma es una entrada.
- **Estación** → la "vivacidad" escala los **pájaros**: primavera/verano vivos, **invierno apagado**.
  (Lo calcula el driver desde la estación; tú solo das UN sonido de pájaros y el motor lo modula.)
- **Naturalidad** → pájaros y grillos **no suenan el 100% del tiempo**: van y vienen por ratos largos
  (envolvente orgánica en el driver), para que no se sienta falso ni en bucle.

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

## 4.ter Animales — lo que hace que el bioma se sienta VIVO

Los loops de fondo dan ambiente; lo que da **vida** son **llamados de animales** que suenan cada
tanto. **Principio (Carlos):** animales **pequeños o LEJANOS**, nunca algo que suene "encima" del
jugador (acechante). Cada animal tiene una **presencia** (`gain` en `ambientCritters.ts`): bajo =
lejano. CUÁNDO suena cada uno (bioma/hora/rareza/presencia) vive en `ambientCritters.ts` (a gusto).

| Archivo | Animal | Bioma · hora | Estado |
|---|---|---|---|
| `owl.ogg` | Búho (ululato) | Bosque · noche **y** Desierto · noche (lejano) | ✅ puesto |
| `hawk.ogg` | Ave rapaz (grito, lejana) | Desierto · día | ✅ puesto (llena el desierto) |
| `frog.ogg` | Rana/sapo | Bosque · noche | ✅ puesto |
| `crow.ogg` | Cuervo/grajo lejano | Bosque · día | ✅ puesto |
| `loon.ogg` | Ave acuática ártica | Tundra · día | ✅ puesto |
| `coyote.ogg` | Coyote (aullido) | Desierto · noche | ⏸️ diferido (aullido cercano = acecho) |
| `wolf.ogg` | Lobo (aullido) | Tundra · noche | ⏸️ diferido (aullido cercano = acecho) |

El **desierto de noche** lo llena un **búho lejano** (no el coyote). Los depredadores quedan
diferidos a propósito; si algún día se agregan, ya están con presencia baja (suenan lejos).

Búscalos **cortos (1–3 s), secos, un solo llamado** (no un loop). Términos: `owl hoot`, `hawk
screech`, `frog croak`, `crow caw`, `loon call`. CC0/uso libre. Se convierten a ogg mono igual que
los loops, pero **sin** rebanada de centro (es un llamado único): solo recorte de silencio + normalización.

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
