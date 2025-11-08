const $ = (sel) => document.querySelector(sel);
const $results = $('#results');
const $status = $('#status');


$('#go').addEventListener('click', async () => {
    const n = Math.max(1, Math.min(200, Number($('#count').value) || 24));
    $status.textContent = `Requesting ${n} resources...`;
    $results.innerHTML = '';
    const t0 = performance.now();


    const reqs = Array.from({ length: n }, (_, i) => i + 1).map(async (id) => {
        const res = await fetch(`/api/thing?id=${id}`);
        const json = await res.json();
        const li = document.createElement('li');
        li.textContent = `id=${json.id} ts=${json.ts}`;
        $results.appendChild(li);
    });


    await Promise.all(reqs);
    const dt = (performance.now() - t0).toFixed(1);
    $status.textContent = `Done in ${dt} ms. Check server logs to see streams sharing one session.`;
});