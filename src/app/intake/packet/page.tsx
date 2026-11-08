"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSite } from "@/lib/db";
import { readWaterPacket, prepareWaterDraft } from "@/lib/waterReview";
import type { WaterReviewPacket } from "@/lib/waterReview";
import type { SourceType } from "@/lib/types";

export default function ReviewPacketPage(){
 const router=useRouter();
 const [text,setText]=useState(''),[packet,setPacket]=useState<WaterReviewPacket|null>(null),[error,setError]=useState(''),[checked,setChecked]=useState(false),[busy,setBusy]=useState(false),[sourceType,setSourceType]=useState<SourceType>('underground');
 function parse(){try{setPacket(readWaterPacket(text));setChecked(false);setError('')}catch(e){setError((e as Error).message);setPacket(null)}}
 async function file(file:File|undefined){if(!file)return;if(file.size>24000){setError('Packet is too large.');return}setText(await file.text());setPacket(null);setChecked(false)}
 async function draft(){if(!packet||!checked||busy)return;setBusy(true);setError('');try{
  const prepared=prepareWaterDraft(packet),input=packet.input;
  if(prepared.parameters.pH===undefined||prepared.parameters.salinityPpt===undefined)throw new Error('Exact pH and salinity with confirmed units are required to prefill an analysis. Clarify these with the client first.');
  const notes=`Website review request ${input.requestId}\nClient: ${input.name} (${input.email})\nSite: ${input.site}, ${input.country}\nPurpose: ${input.purpose}\nQuestion: ${input.question}\nSpecies and stage: ${input.species}; ${input.lifeStage||'not supplied'}\nSystem: ${input.system||'not supplied'}\nSample: ${input.sampleContext}; ${input.sampleDate||'date not supplied'}\nSource: ${input.sourceType}\nLab: ${input.laboratory||'not supplied'}; report ${input.reportReference||'not supplied'}\nWithheld from automatic mapping: ${prepared.withheld.join(', ')||'none'}\nOriginal intake retained below for source verification.\n${JSON.stringify({schema:packet.schema,submittedAt:packet.submittedAt,input})}`;
  const site=await createSite({name:input.site,location:input.country,sourceType,notes});
  sessionStorage.setItem(`water-review-prefill:${site.id}`,JSON.stringify({parameters:prepared.parameters,volumeM3:input.volumeM3?Number(input.volumeM3):undefined,notes}));
  router.push(`/analysis/new?siteId=${site.id}&packet=1`);
 }catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const prepared=packet?prepareWaterDraft(packet):null;
 return <main className="max-w-4xl mx-auto p-6 space-y-6"><Link href="/intake" className="underline">← Private intake</Link><div><p className="text-sm text-slate-500 mb-2">Expert workflow</p><h1 className="text-3xl font-semibold">Import a website water-review packet</h1><p className="mt-3 text-slate-600">Paste the packet block from the private enquiry notification, or open the client-supplied JSON download. Review the original report before creating an analysis draft. Importing does not run a diagnosis.</p></div>
 <label className="block font-medium">Open review packet<input type="file" accept=".json,.txt,application/json,text/plain" className="block mt-2" onChange={e=>void file(e.target.files?.[0])}/></label>
 <label className="block font-medium">Or paste the packet<textarea rows={8} value={text} onChange={e=>{setText(e.target.value);setPacket(null);setChecked(false)}} className="block border rounded p-3 w-full mt-2 font-mono text-sm" maxLength={24000}/></label>
 <button type="button" onClick={parse} className="bg-slate-900 text-white px-5 py-3 rounded">Validate and preview</button>
 {error&&<p role="alert" className="bg-red-50 border border-red-300 p-4 text-red-800">{error}</p>}
 {packet&&prepared&&<section className="space-y-5 border rounded p-5"><h2 className="text-2xl font-semibold">Review before transfer</h2><p><strong>{packet.input.site}</strong> · {packet.input.country}<br/>{packet.input.name} · {packet.input.email}</p><p>{packet.input.question}</p><p className="text-sm">Sample: {packet.input.sampleContext}; {packet.input.sampleDate||'date missing'}. Laboratory: {packet.input.laboratory||'not provided'}.</p>
 <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{['Parameter','Original value','Standardised value','Draft mapping'].map(x=><th key={x} className="p-2 border-b">{x}</th>)}</tr></thead><tbody>{packet.readings.map(r=><tr key={r.key}><td className="p-2 border-b">{r.label}</td><td className="p-2 border-b">{r.qualifier==='less_than'?'< ':''}{packet.input.readings.find(x=>x.key===r.key)?.value} {r.unit}</td><td className="p-2 border-b">{r.canonicalValue!==undefined?`${r.qualifier==='less_than'?'< ':''}${Number(r.canonicalValue.toPrecision(7))} ${r.canonicalUnit}`:'Unit review required'}</td><td className="p-2 border-b">{r.key in prepared.parameters?'Prefill':'Withheld for review'}</td></tr>)}</tbody></table></div>
 <p className="text-sm text-amber-800">Nitrogen results require checking against the engine's reporting basis. Censored values, unconfirmed units and conductivity are retained in the notes and not mapped automatically. Missing readings are not replaced by zero.</p>
 <p className="text-sm"><strong>Missing measurements:</strong> {packet.missing.join(', ')||'none reported missing'}</p>
 <label className="block font-medium">Reviewed source classification<select value={sourceType} onChange={e=>setSourceType(e.target.value as SourceType)} className="block border p-2 rounded mt-2"><option value="underground">Underground</option><option value="borewell">Borewell</option><option value="brackish">Brackish</option><option value="surface">Surface</option></select></label>
 <label className="flex items-start gap-3"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)} className="mt-1"/><span>I have checked the original laboratory report, sample context, qualifiers and units. I will select species, confirm withheld results and complete the required fields before running an analysis.</span></label>
 <button type="button" disabled={!checked||busy} onClick={()=>void draft()} className="bg-slate-900 text-white px-5 py-3 rounded disabled:opacity-40">{busy?'Preparing…':'Create analysis draft'}</button><p className="text-xs text-slate-500">The reviewed draft and original intake remain in this browser's private Water Advisor records. No client-accessible report URL is created.</p>
 </section>}
 </main>
}
