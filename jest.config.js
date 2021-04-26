module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'ts', 'json', 'vue'],
  snapshotSerializers: ['<rootDir>/node_modules/jest-serializer-vue'],
  transform: {
    '^.+\\.vue$': 'vue-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native$': 'react-native-web',
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
  },
  globals: {
    'vue-jest': {
      babelConfig: './babel.config.js',
    },
  },
};
