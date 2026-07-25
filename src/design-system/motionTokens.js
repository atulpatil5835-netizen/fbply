export const motionTokens = Object.freeze({
  duration: Object.freeze({
    instant: 0,
    fast: 150,
    normal: 200,
    slow: 220,
    modal: 180,
    card: 180,
    numberReveal: 560,
    homeEntry: 360,
    loader: 1600,
    attention: 900,
    skeleton: 1400,
  }),
  delay: Object.freeze({
    none: 0,
    homeHeader: 0,
    homeCards: 80,
    numberReveal: 150,
    quickActions: 300,
    recentActivity: 470,
    stagger: 70,
    compactStagger: 45,
  }),
  easing: Object.freeze({
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    decelerate: 'cubic-bezier(0.16, 1, 0.3, 1)',
    softOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
    linear: 'linear',
  }),
  spring: Object.freeze({
    gentle: Object.freeze({ duration: 260, easing: 'cubic-bezier(0.2, 0, 0, 1)' }),
    settle: Object.freeze({ duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }),
    firm: Object.freeze({ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }),
  }),
  distance: Object.freeze({
    rise: '6px',
    entry: '10px',
    hoverLift: '-1px',
    pressScale: '0.985',
  }),
  numberReveal: Object.freeze({
    minDuration: 300,
    maxDuration: 700,
  }),
  reducedMotion: Object.freeze({
    mediaQuery: '(prefers-reduced-motion: reduce)',
    duration: 0,
    transition: 'none',
  }),
})

function ms(value) {
  return `${value}ms`
}

export const motionCssVariables = Object.freeze({
  '--motion-duration-fast': ms(motionTokens.duration.fast),
  '--motion-duration-normal': ms(motionTokens.duration.normal),
  '--motion-duration-slow': ms(motionTokens.duration.slow),
  '--motion-duration-modal': ms(motionTokens.duration.modal),
  '--motion-duration-card': ms(motionTokens.duration.card),
  '--motion-duration-number-reveal': ms(motionTokens.duration.numberReveal),
  '--motion-duration-home-entry': ms(motionTokens.duration.homeEntry),
  '--motion-duration-loader': ms(motionTokens.duration.loader),
  '--motion-duration-attention': ms(motionTokens.duration.attention),
  '--motion-duration-skeleton': ms(motionTokens.duration.skeleton),
  '--motion-delay-home-header': ms(motionTokens.delay.homeHeader),
  '--motion-delay-home-cards': ms(motionTokens.delay.homeCards),
  '--motion-delay-number-reveal': ms(motionTokens.delay.numberReveal),
  '--motion-delay-quick-actions': ms(motionTokens.delay.quickActions),
  '--motion-delay-recent-activity': ms(motionTokens.delay.recentActivity),
  '--motion-delay-stagger': ms(motionTokens.delay.stagger),
  '--motion-delay-compact-stagger': ms(motionTokens.delay.compactStagger),
  '--motion-ease-standard': motionTokens.easing.standard,
  '--motion-ease-decelerate': motionTokens.easing.decelerate,
  '--motion-ease-soft-out': motionTokens.easing.softOut,
  '--motion-rise-distance': motionTokens.distance.rise,
  '--motion-entry-distance': motionTokens.distance.entry,
  '--motion-hover-lift': motionTokens.distance.hoverLift,
  '--motion-press-scale': motionTokens.distance.pressScale,
})
