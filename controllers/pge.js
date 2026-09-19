const https = require("https");

const PGE_HOST = "ewapi.cloudapi.pge.com";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 1_000_000;
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
      glyph: "⁇",
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
      path: `/single-address-outages?address=${address}`,
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
          const rawData = JSON.parse(body)[0];
          let message;
          let statusColor;
          let glyph;
          let glyphColor;

          if (!rawData || rawData.prem_state !== "CA") {
            statusColor = "#DFBA70";
            message = "Unable to Load PG&E API for this Address";
            glyph = "⁇";
            glyphColor = "#3F371A";
          } else {
            const outage = rawData.sp_meter_transformer_details?.[0]?.current_outage;
            if (!outage) throw new Error("Unexpected PG&E response shape");

            if (outage.last_update) {
              message = `Outage Reported. PG&E Status: ${outage.crew_current_status || "Unknown"}`;
              statusColor = "#f23050";
              glyph = "⚠️";
              glyphColor = "#3A0C02";
            } else {
              message = "No Outage Reported by PG&E";
              statusColor = "#30f27a";
              glyph = "✓";
              glyphColor = "#1A3F24";
            }
          }

          settled = true;
          res.set("Cache-Control", "no-store").json({
            string: message,
            color: statusColor,
            glyph,
            glyphColor,
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
