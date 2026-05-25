(function () {
  const files = ["data-payload-00.txt","data-payload-01.txt","data-payload-02.txt","data-payload-03.txt","data-payload-04.txt","data-payload-05.txt","data-payload-06.txt","data-payload-07.txt","data-payload-08.txt","data-payload-09.txt","data-payload-10.txt","data-payload-11.txt","data-payload-12.txt","data-payload-13.txt","data-payload-14.txt"];
  const current = document.currentScript && document.currentScript.src ? document.currentScript.src : "";
  const root = current ? current.slice(0, current.lastIndexOf("/") + 1) : "assets/";
  window.siteData = window.siteData || { themes: [], sources: [], events: [], comparisons: [] };

  async function inflateBase64(payload) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    if (typeof DecompressionStream !== "function") {
      throw new Error("This browser cannot decompress the research data payload.");
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }

  window.siteDataReady = Promise.all(files.map((file) => fetch(root + file).then((response) => {
    if (!response.ok) throw new Error("Failed to load " + file);
    return response.text();
  })))
    .then((chunks) => inflateBase64(chunks.join("")))
    .then((json) => { window.siteData = JSON.parse(json); return window.siteData; });
}());
