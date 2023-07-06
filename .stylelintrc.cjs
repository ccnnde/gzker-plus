module.exports = {
  extends: ['stylelint-config-recess-order', 'stylelint-config-standard-scss', 'stylelint-config-standard-vue/scss'],
  rules: {
    // fix element-plus class error https://github.com/WordPress/gutenberg/issues/28616
    'selector-class-pattern': [
      '^([a-z][a-z0-9]*)(-[a-z0-9]+)*((__([a-z][a-z0-9]*)(-[a-z0-9]+)*)?(--([a-z][a-z0-9]*)(-[a-z0-9]+)*)?)$',
      {
        message: 'Expected class pattern to be BEM style',
      },
    ],
  },
};
