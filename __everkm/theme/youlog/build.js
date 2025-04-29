const esbuild = require('esbuild')
const stylePlugin = require('esbuild-style-plugin')
const path = require('path')
const chokidar = require('chokidar')
const fs = require('fs')
// 使用import()动态导入ESM模块
// const babelPlugin = require("esbuild-plugin-babel");

// 检查是否处于开发模式
const isDev = process.argv.includes('--watch')


let basePrefix = trimSlash(
  process.env.BASE_PREFIX ? `${process.env.BASE_PREFIX}` : '',
)
// 构建输出目录
const distBaseDir = trimSlash(`../../dist/${basePrefix}`)
const distDir = `${distBaseDir}/assets`
console.log(
  `Building with esbuild in ${isDev ? 'watch' : 'production'} mode, distDir: ${distDir}`,
)

// Manifest 文件路径
const manifestPath = path.resolve(__dirname, 'assets-manifest.json')

function trimSlash(str) {
  return str.replace(/^\/+|\/+$/g, '')
}

// manifest 插件
const manifestPlugin = {
  name: 'manifest',
  setup(build) {
    const manifest = {
      entrypoints: {},
    }

    build.onEnd(async (result) => {
      if (result.errors.length > 0) return

      // 获取输出文件列表
      const outputFiles = result.metafile.outputs

      // 更新 manifest
      Object.entries(outputFiles).forEach(([filepath, info]) => {
        const filename = path.basename(filepath)
        
        // 从 entryPoints 配置中获取原始名称映射
        const getOriginalName = (filename) => {
          for (const entry of entryPoints) {
            const entryName = entry.out
            // 开发模式下文件名没有hash,所以需要特殊处理
            if (isDev) {
              if (filename === entryName + '.js' || filename === entryName + '.css') {
                return entryName
              }
            } else {
              if (filename.startsWith(entryName + '-')) {
                return entryName
              }
            }
          }
          return null
        }

        const originalName = getOriginalName(filename)
        if (!originalName) return

        // 确保 entrypoint 对象存在
        if (!manifest.entrypoints[originalName]) {
          manifest.entrypoints[originalName] = {
            assets: {
              js: [],
              css: [],
            },
          }
        }

        // 根据文件类型记录
        const assetPath = path.relative(distBaseDir, filepath)
        if (filename.endsWith('.js')) {
          manifest.entrypoints[originalName].assets.js.push(assetPath)
        } else if (filename.endsWith('.css')) {
          manifest.entrypoints[originalName].assets.css.push(assetPath)
        }
      })

      // 写入 manifest 文件
      await fs.promises.writeFile(
        manifestPath,
        JSON.stringify(manifest, null, 2),
      )
      console.log('Manifest file generated:', manifestPath)
    })

    build.onStart(() => {
      // 清空 manifest
      manifest.entrypoints = {}
    })

    build.onResolve({filter: /.*/}, (args) => {
      if (args.kind === 'entry-point') {
        // 记录入口文件的映射关系
        const entryPoint = entryPoints.find((ep) => ep.in === args.path)
        if (entryPoint) {
          const originalName = entryPoint.out
          // 根据开发模式使用不同的文件名格式
          const assetName = isDev ? originalName : `${originalName}.[hash]`
          manifest.entrypoints[originalName] = {
            assets: {
              js: [assetName + '.js'],
              css: [assetName + '.css'],
            },
          }
        }
      }
      return null
    })
  },
}

// 多入口点配置
const entryPoints = [
  {
    in: 'src/index.ts',
    out: 'youlog',
  },
  {
    in: 'src/plugins/in_search/index.ts',
    out: 'plugin-in-search',
  },
  // 可以根据需要添加更多入口点
]

// 构建配置
const buildOptions = {
  entryPoints: Object.fromEntries(
    entryPoints.map((entry) => [entry.out, entry.in]),
  ),
  bundle: true,
  outdir: distDir,
  entryNames: isDev ? '[name]' : '[name]-[hash]',
  assetNames: isDev ? '[name]' : '[name]-[hash]',
  metafile: true,
  minify: !isDev,
  sourcemap: false,
  loader: {
    '.js': 'jsx',
    '.jsx': 'jsx',
    '.ts': 'tsx',
    '.tsx': 'tsx',
  },
  jsx: 'preserve',
  jsxImportSource: 'solid-js',
  plugins: [
    manifestPlugin,
    stylePlugin({
      postcss: {
        plugins: [
          require('postcss-import'),
          require('tailwindcss/nesting'),
          require('tailwindcss')({
            config: path.resolve(__dirname, 'tailwind.config.js'),
          }),
          require('autoprefixer'),
        ],
      },
      cssModules: false,
      extract: true,
      output: isDev ? `${distDir}/[name].css` : `${distDir}/[name]-[hash].css`,
    }),
  ],
}

// 添加分析构建产物的函数
function analyzeBundle(metafile) {
  console.log('\n📊 依赖大小分析:')
  const outputs = metafile.outputs
  
  for (const [outFile, info] of Object.entries(outputs)) {
    if (!outFile.endsWith('.js')) continue
    
    console.log(`\n文件: ${path.basename(outFile)}`)
    console.log(`总大小: ${(info.bytes / 1024).toFixed(2)} KB`)
    
    if (info.inputs) {
      console.log('\n依赖分析:')
      const deps = Object.entries(info.inputs)
        .map(([name, data]) => ({
          name: name.replace(/^node_modules\/\.pnpm\//, '')
            .replace(/\/node_modules\//, '/')
            .replace(/\/dist\/.*$/, ''),
          size: data.bytesInOutput
        }))
        .filter(dep => dep.size > 0)
        .sort((a, b) => b.size - a.size)
      
      deps.forEach(dep => {
        console.log(`  - ${dep.name}: ${(dep.size / 1024).toFixed(2)} KB`)
      })
    }
  }
  
  // 将分析结果写入文件
  const analysisPath = path.join(path.dirname(manifestPath), 'bundle-analysis.json')
  fs.writeFileSync(
    analysisPath,
    JSON.stringify(metafile, null, 2)
  )
  console.log(`\n详细分析已保存到: ${analysisPath}`)
}

async function build() {
  // 动态导入babel插件
  const babelPluginModule = await import('esbuild-plugin-babel')
  const babelPlugin = babelPluginModule.default

  // 更新构建配置
  buildOptions.plugins = [
    babelPlugin({
      filter: /\.(jsx|tsx|ts)$/,
      config: {
        presets: [
          ['@babel/preset-typescript', {isTSX: true, allExtensions: true}],
          'babel-preset-solid',
        ],
        plugins: ['@babel/plugin-syntax-flow'],
      },
    }),
    ...buildOptions.plugins,
  ]

  if (isDev) {
    // 开发模式：使用 context API 进行监听
    const ctx = await esbuild.context(buildOptions)

    // 使用 chokidar 监听额外的文件
    const watchPaths = [
      'src/**/*.{js,jsx,ts,tsx}',
      'src/**/*.{css,scss}',
      'templates/**/*.{html,md}',
      'tailwind.config.js',
    ]

    console.log('Watching for changes in:')
    watchPaths.forEach((watchPath) => console.log(`- ${watchPath}`))

    // 添加 chokidar 监听
    const watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: true,
    })

    watcher.on('all', async (event, filePath) => {
      console.log(`File ${filePath} changed (${event}), rebuilding...`)
      try {
        // 触发重新构建
        await ctx.rebuild()
        console.log('Rebuild succeeded')
      } catch (error) {
        console.error('Rebuild failed:', error)
      }
    })

    // 让 esbuild 也保持监听状态
    await ctx.watch()
    console.log('esbuild watching for changes...')
  } else {
    // 生产模式：一次性构建
    const result = await esbuild.build(buildOptions)
    analyzeBundle(result.metafile)
    console.log('Build completed successfully!')
    process.exit(0)
  }
}

build().catch((error) => {
  console.error('Build failed:', error)
  process.exit(1)
})
