const https = require("https");

const PGE_HOST = "ewapi.cloudapi.pge.com";
const REQUEST_TIMEOUT_MS = 10000;
const MAX_RESPONSE_BYTES = 1000000;
const MAX_FIELD_LENGTH = 256;

const reqHeaders = {
  Host: PGE_HOST,
  Accept: "application/json, text/javascript, */*; q=0.01",
  "Accept-Language": "en-us",
  "Content-Type": "application/json",
  Origin: "http://critweb-outage.pgealerts.com",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.1 Safari/605.1.15",
  Referer: "http://critweb-outage.pgealerts.com/?WT.mc_id=Vanity_pge-outages",
};

const getField = (req, name) => {
  const value = req.query[name];
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_FIELD_LENGTH) {
    return null;
  }
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
};

const sendError = (res) => {
  if (res.headersSent) return;
  res
    .status(502)
    .set("Cache-Control", "no-store")
    .json({
      string: "PG&E Error: Unable to check power outage status",
      color: "#0d97ff",
      status: "error",
      glyphColor: "#3F371A",
    });
};

exports.check = (req, res) => {
  const cty = getField(req, "cty");
  const zip = getField(req, "zip");
  const str = getField(req, "str");
  const stn = getField(req, "stn");

  if (!cty || !zip || !str || !stn) {
    res.status(400).json({ error: "A complete address is required" });
    return;
  }

  const address = encodeURIComponent(`${stn} ${str} ${cty} ${zip}`);
  let settled = false;
  const fail = () => {
    if (settled) return;
    settled = true;
    sendError(res);
  };

  const request = https.request(
    {
      method: "GET",
      host: PGE_HOST,
      path: `/single-address-outages?v=2&address=${address}`,
      headers: reqHeaders,
      timeout: REQUEST_TIMEOUT_MS,
      // PG&E currently presents a self-signed certificate. Keep this exception
      // scoped to this fixed outbound host; never disable TLS verification globally.
      rejectUnauthorized: false,
      servername: PGE_HOST,
    },
    (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        fail();
        return;
      }

      response.setEncoding("utf8");
      let body = "";
      response.on("data", (chunk) => {
        body += chunk;
        if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES) {
          fail();
          request.destroy(new Error("PG&E response exceeded size limit"));
        }
      });

      response.on("end", () => {
        if (settled) return;
        try {
          const parsed = JSON.parse(body);
          const records = Array.isArray(parsed) ? parsed : parsed && parsed.results;
          const rawData = Array.isArray(records) ? records[0] : null;
          let message = "";
          let statusColor;
          let status;
          let glyphColor;

          if (!rawData || rawData.prem_state !== "CA") {
            statusColor = "#DFBA70";
            status = "error";
            message = "Unable to Load PG&E API for this Address";
            glyphColor = "#3F371A";
          } else {
            const details = rawData.sp_meter_transformer_details;
            if (!Array.isArray(details) || !details.length) throw new Error("Unexpected PG&E response shape");
            let outage;
            let forecast;
            let delayedForecast;
            const now = Date.now();

            for (const detail of details) {
              if (detail.current_outage && detail.current_outage.last_update) outage = detail.current_outage;
              for (const upcoming of detail.forecasted_outages || []) {
                const start = Date.parse(upcoming.estimated_shut_off_start_dttm);
                if (!Number.isFinite(start)) continue;
                if (start > now) {
                  if (!forecast || start < Date.parse(forecast.estimated_shut_off_start_dttm)) forecast = upcoming;
                } else if (!delayedForecast || start > Date.parse(delayedForecast.estimated_shut_off_start_dttm)) {
                  delayedForecast = upcoming;
                }
              }
            }
            if (!forecast) forecast = delayedForecast;

            if (outage) {
              message = "Power Outage Reported.";
              const restoration = Date.parse(outage.current_etor);
              if (Number.isFinite(restoration)) {
                const date = new Date(restoration);
                const day = date.toLocaleDateString("en-US", {
                  timeZone: "America/Los_Angeles", month: "long", day: "numeric",
                });
                const time = date.toLocaleTimeString("en-US", {
                  timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit",
                });
                message += ` Estimated Restoration: ${day}, ${time}`;
              }
              message += `\nCurrent Outage: ${outage.outage_cause || "Cause not reported"}`;
              statusColor = "#f23050";
              status = "current";
              glyphColor = "#1A3F24";
            }
            if (forecast) {
              const delayed = Date.parse(forecast.estimated_shut_off_start_dttm) <= now;
              if (message) message += "\n";
              else {
                statusColor = "#DFBA70";
                status = delayed ? "delayed" : "future";
                glyphColor = "#1A3F24";
              }
              message += delayed ? "Forecasted Outage (delayed)" : "Forecasted Outage";
              if (forecast.stage) message += `: ${forecast.stage}`;
              else if (forecast.message_template) message += `: PSPS ${forecast.message_template.replace(/(Single|Multiple)$/, "")}`;

              const time = new Intl.DateTimeFormat("en-US", {
                timeZone: "America/Los_Angeles", month: "numeric", day: "numeric",
                hour: "numeric", minute: "2-digit", timeZoneName: "short",
              });
              if (forecast.estimated_shut_off_start_dttm) {
                message += `.${delayed ? " Scheduled" : " Estimated"} shutoff: ${time.format(new Date(forecast.estimated_shut_off_start_dttm))}`;
                if (forecast.estimated_shutoff_end_dttm) message += ` - ${time.format(new Date(forecast.estimated_shutoff_end_dttm))}`;
              }
              if (forecast.etor) message += `. Estimated restoration: ${time.format(new Date(forecast.etor))}`;
            }
            if (!message) {
              message = "No Outage Reported by PG&E";
              statusColor = "#30f27a";
              status = "clear";
              glyphColor = "#1A3F24";
            }
          }

          settled = true;
          if (req.resolvedAddress && status === "error") res.status(404);
          if (req.resolvedAddress && status !== "error") res.set("Cloudflare-CDN-Cache-Control", "public, max-age=900");
          res.set("Cache-Control", "no-store").json({
            string: message,
            color: statusColor,
            status,
            glyphColor,
            address: req.resolvedAddress,
            checkedAt: req.resolvedAddress ? new Date().toISOString() : undefined,
          });
        } catch (error) {
          console.error(`Unable to parse PG&E response: ${error.message}`);
          fail();
        }
      });
    }
  );

  request.on("timeout", () => request.destroy(new Error("PG&E request timed out")));
  request.on("error", (error) => {
    console.error(`Unable to check PGE API with request: ${error.message}`);
    fail();
  });
  request.end();
};

const download = (path) => new Promise((resolve, reject) => {
  const request = https.get({
    host: "pgealerts-downloads.alerts.pge.com", path, timeout: REQUEST_TIMEOUT_MS,
  }, (response) => {
    if (response.statusCode !== 200) {
      response.resume();
      reject(new Error(`PG&E download returned ${response.statusCode}`));
      return;
    }
    const chunks = [];
    let size = 0;
    response.on("data", (chunk) => {
      size += chunk.length;
      if (size > 30000000) request.destroy(new Error("PG&E download exceeded size limit"));
      else chunks.push(chunk);
    });
    response.on("end", () => resolve(Buffer.concat(chunks)));
    response.on("error", reject);
  });
  request.on("timeout", () => request.destroy(new Error("PG&E download timed out")));
  request.on("error", reject);
});

let pspsGeoJSON;
let pspsUpdated = 0;
let pspsActive;
let pspsStatusUpdated = 0;

exports.pspsStatus = async (req, res) => {
  if (pspsActive === undefined || Date.now() - pspsStatusUpdated >= 3 * 60 * 60 * 1000) {
    try {
      const events = JSON.parse((await download("/forecasted_outages/psps_event_package_check.json")).toString()).psps_events.events;
      let active = false;
      for (const event of events) {
        if (event.active_files.map) {
          active = true;
          break;
        }
      }
      pspsActive = active;
      pspsStatusUpdated = Date.now();
    } catch (error) {
      console.error(`Unable to check PG&E PSPS status: ${error.message}`);
      if (pspsActive !== undefined) {
        res.set("Cache-Control", "public, max-age=10800").json({ active: pspsActive });
        return;
      }
      res.status(502).set("Cache-Control", "no-store").json({ error: "Unable to check PG&E PSPS status" });
      return;
    }
  }
  res.set("Cache-Control", "public, max-age=10800").json({ active: pspsActive });
};

exports.psps = async (req, res) => {
  if (!pspsGeoJSON || Date.now() - pspsUpdated >= 30 * 60 * 1000) {
    try {
      const shp = (await import("shpjs")).default;
      const geojson = { type: "FeatureCollection", features: [] };

      for (const event of JSON.parse((await download("/forecasted_outages/psps_event_package_check.json")).toString()).psps_events.events) {
        if (!event.active_files.map) continue;
        // PG&E prefixes the map ZIP filename with "z - " in public_sync.
        let polygons = await shp(await download(`/public_sync/z%20-%20${encodeURIComponent(event.active_files.map)}`));
        if (!Array.isArray(polygons)) polygons = [polygons];
        for (const polygon of polygons) {
          for (const feature of polygon.features) geojson.features.push(feature);
        }
      }

      pspsGeoJSON = geojson;
      pspsUpdated = Date.now();
    } catch (error) {
      console.error(`Unable to load PG&E PSPS areas: ${error.message}`);
      res.json({ type: "FeatureCollection", features: [] });
      return;
    }
  }
  res.set("Cache-Control", "public, max-age=1800").json(pspsGeoJSON);
};
