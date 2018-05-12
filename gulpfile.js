var gulp = require('gulp'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    sass = require('gulp-ruby-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    browserSync = require('browser-sync').create()

var DEST = 'build/';

gulp.task('scripts', function() {
    return gulp.src('src/js/*.js')
      .pipe(gulp.dest(DEST+'src/js'))
      .pipe(rename({suffix: '.min'}))
      .pipe(gulp.dest(DEST+'src/js'))
      .pipe(browserSync.stream());
});

var compileSASS = function (filename, options) {
  return sass('src/css/*.css', options)
        .pipe(autoprefixer('last 2 versions', '> 5%'))
        .pipe(concat(filename))
        .pipe(gulp.dest(DEST+'src/css'))
        .pipe(browserSync.stream());
};

gulp.task('sass', function() {
    return compileSASS('src/css/custom.css', {});
});

gulp.task('sass-minify', function() {
    return compileSASS('src/css/custom.min.css', {style: 'compressed'});
});

gulp.task('browser-sync', function() {
    browserSync.init({
        server: {
            baseDir: './'
        },
        startPath: './index.html'
    });
});

gulp.task('watch', function() {
  // Watch .html files
  gulp.watch('./*.html', browserSync.reload);
  // Watch .js files
  gulp.watch('src/js/*.js', ['scripts']);
  // Watch .scss files
  gulp.watch('src/css/*.css', ['sass', 'sass-minify']);
});

// Default Task
gulp.task('default', ['browser-sync', 'watch']);
