# Stage 1 (Research): status - BLOCKED, partial

## What blocked it
This cloud environment's network policy denies every official Raspberry Pi document host:
`datasheets.raspberrypi.com`, `pip.raspberrypi.com`, `pip-assets.raspberrypi.com`,
`www.raspberrypi.com`, `rpltd.co` (design-file short links). Also denied: `jlcpcb.com`,
`lcsc.com`, `kicad.org`/`downloads.kicad.org`, Launchpad PPAs, `ti.com`, `digikey.com`, `mouser.com`.

Reachable: `github.com` (git), `gitlab.com`, `pypi.org`, `archive.ubuntu.com`.

## Official primary sources (not yet read)
From raspberrypi/documentation `asciidoc/computers/compute-module/datasheet.adoc`:
- CM5 datasheet: RP-008180-DS
- CM5 design files: rpltd.co/cm5-design-files
- CM5IO datasheet: RP-008182-DS
- CM5IO KiCad design files: rpltd.co/cm5io-design-files
- Raspberry Pi 5 schematics and Touch Display 2 documentation: not yet located

## Secondary source found (NOT a substitute for the datasheet)
KiCad 10.0 demo project `demos/cm5_minima` (third-party "CM5 MINIMA REV3" by piecol,
modified by the KiCad team). Its `CM5IO.kicad_sym` contains symbols `ComputeModule5-CM5_GPIO`
and `ComputeModule5-CM5_HSS`, apparently derived from the official CM5IO library.
- Licence: CERN-OHL-S v2 (strongly reciprocal). Copying its schematic/layout would make
  this design CERN-OHL-S too. Used here only as a cross-check.
- Connector fields in that symbol: Amphenol 10164227-1001A1RLF (x2), Hirose alternative
  (part number not given). Stack height NOT stated.
- Extracted pin table: `cm5_connector_pins_UNVERIFIED.csv`. Every row must be checked
  against RP-008180-DS before it goes into a schematic.

## Tooling
- `kicad-cli` not installed. Ubuntu 24.04 apt offers KiCad 7.0.11 only.
  Latest stable is KiCad 10.0.x, which needs kicad.org or the KiCad PPA (both denied).
