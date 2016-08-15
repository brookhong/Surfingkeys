var gulp = require('gulp'),
    replace = require('gulp-replace'),
    gp_concat = require('gulp-concat'),
    clean = require('gulp-clean'),
    zip = require('gulp-zip'),
    gp_uglify = require('gulp-uglify');

gulp.task('clean', function () {
    return gulp.src('dist', {read: false})
        .pipe(clean());
});

gulp.task('copy-non-js-files', ['clean'], function() {
    return gulp.src(['icons/**', 'content_scripts/**', '!content_scripts/**/*.js', 'pages/**', '!pages/**/*.js'], {base: "."})
        .pipe(gulp.dest('dist'));
});

gulp.task('copy-pretty-default-js', ['copy-js-files'], function() {
    return gulp.src(['pages/default.js'], {base: "."})
        .pipe(gulp.dest('dist'));
});

gulp.task('build_common_content_min', ['clean'], function() {
    return gulp.src([
        "libs/trie.js",
        "libs/jquery.min.js",
        "content_scripts/utils.js",
        "content_scripts/runtime.js",
        "content_scripts/normal.js",
        "content_scripts/visual.js",
        "content_scripts/hints.js",
        "content_scripts/events.js"
    ])
    .pipe(gp_concat('common_content.min.js'))
    .pipe(gp_uglify())
    .pipe(gulp.dest('dist/content_scripts'));
});

gulp.task('use_common_content_min', ['copy-non-js-files', 'clean'], function() {
    gulp.src(['pages/frontend.html', 'pages/error.html', 'pages/options.html', 'pages/github-markdown.html'], {base: "."})
        .pipe(replace(/.*build:common_content[^]*endbuild.*/, '        <script src="../content_scripts/common_content.min.js"></script>'))
        .pipe(replace('sha256-lDGRdKgKO0PWPM8gzds75c6s6+XVZP1t+dfFrPEbXyk=', 'sha256-g8hZSMVxfGe/9E8KGWayP4wSYYmyR3rNoNJoxPobLcE='))
        .pipe(gulp.dest('dist'));
    gulp.src('manifest.json')
        .pipe(replace(/.*build:common_content[^]*endbuild.*/, '            "content_scripts/common_content.min.js",'))
        .pipe(replace('sha256-lDGRdKgKO0PWPM8gzds75c6s6+XVZP1t+dfFrPEbXyk=', 'sha256-g8hZSMVxfGe/9E8KGWayP4wSYYmyR3rNoNJoxPobLcE='))
        .pipe(gulp.dest('dist'));
});

gulp.task('copy-js-files', ['clean'], function() {
    return gulp.src([
        'background.js',
        'content_scripts/content_scripts.js',
        'content_scripts/top.js',
        'libs/ace/*.js',
        'libs/marked.min.js',
        'pages/*.js'
    ], {base: "."})
    .pipe(gp_uglify())
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['copy-pretty-default-js', 'build_common_content_min', 'use_common_content_min'], function() {
    return gulp.src('dist/**')
        .pipe(zip('sk.zip'))
        .pipe(gulp.dest('dist'));
});
