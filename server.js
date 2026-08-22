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

/* =========================================================
   GOOGLE DRIVE
   Obtiene dinámicamente el UUID de confirmación para archivos
   grandes que muestran la pantalla "Download anyway".
   ========================================================= */

async function resolveDriveUrl(originalUrl) {
  try {
    const response = await fetch(originalUrl, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15"
      }
    });

    const finalUrl = response.url;
    const contentType =
      response.headers.get("content-type") || "";

    /*
     * Si Drive ya entrega directamente el MP4,
     * no necesitamos confirmación.
     */
    if (
      contentType.toLowerCase().includes("video/mp4")
    ) {
      return finalUrl;
    }

    const html = await response.text();

    /*
     * Google Drive coloca el UUID dentro del formulario
     * de "Download anyway".
     */
    const uuidMatch = html.match(
      /name=["']uuid["'][^>]*value=["']([^"']+)["']/i
    );

    if (!uuidMatch) {
      throw new Error(
        "Google Drive no proporcionó UUID de confirmación"
      );
    }

    const uuid = uuidMatch[1];

    const separator = originalUrl.includes("?")
      ? "&"
      : "?";

    const confirmedUrl =
      `${originalUrl}${separator}confirm=t&uuid=${encodeURIComponent(uuid)}`;

    return confirmedUrl;

  } catch (error) {
    console.error(
      "Error resolviendo Google Drive:",
      error.message
    );

    return null;
  }
}

/* =========================================================
   MANIFEST
   ========================================================= */

app.get("/manifest.json", (req, res) => {
  res.json({
    id: "org.hikarimaskman.addon",
    version: "1.0.1",
    name: "Hikari Sentai Maskman",
    description:
      "Hikari Sentai Maskman - complete series metadata",
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
        name: "Hikari Sentai Maskman"
      }
    ]
  });
});

/* =========================================================
   CATALOG
   ========================================================= */

app.get(
  "/catalog/series/hikari-sentai-maskman.json",
  (req, res) => {
    res.json({
      metas
    });
  }
);

/* =========================================================
   META
   ========================================================= */

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

/* =========================================================
   STREAM
   ========================================================= */

app.get(
  "/stream/series/:id.json",
  async (req, res) => {

    try {

      const rawId = req.params.id;

      /*
       * Stremio puede pedir:
       *
       * tt0092371
       * tt0092371:1:1
       * tt0092371:1:50
       */

      const parts = rawId.split(":");

      const seriesId = parts[0];

      const season =
        parts.length >= 2
          ? parseInt(parts[1], 10)
          : 1;

      const episodeNumber =
        parts.length >= 3
          ? parseInt(parts[2], 10)
          : null;

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
       * Si Stremio solicita un episodio concreto,
       * devolver SOLO ese episodio.
       */

      let selectedEpisodes = episodes;

      if (
        episodeNumber !== null &&
        !isNaN(episodeNumber)
      ) {
        selectedEpisodes = episodes.filter(
          ep =>
            parseInt(ep.episode, 10) ===
            episodeNumber
        );
      }

      if (!selectedEpisodes.length) {
        return res.json({
          streams: []
        });
      }

      const streams = [];

      /*
       * Resolver dinámicamente cada URL.
       */

      for (const ep of selectedEpisodes) {

        const resolvedUrl =
          await resolveDriveUrl(ep.url);

        if (!resolvedUrl) {
          console.error(
            `No se pudo resolver E${String(ep.episode).padStart(2, "0")}`
          );

          continue;
        }

        streams.push({
          name: "Google Drive",

          title:
            `E${String(ep.episode).padStart(2, "0")} - ` +
            ep.name.replace(/\.mp4$/i, ""),

          url: resolvedUrl,

          type: "video/mp4"
        });
      }

      res.json({
        streams
      });

    } catch (error) {

      console.error(
        "STREAM ERROR:",
        error
      );

      res.status(500).json({
        err: "Stream resolution error",
        message: error.message
      });
    }
  }
);

/* =========================================================
   ROOT
   ========================================================= */

app.get("/", (req, res) => {
  res.json({
    addon: "Hikari Sentai Maskman",
    total: metas.length,
    episodes: episodes.length,
    status: "online"
  });
});

/* =========================================================
   START
   ========================================================= */

app.listen(PORT, () => {
  console.log(
    "Hikari Sentai Maskman running on port " +
    PORT
  );
});
