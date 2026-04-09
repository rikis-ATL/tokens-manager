---
phase: 31-style-guide-verification
type: browser-checklist
source_decisions: [D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12]
---

# Phase 31: Style Guide Browser Verification Checklist

**Purpose:** Systematic browser verification of Phase 25 Style Guide tab
**Prerequisite:** `yarn dev` running, navigate to `/collections/[id]/tokens`, click "Style Guide" tab
**Collection:** Use any collection with tokens of multiple types (color, spacing, typography, shadow, border-radius, and at least one "other" type). If the collection has themes, use it for items 7-8.

## Checklist

| # | Area | Phase 25 Decision | Steps | Expected Behavior | Result |
|---|------|-------------------|-------|-------------------|--------|
| 1 | Color Tokens | D-07 | Look for color token groups in the Style Guide. Hover over individual color swatches. | Each color group renders as a horizontal palette row of colored swatch boxes. Hovering a swatch shows a tooltip with `token.path: resolvedHex` (e.g., `color.primary.500: #0056D2`). Swatch background matches the resolved color value. | |
| 2 | Spacing Tokens | D-08 | Locate spacing token groups in the Style Guide. | Each spacing token renders as a grey bar (10px height) with width proportional to the spacing value (capped at 300px). A label next to or below each bar shows the resolved value (e.g., `16px`). | |
| 3 | Typography Tokens | D-09 | Locate typography token groups in the Style Guide. | Each typography token renders sample text with the token's font properties applied (font-family, font-size, font-weight, line-height). Token name is visible alongside the specimen. | |
| 4 | Shadow Tokens | D-10 | Locate shadow token groups in the Style Guide. | Each shadow token renders as a 30x30px div with the shadow value applied as `box-shadow`. Token name is shown as a label. The shadow is visually distinguishable on the preview tile. | |
| 5 | Border-Radius Tokens | D-11 | Locate border-radius token groups in the Style Guide. | Each border-radius token renders as a 30x30px div with the `border-radius` value applied. Token name is shown as a label. Different radius values produce visibly different corner rounding. | |
| 6 | Other/Fallback Tokens | D-12 | Look for any token types that are not color, spacing, typography, shadow, or border-radius (e.g., opacity, z-index, or custom types). | These tokens render as name+value text cards showing `token.path` and the resolved value. No token type is hidden — every token in the collection appears somewhere in the Style Guide. | |
| 7 | Theme Switching | D-06 | If the collection has themes: switch between Default and a custom theme using the theme selector at the top of the page while on the Style Guide tab. | The Style Guide re-renders with the selected theme's token values. Color swatches change color if the theme overrides color tokens. Spacing bars resize if spacing values differ. The switch is immediate (no page reload needed). | |
| 8 | Disabled Groups | D-05 | If the collection has a theme with a disabled group: activate that theme and check the Style Guide. | Tokens from the disabled group do NOT appear in the Style Guide. Only tokens from enabled and source groups are visible. Switching back to Default shows all groups. | |

## Instructions for Tester

1. Start the dev server: `yarn dev`
2. Open browser to `http://localhost:3000`
3. Navigate to a collection with diverse token types
4. Click the "Style Guide" tab
5. Work through items 1-6 on the Default theme
6. If themes exist, work through items 7-8
7. Record pass/fail in the Result column
8. If any item fails, note the specific issue observed
