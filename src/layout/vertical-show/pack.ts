import type {ContentMetrics, LayoutIssue, LayoutPack, ResolvedLayout} from '../../contracts/packs';

const criticalInsets = {left: 56, top: 160, right: 150, bottom: 310};

export const verticalShowLayout: LayoutPack = {
  id: 'vertical-show',
  version: '1.0.0',
  supportedAspectRatios: ['9:16'],
  regions: {
    hook: {
      regionId: 'hook',
      purpose: 'hook',
      normalizedBounds: {x: 0.052, y: 0.083, width: 0.77, height: 0.15},
      safeInsets: criticalInsets,
      zLayer: 50,
    },
    hero: {
      regionId: 'hero',
      purpose: 'hero',
      normalizedBounds: {x: 0.045, y: 0.22, width: 0.84, height: 0.42},
      safeInsets: criticalInsets,
      zLayer: 20,
    },
    hud: {
      regionId: 'hud',
      purpose: 'hud',
      normalizedBounds: {x: 0.052, y: 0.55, width: 0.77, height: 0.14},
      safeInsets: criticalInsets,
      zLayer: 60,
    },
    evidence: {
      regionId: 'evidence',
      purpose: 'evidence',
      normalizedBounds: {x: 0.052, y: 0.69, width: 0.77, height: 0.17},
      safeInsets: criticalInsets,
      zLayer: 55,
    },
    result: {
      regionId: 'result',
      purpose: 'overlay',
      normalizedBounds: {x: 0.052, y: 0.59, width: 0.77, height: 0.25},
      safeInsets: criticalInsets,
      zLayer: 80,
    },
    footer: {
      regionId: 'footer',
      purpose: 'footer',
      normalizedBounds: {x: 0.052, y: 0.865, width: 0.77, height: 0.045},
      safeInsets: criticalInsets,
      zLayer: 90,
    },
  },
  variants: {
    standard: {id: 'standard', description: 'Single hero wheel and stacked story evidence'},
    focus: {id: 'focus', description: 'Quiet HUD with enlarged hero'},
    detail: {id: 'detail', description: 'Bankroll or decision detail'},
    split: {id: 'split', description: 'Duel or race comparison'},
    result: {id: 'result', description: 'Calm oversized receipt'},
  },
  resolve({width, height, variantId}: {width: number; height: number; variantId: string; contentMetrics: ContentMetrics}): ResolvedLayout {
    const scaleX = width / 1080;
    const scaleY = height / 1920;
    const regions = Object.fromEntries(
      Object.entries(this.regions).map(([key, region]) => [key, {
        x: region.normalizedBounds.x * width,
        y: region.normalizedBounds.y * height,
        width: region.normalizedBounds.width * width,
        height: region.normalizedBounds.height * height,
        zLayer: region.zLayer,
      }]),
    );
    return {
      width,
      height,
      variantId,
      regions,
      criticalInsets: {
        left: criticalInsets.left * scaleX,
        top: criticalInsets.top * scaleY,
        right: criticalInsets.right * scaleX,
        bottom: criticalInsets.bottom * scaleY,
      },
    };
  },
  validate(layout: ResolvedLayout): LayoutIssue[] {
    const issues: LayoutIssue[] = [];
    if (layout.width / layout.height !== 9 / 16) {
      issues.push({issueId: 'layout-aspect', severity: 'blocker', message: 'VerticalShowLayout requires exact 9:16 output'});
    }
    if (!this.variants[layout.variantId]) {
      issues.push({issueId: 'layout-variant', severity: 'blocker', message: `Unknown layout variant: ${layout.variantId}`});
    }
    return issues;
  },
};
