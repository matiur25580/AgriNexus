import { Activity, ArrowDownRight, ArrowUpRight, CloudSun, Droplets, Leaf, MapPin, PackageCheck, Sprout, Tractor, Wheat } from "lucide-react";

const metrics = [
  { label: "Managed acreage", value: "12,840", change: "+8.2%", positive: true, icon: Sprout },
  { label: "Active crop cycles", value: "248", change: "+12 this month", positive: true, icon: Leaf },
  { label: "Harvest forecast", value: "8,420 t", change: "+5.4%", positive: true, icon: Wheat },
  { label: "Open field alerts", value: "07", change: "3 need review", positive: false, icon: Activity },
];
const farms = [
  { name: "Green Valley Estate", location: "Nashik, Maharashtra", crop: "Grapes · 184 acres", health: "Healthy", progress: 78, color: "green" },
  { name: "Riverbend Cooperative", location: "Nadia, West Bengal", crop: "Rice · 320 acres", health: "Monitor", progress: 54, color: "amber" },
  { name: "Sunrise Agro Park", location: "Pune, Maharashtra", crop: "Tomato · 96 acres", health: "Healthy", progress: 86, color: "green" },
];

function App() {
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="AgriNexus home"><span className="brand-mark"><Sprout size={22}/></span><span>agri<span className="brand-light">nexus</span><small>FIELD INTELLIGENCE</small></span></a>
      <div className="workspace"><span className="workspace-dot"/> Demo organization <span className="chevron">⌄</span></div>
      <p className="nav-label">WORKSPACE</p>
      <nav className="nav-list">
        <a className="nav-item active" href="#"><Activity size={17}/> Overview</a>
        <a className="nav-item" href="#"><MapPin size={17}/> Farms & plots</a>
        <a className="nav-item" href="#"><Sprout size={17}/> Crop cycles</a>
        <a className="nav-item" href="#"><ClipboardIcon/> Field operations</a>
        <a className="nav-item" href="#"><Wheat size={17}/> Harvest & yield</a>
        <a className="nav-item" href="#"><PackageCheck size={17}/> Traceability</a>
      </nav>
      <p className="nav-label">INSIGHTS</p>
      <nav className="nav-list"><a className="nav-item" href="#"><CloudSun size={17}/> Environment</a><a className="nav-item" href="#"><Droplets size={17}/> Resources</a></nav>
      <div className="sidebar-bottom"><div className="avatar">OA</div><div><strong>Operations Admin</strong><small>Platform administrator</small></div><span className="chevron">···</span></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> Overview</div><div className="top-actions"><span className="live-indicator"><i/> DEMO ENVIRONMENT</span><button className="icon-button" aria-label="Notifications">♧</button><div className="avatar small">OA</div></div></header>
      <div className="content">
        <section className="welcome-row"><div><p className="eyebrow">AGRICULTURAL OPERATIONS <span>·</span> DEMO WORKSPACE</p><h1>Good morning, team <span>✳</span></h1><p className="subheading">Here's an illustrative view of your connected agricultural network.</p></div><button className="primary-button"><span>＋</span> Create field report</button></section>
        <section className="metric-grid">{metrics.map(({label,value,change,positive,icon:Icon})=><article className="metric-card" key={label}><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={18}/></span></div><div className="metric-value">{value}</div><div className={positive?"metric-change positive":"metric-change warning"}>{positive?<ArrowUpRight size={14}/>:<ArrowDownRight size={14}/>} {change}</div></article>)}</section>
        <section className="dashboard-grid">
          <article className="panel performance-panel"><div className="panel-heading"><div><h2>Network performance</h2><p>Illustrative production outlook across active farm operations</p></div><button className="period-button">Last 6 months⌄</button></div><div className="chart-area"><div className="chart-y"><span>10k</span><span>7.5k</span><span>5k</span><span>2.5k</span><span>0</span></div><div className="chart"><div className="chart-grid"><i/><i/><i/><i/><i/></div><svg viewBox="0 0 640 210" preserveAspectRatio="none" role="img" aria-label="Illustrative production trend chart"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7dbb8c" stopOpacity=".28"/><stop offset="100%" stopColor="#7dbb8c" stopOpacity="0"/></linearGradient></defs><path d="M0 168 C48 155 56 144 105 151 S160 132 210 140 S270 98 320 116 S370 90 425 104 S480 65 530 78 S590 45 640 34 L640 210 L0 210Z" fill="url(#area)"/><path d="M0 168 C48 155 56 144 105 151 S160 132 210 140 S270 98 320 116 S370 90 425 104 S480 65 530 78 S590 45 640 34" fill="none" stroke="#4f9b68" strokeWidth="3" strokeLinecap="round"/></svg><div className="chart-x"><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span></div></div></div><div className="chart-legend"><span><i/> Illustrative trend</span><small>Demo data · not a validated yield model</small></div></article>
          <article className="panel weather-panel"><div className="panel-heading"><div><h2>Field conditions</h2><p>Regional environmental snapshot</p></div><CloudSun size={19} className="muted-icon"/></div><div className="weather-main"><div><strong>28°</strong><span>Partly cloudy · sample data</span></div><CloudSun size={48} strokeWidth={1.3}/></div><div className="weather-location"><MapPin size={14}/> Nashik region · illustrative</div><div className="weather-stats"><div><Droplets size={16}/><span>Humidity<strong>64%</strong></span></div><div><CloudSun size={16}/><span>Rain chance<strong>20%</strong></span></div></div><p className="weather-note">Connect a weather provider to replace this illustrative snapshot with live observations.</p></article>
        </section>
        <section className="panel farms-panel"><div className="panel-heading"><div><h2>Farm network</h2><p>Operational overview of sample properties</p></div><button className="text-button">View all farms <span>→</span></button></div><div className="farm-table"><div className="farm-row table-head"><span>FARM / LOCATION</span><span>ACTIVE CROP</span><span>FIELD STATUS</span><span>SEASON PROGRESS</span></div>{farms.map(farm=><div className="farm-row" key={farm.name}><div className="farm-name"><span className="farm-symbol"><Tractor size={17}/></span><span><strong>{farm.name}</strong><small>{farm.location}</small></span></div><span className="crop-cell">{farm.crop}</span><span><i className={`status-dot ${farm.color}`}/>{farm.health}</span><div className="progress-cell"><div className="progress-track"><i style={{width:`${farm.progress}%`}}/></div><small>{farm.progress}%</small></div></div>)}</div></section>
        <footer>© 2026 AgriNexus <span>Connected agriculture · Demonstration workspace</span></footer>
      </div>
    </main>
  </div>;
}
function ClipboardIcon(){return <span className="clipboard-glyph">▤</span>;}
export default App;
