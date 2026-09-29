(function () {
  var script =
    document.currentScript ||
    document.querySelector("script[src*='/embed/fleet.js'][data-token]");
  if (!script) return;
  var token = script.getAttribute("data-token") || "";
  if (!token) return;
  var origin = "";
  try {
    origin = new URL(script.src).origin;
  } catch (e) {
    return;
  }
  var mount = document.getElementById("rentairportcars-fleet");
  if (!mount) {
    mount = document.createElement("div");
    mount.id = "rentairportcars-fleet";
    script.parentNode.insertBefore(mount, script);
  }
  mount.setAttribute("data-rac", "fleet");

  function card(car) {
    var link = document.createElement("a");
    link.href = car.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.cssText =
      "display:flex;align-items:center;gap:12px;padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;text-decoration:none;color:#0b1f4b;";
    if (car.photo) {
      var img = document.createElement("img");
      img.src = car.photo.indexOf("http") === 0 ? car.photo : origin + car.photo;
      img.alt = "";
      img.style.cssText = "width:72px;height:48px;object-fit:cover;border-radius:8px;background:#f1f5f9;";
      link.appendChild(img);
    }
    var text = document.createElement("span");
    var name = document.createElement("strong");
    name.textContent = car.label || "Car";
    name.style.cssText = "display:block;font:700 14px/1.3 system-ui,sans-serif;";
    text.appendChild(name);
    if (car.registrationNumber) {
      var plate = document.createElement("span");
      plate.textContent = car.registrationNumber;
      plate.style.cssText = "display:block;margin-top:2px;font:500 12px/1.3 system-ui,sans-serif;color:#64748b;";
      text.appendChild(plate);
    }
    link.appendChild(text);
    return link;
  }

  fetch(origin + "/api/embed/fleet/" + encodeURIComponent(token))
    .then(function (res) {
      if (!res.ok) throw new Error("fleet");
      return res.json();
    })
    .then(function (data) {
      mount.innerHTML = "";
      mount.style.cssText = "display:grid;gap:8px;max-width:420px;font-family:system-ui,sans-serif;";
      var cars = (data && data.cars) || [];
      if (!cars.length) {
        mount.textContent = "";
        return;
      }
      cars.forEach(function (car) {
        mount.appendChild(card(car));
      });
    })
    .catch(function () {
      mount.textContent = "";
    });
})();
