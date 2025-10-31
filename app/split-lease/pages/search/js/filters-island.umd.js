(function () {
  // Utilities: parse and stringify URL params
  function parseQuery(qs) {
    var out = { schedule_days: [], selected_room_types: [] };
    if (!qs) return out;
    if (qs[0] === '?') qs = qs.slice(1);
    var params = qs.split('&').filter(Boolean);
    params.forEach(function (pair) {
      var idx = pair.indexOf('=');
      var key = idx >= 0 ? decodeURIComponent(pair.slice(0, idx)) : decodeURIComponent(pair);
      var val = idx >= 0 ? decodeURIComponent(pair.slice(idx + 1)) : '';
      if (key === 'schedule_days' && val) {
        out.schedule_days = val.split(',').map(function (v) { return parseInt(v, 10); }).filter(function (n) { return !isNaN(n); });
      } else if (key === 'price_min') {
        out.price_min = parseInt(val, 10);
      } else if (key === 'price_max') {
        out.price_max = parseInt(val, 10);
      } else if (key === 'room_types' && val) {
        out.selected_room_types = val.split(',');
      } else if (key === 'sort_by') {
        out.sort_by = val;
      }
    });
    return out;
  }

  function stringifyQuery(state) {
    var parts = [];
    if (state.schedule_days && state.schedule_days.length) {
      parts.push('schedule_days=' + encodeURIComponent(state.schedule_days.join(',')));
    }
    if (typeof state.price_min === 'number') parts.push('price_min=' + state.price_min);
    if (typeof state.price_max === 'number') parts.push('price_max=' + state.price_max);
    if (state.selected_room_types && state.selected_room_types.length) {
      parts.push('room_types=' + encodeURIComponent(state.selected_room_types.join(',')));
    }
    if (state.sort_by) parts.push('sort_by=' + encodeURIComponent(state.sort_by));
    return parts.join('&');
  }

  function replaceUrl(state) {
    var qs = stringifyQuery(state);
    var url = window.location.pathname + (qs ? ('?' + qs) : '');
    window.history.replaceState({}, '', url);
  }

  // Map day indices (0-6) to Bubble Numbers (1-7) and back
  function toBubble(dayIndex) { return ((dayIndex % 7) + 1); }
  function fromBubble(bn) { return ((bn - 1 + 7) % 7); }

  // Price preset buckets from context
  var PRICE_BUCKETS = [
    { label: '< $200/night', min: 20, max: 200 },
    { label: '$200-$350/night', min: 200, max: 350 },
    { label: '$350-$500/night', min: 350, max: 500 },
    { label: '$500+/night', min: 500, max: 999999 },
    { label: 'All Prices', min: 0, max: 999999 }
  ];

  var ROOM_TYPES = [
    { value: 'private_room', label: 'Private room' },
    { value: 'shared_room', label: 'Shared room' },
    { value: 'studio', label: 'Studio' }
  ];

  var SORT_OPTIONS = [
    { value: 'recommendation_score', label: 'Our Recommendations' },
    { value: 'price', label: 'Price-Lowest to Highest' },
    { value: 'view_count', label: 'Most viewed' },
    { value: 'created_date', label: 'Recently Added' }
  ];

  // Debounce helper
  function debounce(fn, delay) {
    var t; return function () {
      var ctx = this, args = arguments; clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, delay);
    };
  }

  // Vanilla fallback UI if React component is not available
  function renderVanilla(mount, state, setState) {
    mount.innerHTML = '';

    function group(title, el) {
      var wrap = document.createElement('div');
      wrap.className = 'filter-group';
      var label = document.createElement('label');
      label.className = 'filter-label';
      label.textContent = title;
      wrap.appendChild(label);
      wrap.appendChild(el);
      return wrap;
    }

    // Weekly Schedule (simple 7 buttons)
    var schedule = document.createElement('div');
    var dayLabels = ['S','M','T','W','T','F','S'];
    for (var i=0;i<7;i++){
      (function(idx){
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = dayLabels[idx];
        btn.style.marginRight = '6px';
        btn.setAttribute('aria-pressed', state.schedule_days.map(fromBubble).includes(idx) ? 'true' : 'false');
        btn.addEventListener('click', function(){
          var set = new Set(state.schedule_days);
          var bn = toBubble(idx);
          if (set.has(bn)) set.delete(bn); else set.add(bn);
          state.schedule_days = Array.from(set).sort();
          setState(state);
        });
        schedule.appendChild(btn);
      })(i);
    }

    // Price bucket dropdown
    var priceSel = document.createElement('select');
    PRICE_BUCKETS.forEach(function (b, i) {
      var opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = b.label;
      if (state.price_min === b.min && state.price_max === b.max) opt.selected = true;
      priceSel.appendChild(opt);
    });
    priceSel.addEventListener('change', function(){
      var idx = parseInt(priceSel.value, 10);
      state.price_min = PRICE_BUCKETS[idx].min;
      state.price_max = PRICE_BUCKETS[idx].max;
      setState(state);
    });

    // Room types (checkboxes)
    var roomWrap = document.createElement('div');
    ROOM_TYPES.forEach(function(rt){
      var id = 'rt-' + rt.value;
      var box = document.createElement('input'); box.type='checkbox'; box.id=id; box.value=rt.value;
      if ((state.selected_room_types||[]).includes(rt.value)) box.checked = true;
      box.addEventListener('change', function(){
        var arr = new Set(state.selected_room_types||[]);
        if (box.checked) arr.add(rt.value); else arr.delete(rt.value);
        state.selected_room_types = Array.from(arr);
        setState(state);
      });
      var lab = document.createElement('label'); lab.htmlFor=id; lab.textContent=rt.label; lab.style.marginRight='12px';
      roomWrap.appendChild(box); roomWrap.appendChild(lab);
    });

    // Sort dropdown
    var sortSel = document.createElement('select');
    SORT_OPTIONS.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s.value; opt.textContent = s.label; if (state.sort_by===s.value) opt.selected = true;
      sortSel.appendChild(opt);
    });
    sortSel.addEventListener('change', function(){ state.sort_by = sortSel.value; setState(state); });

    mount.appendChild(group('Weekly Schedule', schedule));
    mount.appendChild(group('Price', priceSel));
    mount.appendChild(group('Room Type', roomWrap));
    mount.appendChild(group('Sort', sortSel));
  }

  function init() {
    var mount = document.getElementById('sl-filters-root');
    if (!mount) return;

    var initial = Object.assign({
      schedule_days: [],
      price_min: 0,
      price_max: 999999,
      selected_room_types: [],
      sort_by: 'recommendation_score'
    }, parseQuery(window.location.search));

    var debouncedEmit = debounce(function (payload) {
      window.dispatchEvent(new CustomEvent('sl:filters:change', { detail: payload }));
    }, 500);

    function setState(next) {
      replaceUrl(next);
      debouncedEmit(next);
    }

    // Drawer behavior (mobile)
    var toggle = document.getElementById('sl-filters-open');
    if (toggle) {
      var overlay = document.createElement('div');
      overlay.className = 'filters__drawer-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      var panel = document.createElement('div');
      panel.className = 'filters__drawer-panel';
      // Move the mount into panel on mobile open
      toggle.addEventListener('click', function(){
        var expanded = toggle.getAttribute('aria-expanded') === 'true';
        if (!expanded) {
          document.body.appendChild(overlay);
          document.body.appendChild(panel);
          panel.appendChild(mount);
          overlay.style.display = 'block';
          overlay.setAttribute('aria-hidden', 'false');
          toggle.setAttribute('aria-expanded', 'true');
        } else {
          overlay.setAttribute('aria-hidden', 'true');
          overlay.style.display = 'none';
          toggle.setAttribute('aria-expanded', 'false');
          // Return mount to sidebar container
          var sidebar = document.querySelector('.sl-search-sidebar');
          if (sidebar) sidebar.appendChild(mount);
          if (panel.parentNode) panel.parentNode.removeChild(panel);
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }
      });
      overlay.addEventListener('click', function(){ toggle.click(); });
    }

    // Prefer React component from UMD if available
    var hasReact = !!(window.React && window.ReactDOM);
    var hasLibrary = !!(window.SLComponents && window.SLComponents.SearchScheduleSelector);

    if (hasReact && hasLibrary) {
      // Minimal React wrapper just for the schedule; other controls remain vanilla for brevity
      var React = window.React, ReactDOM = window.ReactDOM;
      var Schedule = window.SLComponents.SearchScheduleSelector;
      function ScheduleWrapper(props){ return React.createElement(Schedule, props); }

      // Render vanilla first, then hydrate schedule area
      renderVanilla(mount, initial, setState);
      // Replace schedule group with React component
      var firstGroup = mount.querySelector('.filter-group');
      if (firstGroup) {
        var scheduleHost = document.createElement('div');
        firstGroup.replaceWith(scheduleHost);
        ReactDOM.createRoot(scheduleHost).render(
          React.createElement('div', { className: 'filter-group' },
            React.createElement('label', { className: 'filter-label' }, 'Weekly Schedule'),
            React.createElement(ScheduleWrapper, {
              minDays: 2,
              maxDays: 5,
              requireContiguous: true,
              initialSelection: (initial.schedule_days||[]).map(fromBubble),
              onSelectionChange: function(days){
                var indices = days.map(function(d){ return d.index; });
                initial.schedule_days = Array.from(new Set(indices.map(toBubble))).sort();
                setState(initial);
              }
            })
          )
        );
      }
    } else {
      renderVanilla(mount, initial, setState);
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();


