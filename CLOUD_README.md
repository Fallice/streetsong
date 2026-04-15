# 微信云开发部署指南

## 1. 数据库集合创建

在微信开发者工具中，点击"云开发" → "数据库"，创建以下集合：

### 1.1 users（用户集合）
```json
{
  "_id": "自动生成的唯一ID",
  "openid": "微信用户openid",
  "nickName": "用户昵称",
  "avatarUrl": "头像URL",
  "createdAt": "创建时间",
  "updatedAt": "更新时间"
}
```

### 1.2 userLibraries（用户曲库集合）
```json
{
  "_id": "自动生成的唯一ID",
  "userId": "用户ID",
  "songs": [
    {
      "_id": "歌曲ID",
      "name": "歌曲名称",
      "artist": "歌手名称",
      "createdAt": "添加时间"
    }
  ],
  "createdAt": "创建时间",
  "updatedAt": "更新时间"
}
```

### 1.3 userPlaylists（用户歌单集合）
```json
{
  "_id": "自动生成的唯一ID",
  "userId": "用户ID",
  "name": "歌单名称",
  "songs": [
    {
      "_id": "歌曲ID",
      "name": "歌曲名称",
      "artist": "歌手名称",
      "createdAt": "添加时间"
    }
  ],
  "createdAt": "创建时间",
  "updatedAt": "更新时间"
}
```

### 1.4 performances（演出集合）
```json
{
  "_id": "自动生成的唯一ID",
  "userId": "用户ID",
  "title": "演出标题",
  "playlistId": "关联歌单ID",
  "status": "ongoing/ended",
  "audienceCount": 0,
  "singingList": [],
  "createdAt": "创建时间",
  "updatedAt": "更新时间"
}
```

### 1.5 pointRecords（点歌记录集合）
```json
{
  "_id": "自动生成的唯一ID",
  "performanceId": "演出ID",
  "userId": "点歌用户ID",
  "songId": "歌曲ID",
  "songName": "歌曲名称",
  "songArtist": "歌手名称",
  "message": "留言",
  "priority": 1,
  "status": "pending/sung/canceled",
  "createdAt": "创建时间"
}
```

## 2. 云函数部署

在微信开发者工具中：

1. 右键点击 `cloudfunctions/login` 文件夹 → "创建并部署：云端安装依赖"
2. 右键点击 `cloudfunctions/api` 文件夹 → "创建并部署：云端安装依赖"

## 3. 前端配置

修改 `app.js`，在 `onLaunch` 中初始化云开发：

```javascript
wx.cloud.init({
  env: '你的云环境ID',
  traceUser: true
})
```

## 4. 权限设置

在数据库控制台，为每个集合设置权限：

- **users**: 仅创建者可读写
- **userLibraries**: 仅创建者可读写
- **userPlaylists**: 仅创建者可读写
- **performances**: 所有用户可读，仅创建者可写
- **pointRecords**: 所有用户可读，仅创建者可写
