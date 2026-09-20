import { Canvas, useLoader } from "@react-three/fiber";
import { Center, Grid, OrbitControls } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import "./App.css";

type HeatTransferMode = "Conduction" | "Convection" | "Radiation";
type BoundaryScope = "Selected face" | "Entire model";
type MaterialProperties = { conductivity: string; density: string; specificHeat: string };
type Material = MaterialProperties & { name: string };
type IconName = "upload" | "play" | "pause" | "reset" | "trash" | "export" | "cube" | "thermo";

const MATERIALS: Material[] = [
  { name: "Aluminium 6061", conductivity: "167", density: "2700", specificHeat: "896" },
  { name: "Copper", conductivity: "401", density: "8960", specificHeat: "385" },
  { name: "Stainless steel", conductivity: "16.2", density: "8000", specificHeat: "500" },
  { name: "Custom material", conductivity: "", density: "", specificHeat: "" },
];

const ICON_PATHS: Record<IconName, ReactNode> = {
  upload: <><path d="M12 16V3m0 0 4 4m-4-4-4 4" /><path d="M4 14v5h16v-5" /></>,
  play: <path d="m9 5 10 7-10 7V5Z" fill="currentColor" stroke="none" />,
  pause: <path d="M9 5v14m6-14v14" />,
  reset: <><path d="M4 12a8 8 0 1 0 2.3-5.7" /><path d="M4 4v5h5" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5" /></>,
  export: <><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 14v6h14v-6" /></>,
  cube: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="M4 7.5 12 12l8-4.5M12 12v9" /></>,
  thermo: <><path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z" /><path d="M12 9v7" /></>,
};

function Icon({ name }: { name: IconName }) {
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON_PATHS[name]}</svg>;
}

function PreviewGeometry() {
  return <mesh castShadow receiveShadow><boxGeometry args={[2.15, 1.35, 1.35]} /><meshStandardMaterial color="#287b9c" metalness={0.35} roughness={0.42} /></mesh>;
}

function ImportedModel({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url);
  return <Center><mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color="#2b9bc3" metalness={0.25} roughness={0.38} /></mesh></Center>;
}

function ThreeViewport({ modelUrl }: { modelUrl: string | null }) {
  return <Canvas shadows camera={{ position: [4.2, 3, 5.6], fov: 43 }}><color attach="background" args={["#08131c"]} /><ambientLight intensity={0.6} /><directionalLight position={[5, 7, 4]} intensity={2.4} castShadow /><pointLight position={[-4, -2, 2]} color="#00b8d4" intensity={2} /><Grid position={[0, -1.1, 0]} args={[14, 14]} cellSize={0.5} cellThickness={0.45} cellColor="#153140" sectionSize={2.5} sectionThickness={0.9} sectionColor="#24617b" fadeDistance={12} /><Suspense fallback={null}>{modelUrl ? <ImportedModel url={modelUrl} /> : <PreviewGeometry />}</Suspense><OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={2.5} maxDistance={14} /></Canvas>;
}

function ControlSection({ title, children, initiallyOpen = true }: { title: string; children: ReactNode; initiallyOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  return <section className="control-section"><button className="section-title" onClick={() => setIsOpen(!isOpen)}>{title}<span aria-hidden="true">v</span></button>{isOpen && <div className="section-content">{children}</div>}</section>;
}

function Field({ label, value, unit, onChange }: { label: string; value: string; unit: string; onChange: (value: string) => void }) {
  return <label className="field"><span>{label}</span><div><input value={value} aria-label={label} inputMode="decimal" onChange={(event) => onChange(event.target.value)} /><em>{unit}</em></div></label>;
}

function TemperatureMetric({ label, color }: { label: string; color?: string }) {
  return <div className="metric"><span>{label}</span><strong style={{ color }}>-</strong><small>Awaiting solve</small></div>;
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialMaterial = MATERIALS[0];
  const [selectedMaterial, setSelectedMaterial] = useState(initialMaterial.name);
  const [materialProperties, setMaterialProperties] = useState<MaterialProperties>(initialMaterial);
  const [initialTemperature, setInitialTemperature] = useState("25");
  const [boundaryTemperature, setBoundaryTemperature] = useState("100");
  const [boundaryScope, setBoundaryScope] = useState<BoundaryScope>("Selected face");
  const [transferMode, setTransferMode] = useState<HeatTransferMode>("Conduction");
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelName, setModelName] = useState("Demo block geometry");
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => () => { if (modelUrl) URL.revokeObjectURL(modelUrl); }, [modelUrl]);

  function selectMaterial(name: string) {
    const material = MATERIALS.find((item) => item.name === name);
    if (!material) return;
    setSelectedMaterial(name);
    setMaterialProperties(material);
  }

  function updateMaterialProperty(property: keyof MaterialProperties, value: string) {
    setMaterialProperties((current) => ({ ...current, [property]: value }));
  }

  function uploadModel(file?: File) {
    if (!file) return;
    if (modelUrl) URL.revokeObjectURL(modelUrl);
    setModelUrl(URL.createObjectURL(file));
    setModelName(file.name);
    setIsRunning(false);
  }

  function clearModel() {
    if (modelUrl) URL.revokeObjectURL(modelUrl);
    setModelUrl(null);
    setModelName("Demo block geometry");
    setIsRunning(false);
  }

  return <div className="app-shell"><header className="topbar"><div className="brand"><div className="brand-mark"><Icon name="thermo" /></div><div><h1>Thermal Studio</h1><p>3D Heat Transfer Simulator</p></div></div><div className="toolbar"><button className="button quiet" onClick={() => fileInputRef.current?.click()}><Icon name="upload" />Upload STL</button><button className="button primary" disabled={!modelUrl} onClick={() => setIsRunning(true)}><Icon name="play" />Start simulation</button><button className="button quiet" disabled={!isRunning} onClick={() => setIsRunning(false)}><Icon name="pause" />Pause</button><button className="icon-button" title="Reset frontend simulation state" onClick={() => setIsRunning(false)}><Icon name="reset" /></button><button className="icon-button" title="Clear model" onClick={clearModel}><Icon name="trash" /></button><button className="button quiet" disabled title="Available when result data exists"><Icon name="export" />Export</button><input ref={fileInputRef} type="file" accept=".stl" hidden onChange={(event) => uploadModel(event.target.files?.[0])} /></div></header>
    <main className="workspace"><aside className="sidebar"><div className="sidebar-head"><span>SIMULATION SETUP</span><b>Frontend demo</b></div><ControlSection title="Material"><label className="select-label">Material<select value={selectedMaterial} onChange={(event) => selectMaterial(event.target.value)}>{MATERIALS.map((material) => <option key={material.name}>{material.name}</option>)}</select></label><div className="properties"><Field label="Conductivity" value={materialProperties.conductivity} unit="W/m-K" onChange={(value) => updateMaterialProperty("conductivity", value)} /><Field label="Density" value={materialProperties.density} unit="kg/m3" onChange={(value) => updateMaterialProperty("density", value)} /><Field label="Specific heat" value={materialProperties.specificHeat} unit="J/kg-K" onChange={(value) => updateMaterialProperty("specificHeat", value)} /></div></ControlSection><ControlSection title="Heat transfer mode"><div className="mode-grid">{(["Conduction", "Convection", "Radiation"] as HeatTransferMode[]).map((mode) => <button key={mode} className={`mode ${transferMode === mode ? "active" : ""}`} onClick={() => setTransferMode(mode)}><span className="radio" />{mode}</button>)}</div></ControlSection><ControlSection title="Boundary conditions"><Field label="Initial temperature" value={initialTemperature} unit="deg C" onChange={setInitialTemperature} /><Field label="Boundary temperature" value={boundaryTemperature} unit="deg C" onChange={setBoundaryTemperature} /><label className="select-label compact">Applied to<select value={boundaryScope} onChange={(event) => setBoundaryScope(event.target.value as BoundaryScope)}><option>Selected face</option><option>Entire model</option></select></label></ControlSection><ControlSection title="Model" initiallyOpen={false}><button className="upload-zone" onClick={() => fileInputRef.current?.click()}><Icon name="cube" /><span>{modelUrl ? modelName : "Import an STL model"}</span><small>STL files only</small></button></ControlSection><p className="sidebar-note">This is a frontend demo. Setup values are stored locally; no thermal result is calculated until a solver is connected.</p></aside>
      <section className="content"><div className="viewport-card"><div className="viewport-head"><div><span className="eyebrow">3D WORKSPACE</span><h2>{modelName}</h2></div><div className="view-status"><span className={`status-dot ${modelUrl ? "ready" : ""}`} />{modelUrl ? "Model loaded" : "Preview geometry"}</div></div><div className="canvas-wrap"><ThreeViewport modelUrl={modelUrl} /><div className="view-hint">Drag to orbit <i /> Scroll to zoom <i /> Right-drag to pan</div><div className="legend"><b>Temperature</b><div className="legend-scale"><span>High</span><div /><span>Low</span></div><small>Visualization inactive</small></div>{!modelUrl && <div className="demo-badge">DEMO GEOMETRY - NOT SIMULATION DATA</div>}</div></div><section className="analysis"><div className="analysis-title"><div><span className="eyebrow">ANALYSIS</span><h2>Thermal results</h2></div><span className="pending-pill">{isRunning ? "Frontend demo active" : "Simulation not run"}</span></div><div className="analysis-grid"><div className="heatmap-card"><div className="card-label">2D CROSS-SECTION <span>Placeholder - solver data required</span></div><div className="heatmap"><div className="heatmap-lines" /><div className="cross-label">Cross-section will appear here</div><div className="heatmap-axis x">X</div><div className="heatmap-axis y">Y</div></div><p>Connect solver field data to render the temperature heatmap.</p></div><div className="summary-card"><div className="card-label">TEMPERATURE SUMMARY</div><div className="metrics"><TemperatureMetric label="Minimum" color="#47bff6" /><TemperatureMetric label="Maximum" color="#ff725c" /><TemperatureMetric label="Average" /></div><div className="flow"><div><span className="card-label">HEAT-FLOW DIRECTION</span><b>Awaiting solver data</b></div><span className="flow-arrow">-&gt;</span></div><div className="gradient"><span>Temperature gradient</span><div className="empty-bar" /></div></div></div></section></section></main>
  </div>;
}
