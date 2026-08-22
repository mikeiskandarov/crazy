import {useEffect, useLayoutEffect, useRef} from 'react';
import {Application, Container, Graphics, Text} from 'pixi.js';
import {cancelRender, continueRender, delayRender, Img, staticFile} from 'remotion';
import type {VisualState, VisibleWheelSegment} from '../../contracts/visual-state';

const WIDTH = 840;
const HEIGHT = 840;
const CENTER_X = 420;
const CENTER_Y = 418;

function colorsForSegment(segment: VisibleWheelSegment, index: number): [number, number, number] {
  const alternate = index % 2 === 0;
  if (segment.eventClass === 'loss') return alternate ? [0xff8a5b, 0xc62848, 0x57091f] : [0xffb04b, 0xa91d39, 0x430819];
  if (segment.eventClass === 'refund') return alternate ? [0xf4d17d, 0x66548f, 0x241d45] : [0xe9b75b, 0x493d78, 0x181633];
  if (segment.eventClass === 'feature') return alternate ? [0xffd56d, 0xba49d3, 0x4f1b76] : [0xffe08b, 0x7a42c7, 0x29195d];
  return alternate ? [0xffd46a, 0x169b75, 0x064932] : [0xffe58d, 0x087d68, 0x043a35];
}

function hashUnit(seed: number, index: number): number {
  let value = (seed ^ Math.imul(index + 1, 0x45d9f3b)) >>> 0;
  value = (value ^ (value >>> 16)) >>> 0;
  value = Math.imul(value, 0x45d9f3b) >>> 0;
  value = (value ^ (value >>> 16)) >>> 0;
  return value / 0x1_0000_0000;
}

function drawScene(app: Application, state: VisualState): void {
  const removed = app.stage.removeChildren();
  for (const child of removed) child.destroy({children: true});
  const stageLights = new Graphics();
  stageLights.moveTo(100, 0).lineTo(315, HEIGHT).lineTo(0, HEIGHT).closePath().fill({color: 0xf7b51a, alpha: state.beatKind === 'reveal' ? .13 : .045});
  stageLights.moveTo(740, 0).lineTo(525, HEIGHT).lineTo(840, HEIGHT).closePath().fill({color: 0x8e5cff, alpha: state.beatKind === 'threat' ? .12 : .05});
  app.stage.addChild(stageLights);

  const shadow = new Graphics().ellipse(CENTER_X, CENTER_Y + 322, 316, 58).fill({color: 0x000000, alpha: .48});
  app.stage.addChild(shadow);
  const wheel = new Container();
  wheel.position.set(CENTER_X, CENTER_Y);
  wheel.rotation = state.wheel.rotationRadians;
  const backRim = new Graphics().circle(0, 18, 337).fill({color: 0x3a1706}).stroke({color: 0x100703, width: 16});
  wheel.addChild(backRim);
  const segments = state.wheel.segments;
  const slice = Math.PI * 2 / segments.length;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    const start = index * slice;
    const end = start + slice;
    const [innerColor, middleColor, outerColor] = colorsForSegment(segment, index);
    const sector = new Graphics();
    sector.moveTo(0, 0).arc(0, 0, 302, start, end).closePath().fill({color: outerColor});
    sector.moveTo(0, 0).arc(0, 0, 264, start, end).closePath().fill({color: middleColor});
    sector.moveTo(0, 0).arc(0, 0, 178, start, end).closePath().fill({color: innerColor, alpha: .88});
    sector.moveTo(0, 0).arc(0, 0, 302, start, end).closePath().fill({color: 0xffd978, alpha: segment.eventClass === 'feature' ? .13 : .06});
    sector.moveTo(0, 0).arc(0, 0, 302, start, end).closePath().stroke({color: 0xffe4a1, width: 4, alpha: .78});
    wheel.addChild(sector);
    const angle = start + slice / 2;
    const label = new Text({text: segment.label, style: {fontFamily: 'Barlow Condensed', fontSize: segments.length > 10 ? 27 : 35, fontWeight: '700', fill: 0xfff4d0, stroke: {color: 0x1a0b08, width: 5}, align: 'center'}});
    label.anchor.set(.5);
    label.position.set(Math.cos(angle) * 224, Math.sin(angle) * 224);
    label.rotation = angle + Math.PI / 2;
    wheel.addChild(label);
  }
  const rimGlow = new Graphics().circle(0, 0, 347).stroke({color: 0xffd45c, width: 13, alpha: .18}).circle(0, 0, 338).stroke({color: 0xfff0ad, width: 7, alpha: .28});
  wheel.addChild(rimGlow);
  const rim = new Graphics().circle(0, 0, 330).stroke({color: 0x5b2607, width: 38}).circle(0, 0, 325).stroke({color: 0xffc541, width: 16}).circle(0, 0, 313).stroke({color: 0x8f4b0c, width: 7}).circle(0, 0, 307).stroke({color: 0xffefb0, width: 3, alpha: .88});
  wheel.addChild(rim);
  const shine = new Graphics();
  shine.arc(0, 0, 296, Math.PI * 1.08, Math.PI * 1.9).stroke({color: 0xffffff, width: 10, alpha: .18});
  shine.arc(0, 0, 287, Math.PI * 1.15, Math.PI * 1.72).stroke({color: 0xffed9f, width: 4, alpha: .42});
  wheel.addChild(shine);
  for (let index = 0; index < 32; index += 1) {
    const angle = (index / 32) * Math.PI * 2;
    const wave = .5 + .5 * Math.sin(state.frame * .14 - index * .42);
    const bulb = new Graphics().circle(Math.cos(angle) * 327, Math.sin(angle) * 327, 6 + wave * 1.2).fill({color: wave > .48 ? 0xffecaf : 0xb47a1b, alpha: .58 + wave * .42});
    wheel.addChild(bulb);
  }
  wheel.alpha = state.beatKind === 'hook' ? .68 : state.finalResult ? .82 : 1;
  const heroScale = state.beatKind === 'hook' ? 1.1 : state.focalElementId === 'hero-wheel' ? 1.035 : .96;
  wheel.scale.set(heroScale);
  app.stage.addChild(wheel);

  // The hub belongs to the physical axle, not the rotating wheel face. Keeping it
  // in stage coordinates also avoids glyph clipping at arbitrary wheel angles.
  const hub = new Container();
  hub.position.set(CENTER_X, CENTER_Y);
  hub.scale.set(heroScale);
  hub.alpha = wheel.alpha;
  const cap = new Graphics().circle(0, 0, 95).fill({color: 0x100c14}).stroke({color: 0xf7b51a, width: 12}).circle(0, -9, 70).fill({color: 0x2b0d4a, alpha: .9});
  hub.addChild(cap);
  app.stage.addChild(hub);

  const pointerBounce = state.wheel.pointerEngaged ? Math.min(.13, Math.abs(state.wheel.angularVelocity) * .12) * Math.sin(state.frame * 1.7) : 0;
  const pointer = new Container();
  pointer.position.set(CENTER_X, state.wheel.pointerEngaged ? 42 : -22);
  pointer.rotation = pointerBounce;
  pointer.alpha = state.wheel.pointerEngaged ? 1 : .24;
  const pointerShadow = new Graphics().moveTo(-38, 2).lineTo(38, 2).lineTo(0, 96).closePath().fill({color: 0x000000, alpha: .5});
  const pointerBody = new Graphics().moveTo(-34, -4).lineTo(34, -4).quadraticCurveTo(20, 44, 0, 90).quadraticCurveTo(-20, 44, -34, -4).closePath().fill({color: 0xf7b51a}).stroke({color: 0xffedac, width: 5});
  pointer.addChild(pointerShadow, pointerBody);
  app.stage.addChild(pointer);

  const elapsed = state.frame - state.beatStartFrame;
  const showCelebration = state.beatKind === 'reveal' && state.finalResult?.tone === 'positive';
  const showImpact = showCelebration || state.beatKind === 'hope';
  if (showImpact) {
    const count = showCelebration ? 104 : 28;
    const particles = new Graphics();
    for (let index = 0; index < count; index += 1) {
      const delay = Math.floor(hashUnit(97, index) * 18);
      const age = Math.max(0, elapsed - delay);
      const originX = hashUnit(state.beatStartFrame + 71, index) * WIDTH;
      const drift = (hashUnit(state.beatStartFrame + 313, index) - .5) * 4.8;
      const x = originX + drift * age + Math.sin(age * .18 + index) * 13;
      const y = -30 + hashUnit(211, index) * 110 + age * (5.2 + hashUnit(401, index) * 3.8) + age * age * .055;
      const alpha = Math.max(0, Math.min(1, age / 3) * (1 - age / 68));
      const color = [0xffe45e, 0xff5db1, 0x7e6bff, 0x48f4d2, 0xffffff, 0x55e878][index % 6]!;
      const size = 5 + hashUnit(509, index) * 7;
      if (index % 4 === 0) particles.circle(x, y, size * .55).fill({color, alpha});
      else if (index % 4 === 1) particles.moveTo(x, y - size).lineTo(x + size * .65, y).lineTo(x, y + size).lineTo(x - size * .65, y).closePath().fill({color, alpha});
      else if (index % 4 === 2) particles.moveTo(x - size, y - 3).lineTo(x + size * .8, y - 7).lineTo(x + size, y + 3).lineTo(x - size * .8, y + 7).closePath().fill({color, alpha});
      else particles.star(x, y, 5, size, size * .42, age * .18).fill({color, alpha});
    }
    app.stage.addChild(particles);
  }
  if (state.beatKind === 'threat') {
    const pulse = .08 + (Math.sin(state.frame * .34) + 1) * .035;
    app.stage.addChild(new Graphics().circle(CENTER_X, CENTER_Y, 384).stroke({color: 0xff4438, width: 18, alpha: pulse}));
  }
  app.render();
}

export const PixiStage: React.FC<{state: VisualState}> = ({state}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handle = delayRender('Initialize the single deterministic Pixi canvas');
    const app = new Application();
    let cancelled = false;
    app.init({canvas, width: WIDTH, height: HEIGHT, backgroundAlpha: 0, antialias: true, autoStart: false, sharedTicker: false, preference: 'webgl', resolution: 1}).then(() => {
      if (cancelled) return;
      app.stop();
      appRef.current = app;
      drawScene(app, stateRef.current);
      continueRender(handle);
    }).catch((error: unknown) => cancelRender(error instanceof Error ? error : new Error(String(error))));
    return () => {
      cancelled = true;
      if (appRef.current) {
        appRef.current.destroy(false, {children: true, texture: true});
        appRef.current = null;
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (appRef.current) drawScene(appRef.current, state);
  }, [state]);

  const heroScale = state.beatKind === 'hook' ? 1.1 : state.focalElementId === 'hero-wheel' ? 1.035 : .96;
  const alpha = state.beatKind === 'hook' ? .68 : state.finalResult ? .82 : 1;
  const stageTop = state.beatKind === 'hook' ? 100 : 235;
  const stageSize = 960;
  const hubTop = stageTop + CENTER_Y / HEIGHT * stageSize - 52;
  return <>
    <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} data-render-layer="pixi-single-canvas" style={{position: 'absolute', left: 60, top: stageTop, width: stageSize, height: stageSize, zIndex: 25}} />
    <div aria-hidden style={{position: 'absolute', left: 460, top: hubTop, width: 160, height: 104, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFE7A3', fontFamily: 'Archivo Black', fontSize: 55, lineHeight: 1, letterSpacing: -2, textShadow: '0 3px 0 #4B1D08, 0 0 8px rgba(255,231,163,.2)', opacity: alpha, transform: `scale(${heroScale})`, transformOrigin: 'center'}}>
      {state.survivalExperience
        ? <Img src={staticFile('assets/brand/crazy-time-logo.png')} style={{width: 140, height: 100, objectFit: 'contain', filter: 'drop-shadow(0 3px 2px rgba(0,0,0,.75))'}} />
        : 'CN'}
    </div>
  </>;
};
