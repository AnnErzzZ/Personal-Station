import Image from '@/components/SiteImage';
function Display({name,width,height}:{name:string;width:number;height:number}){
return <div style={{position:'relative',width,height}}><Image unoptimized src={'/cases/implementation-assistant/displays/'+name+'.png'} alt="" width={width+128} height={height+128} style={{position:'absolute',left:-64,top:-64,width:width+128,height:height+128,maxWidth:'none'}}/></div>;
}
export function SpaceMockup(){return <Display name="Space" width={450} height={900}/>;}
export function GatewayMockup(){return <Display name="Gateway" width={480} height={960}/>;}
export function ConnectMockup(){return <Display name="Connect" width={380} height={760}/>;}
export function DiscoverMockup(){return <Display name="Discover" width={364} height={728}/>;}
export function SelectMockup(){return <Display name="Select" width={400} height={800}/>;}
export function TrackMockup(){return <Display name="Track" width={364} height={728}/>;}
export function HistoryMockup(){return <Display name="History" width={350} height={700}/>;}
export function QueueMockup(){return <Display name="Queue" width={450} height={900}/>;}
export function NoticeMockup(){return <Display name="Notice" width={440} height={880}/>;}
export function LocateMockup(){return <Display name="Locate" width={440} height={880}/>;}
export function HandleMockup(){return <Display name="Handle" width={380} height={760}/>;}
export function ConfigureMockup(){return <Display name="Configure" width={350} height={700}/>;}
export function BindingMockup(){return <Display name="Binding" width={440} height={880}/>;}
export function SaveMockup(){return <Display name="Save" width={440} height={880}/>;}
export function StrategyMockup(){return <Display name="Strategy" width={380} height={760}/>;}
export function StrategyEntryMockup(){return <Display name="StrategyEntry" width={440} height={880}/>;}
export function LibraryMockup(){return <Display name="Library" width={420} height={840}/>;}
export function LaptopMockup(){return <Display name="Laptop" width={1680} height={840}/>;}
