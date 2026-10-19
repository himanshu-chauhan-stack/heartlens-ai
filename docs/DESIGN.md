# HeartLens AI design system

A calm editorial health workspace with a dark landing hero, readable warm surfaces and a restrained lime accent. The interface is original; no CRED assets or branding are used.

## Tokens

| Role | Light | Dark |
|---|---|---|
| Canvas | `#F6F7F2` | `#101511` |
| Surface | `#FFFFFF` | `#1A231D` |
| Text | `#161B17` | `#F1F5EC` |
| Secondary | `#5D665E` | `#B4BEB1` |
| Border | `#D9DFD7` | `#38453B` |
| Action | `#175C43` | `#DDF58A` |
| Action text | `#FFFFFF` | `#142015` |

Final CSS tokens and semantic states are centralized in `apps/web/app/globals.css`. System font stack keeps startup independent of a remote font service. Numeric results use tabular figures. Lucide supplies interface icons; the HeartLens mark is a local SVG.

## Composition

- Home: asymmetric editorial hero, explicitly labeled example specimen, preparation and methodology details.
- Assessment: focused step form, desktop progress context, mobile bottom actions, visible labels and review before sending.
- Result: one prominent model probability, scope/source/version and assumptions; explanation unavailable is an honest state. Scenarios call the same backend and reject unlike model versions.
- Accounts/history: guest path remains usable; device history is distinct from account reports.
- Motion: brief control and surface transitions; reduced motion is respected. No artificial analysis countdown.

## Responsive and accessible behavior

Content-driven layouts stack on phones; navigation has a mobile menu. Fields stay at readable sizes, focus remains visible, touch controls target 44 px, and error/loading states have textual feedback. Print removes navigation/actions and includes source, scope, assumptions and model version. Both themes and narrow widths require browser verification; actual tested dimensions and limitations are recorded in `VALIDATION.md`.
