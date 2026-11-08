export const WATER_REVIEW_VERSION = 'hazem-water-review/v1'
type Definition = { key: string; label: string; group: string; units: readonly string[]; min?: number; max?: number }
export const WATER_FIELDS: readonly Definition[] = [
 {key:'salinityPpt',label:'Salinity',group:'Physical readings',units:['ppt'],max:300},
 {key:'pH',label:'pH',group:'Physical readings',units:['pH'],max:14},
 {key:'temperatureC',label:'Temperature',group:'Physical readings',units:['°C'],min:-5,max:60},
 {key:'conductivityUsCm',label:'Conductivity at 25 °C',group:'Physical readings',units:['µS/cm','mS/cm']},
 ...[['sodiumMgL','Sodium'],['potassiumMgL','Potassium'],['calciumMgL','Calcium'],['magnesiumMgL','Magnesium'],['chlorideMgL','Chloride'],['tdsMgL','Total dissolved solids']].map(([key,label])=>({key,label,group:'Major ions',units:['mg/L','µg/L']})),
 ...[['alkalinityMgL','Alkalinity'],['hardnessMgL','Total hardness']].map(([key,label])=>({key,label,group:'Buffering and hardness',units:['mg/L as CaCO3','meq/L']})),
 {key:'doMgL',label:'Dissolved oxygen',group:'Pond and source chemistry',units:['mg/L'],max:50},
 {key:'tanMgL',label:'Total ammonia (TAN)',group:'Pond and source chemistry',units:['mg/L as N','mg/L as NH3']},
 {key:'nitriteMgL',label:'Nitrite',group:'Pond and source chemistry',units:['mg/L as N','mg/L as NO2']},
 ...[['ironMgL','Iron'],['manganeseMgL','Manganese'],['hydrogenSulfideMgL','Hydrogen sulfide'],['arsenicMgL','Arsenic']].map(([key,label])=>({key,label,group:'Additional laboratory results',units:['mg/L','µg/L']})),
]
export interface WaterReading { key: string; value: string; unit: string; qualifier: 'exact'|'less_than' }
export interface WaterReviewInput {
 name: string; email: string; organisation: string; country: string; site: string;
 purpose: string; species: string; lifeStage: string; system: string; sourceType: string; sampleContext: string;
 sampleDate: string; laboratory: string; reportReference: string; volumeM3: string; question: string;
 readings: WaterReading[]; consent: boolean; requestId: string; submittedAt: string; honeypot?: string;
}
export interface NormalizedReading { key: string; label: string; value: number; unit: string; qualifier: 'exact'|'less_than'; canonicalValue?: number; canonicalUnit?: string; needsReview: boolean }
export interface WaterReviewPacket { schema: string; submittedAt: string; input: WaterReviewInput; readings: NormalizedReading[]; missing: string[]; reviewNotes: string[] }
export const WATER_PURPOSES = ['New water source or project','Operating farm concern','Expansion or species change','Monitoring and trend review']
export const emptyWaterReview = (): WaterReviewInput => ({name:'',email:'',organisation:'',country:'',site:'',purpose:WATER_PURPOSES[0],species:'',lifeStage:'',system:'',sourceType:'',sampleContext:'',sampleDate:'',laboratory:'',reportReference:'',volumeM3:'',question:'',readings:WATER_FIELDS.map(f=>({key:f.key,value:'',unit:f.units[0],qualifier:'exact'})),consent:false,requestId:'',submittedAt:'',honeypot:''})
const isRecord=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
export function normalizeReading(r: WaterReading): NormalizedReading {
 const f=WATER_FIELDS.find(x=>x.key===r.key)
 if(!f || typeof r.value!=='string' || !/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$|^-\d+(?:\.\d*)?$/i.test(r.value.trim())) throw new Error('Enter a number without a unit or a comparison sign.')
 const value=Number(r.value)
 if(!Number.isFinite(value)||value<(f.min??0)||value>(f.max??1_000_000))throw new Error(`${f.label}: check the value and unit.`)
 if(!['exact','less_than'].includes(r.qualifier)||(!f.units.includes(r.unit)&&r.unit!=='Unconfirmed'))throw new Error('Check the reported unit and qualifier.')
 const out:NormalizedReading={key:r.key,label:f.label,value,unit:r.unit,qualifier:r.qualifier,needsReview:r.unit==='Unconfirmed'||r.qualifier==='less_than'}
 if(r.unit==='Unconfirmed')return out
 let factor=1,unit=r.unit
 if(unit==='µg/L'){factor=.001;unit='mg/L'}
 if(unit==='mS/cm'){factor=1000;unit='µS/cm'}
 if(unit==='meq/L'){factor=50.044;unit='mg/L as CaCO3'}
 if(unit==='mg/L as NO2'){factor=14.0067/46.0055;unit='mg/L as N'}
 if(unit==='mg/L as NH3'){factor=14.0067/17.0305;unit='mg/L as N'}
 out.canonicalValue=value*factor;out.canonicalUnit=unit
 return out
}
export function validateWaterReview(value:unknown):{input?:WaterReviewInput;errors:Record<string,string>} {
 const errors:Record<string,string>={}
 if(!isRecord(value))return {errors:{form:'Invalid intake.'}}
 const limits:Record<string,number>={name:150,email:254,organisation:150,country:100,site:150,purpose:80,species:150,lifeStage:100,system:100,sourceType:100,sampleContext:100,sampleDate:10,laboratory:150,reportReference:150,volumeM3:30,question:1000,requestId:36,submittedAt:30}
 const clean:Record<string,unknown>={}
 for(const [key,max] of Object.entries(limits)){
  if(typeof value[key]!=='string'||value[key].length>max)errors[key]='Check this field.'
  else clean[key]=value[key].trim()
 }
 for(const key of ['name','email','country','site','species','sourceType','sampleContext','question'])if(!clean[key])errors[key]='This field is required.'
 if(typeof clean.email==='string'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email))errors.email='Enter a valid email address.'
 if(!WATER_PURPOSES.includes(clean.purpose as string))errors.purpose='Choose the review purpose.'
 if(!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(String(clean.requestId)))errors.requestId='Refresh the form and try again.'
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(String(clean.submittedAt))||!Number.isFinite(Date.parse(String(clean.submittedAt))))errors.submittedAt='Refresh the form and try again.'
 if(clean.volumeM3&&(!/^\d+(\.\d+)?$/.test(String(clean.volumeM3))||Number(clean.volumeM3)<=0||Number(clean.volumeM3)>1e10))errors.volumeM3='Enter a positive volume in m³, or leave blank.'
 if(clean.sampleDate){const date=String(clean.sampleDate);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>new Date(Date.now()+14*3600000).toISOString().slice(0,10))errors.sampleDate='Enter a valid sample date, no later than today.'}
 const rows:WaterReading[]=[];const seen=new Set<string>()
 if(!Array.isArray(value.readings)||value.readings.length>WATER_FIELDS.length)errors.readings='Check the measurement rows.'
 else for(const row of value.readings){
  if(!isRecord(row)||typeof row.key!=='string'||!WATER_FIELDS.some(f=>f.key===row.key)||seen.has(row.key)||typeof row.value!=='string'||row.value.length>30){errors.readings='Invalid or duplicate measurement.';continue}
  seen.add(row.key)
  const r={key:row.key,value:row.value.trim(),unit:row.unit,qualifier:row.qualifier} as WaterReading
  const definition=WATER_FIELDS.find(f=>f.key===r.key)!
  if(typeof r.unit!=='string'||(!definition.units.includes(r.unit)&&r.unit!=='Unconfirmed')||!['exact','less_than'].includes(r.qualifier)){errors[r.key]='Check the reported unit and qualifier.';continue}
  if(r.value)try{normalizeReading(r)}catch(e){errors[r.key]=(e as Error).message}
  rows.push(r)
 }
 clean.email=String(clean.email??'').toLowerCase();clean.readings=rows;clean.consent=value.consent===true;clean.honeypot=typeof value.honeypot==='string'?value.honeypot.slice(0,200):''
 if(!clean.consent)errors.consent='Consent is required to process this review request.'
 return Object.keys(errors).length?{errors}:{input:clean as unknown as WaterReviewInput,errors}
}
export function makeWaterPacket(input:WaterReviewInput):WaterReviewPacket {
 const readings=input.readings.filter(r=>r.value!=='').map(normalizeReading)
 return {schema:WATER_REVIEW_VERSION,submittedAt:input.submittedAt,input:{...input,honeypot:undefined},readings,missing:WATER_FIELDS.filter(f=>!readings.some(r=>r.key===f.key)).map(f=>f.label),reviewNotes:['Client supplied data; verify against the original laboratory report before interpreting.','Missing results are not zero. Less-than results are upper bounds, not exact measurements.','Conductivity is not converted into salinity. Nitrogen reporting basis must be confirmed before transfer into a biological model.','No diagnosis or treatment is issued by this intake.']}
}
export function packetMessage(packet:WaterReviewPacket):string {
 return 'WATER REVIEW REQUEST\nPrivate expert workflow: check the source report and units, agree scope and fee, then import the packet into the protected Water Advisor.\n\nBEGIN WATER REVIEW PACKET\n'+JSON.stringify({schema:packet.schema,submittedAt:packet.submittedAt,input:packet.input})+'\nEND WATER REVIEW PACKET'
}
export function readWaterPacket(text:string):WaterReviewPacket {
 if(text.length>24000)throw new Error('Review packet is too large.')
 let source=text.trim()
 if(source.includes('BEGIN WATER REVIEW PACKET'))source=source.split('BEGIN WATER REVIEW PACKET')[1].split('END WATER REVIEW PACKET')[0].trim()
 const data=JSON.parse(source) as unknown
 if(!isRecord(data)||data.schema!==WATER_REVIEW_VERSION)throw new Error('This is not a supported water-review packet.')
 const validated=validateWaterReview(data.input)
 if(!validated.input)throw new Error('Packet fields failed validation. Check the original intake before importing.')
 return makeWaterPacket(validated.input)
}
export function prepareWaterDraft(packet:WaterReviewPacket){
 const parameters:Record<string,number>={},withheld:string[]=[]
 for(const r of packet.readings){
  // The existing engine does not consistently state a nitrogen reporting basis.
  // Preserve those results for an expert to interpret, without silently mapping them.
  if(r.needsReview||r.canonicalValue===undefined||['tanMgL','nitriteMgL','conductivityUsCm'].includes(r.key)){withheld.push(r.label);continue}
  parameters[r.key]=r.canonicalValue
 }
 return {parameters,withheld}
}
