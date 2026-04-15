// 云函数：微信登录
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { userInfo, code, phoneData, action, nickName, avatarUrl } = event

  console.log('登录请求:', { openid: wxContext.OPENID, action, code: code ? '有' : '无' })

  try {
    // 处理更新用户信息
    if (action === 'updateProfile') {
      return await updateUserProfile(wxContext.OPENID, nickName, avatarUrl)
    }

    let phoneNumber = null

    // 如果有手机号授权码，获取手机号
    if (code) {
      try {
        const phoneRes = await cloud.getOpenData({
          list: [code]
        })
        console.log('手机号解密结果:', phoneRes)

        if (phoneRes && phoneRes.list && phoneRes.list[0]) {
          const phoneData = phoneRes.list[0]
          if (phoneData.data && phoneData.data.phoneNumber) {
            phoneNumber = phoneData.data.phoneNumber
          }
        }
      } catch (phoneErr) {
        console.error('获取手机号失败:', phoneErr)
      }
    }

    // 1. 通过 openid 查找用户
    const userRes = await db.collection('users')
      .where({ openid: wxContext.OPENID })
      .get()

    let user = userRes.data[0]

    // 2. 如果用户不存在，创建新用户
    if (!user) {
      const newUser = {
        openid: wxContext.OPENID,
        nickName: userInfo?.nickName || '',
        avatarUrl: userInfo?.avatarUrl || '',
        phoneNumber: phoneNumber || '',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
      const res = await db.collection('users').add({ data: newUser })
      user = { _id: res._id, ...newUser }

      // 为新用户创建曲库
      await db.collection('userLibraries').add({
        data: {
          userId: user._id,
          songs: [],
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })
    } else {
      // 如果用户提供了新的用户信息，更新
      const updates = { updatedAt: db.serverDate() }

      if (userInfo) {
        if (userInfo.nickName) updates.nickName = userInfo.nickName
        if (userInfo.avatarUrl) updates.avatarUrl = userInfo.avatarUrl
      }

      // 更新手机号（如果之前没有）
      if (phoneNumber && !user.phoneNumber) {
        updates.phoneNumber = phoneNumber
      }

      if (Object.keys(updates).length > 1) {
        await db.collection('users').doc(user._id).update({ data: updates })
        user = { ...user, ...updates }
      }
    }

    const result = {
      success: true,
      data: {
        id: user._id,
        openid: user.openid,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        phoneNumber: user.phoneNumber || ''
      }
    }

    console.log('登录成功:', result)
    return result

  } catch (error) {
    console.error('登录失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 更新用户资料
async function updateUserProfile(openid, nickName, avatarUrl) {
  try {
    const userRes = await db.collection('users')
      .where({ openid: openid })
      .get()

    if (userRes.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }

    const user = userRes.data[0]
    const updates = {
      updatedAt: db.serverDate()
    }

    if (nickName) updates.nickName = nickName
    if (avatarUrl) updates.avatarUrl = avatarUrl

    await db.collection('users').doc(user._id).update({ data: updates })

    const updatedUser = { ...user, ...updates }

    return {
      success: true,
      data: {
        id: updatedUser._id,
        openid: updatedUser.openid,
        nickName: updatedUser.nickName,
        avatarUrl: updatedUser.avatarUrl,
        phoneNumber: updatedUser.phoneNumber || ''
      }
    }
  } catch (error) {
    console.error('更新用户资料失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
