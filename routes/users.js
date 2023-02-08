/**
 * 用户管理模块
 */
const router = require('koa-router')()
const User = require('./../models/userSchema')
const Counter = require('./../models/counterSchema')
const Menu = require('./../models/menuSchema')
const Role = require('./../models/roleSchema')
const util = require('./../utils/util')
const jwt = require('jsonwebtoken')
const md5 = require('md5')
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
      userPwd: md5(userPwd)
    }, 'userId userName userEmail state role deptId roleList')

    // res下的_doc才是字段的信息 处理字段信息时需取res下_doc里的 而直接return res给前端(是因为接口只会返回model模型定义下的字段) 
    const data = res._doc;
    const token = jwt.sign({
      data: data
    }, 'imooc', { expiresIn: '1d' })

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
    // 根据条件查询所有用户列表 过滤掉_id和userPwd
    const query = User.find(params, { _id: 0, userPwd: 0 })
    // 分页
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

// 获取全量用户列表
router.get('/all/list', async (ctx) => {
  try {
    const list = await User.find({}, "userId userName userEmail")
    ctx.body = util.success(list)
  } catch (error) {
    ctx.body = util.fail(error.stack)
  }
})

// 用户删除/批量删除
router.post('/delete', async (ctx) => {
  // 待删除的用户Id数组 采用update 软删除 更新状态
  const { userIds } = ctx.request.body;
  // const ids = userIds.map(item => {
  //   return {
  //     userId: item
  //   }
  // })
  // // $or 找到的都更新
  // User.updateMany({ $or: ids})

  // 找到所有符合的userId 更新state为2
  const res = await User.updateMany({userId: { $in: userIds}}, {state: 2})
  if (res.nModified) {
    ctx.body = util.success(res, `共删除成功${res.nModified}条`)
    return
  }
  ctx.body = util.fail('删除失败')
})

// 用户新增/编辑
router.post('/operate', async (ctx) => {
  const { userId, userName, userEmail, mobile, job, state, role, roleList, deptId, action} = ctx.request.body;
  if (action === 'add') {
    // 新增
    if (!userName || !userEmail || !deptId) {
      ctx.body = util.fail('参数错误', util.CODE.PARAM_ERROR)
      return
    }
    // 查重 和userName或者userEmail相同的数据 并返回_id userName userEmail值
    const res = await User.findOne({ $or: [{ userName }, { userEmail }] }, '_id userName userEmail')
    if (res) {
      ctx.body = util.fail(`系统监测到有重复的用户，信息如下：${res.userName} - ${res.userEmail}`)
    } else {
      // 手动键值+1 new:true 表示返回新的数据
      const doc = await Counter.findOneAndUpdate({ _id: 'userId' }, { $inc: { sequence_value: 1 } }, { new: true })
      try {
        // 新增用户
        const user = new User({
          userId: doc.sequence_value,
          userName,
          userPwd: md5('123456'),
          userEmail,
          role, //默认普通用户
          roleList,
          job,
          state,
          deptId,
          mobile
        })
        user.save();
        ctx.body = util.success({}, '用户创建成功');
      } catch (error) {
        ctx.body = util.fail(error.stack, '用户创建失败');
      }
    }
  } else {
    // 编辑
    if (!deptId) {
      ctx.body = util.fail('部门不能为空', util.CODE.PARAM_ERROR)
      return
    }
    // 根据userId查找并且更新数据
    try {
      await User.findOneAndUpdate({userId}, {mobile, job, state, role, roleList, deptId})
      ctx.body = util.success({}, '更新成功')
    } catch (error) {
      ctx.body = util.fail(error.stack, '更新失败')
    }
  }
})
// 获取用户对应的权限菜单
router.get("/getPermissionList", async (ctx) => {
  let authorization = ctx.request.headers.authorization
  // 解码
  let { data } = util.decoded(authorization)
  let menuList = await getMenuList(data.role, data.roleList);
  let actionList = getAction(JSON.parse(JSON.stringify(menuList)))
  ctx.body = util.success({ menuList, actionList });
})

// 获取有权限的菜单
async function getMenuList(userRole, roleKeys) {
  let rootList = []
  if (userRole == 0) {
    rootList = await Menu.find({}) || []
  } else {
    // 根据用户拥有的角色，获取权限列表
    // 现查找用户对应的角色有哪些
    let roleList = await Role.find({ _id: { $in: roleKeys } })
    let permissionList = []
    roleList.forEach(role => {
      let { checkedKeys, halfCheckedKeys } = role.permissionList;
      permissionList = permissionList.concat([...checkedKeys, ...halfCheckedKeys])
    })
    // 去重
    permissionList = [...new Set(permissionList)]
    rootList = await Menu.find({ _id: { $in: permissionList } })
  }
  return util.getTreeMenu(rootList, null, [])
}

// 获取有权限的按钮
function getAction(list) {
  let actionList = []
  const deep = (arr) => {
    while (arr.length) {
      let item = arr.pop();
      if (item.action) {
        item.action.forEach(action => {
          actionList.push(action.menuCode)
        })
      }
      if (item.children && !item.action) {
        deep(item.children)
      }
    }
  }
  deep(list)
  return actionList;
}
module.exports = router

