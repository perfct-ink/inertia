export default {
  extends: ['stylelint-config-standard-scss'],
  rules: {
    // OOCSS naming from AGENTS.md: single dash = relationship, `--` = state,
    // underscore = multi-word term. Selector shape is reviewed by hand.
    'selector-class-pattern': null,
    'scss/dollar-variable-pattern': null,
    'scss/at-mixin-pattern': null,
    'scss/at-function-pattern': null,
    // Sass functions like color(primary, 0.5) emit hsl(var(--x)/0.5).
    'function-no-unknown': null,
    'scss/function-no-unknown': null,
    'color-function-notation': null,
    'alpha-value-notation': null,
    'declaration-empty-line-before': null,
    // `@include text('sm')` sits beside declarations without a blank line.
    'at-rule-empty-line-before': ['always', { except: ['blockless-after-same-name-blockless', 'first-nested'], ignore: ['after-comment'], ignoreAtRules: ['include'] }],
    'scss/at-rule-conditional-no-parentheses': null,
  },
}
