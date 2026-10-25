// EYVAN web: sharing is closed (Amin #5199: no copy, share or export). Every call is refused as «cancelled».
const refused = () => Promise.reject(Object.assign(new Error('User did not share'), { code: 'CANCELLED' }))
export default { open: refused, share: refused }
