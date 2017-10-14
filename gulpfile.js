var gulp = require('gulp'),
    replace = require('gulp-replace'),
    gp_concat = require('gulp-concat'),
    clean = require('gulp-clean'),
    zip = require('gulp-zip'),
    gulpUtil = require('gulp-util'),
    babel = require('gulp-babel'),
    gulpDocumentation = require('gulp-documentation'),
    ghPages = require('gulp-gh-pages'),
    clean = require('gulp-clean'),
    gp_uglify = require('gulp-uglify');

gulp.task('clean', function () {
    return gulp.src('dist', {read: false})
        .pipe(clean());
});

gulp.task('copy-non-js-files', ['clean'], function() {
    return gulp.src(['icons/**', 'content_scripts/**', '!content_scripts/**/*.js', 'pages/**', '!pages/**/*.js'], {base: "."})
        .pipe(gulp.dest('dist/extension'));
});

gulp.task('copy-pretty-default-js', ['copy-js-files'], function() {
    return gulp.src(['pages/default.js'], {base: "."})
        .pipe(gulp.dest('dist/extension'));
});

gulp.task('build_common_content_min', ['clean'], function() {
    return gulp.src([
        "libs/trie.js",
        "libs/jquery.js",
        "content_scripts/utils.js",
        "content_scripts/runtime.js",
        "content_scripts/normal.js",
        "content_scripts/insert.js",
        "content_scripts/visual.js",
        "content_scripts/hints.js",
    ])
    .pipe(gp_concat('common_content.min.js'))
    .pipe(babel({presets: ['es2015']}))
    .pipe(gp_uglify().on('error', gulpUtil.log))
    .pipe(gulp.dest('dist/extension/content_scripts'));
});

gulp.task('use_common_content_min', ['copy-non-js-files', 'clean'], function() {
    return gulp.src([
        'pages/frontend.html',
        'pages/error.html',
        'pages/options.html',
        'pages/popup.html',
        'pages/mermaid.html',
        'pages/start.html',
        'pages/pdf_viewer.html',
        'pages/markdown.html'
    ], {base: "."})
        .pipe(replace(/.*build:common_content[^]*endbuild.*/, '        <script src="../content_scripts/common_content.min.js"></script>'))
        .pipe(replace('sha256-nWgGskPWTedp2TpUOZNWBmUL17nlwxaRUKiNdVES5rE=', 'sha256-0MujXiVB1Z1j6vda9QAWnGZUT7RNwJIjccsEzO1Jtcw='))
        .pipe(gulp.dest('dist/extension'));
});

gulp.task('use_common_content_min_manifest', ['copy-non-js-files', 'clean'], function() {
    return gulp.src('manifest.json')
        .pipe(replace(/.*build:common_content[^]*endbuild.*/, '            "content_scripts/common_content.min.js",'))
        .pipe(replace('sha256-nWgGskPWTedp2TpUOZNWBmUL17nlwxaRUKiNdVES5rE=', 'sha256-0MujXiVB1Z1j6vda9QAWnGZUT7RNwJIjccsEzO1Jtcw='))
        .pipe(gulp.dest('dist/extension'));
});

gulp.task('copy-js-files', ['copy-es-files'], function() {
    return gulp.src([
        'libs/ace/*.js',
        'pages/pdf/*.js',
        'libs/marked.min.js',
        'libs/mermaid.min.js',
        'libs/webfontloader.js'
    ], {base: "."})
    .pipe(gp_uglify().on('error', gulpUtil.log))
    .pipe(gulp.dest('dist/extension'));
});

gulp.task('copy-es-files', ['clean'], function() {
    return gulp.src([
        'content_scripts/front.js',
        'content_scripts/content_scripts.js',
        'content_scripts/top.js',
        'background.js',
        'pages/*.js'
    ], {base: "."})
    .pipe(babel({presets: ['es2015']}))
    .pipe(gp_uglify().on('error', gulpUtil.log))
    .pipe(gulp.dest('dist/extension'));
});

// Documentation
gulp.task('documentation:html', function () {
  // Generating README documentation
  return gulp.src('./{content_scripts/*.js,pages/*.js}')
    .pipe(gulpDocumentation('html'))
    .pipe(gulp.dest('dist/documentation'));
});

gulp.task('documentation:md', function () {
  // Generating README documentation
  return gulp.src('./{content_scripts/*.js,pages/*.js}')
    .pipe(gulpDocumentation('md'))
    .pipe(gulp.dest('docs'));
});

// Deploy
gulp.task('deploy:docs', function() {
    return gulp.src('dist/documentation/**/*')
    .pipe(ghPages());
});

gulp.task('clean', function () {
    return gulp.src('dist', {read: false})
        .pipe(clean());
});

gulp.task('build', [
    'clean',
    'copy-pretty-default-js',
    'build_common_content_min',
    'use_common_content_min',
    'use_common_content_min_manifest',
    'documentation:md',
], function() {
    return gulp.src('dist/extension/**')
        .pipe(zip('sk.zip'))
        .pipe(gulp.dest('dist'));
});

gulp.task('deploy', ['deploy:docs']);

gulp.task('default', ['build'])