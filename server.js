const express = require("express");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 7070;

const data = JSON.parse(
  fs.readFileSync("./catalog.json", "utf8")
);

const metas = data.metas || [];

const episodes = JSON.parse(
  fs.readFileSync("./drive-episodes.json", "utf8")
);

app.get("/manifest.json", (req, res) => {
  res.json({
    id: "org.hikarimaskman.addon",
    version: "1.0.0",
    name: "Hikari Sentai Maskman",
    description: "Hikari Sentai Maskman - complete series metadata",
    resources: [
      "catalog",
      "meta",
      "stream"
    ],
    types: [
      "series"
    ],
    catalogs: [
      {
        type: "series",
        id: "hikari-sentai-maskman",
        name: "✨ Hikari Sentai Maskman"
      }
    ]
  });
});

app.get(
  "/catalog/series/hikari-sentai-maskman.json",
  (req, res) => {
    res.json({
      metas
    });
  }
);

app.get(
  "/meta/series/:id.json",
  (req, res) => {

    const item = metas.find(
      x =>
        x.id === req.params.id ||
        x.imdb_id === req.params.id ||
        x.tmdb_id === req.params.id
    );

    if (!item) {
      return res.status(404).json({
        err: "Meta not found"
      });
    }

    res.json({
      meta: {
        id: item.id,
        type: "series",
        name: item.name,
        year: item.year,
        imdb_id: item.imdb_id,
        tmdb_id: item.tmdb_id
      }
    });
  }
);

app.get(
  "/stream/series/:id.json",
  (req, res) => {

    const rawId = req.params.id;

    /*
      Formato de episodio:

      tt0092371:1:1
      tt0092371:1:2
      tt0092371:1:50
    */

    const match = rawId.match(
      /^(.+):(\d+):(\d+)$/
    );

    let seriesId = rawId;
    let episodeNumber = null;

    if (match) {
      seriesId = match[1];
      episodeNumber = Number(match[3]);
    }

    const item = metas.find(
      x =>
        x.id === seriesId ||
        x.imdb_id === seriesId ||
        x.tmdb_id === seriesId
    );

    if (!item) {
      return res.status(404).json({
        err: "Meta not found"
      });
    }

    /*
      EPISODIO INDIVIDUAL
    */

    if (episodeNumber !== null) {

      const ep = episodes.find(
        e => Number(e.episode) === episodeNumber
      );

      if (!ep) {
        return res.status(404).json({
          err: "Episode not found"
        });
      }

      return res.json({
        streams: [
          {
            name: "Google Drive",
            title:
              `E${String(ep.episode).padStart(2, "0")} - ` +
              `${ep.name.replace(/\.mp4$/i, "")}`,
            url: ep.url,
            type: "video/mp4"
          }
        ]
      });
    }

    /*
      SERIE COMPLETA
    */

    const streams = episodes.map(ep => ({
      name: "Google Drive",
      title:
        `E${String(ep.episode).padStart(2, "0")} - ` +
        `${ep.name.replace(/\.mp4$/i, "")}`,
      url: ep.url,
      type: "video/mp4"
    }));

    res.json({
      streams
    });
  }
);

app.get("/", (req, res) => {
  res.json({
    addon: "Hikari Sentai Maskman",
    total: metas.length,
    episodes: episodes.length,
    status: "online"
  });
});

app.listen(PORT, () => {
  console.log(
    "Hikari Sentai Maskman running on port " + PORT
  );
});
