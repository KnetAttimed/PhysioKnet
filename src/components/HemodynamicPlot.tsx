import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell, Curve } from 'recharts';
import { Activity, Zap, Info, ChevronRight, Sliders } from 'lucide-react';

export function HemodynamicPlot() {
  const [preload, setPreload] = useState(120); // EDV
  const [contractility, setContractility] = useState(1); // ESPVR Slope
  const [afterload, setAfterload] = useState(80); // MAP or Arterial Elastance proxy

  const loopData = useMemo(() => {
    // Basic PV Loop Simulation
    // 1. Filling (EDV)
    // 2. Isovolumetric Contraction
    // 3. Ejection
    // 4. Isovolumetric Relaxation
    
    const esv = Math.max(40, preload - (60 * contractility * (120 / afterload)));
    const activePressure = afterload + 20;

    return [
      { v: 50, p: 5, stage: 'Filling' },         // End Diastolic Point (Start)
      { v: preload, p: 10, stage: 'EDV' },       // End Diastolic Volume
      { v: preload, p: afterload, stage: 'IC' }, // Isovolumetric Contraction
      { v: (preload + esv) / 2, p: activePressure, stage: 'Ejection' },
      { v: esv, p: afterload, stage: 'ESV' },    // End Systolic Volume
      { v: esv, p: 5, stage: 'IR' },             // Isovolumetric Relaxation
      { v: 50, p: 5, stage: 'Filling' },         // Back to start
    ];
  }, [preload, contractility, afterload]);

  const sv = preload - loopData[4].v;
  const ef = (sv / preload) * 100;

  return (
    <div className="glass-card rounded-3xl p-6 md:p-8 my-8 border border-white/10 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <Activity className="w-48 h-48 text-gemini-cyan" />
      </div>

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-gemini-cyan font-bold uppercase tracking-widest text-[10px] mb-1">
            <Zap className="w-3 h-3" /> Neural Simulation Node
          </div>
          <h3 className="text-2xl font-bold text-white font-sans">Dynamic Pressure-Volume Loop</h3>
        </div>
        <div className="flex gap-4">
           <div className="text-center bg-white/5 border border-white/5 px-4 py-2 rounded-2xl">
              <div className="text-[10px] text-gray-500 uppercase font-bold">Stroke Volume</div>
              <div className="text-xl font-bold text-gemini-blue font-mono">{sv.toFixed(0)} mL</div>
           </div>
           <div className="text-center bg-white/5 border border-white/5 px-4 py-2 rounded-2xl">
              <div className="text-[10px] text-gray-500 uppercase font-bold">Ejection Fraction</div>
              <div className="text-xl font-bold text-gemini-cyan font-mono">{ef.toFixed(1)}%</div>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        <div className="lg:col-span-2 h-[350px] bg-black/40 rounded-2xl p-4 border border-white/5 relative">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <XAxis 
                type="number" 
                dataKey="v" 
                name="Volume" 
                unit="mL" 
                domain={[0, 200]} 
                stroke="#444" 
                tick={{fontSize: 10}}
                label={{ value: 'Left Ventricular Volume (mL)', position: 'bottom', fill: '#666', fontSize: 10 }}
              />
              <YAxis 
                type="number" 
                dataKey="p" 
                name="Pressure" 
                unit="mmHg" 
                domain={[0, 160]} 
                stroke="#444" 
                tick={{fontSize: 10}}
                label={{ value: 'Pressure (mmHg)', angle: -90, position: 'left', fill: '#666', fontSize: 10 }}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '12px' }} />
              <Scatter 
                name="PV Loop" 
                data={loopData} 
                fill="#1e90ff" 
                line={{ stroke: '#1e90ff', strokeWidth: 3 }}
                lineType="joint"
              />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-3 py-1 rounded-full border border-white/10 text-[9px] text-gray-400 uppercase tracking-widest pointer-events-none">
            Ventricular Dynamics Visualizer
          </div>
        </div>

        <div className="space-y-8 p-4 bg-white/5 rounded-2xl border border-white/5">
           <div className="flex items-center gap-2 text-white font-bold text-sm mb-4">
              <Sliders className="w-4 h-4 text-gemini-blue" /> Hemodynamic Inputs
           </div>
           
           <div className="space-y-2">
             <div className="flex justify-between text-xs text-gray-400">
               <span>Preload (EDV)</span>
               <span className="text-gemini-blue">{preload} mL</span>
             </div>
             <input 
               type="range" min="80" max="180" step="5" 
               value={preload} onChange={(e) => setPreload(Number(e.target.value))}
               className="w-full accent-gemini-blue bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
             />
           </div>

           <div className="space-y-2">
             <div className="flex justify-between text-xs text-gray-400">
               <span>Contractility (Inotropy)</span>
               <span className="text-gemini-cyan">x{contractility.toFixed(1)}</span>
             </div>
             <input 
               type="range" min="0.5" max="2.5" step="0.1" 
               value={contractility} onChange={(e) => setContractility(Number(e.target.value))}
               className="w-full accent-gemini-cyan bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
             />
           </div>

           <div className="space-y-2">
             <div className="flex justify-between text-xs text-gray-400">
               <span>Afterload (Mean Pressure)</span>
               <span className="text-gemini-purple">{afterload} mmHg</span>
             </div>
             <input 
               type="range" min="50" max="130" step="5" 
               value={afterload} onChange={(e) => setAfterload(Number(e.target.value))}
               className="w-full accent-gemini-purple bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
             />
           </div>

           <div className="pt-4 border-t border-white/5">
              <div className="text-[10px] text-gray-500 italic leading-relaxed">
                 *Interactive plot demonstrating Frank-Starling mechanics and ESPVR shifts.
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
