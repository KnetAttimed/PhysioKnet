import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, ReferenceLine, Label } from 'recharts';
import { Activity, Zap, Sliders, Info, ArrowUpRight } from 'lucide-react';

/**
 * ELITE PHYSIOLOGY VISUALIZER: Pressure-Volume Loop
 * Models: ESPVR (Linear), EDPVR (Exponential), Arterial Elastance (Ea)
 */
export function HemodynamicPlot() {
  // Inputs
  const [ved, setVed] = useState(140);        // End Diastolic Volume (Preload Proxy)
  const [ees, setEes] = useState(2.0);        // ESPVR Slope (Contractility)
  const [ea, setEa] = useState(1.5);          // Arterial Elastance (Afterload)

  const physics = useMemo(() => {
    // End-Systolic PV Relationship: P = Ees * (V - V0)
    const v0 = 10;
    
    // Intersection of ESPVR and Arterial Elastance (Ea = Pes / SV)
    // SV = Ved - Ves
    // Pes = Ea * (Ved - Ves)
    // Pes = Ees * (Ves - v0)
    // Ea * (Ved - Ves) = Ees * (Ves - v0)
    // Ea*Ved - Ea*Ves = Ees*Ves - Ees*v0
    // Ves * (Ees + Ea) = Ea*Ved + Ees*v0
    const ves = (ea * ved + ees * v0) / (ees + ea);
    const pes = ees * (ves - v0);
    const sv = ved - ves;
    const ef = (sv / ved) * 100;
    const sw = sv * pes; // Stroke Work Proxy (Area)
    const co = sv * 70 / 1000; // CO at 70 bpm

    // Curves Generation
    const espvrPoints = [
      { v: v0, p: 0 },
      { v: 200, p: ees * (200 - v0) }
    ];

    const edpvrPoints = Array.from({ length: 41 }, (_, i) => {
      const v = i * 5;
      // Exponential EDPVR: P = 0.5 * (exp(0.02 * V) - 1)
      const p = 1.2 * (Math.exp(0.018 * v) - 1);
      return { v, p };
    });

    const ped = 1.2 * (Math.exp(0.018 * ved) - 1);

    // Loop Construction
    const loopPoints = [
      { v: ved, p: ped, stage: 'ED' },               // 1. End Diastole
      { v: ved, p: pes * 0.8, stage: 'IC' },         // 2. Isovolumetric Contraction (Linear approx)
      { v: ved, p: pes, stage: 'Opening' },          // 3. Aortic Valve Opens
      { v: (ved + ves) / 2, p: pes * 1.05, stage: 'Ejection' }, // 4. Peak Systole
      { v: ves, p: pes, stage: 'ES' },               // 5. End Systole
      { v: ves, p: ped + 5, stage: 'IR' },           // 6. Isovolumetric Relaxation
      { v: ves, p: ped, stage: 'Opening' }           // 7. Mitral Valve Opens
    ];

    // Close the loop with filling (EDPVR subset)
    const fillingPoints = edpvrPoints.filter(pt => pt.v >= ves && pt.v <= ved);
    const fullLoop = [...loopPoints, ...fillingPoints];

    return { ved, ves, pes, ped, sv, ef, sw, co, espvrPoints, edpvrPoints, fullLoop, eaLine: [{v: ved, p:0}, {v: ves, p: pes}] };
  }, [ved, ees, ea]);

  return (
    <div className="glass-card rounded-[2rem] p-6 md:p-10 my-10 border border-white/10 relative overflow-hidden shadow-2xl">
      {/* Decorative Aura */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gemini-blue via-gemini-cyan to-gemini-purple" />
      
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-gemini-cyan font-bold uppercase tracking-[0.2em] text-[10px]">
            <Activity className="w-4 h-4" /> Advanced Hemodynamic Lab
          </div>
          <h3 className="text-3xl font-extrabold text-[var(--app-text)] font-sans tracking-tight">Left Ventricular PV Dynamics</h3>
        </div>

        <div className="flex flex-wrap gap-3">
          <MetricCard label="Stroke Volume" value={`${physics.sv.toFixed(0)}`} unit="mL" color="text-gemini-blue" />
          <MetricCard label="Ejection Fraction" value={`${physics.ef.toFixed(1)}`} unit="%" color="text-gemini-cyan" />
          <MetricCard label="Cardiac Output" value={`${physics.co.toFixed(1)}`} unit="L/min" color="text-gemini-purple" />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 bg-[var(--app-bg)]/80 rounded-3xl p-6 border border-[var(--card-border)] relative shadow-inner group">
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
              <XAxis 
                type="number" dataKey="v" name="Volume" unit="mL" domain={[0, 200]} stroke="currentColor" 
                className="text-[var(--secondary-text)]"
                tick={{fontSize: 11, fill: 'currentColor'}} axisLine={false} tickLine={false}
              />
              <YAxis 
                type="number" dataKey="p" name="Pressure" unit="mmHg" domain={[0, 180]} stroke="currentColor" 
                className="text-[var(--secondary-text)]"
                tick={{fontSize: 11, fill: 'currentColor'}} axisLine={false} tickLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--app-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--app-text)' }}
                itemStyle={{ color: '#00f5ff' }}
               />
              
              {/* Static Reference Curves */}
              <Scatter name="ESPVR" data={physics.espvrPoints} line={{ stroke: 'var(--secondary-text)', strokeOpacity: 0.2, strokeDasharray: '5 5' }} shape={() => null} />
              <Scatter name="EDPVR" data={physics.edpvrPoints} line={{ stroke: 'var(--secondary-text)', strokeOpacity: 0.2, strokeDasharray: '5 5' }} shape={() => null} />
              
              {/* Arterial Elastance Line (Ea) */}
              <Scatter name="Ea" data={physics.eaLine} line={{ stroke: '#8a2be244', strokeWidth: 1 }} shape={() => null} />

              {/* Main PV Loop */}
              <Scatter 
                name="PV Loop" 
                data={physics.fullLoop} 
                fill="#1e90ff" 
                line={{ stroke: 'url(#loopGradient)', strokeWidth: 4, strokeLinejoin: 'round' }}
                lineType="joint"
                shape={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (payload.stage === 'ED' || payload.stage === 'ES') {
                    return <circle cx={cx} cy={cy} r={4} fill="#00f5ff" />;
                  }
                  return null;
                }}
              />

              <defs>
                <linearGradient id="loopGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1e90ff" />
                  <stop offset="100%" stopColor="#00f5ff" />
                </linearGradient>
              </defs>

              {/* Labels */}
              <ReferenceLine x={physics.ves} stroke="var(--card-border)" />
              <ReferenceLine x={physics.ved} stroke="var(--card-border)" />
            </ScatterChart>
          </ResponsiveContainer>

          <div className="mt-4 flex justify-between px-4 text-[10px] text-[var(--secondary-text)] font-mono tracking-widest uppercase">
            <span>Volume (mL)</span>
            <span className="text-gemini-cyan">ESPVR (Inotropy)</span>
            <span>Pressure (mmHg)</span>
          </div>

          <div className="absolute bottom-10 left-10 p-4 rounded-xl bg-[var(--card-bg)] backdrop-blur border border-[var(--card-border)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
             <div className="text-[10px] text-[var(--secondary-text)] font-bold mb-1">LOOP ANALYSIS</div>
             <div className="text-xs text-[var(--app-text)] opacity-70">Total Stroke Work: <span className="text-[var(--app-text)] opacity-100 font-bold">High</span></div>
             <div className="text-xs text-[var(--app-text)] opacity-70">Compliance: <span className="text-[var(--app-text)] opacity-100 font-bold">Normal</span></div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <div className="glass-card p-6 rounded-2xl border border-[var(--card-border)] space-y-8">
              <h4 className="flex items-center gap-2 text-[var(--app-text)] font-bold text-sm">
                <Sliders className="w-4 h-4 text-gemini-blue" /> System Parameters
              </h4>

              <ControlSlider 
                label="Preload (Venous Return)" 
                sub="Increases End-Diastolic Volume"
                value={ved} 
                min={80} max={180} step={5} 
                onChange={setVed} 
                color="accent-gemini-blue" 
              />

              <ControlSlider 
                label="Inotropy (Contractility)" 
                sub="Shifts ESPVR Slope (Ees)"
                value={ees} 
                min={0.5} max={4.0} step={0.1} 
                onChange={setEes} 
                color="accent-gemini-cyan" 
              />

              <ControlSlider 
                label="Afterload (Arterial Tone)" 
                sub="Modifies Arterial Elastance (Ea)"
                value={ea} 
                min={0.5} max={3.0} step={0.1} 
                onChange={setEa} 
                color="accent-gemini-purple" 
              />

              <div className="pt-4 p-4 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)]">
                <div className="flex gap-2 text-gemini-blue mb-1">
                  <Info className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Clinical Insight</span>
                </div>
                <p className="text-[11px] text-[var(--secondary-text)] leading-relaxed italic">
                  Higher Afterload reduces Stroke Volume and Ejection Fraction.
                  Compare this to Heart Failure (Reduced Ees).
                </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, unit, color }: any) {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] px-6 py-4 rounded-3xl min-w-[140px] shadow-lg">
      <div className="text-[10px] text-[var(--secondary-text)] uppercase font-bold tracking-widest mb-1">{label}</div>
      <div className={`text-2xl font-black font-mono ${color}`}>
        {value}<span className="text-xs ml-1 font-normal opacity-50">{unit}</span>
      </div>
    </div>
  );
}

function ControlSlider({ label, sub, value, min, max, step, onChange, color }: any) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <div>
          <div className="text-xs text-[var(--app-text)] font-bold">{label}</div>
          <div className="text-[10px] text-[var(--secondary-text)]">{sub}</div>
        </div>
        <div className="text-sm font-mono font-bold text-gemini-cyan">{value.toFixed(1)}</div>
      </div>
      <input 
        type="range" min={min} max={max} step={step} 
        value={value} onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full ${color} bg-[var(--card-bg)] h-1.5 rounded-lg appearance-none cursor-pointer hover:bg-opacity-80 transition-all`}
      />
    </div>
  );
}
