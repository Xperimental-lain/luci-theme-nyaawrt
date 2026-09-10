"use strict";
"require baseclass";
"require ui";
"require rpc";
"require fs";

var callSystemInfo = rpc.declare({
    object: 'system',
    method: 'info'
});

var lastRx = 0, lastTx = 0, lastTime = 0;

return baseclass.extend({
  __init__: function () {
    ui.menu.load().then(L.bind(this.render, this));
  },
  render: function (tree) {
    var node = tree,
      url = "";
    this.renderModeMenu(node);
    if (L.env.dispatchpath.length >= 3) {
      for (var i = 0; i < 3 && node; i++) {
        node = node.children[L.env.dispatchpath[i]];
        url = url + (url ? "/" : "") + L.env.dispatchpath[i];
      }
      if (node) this.renderTabMenu(node, url);
    }
    var showSide = document.querySelector(".showSide");
    if (showSide) {
      showSide.addEventListener("click", ui.createHandlerFn(this, "handleSidebarToggle"));
    }
    var darkMask = document.querySelector(".darkMask");
    if (darkMask) {
      darkMask.addEventListener("click", ui.createHandlerFn(this, "handleSidebarToggle"));
    }
    var loading = document.querySelector(".main > .loading");
    if (loading) {
      loading.style.opacity = "0";
      loading.style.visibility = "hidden";
    }
    if (window.innerWidth <= 1152) {
      var mainLeft = document.querySelector(".main-left");
      if (mainLeft) mainLeft.style.transform = "translateX(-20rem)";
    }
    window.addEventListener("resize", this.handleSidebarToggle, true);
    
    // Render Features 1 to 4 (Temp, CPU, RAM, Speed, Light/Dark Toggle)
    this.renderHeaderWidgets();
  },

  renderHeaderWidgets: function () {
    var container = document.querySelector("#indicators");
    if (!container) return;

    var savedTheme = localStorage.getItem("nyaa_theme_mode") || "dark";
    if (savedTheme === "light") {
      document.body.classList.add("light-mode");
    }

    container.innerHTML = '<div class="nyaa-widget-bar">' +
      '<div id="nyaa-temp" class="nyaa-badge temp-green" title="SoC Temperature">🌡️ --°C</div>' +
      '<div id="nyaa-cpu" class="nyaa-badge" title="CPU Load">⚡ CPU --%</div>' +
      '<div id="nyaa-ram" class="nyaa-badge" title="RAM Usage">💾 RAM --%</div>' +
      '<div id="nyaa-speed" class="nyaa-badge" title="Network Speed">🌐 ↓ 0 KB/s ↑ 0 KB/s</div>' +
      '<button id="nyaa-theme-toggle" class="nyaa-toggle-btn" title="Toggle Light/Dark Theme">' + (savedTheme === "light" ? "🌙" : "☀️") + '</button>' +
      '</div>';

    var toggleBtn = document.querySelector("#nyaa-theme-toggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", function () {
        var isLight = document.body.classList.toggle("light-mode");
        localStorage.setItem("nyaa_theme_mode", isLight ? "light" : "dark");
        toggleBtn.textContent = isLight ? "🌙" : "☀️";
      });
    }

    var updateStats = function () {
      // 1 & 2. CPU & RAM
      callSystemInfo().then(function (info) {
        if (info && info.memory) {
          var memTotal = info.memory.total || 1;
          var memFree = (info.memory.free || 0) + (info.memory.buffered || 0) + (info.memory.cached || 0);
          var ramPercent = Math.round(((memTotal - memFree) / memTotal) * 100);
          var ramElem = document.querySelector("#nyaa-ram");
          if (ramElem) ramElem.textContent = "💾 RAM " + ramPercent + "%";
        }
        if (info && info.load && info.load.length) {
          var cpuLoad = (info.load[0] / 65535 * 100).toFixed(0);
          if (isNaN(cpuLoad) || cpuLoad < 0 || cpuLoad > 100) {
            cpuLoad = Math.round(info.load[0] / 100);
          }
          var cpuElem = document.querySelector("#nyaa-cpu");
          if (cpuElem) cpuElem.textContent = "⚡ CPU " + Math.min(100, Math.max(0, cpuLoad)) + "%";
        }
      }).catch(function () {});

      # 3. Temperature
      fs.trimmed("/sys/class/thermal/thermal_zone0/temp").then(function (val) {
        if (val) {
          var temp = (parseFloat(val) / 1000).toFixed(1);
          var tempElem = document.querySelector("#nyaa-temp");
          if (tempElem) {
            tempElem.textContent = "🌡️ " + temp + "°C";
            tempElem.className = "nyaa-badge " + (temp < 60 ? "temp-green" : temp < 75 ? "temp-yellow" : "temp-red");
          }
        }
      }).catch(function () {});

      # 4. Traffic Speed
      fs.read_lines("/proc/net/dev").then(function (lines) {
        var totalRx = 0, totalTx = 0;
        if (lines) {
          for (var i = 0; i < lines.length; i++) {
            var parts = lines[i].trim().split(/\s+/);
            if (parts.length >= 10 && !parts[0].startsWith("lo") && !parts[0].startsWith("Inter-")) {
              var rx = parseInt(parts[1]) || 0;
              var tx = parseInt(parts[9]) || 0;
              totalRx += rx;
              totalTx += tx;
            }
          }
        }
        var now = Date.now();
        if (lastTime > 0) {
          var timeDiff = (now - lastTime) / 1000;
          if (timeDiff > 0) {
            var rxRate = ((totalRx - lastRx) / timeDiff);
            var txRate = ((totalTx - lastTx) / timeDiff);
            
            var fmtRate = function(b) {
              if (b >= 1048576) return (b / 1048576).toFixed(1) + " MB/s";
              return (b / 1024).toFixed(0) + " KB/s";
            };

            var speedElem = document.querySelector("#nyaa-speed");
            if (speedElem) {
              speedElem.textContent = "🌐 ↓ " + fmtRate(rxRate) + "  ↑ " + fmtRate(txRate);
            }
          }
        }
        lastRx = totalRx;
        lastTx = totalTx;
        lastTime = now;
      }).catch(function () {});
    };

    updateStats();
    setInterval(updateStats, 3000);
  },

  handleMenuExpand: function (ev) {
    var a = ev.target,
      ul1 = a.parentNode,
      ul2 = a.nextElementSibling,
      isActive = ul1.classList.contains("active");
    document.querySelectorAll("li.slide.active").forEach(function (li) {
      if (li !== a.parentNode || li == ul1) {
        var menu = li.querySelector("ul");
        if (menu) {
          if (!menu.style.maxHeight || menu.style.maxHeight === "1200px") {
            menu.style.maxHeight = menu.scrollHeight + "px";
          }
          void menu.offsetHeight;
          menu.style.maxHeight = "0px";
        }
        li.classList.remove("active");
        li.childNodes[0].classList.remove("active");
      }
      if (li == ul1) return;
    });
    if (!ul2) return;
    if (!isActive) {
      if (
        ul2.parentNode.offsetLeft + ul2.offsetWidth <=
        ul1.offsetLeft + ul1.offsetWidth
      )
        ul2.classList.add("align-left");
      ul1.classList.add("active");
      a.classList.add("active");
      ul2.style.maxHeight = ul2.scrollHeight + "px";
    }
    a.blur();
    ev.preventDefault();
    ev.stopPropagation();
  },
  renderMainMenu: function (tree, url, level) {
    var l = (level || 0) + 1,
      ul = E("ul", { class: level ? "slide-menu" : "nav" }),
      children = ui.menu.getChildren(tree);
    if (children.length == 0 || l > 2) return E([]);
    for (var i = 0; i < children.length; i++) {
      var isActive = L.env.dispatchpath[l] == children[i].name,
        submenu = this.renderMainMenu(
          children[i],
          url + "/" + children[i].name,
          l
        ),
        hasChildren = submenu.children.length,
        dataTitle = hasChildren ? children[i].title : _(children[i].title);
      ul.appendChild(
        E(
          "li",
          {
            class: hasChildren
              ? "slide" + (isActive ? " active" : "")
              : isActive
              ? " active"
              : "",
          },
          [
            E(
              "a",
              {
                href: hasChildren ? "#" : L.url(url, children[i].name),
                class: hasChildren
                  ? "menu" + (isActive ? " active" : "")
                  : null,
                click: hasChildren
                  ? ui.createHandlerFn(this, "handleMenuExpand")
                  : null,
                "data-title": dataTitle,
                "data-name": children[i].name,
              },
              [_(children[i].title)]
            ),
            submenu,
          ]
        )
      );
    }
    if (l == 1) {
      var container = document.querySelector("#mainmenu");
      if (container) {
        container.appendChild(ul);
        container.style.display = "";
      }
    }
    return ul;
  },
  renderModeMenu: function (tree) {
    var ul = document.querySelector("#modemenu"),
      children = ui.menu.getChildren(tree);
    if (!ul) return;
    for (var i = 0; i < children.length; i++) {
      var isActive = L.env.requestpath.length
        ? children[i].name == L.env.requestpath[0]
        : i == 0;
      ul.appendChild(
        E("li", {}, [
          E(
            "a",
            {
              href: L.url(children[i].name),
              class: isActive ? "active" : null,
            },
            [_(children[i].title)]
          ),
        ])
      );
      if (isActive) this.renderMainMenu(children[i], children[i].name);
      if (i > 0 && i < children.length)
        ul.appendChild(E("li", { class: "divider" }, [E("span")]));
    }
    if (children.length > 1 && ul.parentElement) ul.parentElement.style.display = "";
  },
  renderTabMenu: function (tree, url, level) {
    var container = document.querySelector("#tabmenu"),
      l = (level || 0) + 1,
      ul = E("ul", { class: "tabs" }),
      children = ui.menu.getChildren(tree),
      activeNode = null;
    if (children.length == 0 || !container) return E([]);
    for (var i = 0; i < children.length; i++) {
      var isActive = L.env.dispatchpath[l + 2] == children[i].name,
        activeClass = isActive ? " active" : "",
        className = "tabmenu-item-%s %s".format(children[i].name, activeClass);
      ul.appendChild(
        E("li", { class: className }, [
          E("a", { href: L.url(url, children[i].name) }, [
            _(children[i].title),
          ]),
        ])
      );
      if (isActive) activeNode = children[i];
    }
    container.appendChild(ul);
    container.style.display = "";
    if (activeNode)
      container.appendChild(
        this.renderTabMenu(activeNode, url + "/" + activeNode.name, l)
      );
    return ul;
  },
  handleSidebarToggle: function (ev) {
    var width = window.innerWidth,
      darkMask = document.querySelector(".darkMask"),
      mainRight = document.querySelector(".main-right"),
      mainLeft = document.querySelector(".main-left"),
      open = mainLeft ? mainLeft.style.transform === "" : false;

    if (ev && ev.type == "resize") {
      open = true;
    }

    var willOpen = !open;
    if (ev && ev.type == "resize") {
      willOpen = width > 1152;
    }

    if (mainLeft) {
      if (width <= 1152) {
        mainLeft.style.width = "";
        mainLeft.style.transform = willOpen ? "" : "translateX(-20rem)";
        mainLeft.style.visibility = willOpen ? "visible" : "";
        if (darkMask) {
          darkMask.style.visibility = willOpen ? "visible" : "";
          darkMask.style.opacity = willOpen ? 1 : "";
        }
        if (mainRight) mainRight.style.width = "";
      } else {
        mainLeft.style.width = "";
        mainLeft.style.transform = willOpen ? "" : "translateX(-20rem)";
        mainLeft.style.visibility = willOpen ? "visible" : "hidden";
        if (mainRight) mainRight.style.width = willOpen ? "" : "100%";
        if (darkMask) {
          darkMask.style.visibility = "";
          darkMask.style.opacity = "";
        }
      }
    }
    if (ev && ev.preventDefault) ev.preventDefault();
    if (ev && ev.stopPropagation) ev.stopPropagation();
  },
});
