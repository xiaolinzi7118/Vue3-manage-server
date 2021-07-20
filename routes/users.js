/**
 * 用户管理模块
 */
const router = require('koa-router')()
const User = require('./../models/userSchema')
const util = require('./../utils/util')
const jwt = require('jsonwebtoken')
router.prefix('/users')

//用户登录
router.post('/login', async (ctx) => {
  try {
    const { userName, userPwd } = ctx.request.body;
    /**
     * 返回数据库指定字段，有三种方式
     * 1. 'userId userName userEmail state role deptId roleList'
     * 2. {userId:1,_id:0}
     * 3. select('userId')
     */
    const res = await User.findOne({
      userName,
      userPwd
    }, 'userId userName userEmail state role deptId roleList')

    const data = res._doc;
    const token = jwt.sign({
      data: data
    }, 'imooc', { expiresIn: '1h' })

    console.log('token=>', token);

    if (res) {
      data.token = token;
      ctx.body = util.success(data)
    } else {
      ctx.body = util.fail("账号或密码不正确")
    }
  } catch (error) {
    ctx.body = util.fail(error.msg)
  }
})

//用户列表
router.get('/list', async (ctx) => {
  const { userId, userName, state } = ctx.request.query;
  const { page, skipIndex } = util.pager(ctx.request.query)
  let params = {}
  if (userId) params.userId = userId;
  if (userName) params.userName = userName;
  if (state && state != '0') params.state = state;
  try {
    // 根据条件查询所有用户列表
    const query = User.find(params, { _id: 0, userPwd: 0 })
    const list = await query.skip(skipIndex).limit(page.pageSize)
    const total = await User.countDocuments(params);

    ctx.body = util.success({
      page: {
        ...page,
        total
      },
      list
    })
  } catch (error) {
    ctx.body = util.fail(`查询异常:${error.stack}`)
  }
})
module.exports = router

