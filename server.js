const express = require("express");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 7070;

const data = JSON.parse(
  fs.readFileSync("./catalog.json", "utf8")
);

const metas = data.metas || [];

app.get("/manifest.json", (req, res) => {
  res.json({
    id: "org.hikarimaskman.addon",
    version: "1.0.0",
    name: "Hikari Sentai Maskman",
    description:
      "Hikari Sentai Maskman - complete series metadata",

    resources: [
      "catalog",
      "meta"
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

app.get("/", (req, res) => {
  res.json({
    addon: "Hikari Sentai Maskman",
    total: metas.length,
    status: "online"
  });
});

app.listen(PORT, () => {
  console.log(
    "Hikari Sentai Maskman running on port " + PORT
  );
});
