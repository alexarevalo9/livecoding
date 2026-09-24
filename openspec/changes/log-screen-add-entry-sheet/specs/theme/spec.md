# Delta for theme

## ADDED Requirements

### Requirement: Design tokens

`src/theme.ts` MUST export light-theme tokens: colors, typography (system serif and monospace via platform selection), spacing, radii, and layout constants. No dark theme.

#### Scenario: Tokens available
- GIVEN any screen or component
- WHEN it imports from `@/theme`
- THEN all token groups resolve and `npx tsc --noEmit` passes

### Requirement: Token usage

Screens and components SHOULD take colors, spacing, radii and fonts from the tokens instead of literals. Icons MUST come from `@expo/vector-icons`.

#### Scenario: Consistent styling
- GIVEN the Log screen and Add Entry sheet
- WHEN inspected on a device
- THEN they share the same palette, fonts, and corner radii
