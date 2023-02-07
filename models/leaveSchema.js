const mongoose = require('mongoose')
const leaveSchema = mongoose.Schema({
    orderNo: String, // 申请单号
    applyType: Number, //申请类型  1:事假 2：调休 3:年假
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date, default: Date.now },
    applyUser: {
        userId: String,
        userName: String,
        userEmail: String
    },
    leaveTime: String, // 休假时长
    reasons: String, // 休假原因
    auditUsers: String, // 完整审批人
    curAuditUserName: String, // 当前审批人
    // auditFlows和auditLogs是一一对应的（不考虑驳回又重新发起申请的情况）
    auditFlows: [
        {
            userId: String,
            userName: String,
            userEmail: String
        }
    ],
    auditLogs: [
        {
            userId: String,
            userName: String,
            createTime: Date,
            remark: String,
            action: String
        }
    ],
    applyState: { type: Number, default: 1 }, // 1:待审批 2:审批中 3:审批拒绝 4:审批通过 5:作废
    createTime: { type: Date, default: Date.now }
})

module.exports = mongoose.model("leaves", leaveSchema, "leaves")