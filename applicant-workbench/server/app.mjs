import express from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { resolve } from 'node:path';
import { validate } from './store.mjs';

export function createApp(store, secret) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({limit:'32kb'}));
  app.use((req,res,next) => {
    res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY'});
    if (req.path.startsWith('/api')) res.set('Cache-Control','no-store');
    if (['POST','PUT','DELETE'].includes(req.method)) {
      if (req.headers['x-workbench-request'] !== '1') return res.status(403).json({message:'リクエストを確認できません。'});
      if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return res.status(403).json({message:'異なるサイトからの更新はできません。'});
    }
    next();
  });
  const sign = value => createHmac('sha256',secret).update(value).digest('hex');
  app.use((req,res,next) => {
    const cookie = req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('workbench='))?.slice(10) || '';
    const [actor,sig] = cookie.split('.');
    const valid = ['demo-a','demo-b'].includes(actor) && sig?.length === 64 && timingSafeEqual(Buffer.from(sig),Buffer.from(sign(actor)));
    req.actor = valid ? actor : 'demo-a'; next();
  });
  app.get('/api/health', (_,res)=>res.json({status:'ok',mode:'local-demo'}));
  app.get('/api/session', (req,res)=>res.json({id:req.actor,name:req.actor==='demo-a'?'山田 太郎':'佐藤 花子',mode:'local-demo'}));
  app.post('/api/session', (req,res)=> {
    const id=req.body?.id;
    if (!['demo-a','demo-b'].includes(id)) return res.status(400).json({message:'デモ利用者を選択してください。'});
    res.setHeader('Set-Cookie',`workbench=${id}.${sign(id)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);
    res.json({id});
  });
  app.get('/api/applicants',(req,res)=>res.json(store.list(req.actor)));
  app.get('/api/applicants/:id',(req,res)=> {
    const record = store.find(req.actor,req.params.id);
    if (!record) return res.status(404).json({message:'申請者が見つかりません。'});
    res.json({...record,history:store.history(req.actor,req.params.id)});
  });
  function save(req,res) {
    const {value,errors} = validate(req.body || {});
    if (Object.keys(errors).length) return res.status(422).json({message:'入力内容を確認してください。',errors});
    res.status(req.method==='POST'?201:200).json(store.save(req.actor,value,req.params.id,req.body.version));
  }
  app.post('/api/applicants',save);
  app.put('/api/applicants/:id',save);
  app.delete('/api/applicants/:id',(req,res)=> {store.remove(req.actor,req.params.id,req.body?.version);res.status(204).end();});
  app.use('/api',(_,res)=>res.status(404).json({message:'APIが見つかりません。'}));
  app.use(express.static(resolve('dist')));
  app.get('/{*path}',(_,res)=>res.sendFile(resolve('dist/index.html')));
  app.use((error,req,res,next)=> {
    const status = error.status || 500;
    if (status===500) console.error(error);
    res.status(status).json({message:status===500?'保存できませんでした。時間をおいて再度お試しください。':error.message});
  });
  return app;
}
