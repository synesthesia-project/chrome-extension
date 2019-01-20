var gulp = require('gulp');
var clean = require('gulp-clean');
var gutil = require("gulp-util");
var ts = require('gulp-typescript');
var tslint = require('tslint');
var gulpTslint = require('gulp-tslint');
var runSequence = require('run-sequence');
var webpack = require('webpack');

var tsProjectBackground = ts.createProject('src/background/tsconfig.json');
var tsProjectContentScripts = ts.createProject('src/content-scripts/tsconfig.json');

// Utility Functions

function handleError(err) {
  gutil.log("Build failed", err.message);
  process.exit(1);
}

gulp.task('clean', function() {
  return gulp.src(['.tmp', 'dist'], {read: false})
        .pipe(clean());
});

gulp.task('ts-content-scripts', function () {
    return tsProjectContentScripts.src()
      .pipe(tsProjectContentScripts())
      .on('error', handleError)
      .pipe(gulp.dest('dist/content-scripts'));
});

gulp.task('ts-background-scripts', function () {
    return tsProjectBackground.src()
      .pipe(tsProjectBackground())
      .on('error', handleError)
      .pipe(gulp.dest('.tmp/'));
});

gulp.task('copy-manifest-json', function () {
    return gulp.src(['src/manifest.json']).pipe(gulp.dest('dist'));
});

gulp.task('copy-libs', function () {
    return gulp.src(['node_modules/jquery/dist/jquery.min.js']).pipe(gulp.dest('dist/lib'));
});

gulp.task('background-webpack', ['ts-background-scripts'], function(callback) {
    // run webpack
    webpack({
        entry: "./.tmp/background.js",
        output: {
            filename: "background.js",
            path: __dirname + "/dist"
        },
    }, function(err, stats) {
        if(err) throw new gutil.PluginError("webpack", err);
        callback();
    });
});

gulp.task('tslint-background', function() {
  var program = tslint.Linter.createProgram("src/background/tsconfig.json");

  return gulp.src(['src/background/**/*.ts'])
  .pipe(gulpTslint({
    formatter: 'verbose',
    configuration: 'tslint.json',
    program
  }))
  .on('error', handleError)
  .pipe(gulpTslint.report());
});

gulp.task('tslint-content-scripts', function() {
  var program = tslint.Linter.createProgram("src/content-scripts/tsconfig.json");

  return gulp.src(['src/content-scripts/**/*.ts'])
  .pipe(gulpTslint({
    formatter: 'verbose',
    configuration: 'tslint.json',
    program
  }))
  .on('error', handleError)
  .pipe(gulpTslint.report());
});

gulp.task('default', function(callback) {
  runSequence(
    'clean',
    ['copy-manifest-json', 'copy-libs'],
    ['ts-content-scripts', 'background-webpack'],
    ['tslint-background', 'tslint-content-scripts'],
    callback);
});
