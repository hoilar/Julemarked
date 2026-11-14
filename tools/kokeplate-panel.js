(() => {
  const panel=document.getElementById('kokeplate-panel');
  const data=document.getElementById('modular-data');
  if (!panel || !data) return;
  const model=JSON.parse(data.textContent), get=id=>document.getElementById(id);
  const level=get('plate-level'), attachment=get('plate-attachment');
  const url=file=>'client/public/art/planlagt/moduler/'+file.split('/').map(encodeURIComponent).join('/');
  function option(value,label){const o=document.createElement('option');o.value=value;o.textContent=label;return o;}
  model.plates.forEach((part,i)=>level.append(option(String(i),part.label)));
  attachment.append(option('','Ingen – bare kokeplate'));
  model.attachments.forEach((part,i)=>attachment.append(option(String(i),part.label)));
  function update(){
    const plate=model.plates[Number(level.value)];
    const part=attachment.value===''?null:model.attachments[Number(attachment.value)];
    for(const id of ['plate-part','plate-composite']) get(id).src=url(plate.file);
    get('plate-file').href=url(plate.file);
    for(const id of ['attachment-part','attachment-composite']){
      const img=get(id);img.hidden=!part;if(part) img.src=url(part.file);else img.removeAttribute('src');
    }
    const link=get('attachment-file');link.hidden=!part;if(part) link.href=url(part.file);else link.removeAttribute('href');
    get('plate-description').textContent=plate.label+' · '+(part?part.label:'uten påbygg')+'. Gløden er en del av kokeplata; påbygget dekker bare den delen som ligger under.';
  }
  level.value='4';
  const initial=model.attachments.findIndex(p=>p.id===model.defaultAttachment);
  attachment.value=String(initial<0?0:initial);
  level.addEventListener('change',update);attachment.addEventListener('change',update);
  update();
})();
