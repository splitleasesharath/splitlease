(function () {
  var root = document.getElementById('site-header');
  var lib = window.SplitLeaseComponents || {};
  var Header = lib.Header;

  if (!root || !Header || !window.React || !window.ReactDOM || !ReactDOM.createRoot) return;

  var logoSrc = (function() {
    var path = window.location.pathname.replace(/\\/g, '/');
    if (path.indexOf('/search/') !== -1) {
      return '../shared/images/logo.png';
    }
    return 'shared/images/logo.png';
  })();

  ReactDOM.createRoot(root).render(
    React.createElement(Header, { logoSrc: logoSrc, exploreHref: 'search/index.html' })
  );
})();

(function () {
  var root = document.getElementById('site-header');
  var lib = window.SplitLeaseComponents || {};
  var Header = lib.Header || lib.SiteHeader;
  if (!root || !Header || !window.React || !window.ReactDOM || !ReactDOM.createRoot) return;
  ReactDOM.createRoot(root).render(
    React.createElement(Header, {})
  );
})();


