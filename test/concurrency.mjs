// Fires 10 vessel-call creates at the same time and checks the numbers are unique.
const url = 'http://localhost:4004/operations/VesselCalls'
const body = i => ({
  vessel_ID: 'c1000000-0000-4000-8000-000000000005',
  voyageNumber: `PX${i}`,
  shippingLine_ID: 'b1000000-0000-4000-8000-000000000002',
  agent_ID: 'b1000000-0000-4000-8000-000000000003',
  eta: '2026-12-20T08:00:00Z',
  etd: '2026-12-21T18:00:00Z'
})

const results = await Promise.all(
  Array.from({ length: 10 }, (_, i) =>
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body(i)) })
      .then(r => r.json()))
)
const numbers = results.map(r => r.callNumber ?? `ERROR: ${r.error?.message}`).sort()
console.log(numbers)
console.log(new Set(numbers).size === 10 ? '✅ all 10 numbers unique' : '❌ DUPLICATES or errors!')