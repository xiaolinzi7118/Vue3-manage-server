const Koa = require('koa')
const app = new Koa()
// views 文件夹下面的pug文件 像html一样可以渲染
const views = require('koa-views')
// 把参数转成json对象
const json = require('koa-json')
// 错误监听
const onerror = require('koa-onerror')
// 前端请求的参数 转换
const bodyparser = require('koa-bodyparser')
// koa官方的logger 只有比较简单的信息
const logger = require('koa-logger')
const log4js = require('./utils/log4j')
const users = require('./routes/users')
const menus = require('./routes/menus')
const router = require('koa-router')()
const jwt = require('jsonwebtoken')
const koajwt = require('koa-jwt')
const util = require('./utils/util')

// error handler
onerror(app)

require('./config/db')

// middlewares
app.use(bodyparser({
  enableTypes: ['json', 'form', 'text']
}))
app.use(json())
app.use(logger())
// 静态文件
app.use(require('koa-static')(__dirname + '/public'))

app.use(views(__dirname + '/views', {
  extension: 'pug'
}))

// logger
app.use(async (ctx, next) => {
  log4js.info(`get params:${JSON.stringify(ctx.request.query)}`)
  log4js.info(`post params:${JSON.stringify(ctx.request.body)}`)
  // 所有中间件(上面bodyparser json logger都是中间件)经过next()进行串连起来 koajwt中间件验证过期后会抛出异常 catch可以捕捉到
  await next().catch((err) => {
    if (err.status == '401') {
      //token过期中间件会把状态码设为401
      ctx.status = 200;
      ctx.body = util.fail('Token认证失败', util.CODE.AUTH_ERROR)
    } else {
      throw err;
    }
  })
})

//中间件
//任何接口过来都会先校验token是否有效，unless里放白名单：不需要校验的请求
app.use(koajwt({ secret: 'imooc' }).unless({
  path: [/^\/api\/users\/login/]
}))

//routes

//默认下面子路由以这个为跟路由（统一添加前缀）
router.prefix('/api')
//二级
router.use(users.routes(), users.allowedMethods())
router.use(menus.routes(), menus.allowedMethods())

//全局
app.use(router.routes(), router.allowedMethods())

// //请求/leave/count，验证token
// router.get('/leave/count', (ctx) => {
//   console.log('=>', ctx.request.headers)
//   const token = ctx.request.headers.authorization.split(' ')[1];
//   const payload = jwt.verify(token, 'imooc')
//   ctx.body = payload;
// })

// error-handling
app.on('error', (err, ctx) => {
  log4js.error(`${err.stack}`)
});

module.exports = app
