async function loadPricing(){
  const res = await fetch('./data/pricing.json');
  return await res.json();
}

function money(n){return '$'+Math.round(n).toLocaleString()}

async function init(){
  const pricing = await loadPricing();

  const estimateEl = document.getElementById('estimate');
  const sqftEl = document.getElementById('sqft');
  const conditionEl = document.getElementById('condition');

  function calc(){
    let sqft = +sqftEl.value || 0;
    let condition = +conditionEl.value || 1;
    let total = 0;
    let selected = [];

    document.querySelectorAll('input[type=checkbox]').forEach(c=>{
      if(c.checked){
        let type = pricing.workTypes.find(t=>t.id===c.value);
        if(type){
          selected.push(type.label);
          if(type.priceType === 'perSqFt'){
            total += sqft * type.baseRate;
          } else {
            total += type.baseRate;
          }
        }
      }
    });

    total *= condition;

    let low = total * pricing.rangeMultiplier.low;
    let high = total * pricing.rangeMultiplier.high;

    estimateEl.textContent = `Estimated range: ${money(low)} - ${money(high)}`;

    document.getElementById('workTypes').value = selected.join(', ');
    document.getElementById('roughEstimate').value = `${money(low)} - ${money(high)}`;
  }

  document.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',calc));
  calc();
}

init();
