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
  POINT_RECORDS: 'pointRecords'
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
        result = await getMiniProgramCode(data.scene, data.page, data.width)
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
  return res.data[0] || null
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
  const res = await db.collection(COLLECTIONS.USER_PLAYLISTS).doc(id).get()
  if (!res.data) return null
  // 转换 _id 为 id
  const playlist = { ...res.data, id: res.data._id }
  delete playlist._id
  return playlist
}

async function createPlaylist(userId, name) {
  const playlist = {
    userId,
    name: name || '新歌单',
    songs: [],
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  }
  const res = await db.collection(COLLECTIONS.USER_PLAYLISTS).add({ data: playlist })
  return { id: res._id, ...playlist }
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

async function createPerformance(userId, data) {
  const performance = {
    userId,
    title: data.title || '新演出',
    playlistId: data.playlistId,
    status: 'ongoing',
    audienceCount: 0,
    singingList: [],
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  }
  const res = await db.collection(COLLECTIONS.PERFORMANCES).add({ data: performance })
  return { id: res._id, ...performance }
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
  const record = {
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
  const res = await db.collection(COLLECTIONS.POINT_RECORDS).add({ data: record })
  return { id: res._id, ...record }
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
async function getMiniProgramCode(scene, page, width = 430) {
  try {
    // 确保 scene 不超过32个字符（微信小程序码限制）
    const limitedScene = scene.length > 32 ? scene.substring(0, 32) : scene

    console.log('生成小程序码:', { scene: limitedScene, page, width })

    const wxacodeResult = await cloud.openapi.wxacode.getUnlimited({
      scene: limitedScene,
      page: page,
      width: width,
      auto_color: false,
      line_color: { r: 212, g: 165, b: 116 } // 使用主题色
    })

    // 上传到云存储
    const uploadResult = await cloud.uploadFile({
      cloudPath: `qrcodes/${scene}_${Date.now()}.png`,
      fileContent: wxacodeResult.buffer
    })

    // 获取临时链接
    const fileUrl = await cloud.getTempFileURL({
      fileList: [uploadResult.fileID]
    })

    return fileUrl.fileList[0].tempFileURL
  } catch (err) {
    console.error('生成小程序码失败:', err)
    throw err
  }
}

// 生成唯一ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}
