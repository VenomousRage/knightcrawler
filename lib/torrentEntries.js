const { parse } = require('parse-torrent-title');
const { Type } = require('./types');
const repository = require('./repository');
const { getImdbId, getKitsuId, escapeTitle } = require('./metadata');
const { parseTorrentFiles } = require('./torrentFiles');

async function createTorrentEntry(torrent) {
  const titleInfo = parse(torrent.title);
  const searchTitle = escapeTitle(titleInfo.title).toLowerCase();

  if (!torrent.imdbId && torrent.type !== Type.ANIME) {
    torrent.imdbId = await getImdbId({ name: searchTitle, year: titleInfo.year, type: torrent.type })
        .catch(() => undefined);
  }
  if (!torrent.kitsuId && torrent.type === Type.ANIME) {
    torrent.kitsuId = await getKitsuId({ name: searchTitle, season: titleInfo.season })
        .catch(() => undefined);
  }

  if (!torrent.imdbId && !torrent.kitsuId && !titleInfo.complete) {
    console.log(`imdbId or kitsuId not found: ${torrent.title}`);
    repository.createFailedImdbTorrent(torrent);
    return;
  }

  const files = await parseTorrentFiles(torrent);
  if (!files || !files.length) {
    console.log(`no video files found: ${torrent.title}`);
    return;
  }

  repository.createTorrent(torrent)
      .then(() => files.forEach(file => repository.createFile(file)))
      .then(() => console.log(`Created entry for ${torrent.title}`));
}

async function createSkipTorrentEntry(torrent) {
  return repository.createSkipTorrent(torrent);
}

async function getStoredTorrentEntry(torrent) {
  return repository.getSkipTorrent(torrent)
      .catch(() => repository.getTorrent(torrent))
      .catch(() => undefined);
}

module.exports = { createTorrentEntry, createSkipTorrentEntry, getStoredTorrentEntry };