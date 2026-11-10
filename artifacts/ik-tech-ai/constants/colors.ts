/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#122033',
    tint: '#2F80ED',

    background: '#F5F8FC',
    foreground: '#122033',

    card: '#FFFFFF',
    cardForeground: '#122033',

    primary: '#2F80ED',
    primaryForeground: '#ffffff',

    secondary: '#E8F1FF',
    secondaryForeground: '#1C5DB1',

    muted: '#E9EEF5',
    mutedForeground: '#718096',

    accent: '#FFB84A',
    accentForeground: '#6B4300',

    destructive: '#D95C5C',
    destructiveForeground: '#ffffff',

    border: '#DCE5F0',
    input: '#DCE5F0',
  },

  dark: {
    text: '#EAF2FF',
    tint: '#6CA8FF',
    background: '#081321',
    foreground: '#EAF2FF',
    card: '#102236',
    cardForeground: '#EAF2FF',
    primary: '#6CA8FF',
    primaryForeground: '#07111F',
    secondary: '#183354',
    secondaryForeground: '#B8D4FF',
    muted: '#15283D',
    mutedForeground: '#8EA3BA',
    accent: '#FFBD5A',
    accentForeground: '#4F3200',
    destructive: '#F17979',
    destructiveForeground: '#210808',
    border: '#203852',
    input: '#203852',
  },

  radius: 18,
};

export default colors;
