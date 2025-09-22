// import 'leaflet/dist/leaflet.css';

// src/components/FRAAtlas.jsx
import React, { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";

export default function FRAAtlas() {
  const FOCO_STATES = ["Madhya Pradesh", "Tripura", "Odisha", "Telangana"];

  const [state, setState] = useState("Madhya Pradesh");
  const [level, setLevel] = useState("district");
  const [activeLayers, setActiveLayers] = useState({
    IFR: true,
    CR: true,
    CFR: true,
    assets: true,
  });
  const [wfsGeojson, setWfsGeojson] = useState(null);
  const [ocrText, setOcrText] = useState("");
  const [nerEntities, setNerEntities] = useState([]);
  const [dssResult, setDssResult] = useState(null);
  const [selectedVillage, setSelectedVillage] = useState(null);
  const [loading, setLoading] = useState(false);

  const mapRef = useRef(null);
  const mapCenter = [22.5, 80.0]; // Central India

  // Example: build layer name (adjust based on GeoServer/portal naming)
  const buildLayerName = (layerKey) =>
    `fra:${state.toLowerCase().replace(/\s+/g, "_")}_${layerKey.toLowerCase()}_${level}`;

  // Load WFS layer
  const handleLoadWFS = async () => {
    setLoading(true);
    try {
      const layerName = buildLayerName("IFR"); // example IFR layer
      const resp = await axios.get("/api/wfs", { params: { layer: layerName } });
      setWfsGeojson(resp.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load WFS layer.");
    } finally {
      setLoading(false);
    }
  };

  // OCR file upload
  const handleUploadDoc = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("scan", file);
    setLoading(true);
    try {
      const resp = await axios.post("/api/ocr", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setOcrText(resp.data.text || "");
      // call NER extraction
      const nerResp = await axios.post("/api/ner", { text: resp.data.text });
      setNerEntities(nerResp.data.entities || []);
    } catch (err) {
      console.error(err);
      alert("OCR/NER failed.");
    } finally {
      setLoading(false);
    }
  };

  // DSS request
  const requestDSS = async (villageId) => {
    if (!villageId) return alert("Enter village ID");
    setLoading(true);
    try {
      const resp = await axios.post("/api/dss/recommend", { villageId, state });
      setDssResult(resp.data);
    } catch (err) {
      console.error(err);
      alert("DSS request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 flex gap-4 min-h-screen">
      {/* Sidebar Controls */}
      <aside className="w-80 bg-white rounded-xl p-4 shadow">
        <h2 className="text-lg font-semibold">FRA Atlas Controls</h2>

        {/* State Selection */}
        <label className="block mt-3 text-sm">State (Focus)</label>
        <select
          className="w-full mt-1 p-2 border rounded"
          value={state}
          onChange={(e) => setState(e.target.value)}
        >
          {FOCO_STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        {/* Level Selection */}
        <label className="block mt-3 text-sm">Level</label>
        <select
          className="w-full mt-1 p-2 border rounded"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="state">State</option>
          <option value="district">District</option>
          <option value="subdistrict">Sub-district</option>
          <option value="village">Village</option>
        </select>

        {/* Layer toggles */}
        <div className="mt-3 text-sm">Toggle Layers</div>
        <div className="flex flex-col gap-2 mt-2">
          {["IFR", "CR", "CFR", "assets"].map((k) => (
            <label key={k} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!activeLayers[k]}
                onChange={() =>
                  setActiveLayers((prev) => ({ ...prev, [k]: !prev[k] }))
                }
              />
              <span className="capitalize">{k}</span>
            </label>
          ))}
        </div>

        {/* Load WFS button */}
        <div className="mt-3">
          <button
            className="bg-blue-600 text-white px-3 py-2 rounded"
            onClick={handleLoadWFS}
          >
            Load WFS (IFR example)
          </button>
        </div>

        <hr className="my-3" />

        {/* OCR Upload */}
        <div>
          <label className="text-sm">Upload scanned FRA document (PDF/JPG)</label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleUploadDoc}
            className="mt-2"
          />
          {ocrText && (
            <div className="mt-2 text-xs bg-gray-50 p-2 rounded h-24 overflow-auto">
              <strong>OCR Text:</strong>
              <div>{ocrText}</div>
            </div>
          )}
          {nerEntities.villages && (
            <div className="mt-2 text-xs bg-gray-50 p-2 rounded h-24 overflow-auto">
              <strong>NER Villages:</strong>
              <div>{nerEntities.villages.join(", ")}</div>
            </div>
          )}
        </div>

        <hr className="my-3" />

        {/* DSS */}
        <div>
          <h3 className="font-medium">DSS</h3>
          <div className="mt-2">
            <label className="text-xs">Village ID</label>
            <input
              className="w-full p-2 border rounded mt-1 text-sm"
              value={selectedVillage || ""}
              onChange={(e) => setSelectedVillage(e.target.value)}
            />
            <button
              className="mt-2 w-full bg-green-600 text-white p-2 rounded"
              onClick={() => requestDSS(selectedVillage)}
            >
              Get Recommendations
            </button>
          </div>
          {dssResult && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
              <strong>Recommendations</strong>
              <pre className="text-xs">{JSON.stringify(dssResult, null, 2)}</pre>
            </div>
          )}
        </div>
      </aside>

      {/* Map */}
      <main className="flex-1 rounded-xl overflow-hidden shadow">
        <MapContainer
          center={mapCenter}
          zoom={6}
          style={{ height: "90vh", width: "100%" }}
          ref={mapRef}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {wfsGeojson && <GeoJSON data={wfsGeojson} />}
        </MapContainer>
      </main>
    </div>
  );
}
