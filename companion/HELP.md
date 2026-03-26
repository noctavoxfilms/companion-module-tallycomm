# TallyComm

Envía señales de tally (PGM/PVW/CLEAR) a los camarógrafos en tiempo real via TallyComm.

## Configuración

| Campo | Descripción |
|-------|-------------|
| **Servidor** | `https://tallycomm.com` (por defecto) |
| **Sala** | Nombre exacto de la sala. Debe coincidir con el que usan los camarógrafos. |

## Acciones

| Acción | Descripción |
|--------|-------------|
| Set Camera PGM | Pone cámara en Program (rojo) |
| Set Camera PVW | Pone cámara en Preview (verde) |
| Clear Camera | Libera una cámara |
| Clear All | Libera todas |
| **Set PGM + Clear Previous** | ⭐ La más útil — pone en PGM y limpia la anterior |
| **Set PVW + Clear Previous** | ⭐ Igual para preview |

## Variables

| Variable | Descripción |
|----------|-------------|
| `$(tallycomm:pgm)` | Cámara en PGM (0 = ninguna) |
| `$(tallycomm:pvw)` | Cámara en PVW (0 = ninguna) |
| `$(tallycomm:room)` | Sala configurada |
| `$(tallycomm:connected)` | `online` / `offline` |

## Feedbacks

- **Camera is PGM** → rojo cuando en Program
- **Camera is PVW** → verde cuando en Preview
- **Is Connected** → verde cuando conectado

## Ejemplo ATEM

- **CUANDO**: `bmd-atem` → Program Input Changed → ME=1, Input=1
- **HACER**: `TallyComm` → Set PGM + Clear Previous → Camera=1

## Links

- [tallycomm.com](https://tallycomm.com)
- [Guía de integración](https://tallycomm.com/guide)
