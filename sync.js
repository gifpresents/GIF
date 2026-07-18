const fs = require('fs');
const axios = require('axios');

// =========================================================================
// CONFIGURATION ENGINE (SECURED VIA GITHUB SECRETS)
// =========================================================================
const API_KEY = process.env.YOUTUBE_KEY; 
const CHANNEL_ID = 'UCqRFJN6QZ4t4qf3k7qxEFXA';

// Replicating your "Playlist Order" sheet mapping rules
const CUSTOM_ORDER_MAP = {
  "vertical series": 1,
  "short films": 2,
  "commercials": 3
  // Add additional lowercased categories and rankings here manually as needed
};

async function fetchAllYouTubeData() {
  let videoData = {};
  let baseCategories = [];
  let uniquePlaylistNamesFound = [];
  let playlistPageToken = '';

  console.log("Initializing dynamic YouTube engine synchronization loop...");

  try {
    do {
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${CHANNEL_ID}&maxResults=50&key=${API_KEY}&pageToken=${playlistPageToken}`;
      const playlistRes = await axios.get(playlistUrl);
      
      if (!playlistRes.data.items || playlistRes.data.items.length === 0) break;

      for (let playlist of playlistRes.data.items) {
        const playlistId = playlist.id;
        const categoryName = playlist.snippet.title;

        if (!uniquePlaylistNamesFound.includes(categoryName)) {
          uniquePlaylistNamesFound.push(categoryName);
        }

        if (!videoData[categoryName]) {
          videoData[categoryName] = [];
          baseCategories.push(categoryName);
        }

        let videoPageToken = '';
        do {
          const videoUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${API_KEY}&pageToken=${videoPageToken}`;
          const videoRes = await axios.get(videoUrl);

          if (videoRes.data.items) {
            for (let item of videoRes.data.items) {
              const videoName = item.snippet.title;
              const videoId = item.snippet.resourceId.videoId;
              let videoDesc = item.snippet.description ? item.snippet.description.trim() : '';
              videoDesc = videoDesc.replace(/[\r\n]+/g, ' • ');

              const embedUrl = `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`;
              let thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

              if (item.snippet.thumbnails && item.snippet.thumbnails.maxres) {
                thumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
              } else if (item.snippet.thumbnails && item.snippet.thumbnails.high) {
                thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
              }

              videoData[categoryName].push({
                name: videoName ? videoName.toString().trim() : "Untitled-Video",
                embedUrl: embedUrl,
                thumb: thumbUrl,
                desc: videoDesc
              });
            }
          }
          videoPageToken = videoRes.data.nextPageToken || '';
        } while (videoPageToken);
      }

      playlistPageToken = playlistRes.data.nextPageToken || '';
    } while (playlistPageToken);

    // Sorting categories based on your custom configuration rankings
    const sortedCategoriesArray = baseCategories.sort((a, b) => {
      const keyA = a.toString().toLowerCase().trim();
      const keyB = b.toString().toLowerCase().trim();
      const orderA = CUSTOM_ORDER_MAP[keyA] !== undefined ? CUSTOM_ORDER_MAP[keyA] : 9999;
      const orderB = CUSTOM_ORDER_MAP[keyB] !== undefined ? CUSTOM_ORDER_MAP[keyB] : 9999;
      return orderA - orderB;
    });

    const outputData = {
      categories: sortedCategoriesArray,
      videos: videoData
    };

    // Save output files straight to your local directory block repository root folder
    fs.writeFileSync('data.json', JSON.stringify(outputData, null, 2));
    console.log("Success! Synchronization completed cleanly. data.json created.");

  } catch (error) {
    console.error("Data Sync Pipeline Failed: ", error.message);
  }
}

fetchAllYouTubeData();
