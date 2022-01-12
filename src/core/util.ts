export const Util = {
  applyDeepDefaults: function (respeonseData: {}, defaults: object[], thisSet: {}) {
    // applies the defaults given to the responseData

    // m.applyDeepDefaults = function(e, t, n) {
    //   if (Array.isArray(t))
    //       for (var r in e)
    //           e.hasOwnProperty(r) && m.applyDeepDefaults(e[r], t[0], n);
    //   else
    //       for (var o in t) {
    //           var i;
    //           "object" == _typeof(t[o]) ? (i = Array.isArray(t[o]),
    //           e.hasOwnProperty(o) || n(e, o, i ? [] : {}),
    //           m.applyDeepDefaults(e[o], t[o], n)) : e.hasOwnProperty(o) || ("function" == typeof t[o] ? n(e, o, t[o](e)) : n(e, o, t[o]))
    //       }
    //   return e
    // }
  }
}