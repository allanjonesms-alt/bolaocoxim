async function fetchTotal() {
  const projectId = "gen-lang-client-0506636251";
  const databaseId = "ai-studio-75219dae-00ea-4dab-a959-93d34844c2cb";
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
       console.error("ERROR", data.error);
       return;
    }
    let total = 0;
    if (data.documents) {
      data.documents.forEach(doc => {
        if (doc.fields && doc.fields.balance) {
           let val = doc.fields.balance.integerValue || doc.fields.balance.doubleValue;
           if (val) total += Number(val);
        }
      });
    }
    console.log("REST_TOTAL_BALANCE:", total);
  } catch (e) {
    console.error(e);
  }
}
fetchTotal();
