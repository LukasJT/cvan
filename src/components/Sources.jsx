import React from "react";
import { SOURCES } from "../sources.js";

export function Sources() {
  return (
    <div className="space-y-6">
      <div className="panel corner p-6">
        <div className="mono text-xs uppercase tracking-widest mb-3 muted">Methodology · Citations · Data Sources</div>
        <p className="body text-base primary">
          Every formula and threshold used in CVAN traces back to a primary source.
          The list below is grouped roughly by domain. Click each entry to view its
          DOI, publisher URL, or service endpoint.
        </p>
      </div>

      <div className="panel corner p-6">
        <h2 className="display gold text-lg mb-3">Astronomy</h2>
        <SourceList ids={["meeus", "spa"]} />
      </div>

      <div className="panel corner p-6">
        <h2 className="display gold text-lg mb-3">Light Pollution &amp; Sky Brightness</h2>
        <SourceList ids={["bortle", "lorenz-lp-atlas", "falchi2016", "viirsdnb", "ks1991"]} />
      </div>

      <div className="panel corner p-6">
        <h2 className="display gold text-lg mb-3">Aurora &amp; Geomagnetism</h2>
        <SourceList ids={["swpc-kp", "swpc-kp-forecast", "swpc-ovation", "swpc-aurora-tutorial", "igrf13"]} />
      </div>

      <div className="panel corner p-6">
        <h2 className="display gold text-lg mb-3">Weather, Geocoding, Mapping</h2>
        <SourceList ids={["open-meteo", "nominatim", "leaflet", "osm"]} />
      </div>

      <div className="panel corner p-6">
        <h2 className="display gold text-lg mb-3">License &amp; Disclaimer</h2>
        <p className="body text-sm secondary">
          CVAN is a planning aid. Forecasts (weather, Kp, ovation) carry the
          uncertainties of their underlying models — geomagnetic storms can
          develop in minutes, and clouds in hours. Always verify on-site
          before traveling for an observation.
        </p>
        <p className="body text-sm secondary mt-2">
          External data is fetched directly from the publishing services. CVAN
          stores no user data on a backend; location is held only in browser
          memory and the chosen theme is persisted in localStorage.
        </p>
      </div>
    </div>
  );
}

function SourceList({ ids }) {
  const items = ids.map((id) => SOURCES.find((s) => s.id === id)).filter(Boolean);
  return (
    <ol className="space-y-3" style={{ listStyle: "decimal", paddingLeft: "1.4rem" }}>
      {items.map((s) => (
        <li key={s.id} className="body text-sm">
          <div className="display gold">
            {s.author && <span>{s.author} ({s.year}). </span>}
            {s.url ? (
              <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-gold)", textDecoration: "underline" }}>
                {s.title}
              </a>
            ) : (
              <span>{s.title}</span>
            )}
            .
            {s.publisher && <span className="secondary"> {s.publisher}.</span>}
          </div>
          <div className="mono text-xs mt-1 secondary">
            {s.doi && <>DOI: <a href={`https://doi.org/${s.doi}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-purple)" }}>{s.doi}</a> · </>}
            {s.isbn && <>ISBN {s.isbn} · </>}
            <span className="muted">used for: {s.used}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
