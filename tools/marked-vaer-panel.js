(() => {
  const get = id => document.getElementById(id);
  if (!get('marked-vaer-panel')) return;
  const times = {morgen:'morgen',dag:'dag',kveld:'kveld',natt:'natt'};
  const kinds = {sno:'Snøvær',sludd:'Sludd',storm:'Storm'};
  function updateWeather() {
    const time = get('weather-time').value;
    const kind = get('weather-kind').value;
    const path = 'client/public/art/bg/marked-'+kind+'-'+time+'.jpg';
    get('weather-original').src = 'client/public/art/bg/marked-'+time+'.jpg';
    get('weather-original').alt = 'Eksisterende torgbakgrunn · '+times[time];
    get('weather-preview').src = path;
    get('weather-preview').alt = kinds[kind]+' · '+times[time];
    get('weather-link').href = path;
    get('weather-caption').textContent = kinds[kind]+' · '+times[time]+' · grafikk klar, ikke koblet inn i spillet';
  }
  get('weather-time').addEventListener('change',updateWeather);
  get('weather-kind').addEventListener('change',updateWeather);
  updateWeather();
})();
