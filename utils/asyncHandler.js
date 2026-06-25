// utils/asyncHandler.js
// Express 4 tidak otomatis menangkap rejection dari async function di route
// handler. Tanpa ini, error Mongo/Mongoose yang tidak ter-try/catch akan
// jadi "unhandled rejection" dan request menggantung tanpa respons sampai
// timeout (di Vercel: function timeout, bukan error JSON yang rapi).
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
