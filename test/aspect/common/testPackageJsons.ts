
export const pokedexPackageJson = `{
  "name": "pokedex",
  "version": "3.0.0",
  "private": true,
  "author": "Ali Gasymov <alik0211alik@gmail.com> (https://alik0211.com/)",
  "homepage": "https://alik0211.github.io/pokedex/",
  "dependencies": {
    "hardtack": "4.1.0",
    "react": "16.7.0",
    "react-dom": "16.7.0",
    "react-redux": "6.0.0",
    "redux": "4.0.1",
    "redux-api-middleware": "3.0.1",
    "redux-thunk": "2.3.0"
  },
  "devDependencies": {
    "husky": "1.3.1",
    "lint-staged": "8.1.5",
    "prettier": "1.15.3",
    "react-scripts": "2.1.8",
    "redux-logger": "3.0.6"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test --env=jsdom",
    "eject": "react-scripts eject"
  },
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{js,css}": [
      "prettier --write",
      "git add"
    ]
  }
}`;

export const angularPackageJson = `{
  "name": "ang2-conduit",
  "version": "0.0.0",
  "license": "MIT",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build --prod  --base-href ./ && cp CNAME dist/CNAME",
    "test": "ng test",
    "lint": "ng lint --force",
    "e2e": "ng e2e"
  },
  "pre-commit": [
    "lint"
  ],
  "private": true,
  "dependencies": {
    "@angular/animations": "7.2.4",
    "@angular/common": "7.2.4",
    "@angular/compiler": "7.2.4",
    "@angular/core": "7.2.4",
    "@angular/forms": "7.2.4",
    "@angular/platform-browser": "7.2.4",
    "@angular/platform-browser-dynamic": "7.2.4",
    "@angular/router": "7.2.4",
    "core-js": "^2.4.1",
    "marked": "^0.3.9",
    "rxjs": "^6.4.0",
    "tslib": "^1.9.0",
    "zone.js": "^0.8.29"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "~0.13.0",
    "@angular/cli": "^7.3.1",
    "@angular/compiler-cli": "7.2.4",
    "@angular/language-service": "7.2.4",
    "@types/jasmine": "~2.5.53",
    "@types/jasminewd2": "~2.0.2",
    "@types/node": "^9.4.0",
    "codelyzer": "^4.5.0",
    "jasmine-core": "~2.6.2",
    "jasmine-spec-reporter": "~4.1.0",
    "karma": "~1.7.0",
    "karma-chrome-launcher": "~2.1.1",
    "karma-cli": "~1.0.1",
    "karma-coverage-istanbul-reporter": "^1.2.1",
    "karma-jasmine": "~1.1.0",
    "karma-jasmine-html-reporter": "^0.2.2",
    "pre-commit": "^1.2.2",
    "protractor": "^5.4.2",
    "ts-node": "~4.1.0",
    "tslint": "~5.9.1",
    "typescript": "3.2.4"
  }
}`;
