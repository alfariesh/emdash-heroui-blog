#!/usr/bin/env bash
# Regenerates assets/fonts/*.ttf: the Google Sans faces the app loads, cut down to
# the scripts a blog is written in. The full faces are ~2.1 MB each (8,300 glyphs
# across six scripts); the subsets are ~0.27 MB.
#
# Needs pyftsubset from fonttools (`pip install fonttools`). The source faces come
# from the @expo-google-fonts/google-sans dev dependency, so run `pnpm install` first.
#
#   pnpm --filter @blog/mobile fonts:subset
#
# Covered: Latin (with extensions and Vietnamese), Greek, Cyrillic, Arabic, general
# punctuation, currency, arrows. A character outside this set falls back to the
# system font for that glyph only. All layout features (kerning, ligatures,
# localized forms) are kept, so shaping is unchanged for the covered scripts.
set -euo pipefail

cd "$(dirname "$0")/.."
SRC=node_modules/@expo-google-fonts/google-sans
OUT=assets/fonts

UNICODES="U+0020-007E,U+00A0-024F,U+0300-036F,U+1E00-1EFF"   # Latin, extensions, combining marks, Vietnamese
UNICODES+=",U+0370-03FF,U+0400-04FF"                          # Greek, Cyrillic
UNICODES+=",U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF"  # Arabic and its presentation forms
UNICODES+=",U+2000-206F,U+20A0-20BF,U+2100-214F,U+2190-21FF"  # punctuation, currency, letterlike, arrows
UNICODES+=",U+2212,U+2248,U+2260,U+2264,U+2265,U+25CF,U+FB00-FB06"

mkdir -p "$OUT"
# <package face>:<asset name>
for face in 400Regular:regular 400Regular_Italic:italic 500Medium:medium 600SemiBold:semibold 700Bold:bold; do
	pyftsubset "$SRC/${face%%:*}/GoogleSans_${face%%:*}.ttf" \
		--output-file="$OUT/google-sans-${face##*:}.ttf" \
		--unicodes="$UNICODES" \
		--layout-features='*' --notdef-outline --name-IDs='*' --name-languages='*'
done

# The SIL Open Font License travels with the modified fonts.
cp "$SRC/LICENSE_FONT" "$OUT/LICENSE_FONT"
ls -l "$OUT"
