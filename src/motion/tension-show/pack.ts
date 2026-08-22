import type {MotionAudioPack} from '../../contracts/packs';

export const tensionShowMotion: MotionAudioPack = {
  id: 'tension-show',
  version: '1.0.0',
  durations: {
    anticipation: 18,
    reveal: 10,
    reaction: 28,
    reset: 14,
    microPause: 7,
  },
  easings: {
    'show-enter': {id: 'show-enter', controlPoints: [0.16, 0.9, 0.24, 1]},
    'wheel-decelerate': {id: 'wheel-decelerate', controlPoints: [0.08, 0.58, 0.12, 1]},
    'calm-exit': {id: 'calm-exit', controlPoints: [0.4, 0, 1, 1]},
  },
  motionPresets: {
    'hook-impact': {id: 'hook-impact', description: 'Fast title settle with short controlled overshoot'},
    'wheel-progress': {id: 'wheel-progress', description: 'Continuous analytical spin driven by absolute frame'},
    'danger-focus': {id: 'danger-focus', description: 'Bankroll focus with sober red pulse'},
    'hope-focus': {id: 'hope-focus', description: 'Verified recovery with champagne glint'},
    'decision-hold': {id: 'decision-hold', description: 'Near-static choice state'},
    'result-lock': {id: 'result-lock', description: 'Calm answer card after micro-pause'},
    'outro-receipt': {id: 'outro-receipt', description: 'Stable compliance receipt'},
  },
  audioCues: {
    music: {assetId: 'music-bed', role: 'music', gainMilli: 300},
    hook: {assetId: 'hook-impact', role: 'impact', gainMilli: 740},
    ui: {assetId: 'ui-tick', role: 'ui', gainMilli: 420},
    spin: {assetId: 'wheel-tick', role: 'spin', gainMilli: 360},
    riser: {assetId: 'riser', role: 'ambience', gainMilli: 460},
    warning: {assetId: 'warning-pulse', role: 'impact', gainMilli: 540},
    reveal: {assetId: 'reveal-impact', role: 'impact', gainMilli: 760},
    result: {assetId: 'result-resolve', role: 'ambience', gainMilli: 520},
    celebration: {assetId: 'celebration', role: 'impact', gainMilli: 360},
  },
  loudness: {targetLufs: -14, truePeakDb: -1},
};
