// JDJ environment configuration
// Canonical file for this environment. Do not copy this file between DEV / TEST / PROD.
//
// Environment: PROD
// Database: Supabase PROD (jdj-routes)
//
// This file contains only public browser configuration. No service-role key or secret is stored here.

window.JDJ_ENV = Object.freeze({
  environment: "PROD",
  supabaseUrl: "https://edjmwcnxsqnsxqrcsjxp.supabase.co",
  supabaseKey: "sb_publishable_FElRjSrrcMn2qadsyDDLPA_08YQsz2i"
});

(() => {
  const url = window.JDJ_ENV?.supabaseUrl;
  if (!url || typeof document === "undefined" || !document.head) return;

  if (!document.querySelector('link[data-jdj-supabase-preconnect]')) {
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = url;
    link.crossOrigin = "anonymous";
    link.dataset.jdjSupabasePreconnect = "true";
    document.head.appendChild(link);
  }
})();
