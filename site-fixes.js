/* Upload next to index.html. Hides broken photos, and if email/Stripe
   are not configured, stops the page from pretending a booking or payment went through. */
(function () {
  var OWNER = "casseus137@gmail.com";

  function hideBroken(img) {
    var card = img.closest("article, .about-images, picture, .hero-bg-picture");
    (card || img).style.display = "none";
  }

  document.querySelectorAll("img").forEach(function (img) {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) hideBroken(img);
    img.addEventListener("error", function () { hideBroken(img); });
  });

  function mailtoFallback(title, fields, replyTo) {
    var body = Object.keys(fields).map(function (k) {
      return k + ": " + fields[k];
    }).join("\n");
    var href = "mailto:" + OWNER
      + "?subject=" + encodeURIComponent(title)
      + "&body=" + encodeURIComponent(body);
    if (replyTo) href += "&cc=" + encodeURIComponent(replyTo);
    window.location.href = href;
  }

  var orig = window.fetch;
  window.fetch = function (url, options) {
    var target = String(url || "");
    return orig.apply(this, arguments).then(function (res) {
      if (target.indexOf("/api/notify") !== -1 && !res.ok) {
        try {
          var payload = JSON.parse((options && options.body) || "{}");
          mailtoFallback(payload.title || "Website form", payload.fields || {}, payload.replyTo);
        } catch (e) {}
      }
      return res;
    }).catch(function (err) {
      if (target.indexOf("/api/notify") !== -1) {
        try {
          var payload = JSON.parse((options && options.body) || "{}");
          mailtoFallback(payload.title || "Website form", payload.fields || {}, payload.replyTo);
        } catch (e) {}
      }
      throw err;
    });
  };

  fetch("/api/health").then(function (r) { return r.json(); }).then(function (health) {
    if (!health || health.stripeConfigured) return;
    var pay = document.getElementById("confirmPayment");
    if (!pay) return;
    pay.textContent = "Email me to pay (Stripe is off)";
    pay.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      mailtoFallback("Payment request", {
        note: "Stripe is not configured. Take Zelle, Venmo, or cash.",
        phone: "240-571-7253"
      });
    }, true);
    var note = document.getElementById("stripePayNote");
    if (note) note.textContent = "Card checkout is off. Pay by Zelle, Venmo, or cash — text 240-571-7253.";
  }).catch(function () {});
})();
