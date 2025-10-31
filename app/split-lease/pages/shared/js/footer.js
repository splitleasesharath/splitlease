(function () {
  var root = document.getElementById('site-footer');
  var lib = window.SplitLeaseComponents || {};
  var Footer = lib.Footer;

  if (!root || !Footer || !window.React || !window.ReactDOM || !ReactDOM.createRoot) return;

  var showReferral = root.getAttribute('data-show-referral');
  var showImport = root.getAttribute('data-show-import');
  var showAppDownload = root.getAttribute('data-show-app-download');
  var termsUrl = root.getAttribute('data-terms-url');

  ReactDOM.createRoot(root).render(
    React.createElement(Footer, {
      showReferral: showReferral ? showReferral !== 'false' : true,
      showImport: showImport ? showImport !== 'false' : true,
      showAppDownload: showAppDownload ? showAppDownload !== 'false' : true,
      termsUrl: termsUrl || 'https://app.split.lease/terms'
    })
  );
})();
