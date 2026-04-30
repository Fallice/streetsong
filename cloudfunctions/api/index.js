// 云函数：统一API接口
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 数据库集合名称
const COLLECTIONS = {
  USERS: 'users',
  USER_LIBRARIES: 'userLibraries',
  USER_PLAYLISTS: 'userPlaylists',
  PERFORMANCES: 'performances',
  POINT_RECORDS: 'pointRecords',
  QR_CODES: 'qrCodes' // 小程序码缓存
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { action, data } = event

  console.log('API请求:', { action, data, openid: wxContext.OPENID })

  try {
    let result = null

    switch (action) {
      // ========== 用户相关 ==========
      case 'getUser':
        result = await getUserById(data.userId)
        break

      // ========== 曲库相关 ==========
      case 'getLibrary':
        result = await getLibrary(data.userId)
        break

      case 'addSongToLibrary':
        result = await addSongToLibrary(data.userId, data.song)
        break

      case 'removeSongFromLibrary':
        result = await removeSongFromLibrary(data.userId, data.songId)
        break

      case 'updateSongInLibrary':
        result = await updateSongInLibrary(data.userId, data.songId, data.song)
        break

      // ========== 歌单相关 ==========
      case 'getPlaylists':
        result = await getUserPlaylists(data.userId)
        break

      case 'getPlaylist':
        result = await getPlaylistById(data.playlistId)
        break

      case 'findPlaylistBySuffix':
        result = await findPlaylistBySuffix(data.suffix)
        break

      case 'createPlaylist':
        result = await createPlaylist(data.userId, data.name)
        break

      case 'deletePlaylist':
        result = await deletePlaylist(data.playlistId)
        break

      case 'updatePlaylist':
        result = await updatePlaylist(data.playlistId, data.name)
        break

      case 'addSongToPlaylist':
        result = await addSongToPlaylist(data.playlistId, data.song)
        break

      case 'removeSongFromPlaylist':
        result = await removeSongFromPlaylist(data.playlistId, data.songId)
        break

      // ========== 演出相关 ==========
      case 'getPerformance':
        result = await getPerformanceById(data.performanceId)
        break

      case 'getUserPerformances':
        result = await getUserPerformances(data.userId)
        break

      case 'getPerformancesByPlaylistId':
        result = await getPerformancesByPlaylistId(data.playlistId)
        break

      case 'createPerformance':
        result = await createPerformance(data.userId, data)
        break

      case 'endPerformance':
        result = await endPerformance(data.performanceId)
        break

      case 'updateSingingList':
        result = await updateSingingList(data.performanceId, data.singingList)
        break

      // ========== 点歌记录相关 ==========
      case 'createPointRecord':
        result = await createPointRecord({
          performanceId: data.performanceId,
          userId: data.userId,
          songId: data.songId,
          songName: data.songName,
          songArtist: data.songArtist,
          message: data.message,
          priority: data.priority
        })
        break

      case 'getPointRecords':
        result = await getPointRecordsByPerformance(data.performanceId)
        break

      case 'getUserPointRecords':
        result = await getPointRecordsByUser(data.userId)
        break

      case 'updatePointRecordStatus':
        result = await updatePointRecordStatus(data.recordId, data.status)
        break

      case 'getMiniProgramCode':
        result = await getMiniProgramCode(data)
        break

      default:
        return { success: false, error: '未知的操作类型' }
    }

    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('API错误:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// ========== 用户相关 ==========
async function getUserById(id) {
  const res = await db.collection(COLLECTIONS.USERS).doc(id).get()
  return res.data
}

// ========== 曲库相关 ==========
async function getLibrary(userId) {
  const res = await db.collection(COLLECTIONS.USER_LIBRARIES)
    .where({ userId })
    .get()

  const library = res.data[0] || null
  if (library) {
    // 转换歌曲的 _id 为 id
    library.songs = (library.songs || []).map(song => ({
      ...song,
      id: song._id,
    }))
  }

  return library
}

async function addSongToLibrary(userId, songData) {
  const song = {
    _id: generateId(),
    name: songData.name,
    artist: songData.artist,
    createdAt: Date.now()
  }

  const libraryRes = await db.collection(COLLECTIONS.USER_LIBRARIES).where({ userId }).get()
  if (libraryRes.data.length > 0) {
    const library = libraryRes.data[0]
    await db.collection(COLLECTIONS.USER_LIBRARIES).doc(library._id).update({
      data: {
        songs: _.push([song]),
        updatedAt: db.serverDate()
      }
    })
  } else {
    // 创建新曲库
    await db.collection(COLLECTIONS.USER_LIBRARIES).add({
      data: {
        userId,
        songs: [song],
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })
  }
  return song
}

async function removeSongFromLibrary(userId, songId) {
  const libraryRes = await db.collection(COLLECTIONS.USER_LIBRARIES).where({ userId }).get()
  if (libraryRes.data.length === 0) return false

  const library = libraryRes.data[0]
  const songs = library.songs.filter(s => s._id !== songId)
  await db.collection(COLLECTIONS.USER_LIBRARIES).doc(library._id).update({
    data: { songs, updatedAt: db.serverDate() }
  })
  return true
}

async function updateSongInLibrary(userId, songId, updates) {
  const libraryRes = await db.collection(COLLECTIONS.USER_LIBRARIES).where({ userId }).get()
  if (libraryRes.data.length === 0) return false

  const library = libraryRes.data[0]
  const songs = library.songs.map(s => {
    if (s._id === songId) {
      return { ...s, ...updates }
    }
    return s
  })

  await db.collection(COLLECTIONS.USER_LIBRARIES).doc(library._id).update({
    data: { songs, updatedAt: db.serverDate() }
  })
  return true
}

// ========== 歌单相关 ==========
async function getUserPlaylists(userId) {
  const res = await db.collection(COLLECTIONS.USER_PLAYLISTS)
    .where({ userId })
    .orderBy('createdAt', 'desc')
    .get()
  // 转换 _id 为 id
  return res.data.map(item => {
    const playlist = { ...item, id: item._id }
    delete playlist._id
    return playlist
  })
}

async function getPlaylistById(id) {
  console.log('getPlaylistById 被调用, id:', id)
  const res = await db.collection(COLLECTIONS.USER_PLAYLISTS).doc(id).get()
  if (!res.data) {
    console.log('未找到 id 为', id, '的歌单')
    return null
  }
  console.log('找到歌单:', res.data)
  // 转换 _id 为 id
  const playlist = { ...res.data, id: res.data._id }
  delete playlist._id
  return playlist
}

async function findPlaylistBySuffix(suffix) {
  console.log('findPlaylistBySuffix 被调用, suffix:', suffix)
  try {
    // 先尝试直接查找（万一 suffix 就是完整ID）
    let res = await db.collection(COLLECTIONS.USER_PLAYLISTS).doc(suffix).get()
    if (res.data) {
      console.log('直接找到歌单:', res.data)
      const playlist = { ...res.data, id: res.data._id }
      delete playlist._id
      return playlist
    }

    // 直接查找没找到，尝试获取所有歌单，然后在客户端匹配
    console.log('直接查找失败，获取所有歌单列表')
    const { data } = await db.collection(COLLECTIONS.USER_PLAYLISTS).get()
    console.log('获取到歌单列表:', data)

    // 在客户端查找ID以该 suffix 结尾的歌单
    let matchedPlaylist = null
    if (data && data.length > 0) {
      for (const playlist of data) {
        const id = playlist._id || playlist.id || ''
        if (id.endsWith(suffix) || id.includes(suffix)) {
          matchedPlaylist = playlist
          break
        }
      }
    }

    if (matchedPlaylist) {
      console.log('找到匹配的歌单:', matchedPlaylist)
      const playlist = { ...matchedPlaylist, id: matchedPlaylist._id }
      delete playlist._id
      return playlist
    }

    console.log('未找到匹配的歌单')
    return null
  } catch (e) {
    console.error('findPlaylistBySuffix 出错:', e)
    return null
  }
}

async function createPlaylist(userId, name) {
  const playlistId = generateId() // 手动生成16位ID
  const playlist = {
    userId,
    name: name || '新歌单',
    songs: [],
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  }
  // 使用 set 替代 add，这样可以指定 _id
  await db.collection(COLLECTIONS.USER_PLAYLISTS).doc(playlistId).set({ data: playlist })
  return { id: playlistId, _id: playlistId, ...playlist }
}

async function deletePlaylist(id) {
  await db.collection(COLLECTIONS.USER_PLAYLISTS).doc(id).remove()
  return true
}

async function updatePlaylist(id, name) {
  await db.collection(COLLECTIONS.USER_PLAYLISTS).doc(id).update({
    data: { name, updatedAt: db.serverDate() }
  })
  return true
}

async function addSongToPlaylist(playlistId, songData) {
  const song = {
    _id: generateId(),
    name: songData.name,
    artist: songData.artist,
    createdAt: Date.now()
  }

  await db.collection(COLLECTIONS.USER_PLAYLISTS).doc(playlistId).update({
    data: {
      songs: _.push([song]),
      updatedAt: db.serverDate()
    }
  })
  // 转换 _id 为 id
  return { id: song._id, name: song.name, artist: song.artist, createdAt: song.createdAt }
}

async function removeSongFromPlaylist(playlistId, songId) {
  const res = await db.collection(COLLECTIONS.USER_PLAYLISTS).doc(playlistId).get()
  if (!res.data) return false

  const songs = res.data.songs.filter(s => s._id !== songId)
  await db.collection(COLLECTIONS.USER_PLAYLISTS).doc(playlistId).update({
    data: { songs, updatedAt: db.serverDate() }
  })
  return true
}

// ========== 演出相关 ==========
async function getPerformanceById(id) {
  const res = await db.collection(COLLECTIONS.PERFORMANCES).doc(id).get()
  return res.data
}

async function getUserPerformances(userId) {
  const res = await db.collection(COLLECTIONS.PERFORMANCES)
    .where({ userId })
    .orderBy('createdAt', 'desc')
    .get()
  return res.data
}

async function getPerformancesByPlaylistId(playlistId) {
  console.log('获取歌单的演出信息:', playlistId)
  const res = await db.collection(COLLECTIONS.PERFORMANCES)
    .where({ playlistId })
    .orderBy('createdAt', 'desc')
    .get()
  console.log('查询结果:', res.data)
  return res.data
}

async function createPerformance(userId, data) {
  const performanceId = generateId()
  const performance = {
    _id: performanceId,
    userId,
    title: data.title || '新演出',
    playlistId: data.playlistId,
    status: 'ongoing',
    audienceCount: 0,
    singingList: [],
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  }
  await db.collection(COLLECTIONS.PERFORMANCES).doc(performanceId).set({ data: performance })
  return { id: performanceId, ...performance }
}

async function endPerformance(id) {
  await db.collection(COLLECTIONS.PERFORMANCES).doc(id).update({
    data: {
      status: 'ended',
      endTime: db.serverDate(),
      updatedAt: db.serverDate()
    }
  })
  return true
}

async function updateSingingList(id, singingList) {
  await db.collection(COLLECTIONS.PERFORMANCES).doc(id).update({
    data: {
      singingList,
      updatedAt: db.serverDate()
    }
  })
  return true
}

// ========== 点歌记录相关 ==========
async function createPointRecord(data) {
  const recordId = generateId()
  const record = {
    _id: recordId,
    performanceId: data.performanceId,
    userId: data.userId,
    songId: data.songId,
    songName: data.songName,
    songArtist: data.songArtist,
    message: data.message || '',
    priority: data.priority || 1,
    status: 'pending',
    createdAt: db.serverDate()
  }
  await db.collection(COLLECTIONS.POINT_RECORDS).doc(recordId).set({ data: record })
  return { id: recordId, ...record }
}

async function getPointRecordsByPerformance(performanceId) {
  const res = await db.collection(COLLECTIONS.POINT_RECORDS)
    .where({ performanceId })
    .orderBy('priority', 'desc')
    .orderBy('createdAt', 'asc')
    .get()
  return res.data
}

async function getPointRecordsByUser(userId) {
  const res = await db.collection(COLLECTIONS.POINT_RECORDS)
    .where({ userId })
    .orderBy('createdAt', 'desc')
    .get()
  return res.data
}

async function updatePointRecordStatus(id, status) {
  await db.collection(COLLECTIONS.POINT_RECORDS).doc(id).update({
    data: { status, updatedAt: db.serverDate() }
  })
  return true
}

// 获取小程序码
async function getMiniProgramCode(data) {
  let { scene, page, width = 430, forceRefresh = false } = data

  try {
    // 获取当前云环境ID，用于区分不同环境生成的二维码
    const wxContext = cloud.getWXContext()
    const envId = wxContext.ENV || 'unknown'

    console.log('原始 scene:', scene, '长度:', scene.length)

    // 确保 scene 不超过32个字符（微信小程序码限制）
    // 如果太长，只保留 p= 后面的部分
    let limitedScene = scene
    if (scene.length > 32 && scene.startsWith('p=')) {
      // 移除 p= 前缀，节省空间
      const shortScene = scene.substring(2)
      // 如果还是太长，取最后的部分
      limitedScene = shortScene.length > 30 ? shortScene.substring(shortScene.length - 30) : shortScene
      console.log('缩短后的 scene:', limitedScene, '长度:', limitedScene.length)
    } else if (scene.length > 32) {
      // 其他格式，直接截断
      limitedScene = scene.substring(0, 32)
      console.log('截断后的 scene:', limitedScene, '长度:', limitedScene.length)
    }

    console.log('生成小程序码，使用 scene:', { scene: limitedScene, page, width, envId })

    // 尝试检查缓存，但集合不存在时容错处理
    let existingQR = null
    try {
      existingQR = await db.collection(COLLECTIONS.QR_CODES).where({
        scene: limitedScene,
        page: page,
        envId: envId // 添加环境ID作为查询条件
      }).get()
    } catch (collectionError) {
      console.warn('数据库集合不存在，直接生成新二维码:', collectionError.message)
      // 集合不存在，直接跳过缓存检查
    }

    if (existingQR && existingQR.data.length > 0 && !forceRefresh) {
      console.log('使用已存在的小程序码')
      const existing = existingQR.data[0]
      // 检查临时链接是否过期（云存储临时链接默认2小时过期）
      const now = Date.now()
      const createdAt = existing.createdAt ? new Date(existing.createdAt).getTime() : 0

      // 如果链接生成不到1小时，直接返回（注意返回格式一致）
      if (now - createdAt < 3600000) {
        return {
          fileUrl: existing.fileUrl,
          fileID: existing.fileID
        }
      }
    } else if (existingQR && existingQR.data.length > 0 && forceRefresh) {
      console.log('强制刷新，删除旧缓存')
      // 强制刷新时删除旧记录
      await db.collection(COLLECTIONS.QR_CODES).doc(existingQR.data[0]._id).remove()
    }

    const wxacodeResult = await cloud.openapi.wxacode.getUnlimited({
      scene: limitedScene,
      page: page,
      width: width,
      auto_color: false,
      line_color: { r: 212, g: 165, b: 116 } // 使用主题色
    })

    // 生成唯一的文件名
    const timestamp = Date.now()
    const fileName = `qrcodes/${limitedScene.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.png`

    // 上传到云存储
    const uploadResult = await cloud.uploadFile({
      cloudPath: fileName,
      fileContent: wxacodeResult.buffer
    })

    // 获取临时链接
    const fileUrlResult = await cloud.getTempFileURL({
      fileList: [uploadResult.fileID]
    })

    const fileUrl = fileUrlResult.fileList[0].tempFileURL
    const fileID = uploadResult.fileID

    // 保存到数据库（用于缓存） - 容错处理
    try {
      if (existingQR && existingQR.data.length > 0) {
        // 更新已有记录
        await db.collection(COLLECTIONS.QR_CODES).doc(existingQR.data[0]._id).update({
          data: {
            fileID: fileID,
            fileUrl: fileUrl,
            envId: envId, // 确保环境ID也被更新
            updatedAt: db.serverDate()
          }
        })
      } else {
        // 创建新记录
        await db.collection(COLLECTIONS.QR_CODES).add({
          data: {
            scene: limitedScene,
            page: page,
            fileID: fileID,
            fileUrl: fileUrl,
            envId: envId, // 添加环境ID
            createdAt: db.serverDate(),
            updatedAt: db.serverDate()
          }
        })
      }
      console.log('二维码缓存已保存')
    } catch (saveError) {
      console.warn('保存缓存失败，不影响返回二维码:', saveError.message)
      // 保存缓存失败没关系，我们已经生成了二维码，能正常返回就行
    }

    // 返回包含 fileUrl 和 fileID 的对象
    return {
      fileUrl: fileUrl,
      fileID: fileID
    }
  } catch (err) {
    console.error('生成小程序码失败:', err)
    throw err
  }
}

// 生成16位唯一ID
function generateId() {
  const timestamp = Date.now().toString(36).substr(2) // 时间戳
  const random = Math.random().toString(36).substr(2, 6) // 6位随机数
  const id = (timestamp + random).substr(0, 16) // 总共16位
  return id.toUpperCase() // 可转为大写，方便查看
}
