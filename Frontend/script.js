providers.forEach(p=>{

const div = document.createElement("div")

div.className="card p-3 mt-3"

div.innerHTML = `
<h5>${p.name}</h5>
<p>Service: ${p.service}</p>
<p>Location: ${p.location}</p>
<p>Contact: ${p.contact}</p>
`

list.appendChild(div)

})