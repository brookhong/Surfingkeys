var gulp = require('gulp'),
    replace = require('gulp-replace'),
    gp_concat = require('gulp-concat'),
    clean = require('gulp-clean'),
    zip = require('gulp-zip'),
    gulpUtil = require('gulp-util'),
    babel = require('gulp-babel'),
    gp_uglify = require('gulp-uglify'),
    eslint = require('gulp-eslint');

gulp.task('lint', () => {
    // ESLint ignores files with "node_modules" paths.
    // So, it's best to have gulp ignore the directory as well.
    // Also, Be sure to return the stream from the task;
    // Otherwise, the task may end before the stream has finished.
    return gulp.src([
        'background.js',
        'gulpfile.js',
        'content_scripts/*.js',
        'pages/*.js',
        '!node_modules/**'
        ])
        // eslint() attaches the lint output to the "eslint" property
        // of the file object so it can be used by other modules.
        .pipe(eslint())
        // eslint.format() outputs the lint results to the console.
        // Alternatively use eslint.formatEach() (see Docs).
        .pipe(eslint.format())
        // To have the process exit with an error code (1) on
        // lint error, return the stream and pipe to failAfterError last.
        .pipe(eslint.failAfterError());
});

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
    .pipe(gulp.dest('dist/content_scripts'));
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
        .pipe(gulp.dest('dist'));
});

gulp.task('use_common_content_min_manifest', ['copy-non-js-files', 'clean'], function() {
    return gulp.src('manifest.json')
        .pipe(replace(/.*build:common_content[^]*endbuild.*/, '            "content_scripts/common_content.min.js",'))
        .pipe(replace('sha256-nWgGskPWTedp2TpUOZNWBmUL17nlwxaRUKiNdVES5rE=', 'sha256-0MujXiVB1Z1j6vda9QAWnGZUT7RNwJIjccsEzO1Jtcw='))
        .pipe(gulp.dest('dist'));
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
    .pipe(gulp.dest('dist'));
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
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['lint', 'copy-pretty-default-js', 'build_common_content_min', 'use_common_content_min', 'use_common_content_min_manifest'], function() {
    return gulp.src('dist/**')
        .pipe(zip('sk.zip'))
        .pipe(gulp.dest('dist'));
});
