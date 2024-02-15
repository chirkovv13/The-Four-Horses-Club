const { src, dest, watch, parallel, series } = require('gulp');

const del            = require('del');                                 //Удаление файлов
const browserSync    = require('browser-sync').create();               //Обновление браузера
const scss           = require('gulp-sass')(require('sass'));          //Препроцессор CSS
const sourcemaps     = require('gulp-sourcemaps');                     //Карта для CSS
const concat         = require('gulp-concat');                         //Объединение и изменение имени
const babel          = require('gulp-babel');                          //Поддержка старых браузеров для JS
const uglify         = require('gulp-uglify');                         //Минификация файлов JS
const autoprefixer   = require('gulp-autoprefixer');                   //Поддержка старых браузеров для CSS
const newer          = require('gulp-newer');                          //Исключение обработки существующих файлов
const size           = require('gulp-size');                           //Размер файлов
const imagemin       = require('gulp-imagemin');                       //Оптимизация изображений
const svg            = require('gulp-svg-sprite');                     //Собирает и оптимизирует svg, преобразует в svg-sprite
const webp           = require('gulp-webp');                           //Конвертирует изображения в WebP
const webpHtml       = require('gulp-webp-html');                      //Преобразует img в picture для webP
const webpCss        = require('gulp-webp-css');                       //Добавляет класс и свойства в css для webP
const fileInclude    = require('gulp-file-include');                   //Модульность html
const htmlmin        = require('gulp-htmlmin');                        //Минификация Html
const rename         = require('gulp-rename');                         //Переименование
const plumber        = require('gulp-plumber');                        //Предотвращение разрыва трубы, вызванного ошибками плагинов
const notify         = require('gulp-notify');                         //Отправляет всплывающие уведомления
const fonter         = require('gulp-fonter');                         //Конвертация шрифтов 
const ttf2woff2      = require('gulp-ttf2woff2');                      //Конвертация шрифтов ttf2 to woff2

// const (имя константы для использования плагина/таска) = require('plagin');
// function (имя функции)(params) {}

//Конфигурация
const pathSrc        = "./app";
const pathDest       = "./dist";
const path           = {

  font: {
    src:     pathSrc + "/fonts/**/*.ttf",
    app:     pathSrc + "/fonts",
  },
  
  html: {
    // src:     pathSrc + "/html/main.html",
    src:    [pathSrc + "/html/**/*.html", "!app/html/**/_*.html"],
    watch:   pathSrc + "/html/**/*.html",
  },

  css: {
    src:     pathSrc + "/scss/style.scss",
    app:     pathSrc + "/css",
    watch:   pathSrc + "/scss/**/*.scss"
  },

  js: {
    src: [
            "node_modules/jquery/dist/jquery.js",
            "node_modules/slick-carousel/slick/slick.js",
            "node_modules/@fancyapps/fancybox/dist/jquery.fancybox.js",
            "node_modules/rateyo/src/jquery.rateyo.js",
            "node_modules/ion-rangeslider/js/ion.rangeSlider.js",
            "node_modules/jquery-form-styler/dist/jquery.formstyler.js",
            pathSrc + "/js/main.js"
    ],
    watch:  [pathSrc + "/js/**/*.js", "!app/js/main.min.js"],
    app:     pathSrc + "/js"
  },

  img: {
    src:     pathSrc + "/images/**/*.{png,jpg,jpeg,gif}",
    app:     pathSrc + "/images",
    watch:   pathSrc + "/images/**/*.{png,jpg,jpeg,gif}",
    webp:    pathSrc + "/images/**/*.webp",
    sprite:  pathSrc + "/images/sprite.svg",
    svg:    [pathSrc + "/images/**/*.svg", "!app/images/sprite.svg"],
    // svg:    [pathSrc + "/images/icon/*.svg", "!app/images/sprite.svg"],
    dest:   pathDest + "/images"
  },

  build: [
            // "app/index.html",
            "app/*.html",
            "app/css/style.min.css",
            "app/js/main.min.js",
            "app/images/sprite.svg",
            "app/fonts/**/*.*",
  ],
};


//Наблюдение за файлами
function watching() {
  watch(path.html.watch, series(html)).on('change', browserSync.reload);
  watch(path.css.watch, styles);
  watch(path.js.watch, scripts);
  watch(path.img.watch, series(cleanWebp, imagesApp, html));
  watch(path.img.svg, series(cleanSprite, svgSprite, html));
}

//Сервер
function server() {
  browserSync.init({
    server: {baseDir: pathSrc},          //Относительно какой папки
    notify: false                        //Всплывающее уведомление
  });
}

//Обработка HTML
function html() {
  return src(path.html.src)
  .pipe(plumber({
    errorHandler: notify.onError(error => ({
      title: 'HTML',
      message: error.message
    }))
  }))
  .pipe(webpHtml())
  .pipe(fileInclude())
  .pipe(htmlmin({
    collapseWhitespace: true
  }))
  // .pipe(rename('index.html'))
  .pipe(dest(pathSrc))
  .pipe(browserSync.stream());
}

//Обработка CSS
function styles() {
  // return src(path.css.src, {sourcemaps: true})
  return src(path.css.src)
  .pipe(plumber({
    errorHandler: notify.onError(error => ({
      title: 'CSS',
      message: error.message
    }))
  }))
  .pipe(sourcemaps.init())
  .pipe(webpCss())
  .pipe(scss({outputStyle: 'expanded'}))
  // .pipe(dest(path.css.app, {sourcemaps: true}))
  .pipe(dest(path.css.app))
  .pipe(autoprefixer({
    overrideBrowserslist: ['last 10 version'], 
    grid: true
  }))
  .pipe(scss({outputStyle: 'compressed'}))
  .pipe(concat('style.min.css'))
  .pipe(sourcemaps.write())
  // .pipe(dest(path.css.app, {sourcemaps: true}))
  .pipe(dest(path.css.app))
  .pipe(browserSync.stream());
}

//Функции JavaScript
function scripts() {
  return src(path.js.src)
  .pipe(plumber({
    errorHandler: notify.onError(error => ({
      title: 'JS',
      message: error.message
    }))
  }))
  .pipe(babel({
    presets: ['@babel/preset-env']
  }))
  .pipe(concat('main.min.js'))
  .pipe(uglify())
  .pipe(dest(path.js.app))
  .pipe(browserSync.stream());
}


//Функции Images
function imagesApp() {
  return src(path.img.src)
  .pipe(plumber({
    errorHandler: notify.onError(error => ({
      title: 'Images',
      message: error.message
    }))
  }))
  .pipe(webp())
  .pipe(dest(path.img.app, {base: path.img.app}))
  .pipe(browserSync.stream());
}

function imagesDist() {
  return src([path.img.src, path.img.webp])
  .pipe(plumber({
    errorHandler: notify.onError(error => ({
      title: 'Images',
      message: error.message
    }))
  }))
  .pipe(size({title: 'img до'}))
  .pipe(newer(path.img.dest))
  .pipe(imagemin(
    {verbose: true}, [
    imagemin.gifsicle({interlaced: true}),
    imagemin.mozjpeg({quality: 75, progressive: true}),
    imagemin.optipng({optimizationLevel: 5}),
    imagemin.svgo({
      plugins: [
        {removeViewBox: true},
        {cleanupIDs: false}
      ]
    })
  ]))
  .pipe(size({title: 'img после'}))
  .pipe(dest(path.img.dest, {base: path.img.app}))
}

//Функции svg
function svgSprite() {
  return src(path.img.svg)
  .pipe(svg({
          mode: {
            stack: {
              sprite: "../sprite.svg"
            }
          }
        }))
  .pipe(dest(path.img.app))
}

//Конвертация шрифтов 
function font () {
  return src(path.font.src)
  .pipe(plumber({
    errorHandler: notify.onError(error => ({
      title: 'Fonts',
      message: error.message
    }))
  }))
  .pipe(fonter({
    formats: ['ttf', 'woff', 'eot']
  }))
  .pipe(ttf2woff2())
  .pipe(dest(path.font.app));
}

//Очистка директории dist
function cleanDist() {
  return del(pathDest)
}

//Очистка директории от лишних HTML
function cleanHtml() {
  return del("./app/*.html")
}

//Очистка директории images от webp
function cleanWebp() {
  return del(path.img.webp)
}

//Очистка директории images от Sprite
function cleanSprite() {
  return del(path.img.sprite)
}

//Сборка
function buildDist() {
  return src(path.build, {base: pathSrc})
  .pipe(dest(pathDest))
}

// exports.(имя для вызова таска) = (имя функции);
exports.html        = html;
exports.cleanHtml   = cleanHtml;
exports.styles      = styles;
exports.scripts     = scripts;
exports.imagesApp   = imagesApp;
exports.imagesDist  = imagesDist;
exports.cleanSprite = cleanSprite;
exports.svgSprite   = svgSprite;
exports.server      = server;
exports.watching    = watching;
exports.font        = font;
exports.cleanDist   = cleanDist;
exports.cleanWebp   = cleanWebp;
exports.buildDist   = buildDist;

exports.build       = series(cleanDist, cleanHtml, html, cleanWebp, imagesApp, buildDist, imagesDist);
exports.default     = series(html, styles, font, imagesApp, svgSprite, parallel(scripts, server, watching));
