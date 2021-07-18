const Koa = require('koa')
const app = new Koa()
const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const log4js = require('./utils/log4j')
const users = require('./routes/users')
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
app.use(require('koa-static')(__dirname + '/public'))

app.use(views(__dirname + '/views', {
  extension: 'pug'
}))

// logger
app.use(async (ctx, next) => {
  log4js.info(`get params:${JSON.stringify(ctx.request.query)}`)
  log4js.info(`post params:${JSON.stringify(ctx.request.body)}`)
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

//一级
router.prefix('/api')
//二级
router.use(users.routes(), users.allowedMethods())

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
