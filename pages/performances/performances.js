// 演出记录页面 performances.js
const util = require('../../utils/util.js')
const db = require('../../utils/database.js')
const app = getApp()

Page({
  data: {
    userInfo: null,
    ongoingPerformances: [],
    endedPerformances: [],
    pointRecords: []
  },

  onLoad() {
    this.initPage()
  },

  onShow() {
    if (this.data.userInfo) {
      this.loadData()
    }
  },

  // 初始化页面
  initPage() {
    // 检查登录状态
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return
    }

    this.setData({
      userInfo: userInfo
    })
    this.loadData()
  },

  loadData() {
    if (!this.data.userInfo) return

    // 加载演出数据
    this.loadSingerData()
    // 加载点歌记录
    this.loadAudienceData()
  },

  loadSingerData() {
    const performances = db.PerformanceDB.getPerformancesBySingerId(this.data.userInfo.id)
    const ongoing = []
    const ended = []

    performances.forEach(perf => {
      if (perf.status === 'ongoing') {
        ongoing.push(perf)
      } else {
        ended.push(perf)
      }
    })

    this.setData({
      ongoingPerformances: ongoing,
      endedPerformances: ended
    })
  },

  loadAudienceData() {
    const pointRecords = db.PointRecordDB.getPointRecordsByUserId(this.data.userInfo.id)
    this.setData({
      pointRecords: pointRecords
    })
  },

  // 查看演出详情
  viewPerformance(e) {
    const performanceId = e.currentTarget.dataset.performanceId
    util.showToast('演出详情功能开发中')
  },

  // 格式化时间
  formatTime(time) {
    if (!time) return ''
    const date = new Date(time)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }
})
