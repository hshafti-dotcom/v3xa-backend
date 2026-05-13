const express=require('express');
const cors=require('cors');
const fs=require('fs');
const path=require('path');

const app=express();
const PORT=3000;

app.use(cors());
app.use(express.json());

const DB=path.join(__dirname,'database','devices.json');

function readDB(){
  return JSON.parse(fs.readFileSync(DB,'utf8'));
}

function saveDB(data){
  fs.writeFileSync(DB,JSON.stringify(data,null,2));
}

function addOneYearDate(){
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0,10);
}

function normalizePlan(plan){
  if(!plan) return '1 Year';
  const p = String(plan).toLowerCase();
  if(p.includes('life')) return 'Lifetime';
  return '1 Year';
}

function expiresForPlan(plan){
  return plan === 'Lifetime' ? 'Lifetime' : addOneYearDate();
}


app.get('/',(req,res)=>{
  res.json({
    name:'NEXOR CLOUD BACKEND',
    status:'online'
  });
});

/* =====================================================
   DEVICE CHECK
===================================================== */

app.get('/device/:id',(req,res)=>{
  const db=readDB();
  const device=db.devices.find(d=>d.deviceId===req.params.id);

  if(!device){
    return res.status(404).json({
      success:false,
      message:'Device not found'
    });
  }

  res.json({
    success:true,
    device
  });
});

/* =====================================================
   UPLOAD PLAYLIST
===================================================== */

app.post('/upload',(req,res)=>{
  const {deviceId,playlist}=req.body;

  if(!deviceId||!playlist){
    return res.status(400).json({
      success:false,
      message:'Missing deviceId or playlist'
    });
  }

  const db=readDB();

  let device=db.devices.find(d=>d.deviceId===deviceId);

  if(!device){
    device={
      deviceId,
      playlist:'',
      active:false,
      plan:'Trial',
      expires:'7 days'
    };

    db.devices.push(device);
  }

  device.playlist=playlist;
  device.updatedAt=new Date().toISOString();

  saveDB(db);

  res.json({
    success:true,
    message:'Playlist uploaded',
    device
  });
});

/* =====================================================
   ACTIVATE DEVICE
===================================================== */

app.post('/activate',(req,res)=>{
  const {deviceId,plan}=req.body;

  const db=readDB();

  let device=db.devices.find(d=>d.deviceId===deviceId);

  if(!device){
    return res.status(404).json({
      success:false,
      message:'Device not found. Upload playlist/device first, then activate.'
    });
  }

  const selectedPlan = normalizePlan(plan);

  device.active = true;
  device.plan = selectedPlan;
  device.activatedAt = new Date().toISOString();
  device.expires = expiresForPlan(selectedPlan);

  saveDB(db);

  res.json({
    success:true,
    message:'Device activated',
    device
  });
});

/* =====================================================
   ADMIN
===================================================== */

app.get('/admin/devices',(req,res)=>{
  const db=readDB();
  res.json(db.devices);
});


/* =====================================================
   UPDATE / REPAIR DEVICE
===================================================== */

app.post('/admin/device/:id/update',(req,res)=>{
  const db=readDB();
  const device=db.devices.find(d=>d.deviceId===req.params.id);

  if(!device){
    return res.status(404).json({
      success:false,
      message:'Device not found'
    });
  }

  const {active,plan,playlist}=req.body;

  if(typeof active === 'boolean') device.active = active;
  if(plan){
    const selectedPlan = normalizePlan(plan);
    device.plan = selectedPlan;
    device.expires = expiresForPlan(selectedPlan);
    device.activatedAt = device.activatedAt || new Date().toISOString();
  }
  if(typeof playlist === 'string') device.playlist = playlist;

  device.updatedAt = new Date().toISOString();

  saveDB(db);

  res.json({
    success:true,
    message:'Device updated',
    device
  });
});

app.listen(PORT,()=>{
  console.log('NEXOR backend running on port '+PORT);
});
