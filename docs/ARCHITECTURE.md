# BUBBLE – Centralized Public Audio Feed Architecture

## Goal

All users connect to **one shared backend**, **one MongoDB database**, and **one cloud storage** (Cloudinary). Audio files are **never** stored in MongoDB — only metadata and the Cloudinary URL are stored.

---

## 1. Audio file storage (Cloudinary)

- Frontend records audio and sends it as a file in `FormData` with key `"audio"`.
- Backend receives the file with **multer** (`upload.single('audio')`).
- Backend uploads the file to **Cloudinary** via `cloudinary.uploader.upload(dataUri, { resource_type: 'video' })`.
- Cloudinary returns a **secure URL**.
- That URL is the **only** reference to the audio; it is stored in MongoDB. No raw audio or base64 is ever stored in the database.

---

## 2. Database storage (MongoDB)

**AudioPost** (collection: `audioposts`) stores **metadata only**:

| Field       | Type    | Description                          |
|------------|---------|--------------------------------------|
| userId     | ObjectId| Optional reference to Users          |
| username   | String  | Display name (e.g. "anonymous")      |
| audioUrl   | String  | Cloudinary `secure_url`              |
| duration   | Number  | Length in seconds                    |
| createdAt  | Date    | When the post was created            |
| expiryAt  | Date    | TTL for auto-delete (e.g. 24h)       |
| likes      | Number  | Like count                           |
| impressions| Number  | View count                           |
| avatar     | String  | Optional avatar URL                  |
| anonymousId| String  | Optional anonymous identifier        |

---

## 3. Upload flow (POST /api/audio/upload)

1. Frontend records audio and builds `FormData` with key `"audio"`.
2. Request: `POST /api/audio/upload` with `FormData`.
3. Backend: multer gives `req.file`; validate type (audio only), optional duration limit.
4. Backend: upload file to Cloudinary → get `result.secure_url`.
5. Backend: create **AudioPost** with metadata (including `audioUrl: result.secure_url`).
6. Backend: return the saved document: `res.json({ post: newPost })`.
7. Frontend: add the returned post to local feed state (no refetch).

---

## 4. Feed access (GET /api/audio/feed)

1. Frontend (e.g. on mount): `GET /api/audio/feed`.
2. Backend: find documents where `expiryAt > now()`, sort by `createdAt` descending.
3. Backend: return metadata only: `res.json({ posts })`. Each item includes `audioUrl` (pointing to Cloudinary).
4. Frontend: `setBubbles(data.posts || [])` and render; no audio is read from MongoDB.

---

## 5. Playback

- Frontend never requests audio from MongoDB.
- Playback uses the **audioUrl** from the feed/post (Cloudinary URL) with `<audio>` or `new Audio(audioUrl)`.

---

## 6. Centralized behavior

- **One backend** → one MongoDB and one Cloudinary account.
- **Same feed for everyone** → all clients read from the same `audioposts` collection.
- **Refresh** → app calls `GET /api/audio/feed` again; feed always comes from the backend.
- No audio or posts exist only in frontend state; persistence is in MongoDB + Cloudinary.

---

## 7. Security

- **File type**: only allow `audio/*` (and/or a whitelist) before uploading to Cloudinary.
- **Duration**: optional server-side cap (e.g. max 60s); client can send `duration` in the form.
- **Secrets**: Cloudinary API key/secret stay on the backend; never exposed to the frontend.

---

## API summary

| Method | Path                | Description                    |
|--------|---------------------|--------------------------------|
| POST   | /api/audio/upload   | Upload audio → Cloudinary + MongoDB, return post |
| GET    | /api/audio/feed     | Return non-expired posts, newest first           |

Legacy routes `/bubble/upload` and `/bubble/feed` remain for backward compatibility and use the Bubble model / `bubbles` collection.
