// Repair service category/item picker on booking page
(function(){
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  ready(function(){
    var category=document.getElementById('category');
    var item=document.getElementById('serviceItem');
    var main=document.getElementById('mainServices');
    if(!category||!item||!main||!window.catalog)return;
    function checked(){return Array.from(document.querySelectorAll('#mainServices input:checked')).map(function(x){return x.value})}
    function available(){var s=checked();return window.catalog.filter(function(i){return s.indexOf(i.service)>-1})}
    function fillCategories(){
      var a=available();
      if(document.body){document.body.classList.toggle('items-on',a.length>0)}
      if(!a.length){category.innerHTML='<option value="">Select a service first</option>';item.innerHTML='<option value="">Select a category first</option>';return}
      var old=category.value;
      var cats=[];
      a.forEach(function(i){if(cats.indexOf(i.cat)===-1)cats.push(i.cat)});
      category.innerHTML=cats.map(function(c){return '<option value="'+c.replace(/"/g,'&quot;')+'">'+c+'</option>'}).join('');
      if(cats.indexOf(old)>-1)category.value=old;
      fillItems();
    }
    function fillItems(){
      var c=category.value;
      var a=available().filter(function(i){return i.cat===c});
      item.innerHTML=a.length?a.map(function(i){return '<option value="'+i.id+'">'+i.name+' ('+i.unit+')</option>'}).join(''):'<option value="">No items available</option>';
    }
    category.addEventListener('change',fillItems);
    main.addEventListener('change',function(){setTimeout(fillCategories,0)});
    document.querySelectorAll('#mainServices input').forEach(function(x){x.addEventListener('change',function(){setTimeout(fillCategories,0)})});
    window.repairServicePicker=fillCategories;
    setTimeout(fillCategories,50);
    setTimeout(fillCategories,500);
  })
})();