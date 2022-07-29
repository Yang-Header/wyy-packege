const { src, dest, parallel, series, watch } = require('gulp')

// node的模块，用于删除文件与文件夹
const del = require('del')
// 创建一个服务，并打开浏览器
const browserSync = require('browser-sync')

// 所有gulp插件包
const loadPlugins = require('gulp-load-plugins')

const plugins = loadPlugins()
const bs = browserSync.create()

const cwd = process.cwd();
let config = {
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      style: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      font: 'assets/fonts/**'
    }
  }
};

try {
 const  loadConfig = require(`${cwd}/pages.config.js`)
 config = Object.assign({}, config, loadConfig)
}catch (e) {

}


const clean = () => {
  return del([config.build.dist, config.build.temp])
}

const style = () => {
  return src(config.build.paths.style, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.sass({ outputStyle: 'expanded' }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const script = () => {
  return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
    .pipe(dest(config.build.dist))
    .pipe(bs.reload({ stream: true }))
}

const page = () => {
  return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.swig({ data: config.data, defaults: { cache: false } })) // 防止模板缓存导致页面不能及时更新
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const image = () => {
  return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

const font = () => {
  return src(config.build.paths.font, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

const extra = () => {
  return src('**', { base: config.build.public, cwd: config.build.public})
    .pipe(dest(config.build.dist))
}

const serve = () => {
  // watch: 用于监测对应文件的变化，监测到变化后执行后面的任务
  watch(config.build.paths.style, {cwd: config.build.src}, style)
  watch(config.build.paths.scripts, {cwd: config.build.src}, script)
  watch(config.build.paths.pages,{cwd: config.build.src}, page)
  // watch('src/assets/images/**', image)
  // watch('src/assets/fonts/**', font)
  // watch('public/**', extra)
  watch([
    config.build.paths.images,
    config.build.paths.font,
    config.build.public
  ],{cwd: config.build.src}, bs.reload)

  watch('**', {cwd: config.build.public}, bs.reload)
  bs.init({
    notify: false,
    port: 2080,
    // open: false, // 是否打开浏览器
    // files: 'dist/**', // 监听文件变化后刷新浏览器
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public], // 文件依次查询的顺序，第一个文件夹下面查不到就差第二个文件夹
      routes: {
        '/node_modules': 'node_modules' // 对文件中的路径做映射
      }
    }
  })
}

const useref = () => {
  return src(config.build.paths.pages, { base: config.build.temp, cwd: config.build.temp })
    .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
    // html js css
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true
    })))
    .pipe(dest(config.build.dist))
}

const delTemp = () => {
  return del([config.build.temp])
}

const compile = parallel(style, script, page)
// series: 有执行先后顺序， parallel: 全部一起执行，没有先后顺序
// 上线之前执行的任务
const build = series(
  clean,
  parallel(
    series(compile, useref),
    image,
    font,
    extra
  ),
  delTemp
)

const develop = series(compile, serve, delTemp)

module.exports = {
  clean,
  build,
  develop
}
