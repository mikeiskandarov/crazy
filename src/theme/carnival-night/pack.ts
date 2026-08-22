import type {ThemePack} from '../../contracts/packs';
import {carnivalNightTokens} from './tokens';

export const carnivalNightTheme: ThemePack = {
  id: 'carnival-night',
  version: '1.0.0',
  tokens: carnivalNightTokens,
  assets: [
    {assetId: 'background-crazy-time-wonderland', path: 'public/assets/backgrounds/crazy-time-wonderland-v1.png', sha256: 'a564d606e14928755c40076aa79a1082fd2e6ec3ef7941ae4866d578ade058a6', role: 'stage-background', provenanceId: 'openai-generated-crazy-time-wonderland-v1'},
    {assetId: 'font-impact', path: 'public/assets/fonts/archivo-black-latin-400-normal.woff2', sha256: '25f33e61cf995abd6be62931cf03bf427286259177b43618cc410ee0157cfd30', role: 'impact-font', provenanceId: 'fontsource-archivo-black-5-3-0'},
    {assetId: 'font-condensed', path: 'public/assets/fonts/barlow-condensed-latin-700-normal.woff2', sha256: '3787a5a419171630e6890cfa47c4da067474d005cd0ff8dc11ec090fdc3ee2b8', role: 'condensed-font', provenanceId: 'fontsource-barlow-condensed-5-3-0'},
    {assetId: 'font-ui', path: 'public/assets/fonts/inter-latin-600-normal.woff2', sha256: 'f9a06e79cd3a2a20951c0f0e28f66dd0e6d3fda73911d640a2125c8fcb78f21a', role: 'ui-font', provenanceId: 'fontsource-inter-5-3-0'},
  ],
  validate() {
    const colors = Object.values(this.tokens.color);
    const invalid = colors.filter((color) => !/^#[0-9A-F]{6}$/i.test(color));
    return invalid.length > 0
      ? [{issueId: 'theme-color', severity: 'blocker' as const, message: `Invalid semantic colors: ${invalid.join(', ')}`}]
      : [];
  },
};
