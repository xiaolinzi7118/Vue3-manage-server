/**
 * 通用工具函数
 */
const log4js = require('./log4j')
const jwt = require('jsonwebtoken')
const CODE = {
    SUCCESS: 200,
    PARAM_ERROR: 10001, // 参数错误
    USER_ACCOUNT_ERROR: 20001, //账号或密码错误
    USER_LOGIN_ERROR: 30001, // 用户未登录
    BUSINESS_ERROR: 40001, //业务请求失败
    AUTH_ERROR: 500001, // 认证失败或TOKEN过期
}
module.exports = {
    /**
     * 分页结构封装
     * @param {number} pageNum 
     * @param {number} pageSize 
     */
    pager({ pageNum = 1, pageSize = 10 }) {
        // 强制转换成number
        pageNum *= 1;
        pageSize *= 1;
        const skipIndex = (pageNum - 1) * pageSize;
        return {
            page: {
                pageNum,
                pageSize
            },
            skipIndex
        }
    },
    success(data = '', msg = '', code = CODE.SUCCESS) {
        log4js.debug(data);
        return {
            code, data, msg
        }
    },
    fail(msg = '', code = CODE.BUSINESS_ERROR, data = '') {
        log4js.debug(msg);
        return {
            code, data, msg
        }
    },
    CODE,
    // 解码
    decoded(authorization) {
        if (authorization) {
            let token = authorization.split(' ')[1]
            return jwt.verify(token, 'imooc')
        }
        return '';
    },
    // 递归拼接菜单树形列表
    getTreeMenu(rootList, id, list) {
        for (let i = 0; i < rootList.length; i++) {
            let item = rootList[i]
            // pop会改变原数组 所以要加一层slice切割
            if (String(item.parentId.slice().pop()) == String(id)) {
                // 处理字段信息时需取res下_doc里的 而直接return res给前端(是因为接口只会返回model模型定义下的字段)
                list.push(item._doc)
            }
        }
        list.map(item => {
            item.children = []
            this.getTreeMenu(rootList, item._id, item.children)
            if (item.children.length == 0) {
                delete item.children;
            } else if (item.children.length > 0 && item.children[0].menuType == 2) {
                // 快速区分按钮和菜单，用于后期做菜单按钮权限控制
                item.action = item.children;
            }
        })
        return list;
    }
}