// Handles the text size setting (Normal / Large / Extra large).
// The choice is saved in the browser so it is kept after a refresh.

export type TextSize = 'normal' | 'large' | 'xlarge';

// Page font size for each option. Everything else scales from this.
const percentages: Record<TextSize, string> = {
  normal: '100%',
  large: '118%',
  xlarge: '135%',
};

const STORAGE_KEY = 'medtrack-text-size';

// Reads the saved text size, or returns 'normal' if nothing is saved.
export function getSavedTextSize(): TextSize {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'large' || saved === 'xlarge') return saved;
  } catch {
    // storage unavailable, fall through to default
  }
  return 'normal';
}

// Applies the text size to the whole page and saves it for next time.
export function applyTextSize(size: TextSize) {
  document.documentElement.style.fontSize = percentages[size];
  try {
    localStorage.setItem(STORAGE_KEY, size);
  } catch {
    // ignore, the size still applies for this session
  }
}