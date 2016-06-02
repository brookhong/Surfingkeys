var gulp = require('gulp'),
    gp_concat = require('gulp-concat'),
    clean = require('gulp-clean'),
    zip = require('gulp-zip'),
    gp_uglify = require('gulp-uglify');

gulp.task('clean', function () {
    return gulp.src('dist', {read: false})
        .pipe(clean());
});

gulp.task('copy-non-js-files', ['clean'], function() {
    return gulp.src(['manifest.json', 'icons/**', 'content_scripts/**', '!content_scripts/**/*.js', 'pages/**', '!pages/**/*.js'], {base: "."})
        .pipe(gulp.dest('dist'));
});

gulp.task('copy-js-files', ['clean'], function() {
    return gulp.src(['background.js', 'content_scripts/**/*.js', 'libs/**/*.js', 'pages/**/*.js'], {base: "."})
        .pipe(gp_uglify())
        .pipe(gulp.dest('dist'));
});

gulp.task('copy-files', ['copy-js-files', 'copy-non-js-files'], function(){});

gulp.task('default', ['copy-files'], function(){
    return gulp.src('dist/**')
        .pipe(zip('sk.zip'))
        .pipe(gulp.dest('dist'));
});
