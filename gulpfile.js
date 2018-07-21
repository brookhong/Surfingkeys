const gulp = require('gulp'),
    babel = require('gulp-babel'),
    replace = require('gulp-replace'),
    clean = require('gulp-clean'),
    eslint = require('gulp-eslint'),
    ghPages = require('gulp-gh-pages'),
    gp_concat = require('gulp-concat'),
    gp_uglify = require('gulp-uglify'),
    sourcemaps = require('gulp-sourcemaps'),
    gulpif = require('gulp-if'),
    minimist = require('minimist'),
    gulpDocumentation = require('gulp-documentation'),
    gulpUtil = require('gulp-util'),
    fs = require('fs'),
    zip = require('gulp-zip');

var options = minimist(process.argv.slice(2), {
    string: 'env',
    default: { env: process.env.NODE_ENV || 'production' }
});

gulp.task('lint', () => {
    return gulp.src([
        'gulpfile.js',
        'content_scripts/*.js',
        'pages/*.js',
        '!node_modules/**'
    ])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
});

gulp.task('clean', function () {
    return gulp.src(`dist/${buildTarget}-extension`, {read: false, allowEmpty: true})
        .pipe(clean());
});

gulp.task('copy-html-files', function() {
    if (buildTarget === "Firefox") {
        return gulp.src(['pages/*.html'], {base: "."})
            .pipe(replace(/\s*<script src="ga.js"><\/script>\n\s*<script async src='https:\/\/www.google-analytics.com\/analytics.js'><\/script>/, ''))
            .pipe(gulp.dest(`dist/${buildTarget}-extension`));
    } else {
        return gulp.src(['pages/*.html'], {base: "."})
            .pipe(gulp.dest(`dist/${buildTarget}-extension`));
    }
});

gulp.task('copy-non-js-files', function() {
    return gulp.src(['icons/**',
        'content_scripts/**',
        '!content_scripts/**/*.js',
        'pages/**',
        'libs/marked.min.js',
        'libs/mermaid.min.js',
        '!pages/**/*.html',
        '!pages/**/*.js'], {base: "."})
        .pipe(gulp.dest(`dist/${buildTarget}-extension`));
});

gulp.task('copy-es-files', function() {
    return gulp.src([
        'content_scripts/front.js',
        'content_scripts/content_scripts.js',
        'content_scripts/top.js',
        'pages/*.js'
    ], {base: "."})
        .pipe(gulpif(options.env === 'development', sourcemaps.init()))
        .pipe(babel({presets: ['es2015']}))
        .pipe(gulpif(!options.nominify, gp_uglify().on('error', gulpUtil.log)))
        .pipe(gulpif(options.env === 'development', sourcemaps.write('.')))
        .pipe(gulp.dest(`dist/${buildTarget}-extension`));
});

gulp.task('copy-js-files', gulp.series('copy-es-files', function() {
    var libs = [
        'libs/ace/*.js',
        'pages/pdf/*.js',
        'libs/webfontloader.js'
    ];
    return gulp.src(libs, {base: "."})
        .pipe(gulpif(options.env === 'development', sourcemaps.init()))
        .pipe(gulpif(!options.nominify, gp_uglify().on('error', gulpUtil.log)))
        .pipe(gulpif(options.env === 'development', sourcemaps.write('.')))
        .pipe(gulp.dest(`dist/${buildTarget}-extension`));
}));

gulp.task('copy-pretty-default-js', gulp.series('copy-js-files', function() {
    return gulp.src(['pages/default.js'], {base: "."})
        .pipe(gulp.dest(`dist/${buildTarget}-extension`));
}));

gulp.task('build_background', function() {
    var background = [
        "background.js"
    ];
    if (buildTarget === "Firefox") {
        background.unshift("firefox_bg.js");
        gulp.src("firefox_pac.js").pipe(gulp.dest(`dist/${buildTarget}-extension`));
    } else {
        background.unshift("chrome_bg.js");
    }
    return gulp.src(background)
        .pipe(gulpif(options.env === 'development', sourcemaps.init()))
        .pipe(gp_concat('background.js'))
        .pipe(babel({presets: ['es2015']}))
        .pipe(gulpif(!options.nominify, gp_uglify().on('error', gulpUtil.log)))
        .pipe(gulpif(options.env === 'development', sourcemaps.write('.')))
        .pipe(gulp.dest(`dist/${buildTarget}-extension`));
});

gulp.task('build_common_content_min', function() {
    var common_content = [
        "libs/trie.js",
        "content_scripts/keyboardUtils.js",
        "content_scripts/utils.js",
        "content_scripts/runtime.js",
        "content_scripts/normal.js",
        "content_scripts/insert.js",
        "content_scripts/visual.js",
        "content_scripts/hints.js",
        "content_scripts/clipboard.js",
    ];
    if (buildTarget === "Firefox") {
        common_content.push("libs/shadydom.min.js");
        common_content.push("content_scripts/firefox_fg.js");
    } else {
        common_content.push("content_scripts/chrome_fg.js");
    }
    return gulp.src(common_content)
        .pipe(gulpif(options.env === 'development', sourcemaps.init()))
        .pipe(gp_concat('common_content.min.js'))
        .pipe(babel({presets: ['es2015']}))
        .pipe(gulpif(!options.nominify, gp_uglify().on('error', gulpUtil.log)))
        .pipe(gulpif(options.env === 'development', sourcemaps.write('.')))
        .pipe(gulp.dest(`dist/${buildTarget}-extension/content_scripts`));
});

gulp.task('build_manifest', gulp.series('copy-non-js-files', 'copy-html-files', function(cb) {
    var json = JSON.parse(fs.readFileSync('manifest.json'));
    if (buildTarget === "Firefox") {
        json.options_ui = {
            page: "pages/options.html"
        };
        json.content_security_policy = "script-src 'self'; object-src 'self'";
    } else {
        json.permissions.push("tts");
        json.permissions.push("downloads.shelf");
        json.background.persistant = false;
        json.incognito = "split";
        json.options_page = "pages/options.html";
        json.sandbox = {
            "pages": [
                "pages/sandbox.html"
            ]
        };
    }
    return fs.writeFile(`dist/${buildTarget}-extension/manifest.json`, JSON.stringify(json, null, 4), cb);
}));

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

gulp.task('build', gulp.series(
    'clean',
    gulp.parallel(
        'lint',
        'copy-pretty-default-js',
        'build_common_content_min',
        'build_manifest',
        'build_background',
        'documentation:md',
        'documentation:html'
    ), function() {
        return gulp.src(`dist/${buildTarget}-extension/**`)
            .pipe(zip(`${buildTarget}-extension/sk.zip`))
            .pipe(gulp.dest('dist'));
    })
);

gulp.task('deploy', gulp.series('deploy:docs'));

var buildTarget = "Chrome";
gulp.task('default', gulp.series('build'));

gulp.task('set_target_firefox', function (cb) {
    buildTarget = "Firefox";
    cb();
});
gulp.task('firefox', gulp.series(['set_target_firefox', 'build']));
