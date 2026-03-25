import fs from 'fs';

const filePath = 'src/app/afastamentos/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find the card content area and replace the corrupted section
// We'll identify by the start/end markers
const cardStart = content.indexOf("                                                                const status = getStatus(record);");
const cardEnd = content.indexOf("                                                            );\n                                                                    })}\n");

if (cardStart === -1 || cardEnd === -1) {
    console.error('Could not find card boundaries: start=' + cardStart + ' end=' + cardEnd);
    // Let's look at what's around the area
    const idx = content.indexOf("group.items.map((record)");
    console.log('group.items.map at index:', idx);
    console.log('Context around it:', content.slice(idx - 50, idx + 200));
    process.exit(1);
}

console.log('Found card section, replacing...');

const newCardContent = `                                                                const status = getStatus(record);
                                                                return (
                                                                    <div key={record.id} className="bg-white p-6 border border-slate-200 shadow-sm rounded-lg hover:border-[#1A3351]/30 transition-colors relative overflow-hidden group/card">
                                                                        <div className="absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 bg-[#1A3351]/5 rounded-full group-hover/card:bg-[#1A3351]/10 transition-colors" />

                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                                                            <div className="space-y-1">
                                                                                <p className="text-[9px] font-black text-slate-400 uppercase">Vigência e Tipo</p>
                                                                                <div className="flex flex-col gap-1.5">
                                                                                    <p className="text-sm font-black text-[#1A3351] uppercase mb-1 truncate">{record.tipo_afastamento}</p>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-xs font-black text-slate-400 uppercase min-w-[50px]">Início:</span>
                                                                                        <span className="text-sm font-bold text-[#1A3351]">{formatDate(record.data_inicio)}</span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                                                                        <span className="text-xs font-black text-slate-400 uppercase min-w-[50px]">Término:</span>
                                                                                        <span className="text-sm font-bold">
                                                                                            {record.data_fim ? (
                                                                                                <span className="flex items-center gap-2 translate-y-[1px]">
                                                                                                    <span className={status === 'expired' ? 'text-[#E31E24]' : 'text-green-600'}>
                                                                                                        {formatDate(record.data_fim)}
                                                                                                    </span>
                                                                                                    <span className={\`text-[10px] px-2 py-0.5 rounded shadow-sm border font-black \${
                                                                                                        status === 'active' || status === 'alert' ? 'bg-green-500 text-white border-green-600 animate-pulse' :
                                                                                                        status === 'finished' ? 'bg-slate-300 text-slate-600 border-slate-400' :
                                                                                                        'bg-[#E31E24] text-white border-[#E31E24]'
                                                                                                    }\`}>
                                                                                                        {status === 'active' ? 'VIGENTE' : status === 'alert' ? 'VENCENDO' : status === 'finished' ? 'FINALIZADO' : 'VENCIDO'}
                                                                                                    </span>
                                                                                                </span>
                                                                                            ) : '---'}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="space-y-1">
                                                                                <p className="text-[9px] font-black text-slate-400 uppercase">Dados Adicionais</p>
                                                                                <div className="flex flex-col gap-3">
                                                                                    <div>
                                                                                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Duração do Afastamento</span>
                                                                                        <span className="text-sm font-black text-[#1A3351] flex items-center gap-1"><Clock className="w-3.5 h-3.5 opacity-50"/> {record.dias_afastado || 'N/D'} Dias</span>
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className="flex items-center gap-2 mb-1">
                                                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Diagnóstico (CID-10)</span>
                                                                                            <button onClick={() => {
                                                                                                const newSet = new Set(revealedCids);
                                                                                                if (newSet.has(record.id)) newSet.delete(record.id); else newSet.add(record.id);
                                                                                                setRevealedCids(newSet);
                                                                                            }} className="text-[9px] px-2 py-0.5 border border-slate-300 rounded text-slate-500 hover:bg-slate-100 flex items-center gap-1 transition-colors">
                                                                                                {revealedCids.has(record.id) ? <><EyeOff className="w-3 h-3"/> Ocultar</> : <><Eye className="w-3 h-3"/> Revelar</>}
                                                                                            </button>
                                                                                        </div>
                                                                                        {revealedCids.has(record.id) ? (
                                                                                            <div className="flex flex-wrap gap-1 mt-2">
                                                                                                {record.afastamento_cids?.map(c => <CIDBadge key={c.id} code={c.cid_codigo} />)}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <span className="text-xs text-slate-400 font-bold italic tracking-wide">• • •</span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* BOTÕES - Todos na parte inferior, distribuídos horizontalmente */}
                                                                        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100 relative z-10">
                                                                            <button onClick={() => handleViewPortaria(record)} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 hover:text-slate-900 font-black rounded hover:bg-slate-200 transition-all border border-slate-200 shadow-sm text-[10px] uppercase flex-1 min-w-[100px]">
                                                                                <Printer className="w-3.5 h-3.5" /> Portaria
                                                                            </button>
                                                                            <button onClick={() => openEditModal(record)} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1A3351] text-white font-black rounded hover:bg-[#204060] active:scale-95 transition-all text-[10px] uppercase border shadow-sm flex-1 min-w-[100px]">
                                                                                <Pencil className="w-3.5 h-3.5" /> Editar
                                                                            </button>
                                                                            {record.situacao === 'EM_ANDAMENTO' && (
                                                                                <>
                                                                                    <button onClick={() => router.push(\`/afastamentos/new?renew_from=\${record.id}&cpf=\${record.servidor_cpf}\`)} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-[10px] font-black rounded hover:bg-amber-600 transition-all shadow-sm uppercase flex-1 min-w-[100px]">
                                                                                        <RotateCcw className="w-3.5 h-3.5" /> Prorrogar
                                                                                    </button>
                                                                                    {!record.tipo_afastamento?.toUpperCase().includes('MATERNIDADE') && (
                                                                                        <button onClick={() => handleAltaMedica(record)} disabled={updatingId === record.id} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-[10px] font-black rounded hover:bg-emerald-700 transition-all shadow-sm uppercase disabled:opacity-50 flex-1 min-w-[100px]">
                                                                                            {updatingId === record.id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                                                            Dar Alta
                                                                                        </button>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}\n`;

// Find old card section boundaries more precisely
const oldStart = content.indexOf("                                                                const status = getStatus(record);");
const oldEnd = content.indexOf("                                                                    })}\n", oldStart);

if (oldStart === -1) {
    console.error('Cannot find start marker');
    process.exit(1);
}
if (oldEnd === -1) {
    console.error('Cannot find end marker');
    process.exit(1);
}

const endMarker = "                                                                    })}\n";
const newContent = content.slice(0, oldStart) + newCardContent + content.slice(oldEnd + endMarker.length);
fs.writeFileSync(filePath, newContent);
console.log('Done! File written successfully.');
